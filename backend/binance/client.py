"""Binance WebSocket and REST client."""
import asyncio
import json
import logging
import httpx
import websockets
from collections import defaultdict, deque
from datetime import datetime
from typing import Callable, Dict, List, Optional
from config import settings

logger = logging.getLogger(__name__)


class CandleBuffer:
    """Thread-safe circular buffer for OHLCV candles."""

    def __init__(self, maxlen: int = 200):
        self._data: deque = deque(maxlen=maxlen)

    def append(self, candle: dict):
        # Replace last candle if same open_time (candle update), else append
        if self._data and self._data[-1]["open_time"] == candle["open_time"]:
            self._data[-1] = candle
        else:
            self._data.append(candle)

    def to_list(self) -> List[dict]:
        return list(self._data)

    def __len__(self):
        return len(self._data)


class BinanceClient:
    def __init__(self):
        self.candles: Dict[str, Dict[str, CandleBuffer]] = defaultdict(
            lambda: defaultdict(lambda: CandleBuffer(settings.CANDLE_LIMIT))
        )
        self.latest_prices: Dict[str, dict] = {}
        self._callbacks: List[Callable] = []
        self._running = False
        self._ws_task: Optional[asyncio.Task] = None

    # ------------------------------------------------------------------ #
    #  Public API                                                          #
    # ------------------------------------------------------------------ #
    def on_update(self, callback: Callable):
        """Register a callback that gets called on every candle update."""
        self._callbacks.append(callback)

    async def start(self, symbols: List[str], timeframes: List[str]):
        """Prefetch historical candles then start WebSocket stream."""
        # Binance native valid intervals
        native_intervals = {"1m","3m","5m","15m","30m","1h","2h","4h","6h","8h","12h","1d","3d","1w","1M"}
        
        native_to_fetch = set()
        needs_1m = False
        
        for tf in timeframes:
            if tf in native_intervals:
                native_to_fetch.add(tf)
            elif tf.endswith("m"):
                needs_1m = True
                
        if needs_1m:
            native_to_fetch.add("1m")
            
        fetch_list = list(native_to_fetch)
        
        await self._prefetch_candles(symbols, fetch_list)
        self._running = True
        self._ws_task = asyncio.create_task(
            self._ws_stream(symbols, fetch_list)
        )
        logger.info("Binance client started for %s with streams %s", symbols, fetch_list)

    async def stop(self):
        self._running = False
        if self._ws_task:
            self._ws_task.cancel()
            try:
                await self._ws_task
            except asyncio.CancelledError:
                pass

    def get_candles(self, symbol: str, timeframe: str) -> List[dict]:
        # Native exist?
        if timeframe in self.candles[symbol] and len(self.candles[symbol][timeframe]) > 0:
            return self.candles[symbol][timeframe].to_list()
            
        # Synthesize from 1m if needed (e.g. 2m, 4m, 10m)
        if timeframe.endswith("m"):
            try:
                target_m = int(timeframe[:-1])
                if "1m" in self.candles[symbol] and len(self.candles[symbol]["1m"]) > 0:
                    return self._resample(self.candles[symbol]["1m"].to_list(), target_m)
            except ValueError:
                pass
                
        return []

    def _resample(self, candles_1m: List[dict], target_minutes: int) -> List[dict]:
        if not candles_1m: return []
        
        resampled = []
        current_group = []
        target_ms = target_minutes * 60 * 1000
        
        for c in candles_1m:
            bucket = (c["open_time"] // target_ms) * target_ms
            
            if not current_group:
                current_group = [c]
                current_bucket = bucket
            elif bucket == current_bucket:
                current_group.append(c)
            else:
                resampled.append(self._aggregate_candles(current_group, current_bucket, target_ms, target_minutes))
                current_group = [c]
                current_bucket = bucket
                
        if current_group:
            resampled.append(self._aggregate_candles(current_group, current_bucket, target_ms, target_minutes))
            
        return resampled

    def _aggregate_candles(self, group: List[dict], open_time: int, duration_ms: int, target_m: int) -> dict:
        return {
            "open_time": open_time,
            "open": group[0]["open"],
            "high": max(c["high"] for c in group),
            "low": min(c["low"] for c in group),
            "close": group[-1]["close"],
            "volume": sum(c["volume"] for c in group),
            "close_time": open_time + duration_ms - 1,
            "is_closed": group[-1]["is_closed"],
            "symbol": group[0]["symbol"],
            "timeframe": f"{target_m}m",
        }

    # ------------------------------------------------------------------ #
    #  Historical candles pre-fetch                                        #
    # ------------------------------------------------------------------ #
    async def _prefetch_candles(self, symbols: List[str], timeframes: List[str]):
        sem = asyncio.Semaphore(5)
        
        async def fetch_with_sem(c, s, t):
            async with sem:
                await self._fetch_klines(c, s, t)

        async with httpx.AsyncClient(timeout=30) as client:
            tasks = [
                fetch_with_sem(client, sym, tf)
                for sym in symbols
                for tf in timeframes
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for r in results:
                if isinstance(r, Exception):
                    logger.warning("Prefetch error: %s", r)

    async def _fetch_klines(self, client: httpx.AsyncClient, symbol: str, tf: str):
        url = f"{settings.BINANCE_REST_BASE}/api/v3/klines"
        params = {"symbol": symbol, "interval": tf, "limit": settings.CANDLE_LIMIT}
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        raw = resp.json()
        buf = self.candles[symbol][tf]
        for k in raw:
            buf.append(self._parse_rest_kline(k))
        logger.debug("Prefetched %d candles for %s/%s", len(raw), symbol, tf)

    # ------------------------------------------------------------------ #
    #  WebSocket streaming                                                 #
    # ------------------------------------------------------------------ #
    async def _ws_stream(self, symbols: List[str], timeframes: List[str]):
        streams = [
            f"{sym.lower()}@kline_{tf}"
            for sym in symbols
            for tf in timeframes
        ]
        # Also subscribe to mini-tickers for price feed
        tickers = [f"{sym.lower()}@miniTicker" for sym in symbols]
        all_streams = streams + tickers

        url = f"{settings.BINANCE_WS_BASE}?streams={'/'.join(all_streams)}"
        while self._running:
            try:
                async with websockets.connect(url, ping_interval=20, ping_timeout=20) as ws:
                    logger.info("Binance WS connected")
                    async for raw in ws:
                        if not self._running:
                            break
                        await self._handle_message(json.loads(raw))
            except Exception as e:
                if self._running:
                    logger.warning("WS error, reconnecting in 3s: %s", e)
                    await asyncio.sleep(3)

    async def _handle_message(self, msg: dict):
        data = msg.get("data", {})
        event = data.get("e", "")

        if event == "kline":
            k = data["k"]
            symbol = k["s"]
            tf = k["i"]
            candle = {
                "open_time": k["t"],
                "open": float(k["o"]),
                "high": float(k["h"]),
                "low": float(k["l"]),
                "close": float(k["c"]),
                "volume": float(k["v"]),
                "close_time": k["T"],
                "is_closed": k["x"],
                "symbol": symbol,
                "timeframe": tf,
            }
            self.candles[symbol][tf].append(candle)

            # Update latest price
            self.latest_prices[symbol] = {
                "symbol": symbol,
                "price": float(k["c"]),
                "open": float(k["o"]),
                "high": float(k["h"]),
                "low": float(k["l"]),
                "volume": float(k["v"]),
                "close_time": k["T"],
                "timestamp": data.get("E", 0),
            }

            # Fire callbacks
            for cb in self._callbacks:
                try:
                    await cb(symbol, tf, candle)
                except Exception as e:
                    logger.error("Callback error: %s", e)

        elif event == "24hrMiniTicker":
            symbol = data["s"]
            existing = self.latest_prices.get(symbol, {})
            existing.update(
                {
                    "symbol": symbol,
                    "price": float(data["c"]),
                    "open_24h": float(data["o"]),
                    "high_24h": float(data["h"]),
                    "low_24h": float(data["l"]),
                    "volume_24h": float(data["v"]),
                    "quote_volume_24h": float(data["q"]),
                }
            )
            self.latest_prices[symbol] = existing

    # ------------------------------------------------------------------ #
    #  Helpers                                                             #
    # ------------------------------------------------------------------ #
    @staticmethod
    def _parse_rest_kline(k: list) -> dict:
        return {
            "open_time": k[0],
            "open": float(k[1]),
            "high": float(k[2]),
            "low": float(k[3]),
            "close": float(k[4]),
            "volume": float(k[5]),
            "close_time": k[6],
            "is_closed": True,
        }

    async def get_server_time(self) -> int:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{settings.BINANCE_REST_BASE}/api/v3/time")
            resp.raise_for_status()
            return resp.json()["serverTime"]


# Singleton
binance_client = BinanceClient()
