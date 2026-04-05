"""Signal manager: orchestrates prediction lifecycle."""
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx

from ai_providers import get_provider
from binance.client import binance_client
from database.db import save_signal
from indicators.calculator import calculate_indicators

logger = logging.getLogger(__name__)


class PredictionSession:
    """Manages an active prediction session."""

    def __init__(
        self,
        provider_id: str,
        api_key: str,
        model: str,
        symbol: str,
        timeframe: str,
        interval_seconds: int = 60,
    ):
        self.provider_id = provider_id
        self.api_key = api_key
        self.model = model
        self.symbol = symbol
        self.timeframe = timeframe
        self.interval_seconds = interval_seconds
        self._task: Optional[asyncio.Task] = None
        self._running = False
        self.last_signal: Optional[dict] = None
        self.on_signal = None  # callback(signal_dict)
        self.on_partial = None # callback(partial_dict)

    def start(self):
        self._running = True
        self._task = asyncio.create_task(self._run())
        logger.info("Prediction session started: %s/%s via %s", self.symbol, self.timeframe, self.provider_id)

    def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
        logger.info("Prediction session stopped")

    async def _run(self):
        while self._running:
            try:
                await self._predict_once()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Prediction loop error: %s", e)
            await asyncio.sleep(self.interval_seconds)

    async def _predict_once(self):
        candles = binance_client.get_candles(self.symbol, self.timeframe)
        if len(candles) < 30:
            error_msg = f"Not enough market data to analyze {self.symbol} on {self.timeframe} (wait a moment for WebSocket data collection)."
            logger.warning(error_msg)
            await self._broadcast_api_failure({}, datetime.now(timezone.utc), error_msg)
            self.stop()
            return

        indicators = calculate_indicators(candles)
        if "error" in indicators:
            error_msg = f"Indicator processing error: {indicators['error']}"
            logger.warning(error_msg)
            await self._broadcast_api_failure({}, datetime.now(timezone.utc), error_msg)
            self.stop()
            return

        now = datetime.now(timezone.utc)
        last_candle = candles[-1]
        next_candle_ms = last_candle.get("close_time", 0) + 1
        
        tf = self.timeframe
        if tf.endswith('m'):
            duration_ms = int(tf[:-1]) * 60000
        elif tf.endswith('h'):
            duration_ms = int(tf[:-1]) * 3600000
        elif tf.endswith('d'):
            duration_ms = int(tf[:-1]) * 86400000
        else:
            duration_ms = 60000

        # Calculate explicit target time bounds as pure `made_at + timeframe` matching user intuition
        now_clean = now.replace(second=0, microsecond=0)
        target_time_ms = int(now_clean.timestamp() * 1000) + duration_ms
        target_time_iso = datetime.fromtimestamp(target_time_ms / 1000, tz=timezone.utc).isoformat()

        market_data = {
            "symbol": self.symbol,
            "timeframe": self.timeframe,
            "current_time": now.isoformat(),
            "next_candle_time": datetime.fromtimestamp(
                next_candle_ms / 1000, tz=timezone.utc
            ).isoformat(),
            "timestamp": int(now.timestamp() * 1000),
            **indicators,
        }

        provider = get_provider(self.provider_id, self.api_key, self.model)
        
        async def _handle_chunk(chunk_text: str):
            if self.on_partial:
                await self.on_partial({
                    "symbol": self.symbol,
                    "timeframe": self.timeframe,
                    "provider": self.provider_id,
                    "model": self.model,
                    "chunk": chunk_text,
                    "target_time": target_time_iso,
                    "created_at": now.isoformat(),
                    "price": indicators.get("price")
                })

        # ── Make the API call — catch failures explicitly ──────────────────
        try:
            result = await provider.predict(market_data, on_chunk=_handle_chunk)
        except httpx.HTTPStatusError as e:
            status = e.response.status_code
            try:
                await e.response.aread()
                body = e.response.text[:300]
            except Exception:
                body = "Stream response body unread"
            error_msg = f"HTTP {status}: {body}"
            logger.error("API call failed for %s: %s", self.provider_id, error_msg)
            await self._broadcast_api_failure(indicators, now, error_msg, target_time_iso)
            self.stop()
            return
        except httpx.RequestError as e:
            error_msg = f"Network error: {e}"
            logger.error("API network error for %s: %s", self.provider_id, error_msg)
            await self._broadcast_api_failure(indicators, now, error_msg, target_time_iso)
            self.stop()
            return
        except Exception as e:
            error_msg = f"Unexpected error: {e}"
            logger.error("API unexpected error for %s: %s", self.provider_id, error_msg)
            await self._broadcast_api_failure(indicators, now, error_msg, target_time_iso)
            self.stop()
            return

        signal_dict = {
            "symbol": self.symbol,
            "timeframe": self.timeframe,
            "provider": self.provider_id,
            "model": self.model,
            "price": indicators.get("price"),
            "rsi": indicators.get("rsi"),
            "macd": indicators.get("macd"),
            "trend": indicators.get("trend"),
            "api_failed": False,
            "error_message": None,
            "target_time": target_time_iso,
            **result.to_dict(),
            "created_at": now.isoformat(),
            "indicators": {
                k: v for k, v in indicators.items() if k != "candles"
            },
        }

        signal_id = await save_signal(signal_dict)
        signal_dict["id"] = signal_id
        self.last_signal = signal_dict

        if self.on_signal:
            await self.on_signal(signal_dict)

        logger.info(
            "Signal [%s]: %s confidence=%s%%",
            self.symbol,
            result.signal,
            result.confidence,
        )

    async def _broadcast_api_failure(self, indicators: dict, now: datetime, error_msg: str, target_time_iso: str = "—"):
        """Build and broadcast an api_failed signal to the frontend."""
        failure_dict = {
            "symbol": self.symbol,
            "timeframe": self.timeframe,
            "provider": self.provider_id,
            "model": self.model,
            "price": indicators.get("price"),
            "rsi": indicators.get("rsi"),
            "macd": indicators.get("macd"),
            "trend": indicators.get("trend"),
            "signal": "ERROR",
            "confidence": 0,
            "prediction_time": "—",
            "target_time": target_time_iso,
            "reason": error_msg,
            "api_failed": True,
            "error_message": error_msg,
            "created_at": now.isoformat(),
        }
        self.last_signal = failure_dict
        if self.on_signal:
            await self.on_signal(failure_dict)


# Singleton session manager
class SessionManager:
    def __init__(self):
        self._session: Optional[PredictionSession] = None

    def get_session(self) -> Optional[PredictionSession]:
        return self._session

    def start_session(self, **kwargs) -> PredictionSession:
        self.stop_session()
        self._session = PredictionSession(**kwargs)
        return self._session

    def stop_session(self):
        if self._session:
            self._session.stop()
            self._session = None


session_manager = SessionManager()
