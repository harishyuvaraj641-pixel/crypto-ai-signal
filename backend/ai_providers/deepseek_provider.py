import httpx
import json
import logging
from typing import Optional, Callable
from ai_providers.base import BaseAIProvider, PredictionResult

logger = logging.getLogger(__name__)


class DeepSeekProvider(BaseAIProvider):
    BASE_URL = "https://api.deepseek.com/v1"

    async def predict(self, market_data: dict, on_chunk: Optional[Callable[[str], None]] = None) -> PredictionResult:
        prompt = self.build_prompt(market_data)
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "You are an expert crypto trading analyst."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
            "max_tokens": 1024,
            "stream": True,
        }
        
        full_text = ""
        async with httpx.AsyncClient(timeout=60) as client:
            async with client.stream(
                "POST", 
                f"{self.BASE_URL}/chat/completions", 
                headers=headers, 
                json=payload
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        chunk_str = line[6:].strip()
                        if chunk_str == "[DONE]":
                            break
                        try:
                            data = json.loads(chunk_str)
                            if "choices" in data and len(data["choices"]) > 0:
                                delta = data["choices"][0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    full_text += content
                                    if on_chunk:
                                        await on_chunk(full_text)
                        except Exception:
                            pass
                            
        return self.parse_response(full_text)
