"""Technical indicator calculation using pandas-ta."""
import logging
from typing import Dict, List, Optional
import numpy as np
import pandas as pd

try:
    import pandas_ta as ta
except ImportError:
    ta = None

logger = logging.getLogger(__name__)


def _to_df(candles: List[dict]) -> pd.DataFrame:
    df = pd.DataFrame(candles)
    for col in ["open", "high", "low", "close", "volume"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df.dropna(subset=["close"])
    df = df.reset_index(drop=True)
    return df


def _safe(val) -> Optional[float]:
    """Return Python float or None for NaN/Inf values."""
    try:
        v = float(val)
        return None if (np.isnan(v) or np.isinf(v)) else round(v, 6)
    except Exception:
        return None


def calculate_indicators(candles: List[dict]) -> Dict:
    if len(candles) < 30:
        return {"error": "Not enough candles"}

    df = _to_df(candles)
    close = df["close"]
    high = df["high"]
    low = df["low"]
    volume = df["volume"]
    current_price = float(close.iloc[-1])

    result: Dict = {"price": round(current_price, 6)}

    # ── RSI ────────────────────────────────────────────────────────────────
    if ta:
        rsi_s = ta.rsi(close, length=14)
        result["rsi"] = _safe(rsi_s.iloc[-1]) if rsi_s is not None else None
    else:
        delta = close.diff()
        up = delta.clip(lower=0)
        down = -delta.clip(upper=0)
        rs = up.ewm(com=13, adjust=False).mean() / down.ewm(com=13, adjust=False).mean()
        rsi_s = 100 - (100 / (1 + rs))
        result["rsi"] = _safe(rsi_s.iloc[-1])

    # ── MACD ───────────────────────────────────────────────────────────────
    if ta:
        macd_df = ta.macd(close, fast=12, slow=26, signal=9)
        if macd_df is not None and not macd_df.empty:
            result["macd"] = _safe(macd_df.iloc[-1, 0])
            result["macd_signal"] = _safe(macd_df.iloc[-1, 1])
            result["macd_hist"] = _safe(macd_df.iloc[-1, 2])
    else:
        ema12 = close.ewm(span=12, adjust=False).mean()
        ema26 = close.ewm(span=26, adjust=False).mean()
        macd_line = ema12 - ema26
        macd_sig = macd_line.ewm(span=9, adjust=False).mean()
        result["macd"] = _safe(macd_line.iloc[-1])
        result["macd_signal"] = _safe(macd_sig.iloc[-1])
        result["macd_hist"] = _safe((macd_line - macd_sig).iloc[-1])

    # ── EMAs ───────────────────────────────────────────────────────────────
    for period in [9, 21, 50]:
        if ta:
            ema_s = ta.ema(close, length=period)
            result[f"ema{period}"] = _safe(ema_s.iloc[-1]) if ema_s is not None else None
        else:
            result[f"ema{period}"] = _safe(close.ewm(span=period, adjust=False).mean().iloc[-1])

    # ── Trend ──────────────────────────────────────────────────────────────
    ema9 = result.get("ema9") or 0
    ema21 = result.get("ema21") or 0
    ema50 = result.get("ema50") or 0
    if ema9 > ema21 > ema50:
        trend = "UPTREND"
    elif ema9 < ema21 < ema50:
        trend = "DOWNTREND"
    else:
        trend = "SIDEWAYS"
    result["trend"] = trend

    # ── ATR / Volatility ───────────────────────────────────────────────────
    if ta:
        atr_s = ta.atr(high, low, close, length=14)
        atr_val = _safe(atr_s.iloc[-1]) if atr_s is not None else None
    else:
        tr = pd.Series(
            np.maximum.reduce([
                (high - low).values,
                (high - close.shift()).abs().values,
                (low - close.shift()).abs().values,
            ]),
            index=close.index,
        )
        atr_val = _safe(tr.rolling(14).mean().iloc[-1])
    result["atr"] = atr_val
    result["volatility"] = round((atr_val / current_price) * 100, 4) if atr_val else None

    # ── Support & Resistance ───────────────────────────────────────────────
    window = min(50, len(df))
    result["support"] = _safe(low.rolling(window).min().iloc[-1])
    result["resistance"] = _safe(high.rolling(window).max().iloc[-1])

    # ── Volume ─────────────────────────────────────────────────────────────
    result["volume"] = _safe(volume.iloc[-1])
    vol_mean = volume.rolling(20).mean().iloc[-1]
    result["volume_change"] = (
        round(((float(volume.iloc[-1]) - float(vol_mean)) / float(vol_mean)) * 100, 2)
        if vol_mean and vol_mean != 0
        else None
    )

    # ── Momentum (ROC) ─────────────────────────────────────────────────────
    if ta:
        roc_s = ta.roc(close, length=10)
        result["momentum"] = _safe(roc_s.iloc[-1]) if roc_s is not None else None
    else:
        result["momentum"] = _safe(
            ((close.iloc[-1] - close.iloc[-10]) / close.iloc[-10]) * 100
            if len(close) >= 10
            else None
        )

    # ── Moving Averages ────────────────────────────────────────────────────
    result["sma20"] = _safe(close.rolling(20).mean().iloc[-1])
    result["sma50"] = _safe(close.rolling(50).mean().iloc[-1])

    # ── Advanced Institutional Indicators ──────────────────────────────────
    if ta:
        try:
            # Bollinger Bands
            bb_df = ta.bbands(close, length=20, std=2)
            if bb_df is not None and not bb_df.empty:
                result["bb_lower"] = _safe(bb_df.iloc[-1, 0])
                result["bb_mid"] = _safe(bb_df.iloc[-1, 1])
                result["bb_upper"] = _safe(bb_df.iloc[-1, 2])

            # ADX (Trend Strength)
            adx_df = ta.adx(high, low, close, length=14)
            if adx_df is not None and not adx_df.empty:
                result["adx"] = _safe(adx_df.iloc[-1, 0])

            # StochRSI
            stoch_df = ta.stochrsi(close, length=14, rsi_length=14, k=3, d=3)
            if stoch_df is not None and not stoch_df.empty:
                result["stochrsi_k"] = _safe(stoch_df.iloc[-1, 0])
                result["stochrsi_d"] = _safe(stoch_df.iloc[-1, 1])

            # OBV
            obv_s = ta.obv(close, volume)
            if obv_s is not None:
                result["obv"] = _safe(obv_s.iloc[-1])

            # Ichimoku Cloud
            ich_df, _ = ta.ichimoku(high, low, close)
            if ich_df is not None and not ich_df.empty:
                result["ichimoku_tenkan"] = _safe(ich_df.iloc[-1, 0])
                result["ichimoku_kijun"] = _safe(ich_df.iloc[-1, 1])
                result["ichimoku_senkou_a"] = _safe(ich_df.iloc[-1, 2])
                result["ichimoku_senkou_b"] = _safe(ich_df.iloc[-1, 3])
        except Exception as e:
            logger.warning("Error calculating advanced TA: %s", e)

    # Rolling VWAP Approximation (does not require datetime index anchoring)
    try:
        tp = (high + low + close) / 3
        vol_sum = volume.rolling(50).sum()
        vwap_s = (tp * volume).rolling(50).sum() / vol_sum
        result["vwap"] = _safe(vwap_s.iloc[-1])
    except Exception:
        pass

    # ── Signal history candles (last 50) ───────────────────────────────────
    result["candles"] = candles[-50:]

    return result
