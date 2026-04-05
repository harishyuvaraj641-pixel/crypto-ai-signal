import httpx
import json
import logging
from typing import Optional, Callable
from ai_providers.base import BaseAIProvider, PredictionResult

logger = logging.getLogger(__name__)


class NvidiaProvider(BaseAIProvider):
    BASE_URL = "https://integrate.api.nvidia.com/v1"

    async def predict(self, market_data: dict, on_chunk: Optional[Callable[[str], None]] = None) -> PredictionResult:
        prompt = self.build_prompt(market_data)
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert crypto trading analyst.",
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 1.0,
            "top_p": 0.95,
            "max_tokens": 8192,
            "stream": True,
        }

        # Enable thinking mode for DeepSeek models specifically on NVIDIA
        if "deepseek" in self.model.lower():
            payload["extra_body"] = {"chat_template_kwargs": {"thinking": True}}

        full_text = ""
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream(
                "POST",
                f"{self.BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        chunk = line[6:].strip()
                        if chunk == "[DONE]":
                            break
                        try:
                            data = json.loads(chunk)
                            delta = data["choices"][0]["delta"]
                            
                            # Capture both reasoning and standard content
                            reasoning = delta.get("reasoning_content")
                            content = delta.get("content")
                            
                            chunk_text = (reasoning or "") + (content or "")
                            
                            if chunk_text:
                                full_text += chunk_text
                                if on_chunk:
                                    await on_chunk(full_text)
                        except Exception:
                            pass

        logger.debug("NVIDIA raw: %s", full_text[:300])
        return self.parse_response(full_text)
