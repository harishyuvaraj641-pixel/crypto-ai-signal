import httpx
import logging
from typing import Optional, Callable
from ai_providers.base import BaseAIProvider, PredictionResult

logger = logging.getLogger(__name__)


class GeminiProvider(BaseAIProvider):
    BASE_URL = "https://generativelanguage.googleapis.com/v1beta"

    async def predict(self, market_data: dict, on_chunk: Optional[Callable[[str], None]] = None) -> PredictionResult:
        prompt = self.build_prompt(market_data)
        url = f"{self.BASE_URL}/models/{self.model}:generateContent?key={self.api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 2048},
        }
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
        return self.parse_response(text)
