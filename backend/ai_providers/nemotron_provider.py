"""NVIDIA Nemotron provider (reuses NVIDIA endpoint)."""
from ai_providers.nvidia_provider import NvidiaProvider


class NemotronProvider(NvidiaProvider):
    """Nemotron uses the same NVIDIA API endpoint."""
    pass
