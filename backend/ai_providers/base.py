"""Abstract base AI provider."""
import json
import re
from abc import ABC, abstractmethod
from typing import Optional, Callable


class PredictionResult:
    def __init__(self, signal: str, confidence: int, prediction_time: str, reason: str):
        self.signal = signal.upper()
        self.confidence = max(0, min(100, int(confidence)))
        self.prediction_time = prediction_time
        self.reason = reason

    def to_dict(self) -> dict:
        return {
            "signal": self.signal,
            "confidence": self.confidence,
            "prediction_time": self.prediction_time,
            "reason": self.reason,
        }


class BaseAIProvider(ABC):
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

    @abstractmethod
    async def predict(self, market_data: dict, on_chunk: Optional[Callable[[str], None]] = None) -> PredictionResult:
        pass

    def build_prompt(self, d: dict) -> str:
        return f"""Analyze the following cryptocurrency market data and predict the short-term price movement.
First, provide your comprehensive, step-by-step market reasoning and analytical breakdown.
Finally, append a JSON block with your final decision.

Required JSON fields: signal (BUY/SELL/HOLD), confidence (0-100), prediction_time (string), reason (short 1-sentence summary)

Market Data:
Coin: {d.get('symbol', 'N/A')}
Price: {d.get('price', 'N/A')}
Volume: {d.get('volume', 'N/A')}
Volume Change: {d.get('volume_change', 'N/A')}%
RSI: {d.get('rsi', 'N/A')}
MACD: {d.get('macd', 'N/A')}
MACD Signal: {d.get('macd_signal', 'N/A')}
MACD Histogram: {d.get('macd_hist', 'N/A')}
EMA9: {d.get('ema9', 'N/A')}
EMA21: {d.get('ema21', 'N/A')}
EMA50: {d.get('ema50', 'N/A')}
SMA20: {d.get('sma20', 'N/A')}
Trend: {d.get('trend', 'N/A')}
Volatility: {d.get('volatility', 'N/A')}%
ATR: {d.get('atr', 'N/A')}
VWAP (Rolling): {d.get('vwap', 'N/A')}
Bollinger Bands: Lower {d.get('bb_lower', 'N/A')} | Mid {d.get('bb_mid', 'N/A')} | Upper {d.get('bb_upper', 'N/A')}
ADX (Trend Strength): {d.get('adx', 'N/A')}
Stochastic RSI: K={d.get('stochrsi_k', 'N/A')} D={d.get('stochrsi_d', 'N/A')}
OBV (Smart Money Volume): {d.get('obv', 'N/A')}
Ichimoku Cloud: Tenkan={d.get('ichimoku_tenkan', 'N/A')} | Kijun={d.get('ichimoku_kijun', 'N/A')} | SenkouA={d.get('ichimoku_senkou_a', 'N/A')} | SenkouB={d.get('ichimoku_senkou_b', 'N/A')}
Support: {d.get('support', 'N/A')}
Resistance: {d.get('resistance', 'N/A')}
Momentum (ROC): {d.get('momentum', 'N/A')}
Timeframe: {d.get('timeframe', 'N/A')}
Current Time: {d.get('current_time', 'N/A')}
Next Candle Time: {d.get('next_candle_time', 'N/A')}
Timestamp: {d.get('timestamp', 'N/A')}

Return exactly this format:
[Your text reasoning and analysis...]
```json
{{"signal": "BUY", "confidence": 87, "prediction_time": "Next 5 minutes candle", "reason": "..."}}
```"""

    @staticmethod
    def parse_response(text: str) -> PredictionResult:
        """Extract JSON from AI response text."""
        # Try direct parse
        try:
            data = json.loads(text.strip())
            return PredictionResult(**data)
        except Exception:
            pass

        # Try extracting JSON block from markdown/text
        patterns = [
            r'```json\s*(\{.*?\})\s*```',
            r'```\s*(\{.*?\})\s*```',
            r'(\{[^{}]*"signal"[^{}]*\})',
        ]
        for pat in patterns:
            match = re.search(pat, text, re.DOTALL | re.IGNORECASE)
            if match:
                try:
                    data = json.loads(match.group(1))
                    return PredictionResult(
                        signal=data.get("signal", "HOLD"),
                        confidence=data.get("confidence", 50),
                        prediction_time=data.get("prediction_time", "Unknown"),
                        reason=data.get("reason", "No reason provided"),
                    )
                except Exception:
                    pass

        # Fallback
        raise ValueError(f"Could not parse AI response. Raw output: {text[:200]}...")
