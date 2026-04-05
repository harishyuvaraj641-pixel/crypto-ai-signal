"""OpenRouter API provider (access to 100+ models)."""
import httpx
import json
import logging
from typing import Optional, Callable
from ai_providers.base import BaseAIProvider, PredictionResult

logger = logging.getLogger(__name__)


class OpenRouterProvider(BaseAIProvider):
    BASE_URL = "https://openrouter.ai/api/v1"

    async def predict(self, market_data: dict, on_chunk: Optional[Callable[[str], None]] = None) -> PredictionResult:
        prompt = self.build_prompt(market_data)
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://cryptoai.signal",
            "X-Title": "CryptoAI Signal",
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
            "temperature": 0.2,
            "max_tokens": 4096,
            "stream": True,
            "reasoning": {"enabled": True},
            "provider": {"sort": "throughput"}
        }
        
        full_text = ""
        reasoning_tokens = 0
        
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream(
                "POST",
                f"{self.BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
            ) as resp:
                if resp.status_code >= 400:
                    await resp.aread()  # Force read before closing stream context
                    resp.raise_for_status()

                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        chunk_str = line[6:].strip()
                        if chunk_str == "[DONE]":
                            break
                        try:
                            chunk = json.loads(chunk_str)
                            
                            if "choices" in chunk and len(chunk["choices"]) > 0:
                                delta = chunk["choices"][0].get("delta", {})
                                content = delta.get("content", "") or ""
                                reasoning = delta.get("reasoning", "") or ""
                                chunk_text = reasoning + content
                                
                                if chunk_text:
                                    full_text += chunk_text
                                    if on_chunk:
                                        await on_chunk(full_text)
                                        
                            if "usage" in chunk and chunk["usage"]:
                                # JS SDK might map to camelCase, check both just in case
                                usage = chunk["usage"]
                                reasoning_tokens = usage.get("reasoningTokens", usage.get("reasoning_tokens", 0))
                        except Exception:
                            pass

        logger.debug("OpenRouter raw: %s", full_text[:300])
        if reasoning_tokens > 0:
            logger.info("OpenRouter reasoning tokens used: %d", reasoning_tokens)
            
        return self.parse_response(full_text)
