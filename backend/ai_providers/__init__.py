"""AI provider factory and registry."""
from ai_providers.openai_provider import OpenAIProvider
from ai_providers.gemini_provider import GeminiProvider
from ai_providers.claude_provider import ClaudeProvider
from ai_providers.deepseek_provider import DeepSeekProvider
from ai_providers.perplexity_provider import PerplexityProvider
from ai_providers.nemotron_provider import NemotronProvider
from ai_providers.nvidia_provider import NvidiaProvider
from ai_providers.openrouter_provider import OpenRouterProvider
from ai_providers.base import BaseAIProvider

PROVIDER_MAP = {
    "openai": OpenAIProvider,
    "gemini": GeminiProvider,
    "claude": ClaudeProvider,
    "deepseek": DeepSeekProvider,
    "perplexity": PerplexityProvider,
    "nemotron": NemotronProvider,
    "nvidia": NvidiaProvider,
    "openrouter": OpenRouterProvider,
}


def get_provider(provider_id: str, api_key: str, model: str) -> BaseAIProvider:
    cls = PROVIDER_MAP.get(provider_id.lower())
    if not cls:
        raise ValueError(f"Unknown provider: {provider_id}. Available: {list(PROVIDER_MAP.keys())}")
    return cls(api_key=api_key, model=model)
