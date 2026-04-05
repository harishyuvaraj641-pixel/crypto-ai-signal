import httpx
import logging
from typing import Optional, Callable
from ai_providers.base import BaseAIProvider, PredictionResult

logger = logging.getLogger(__name__)


class ClaudeProvider(BaseAIProvider):
    BASE_URL = "https://api.anthropic.com/v1"

    async def predict(self, market_data: dict, on_chunk: Optional[Callable[[str], None]] = None) -> PredictionResult:
        prompt = self.build_prompt(market_data)
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "max_tokens": 1024,
            "messages": [{"role": "user", "content": prompt}],
            "system": "You are an expert crypto trading analyst.",
        }
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(f"{self.BASE_URL}/messages", headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            text = data["content"][0]["text"]
        return self.parse_response(text)
