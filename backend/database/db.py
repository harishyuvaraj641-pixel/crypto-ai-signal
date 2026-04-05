"""SQLite database layer using aiosqlite."""
import aiosqlite
import json
from datetime import datetime
from typing import List, Optional
from config import settings


CREATE_SIGNALS_TABLE = """
CREATE TABLE IF NOT EXISTS signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    signal TEXT NOT NULL,
    confidence INTEGER NOT NULL,
    prediction_time TEXT,
    reason TEXT,
    price REAL,
    rsi REAL,
    macd REAL,
    trend TEXT,
    created_at TEXT NOT NULL,
    is_correct INTEGER DEFAULT NULL,
    target_time TEXT
);
"""

CREATE_CANDLES_TABLE = """
CREATE TABLE IF NOT EXISTS candles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    open_time INTEGER NOT NULL,
    open REAL, high REAL, low REAL, close REAL, volume REAL,
    close_time INTEGER NOT NULL,
    UNIQUE(symbol, timeframe, open_time)
);
"""


async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(settings.DB_PATH)
    db.row_factory = aiosqlite.Row
    return db


async def init_db():
    async with aiosqlite.connect(settings.DB_PATH) as db:
        await db.execute(CREATE_SIGNALS_TABLE)
        await db.execute(CREATE_CANDLES_TABLE)
        
        # Safely upgrade existing signals table if target_time is missing
        try:
            await db.execute("ALTER TABLE signals ADD COLUMN target_time TEXT")
        except aiosqlite.OperationalError as e:
            if "duplicate column name" not in str(e):
                pass
                
        await db.commit()


async def save_signal(signal_data: dict) -> int:
    async with aiosqlite.connect(settings.DB_PATH) as db:
        cursor = await db.execute(
            """INSERT INTO signals 
               (symbol, timeframe, provider, model, signal, confidence,
                prediction_time, reason, price, rsi, macd, trend, created_at, target_time)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                signal_data["symbol"],
                signal_data["timeframe"],
                signal_data["provider"],
                signal_data["model"],
                signal_data["signal"],
                signal_data["confidence"],
                signal_data.get("prediction_time", ""),
                signal_data.get("reason", ""),
                signal_data.get("price", 0),
                signal_data.get("rsi", 0),
                signal_data.get("macd", 0),
                signal_data.get("trend", ""),
                datetime.utcnow().isoformat(),
                signal_data.get("target_time"),
            ),
        )
        await db.commit()
        return cursor.lastrowid


async def get_signals(symbol: Optional[str] = None, limit: int = 50) -> List[dict]:
    async with aiosqlite.connect(settings.DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        if symbol:
            cursor = await db.execute(
                "SELECT * FROM signals WHERE symbol=? ORDER BY id DESC LIMIT ?",
                (symbol, limit),
            )
        else:
            cursor = await db.execute(
                "SELECT * FROM signals ORDER BY id DESC LIMIT ?", (limit,)
            )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def get_signal_stats() -> dict:
    async with aiosqlite.connect(settings.DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT signal, COUNT(*) as count FROM signals GROUP BY signal"""
        )
        rows = await cursor.fetchall()
        return {row["signal"]: row["count"] for row in rows}
