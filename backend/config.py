"""Application configuration and constants."""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "CryptoAI Signal"
    VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Binance
    BINANCE_WS_BASE: str = "wss://stream.binance.com:9443/stream"
    BINANCE_REST_BASE: str = "https://api.binance.com"

    # Database
    DB_PATH: str = "signals.db"

    # Default coins and timeframes
    DEFAULT_COINS: List[str] = [
        "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"
    ]
    DEFAULT_TIMEFRAMES: List[str] = ["1m", "3m", "5m", "15m", "1h", "4h", "1d"]

    CANDLE_LIMIT: int = 1000  # fetch enough to support robust resampling of timeframes

    # AI Providers
    AI_PROVIDERS: dict = {
        "openai": {
            "name": "OpenAI",
            "base_url": "https://api.openai.com/v1",
            "models": ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
        },
        "gemini": {
            "name": "Google Gemini",
            "base_url": "https://generativelanguage.googleapis.com/v1beta",
            "models": ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash"],
        },
        "claude": {
            "name": "Anthropic Claude",
            "base_url": "https://api.anthropic.com/v1",
            "models": ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"],
        },
        "deepseek": {
            "name": "DeepSeek",
            "base_url": "https://api.deepseek.com/v1",
            "models": ["deepseek-chat", "deepseek-reasoner"],
        },
        "perplexity": {
            "name": "Perplexity",
            "base_url": "https://api.perplexity.ai",
            "models": ["llama-3.1-sonar-large-128k-online", "llama-3.1-sonar-small-128k-online"],
        },
        "nemotron": {
            "name": "NVIDIA Nemotron",
            "base_url": "https://integrate.api.nvidia.com/v1",
            "models": ["nvidia/llama-3.1-nemotron-70b-instruct"],
        },
        "nvidia": {
            "name": "NVIDIA API",
            "base_url": "https://integrate.api.nvidia.com/v1",
            "models": [
                "deepseek-ai/deepseek-v3.2",
                "meta/llama-3.1-70b-instruct",
                "mistralai/mistral-large-2-instruct",
                "nvidia/llama-3.1-nemotron-70b-instruct",
            ],
        },
        "openrouter": {
            "name": "OpenRouter",
            "base_url": "https://openrouter.ai/api/v1",
            "models": [
                "google/gemini-2.0-flash-lite-preview-02-05:free",
                "meta-llama/llama-3.3-70b-instruct:free",
                "nvidia/nemotron-3-super-120b-a12b:free",
                "openai/gpt-4o",
                "anthropic/claude-3.5-sonnet",
                "deepseek/deepseek-chat",
                "mistralai/mistral-large",
                "nousresearch/hermes-3-llama-3.1-405b",
            ],
        },
    }

    class Config:
        env_file = ".env"


settings = Settings()
