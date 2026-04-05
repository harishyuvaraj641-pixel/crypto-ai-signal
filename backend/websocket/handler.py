"""WebSocket handler: broadcasts data to all connected frontend clients."""
import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Set
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active: Set[WebSocket] = set()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.add(ws)
        logger.info("WS client connected. Total: %d", len(self.active))

    def disconnect(self, ws: WebSocket):
        self.active.discard(ws)
        logger.info("WS client disconnected. Total: %d", len(self.active))

    async def broadcast(self, message: dict):
        if not self.active:
            return
        text = json.dumps(message, default=str)
        dead = set()
        for ws in list(self.active):
            try:
                await ws.send_text(text)
            except Exception:
                dead.add(ws)
        self.active -= dead


ws_manager = ConnectionManager()


async def ws_endpoint(websocket: WebSocket):
    """Main WebSocket endpoint for frontend clients."""
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep alive — listen for client pings
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30)
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except asyncio.TimeoutError:
                # Send server heartbeat
                await websocket.send_text(
                    json.dumps({
                        "type": "heartbeat",
                        "server_time": datetime.now(timezone.utc).isoformat(),
                    })
                )
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error("WS error: %s", e)
        ws_manager.disconnect(websocket)
