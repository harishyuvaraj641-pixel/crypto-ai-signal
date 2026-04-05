"""
CryptoAI Signal — FastAPI Backend
"""
import asyncio
import logging
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from binance.client import binance_client
from config import settings
from database.db import get_signals, get_signal_stats, init_db
from indicators.calculator import calculate_indicators
from signals.manager import session_manager
from websocket.handler import ws_endpoint, ws_manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

TRACKED_COINS: List[str] = list(settings.DEFAULT_COINS)
TRACKED_TIMEFRAMES: List[str] = ["1m", "3m", "5m", "15m", "1h"]


# ─── Price broadcast task ───────────────────────────────────────────────────
async def _price_broadcast_loop():
    """Send live prices to all WS clients every second."""
    while True:
        try:
            prices = list(binance_client.latest_prices.values())
            if prices:
                await ws_manager.broadcast({"type": "prices", "data": prices})
        except Exception as e:
            logger.warning("Price broadcast error: %s", e)
        await asyncio.sleep(1)


async def _candle_callback(symbol: str, timeframe: str, candle: dict):
    """Called on every new candle from Binance WebSocket."""
    await ws_manager.broadcast(
        {"type": "candle", "symbol": symbol, "timeframe": timeframe, "data": candle}
    )


# ─── Signal callback ────────────────────────────────────────────────────────
async def _on_new_signal(signal: dict):
    await ws_manager.broadcast({"type": "signal", "data": signal})
    logger.info("Signal broadcast: %s %s", signal.get("symbol"), signal.get("signal"))

async def _on_partial_signal(data: dict):
    await ws_manager.broadcast({"type": "api_partial", "data": data})


# ─── Lifespan ───────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting CryptoAI Signal backend…")
    await init_db()
    binance_client.on_update(_candle_callback)
    await binance_client.start(TRACKED_COINS, TRACKED_TIMEFRAMES)
    broadcast_task = asyncio.create_task(_price_broadcast_loop())
    yield
    logger.info("Shutting down…")
    broadcast_task.cancel()
    await binance_client.stop()
    session_manager.stop_session()


# ─── App ────────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Models ─────────────────────────────────────────────────────────────────
class StartPredictionRequest(BaseModel):
    provider: str
    api_key: str
    model: str
    symbol: str = "BTCUSDT"
    timeframe: str = "5m"
    interval_seconds: int = 60


class AddCoinRequest(BaseModel):
    symbol: str


# ─── Routes ─────────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {"status": "ok", "version": settings.VERSION, "server_time": datetime.now(timezone.utc).isoformat()}


@app.get("/api/providers")
async def get_providers():
    return settings.AI_PROVIDERS


@app.get("/api/coins")
async def get_coins():
    prices = binance_client.latest_prices
    return {
        "coins": TRACKED_COINS,
        "prices": {sym: prices.get(sym, {}) for sym in TRACKED_COINS},
    }


@app.post("/api/coins/add")
async def add_coin(req: AddCoinRequest):
    sym = req.symbol.upper()
    if sym not in TRACKED_COINS:
        TRACKED_COINS.append(sym)
        await binance_client.start([sym], TRACKED_TIMEFRAMES)
    return {"coins": TRACKED_COINS}


@app.get("/api/indicators/{symbol}/{timeframe}")
async def get_indicators(symbol: str, timeframe: str):
    candles = binance_client.get_candles(symbol.upper(), timeframe)
    if not candles:
        raise HTTPException(404, f"No candle data for {symbol}/{timeframe}")
    return calculate_indicators(candles)


@app.get("/api/candles/{symbol}/{timeframe}")
async def get_candles(symbol: str, timeframe: str, limit: int = 100):
    candles = binance_client.get_candles(symbol.upper(), timeframe)
    return {"symbol": symbol.upper(), "timeframe": timeframe, "candles": candles[-limit:]}


@app.post("/api/predict/start")
async def start_prediction(req: StartPredictionRequest):
    session = session_manager.start_session(
        provider_id=req.provider,
        api_key=req.api_key,
        model=req.model,
        symbol=req.symbol.upper(),
        timeframe=req.timeframe,
        interval_seconds=req.interval_seconds,
    )
    session.on_signal = _on_new_signal
    session.on_partial = _on_partial_signal
    session.start()
    return {"status": "started", "symbol": req.symbol, "provider": req.provider, "model": req.model}


@app.post("/api/predict/stop")
async def stop_prediction():
    session_manager.stop_session()
    return {"status": "stopped"}


@app.get("/api/predict/status")
async def prediction_status():
    session = session_manager.get_session()
    if not session:
        return {"active": False}
    return {
        "active": True,
        "symbol": session.symbol,
        "timeframe": session.timeframe,
        "provider": session.provider_id,
        "model": session.model,
        "last_signal": session.last_signal,
    }


@app.get("/api/signals")
async def list_signals(symbol: Optional[str] = None, limit: int = 50):
    signals = await get_signals(symbol=symbol, limit=limit)
    return {"signals": signals}


@app.get("/api/signals/stats")
async def signal_stats():
    return await get_signal_stats()


# WebSocket endpoint
@app.websocket("/ws")
async def websocket_route(websocket: WebSocket):
    await ws_endpoint(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
