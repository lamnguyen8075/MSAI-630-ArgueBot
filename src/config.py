"""Application configuration loaded from environment variables."""

from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()

DEFAULT_MODEL = "llama-3.3-70b-versatile"
DEFAULT_TIMEOUT = 120
MAX_RETRIES = 5
# Free Groq tier (~12K TPM): space requests to stay under the limit.
DEFAULT_REQUEST_DELAY = 12


@dataclass(frozen=True)
class AgentTemperatures:
    """Per-agent temperature settings — lower for judge/moderator reduces drift."""

    proponent: float = 0.7
    opponent: float = 0.7
    moderator: float = 0.2
    judge: float = 0.1


@dataclass(frozen=True)
class AppConfig:
    """Runtime configuration for ArgueBot."""

    groq_api_key: str | None
    groq_model: str
    timeout_seconds: int
    max_retries: int
    request_delay_seconds: float
    temperatures: AgentTemperatures

    @property
    def has_api_key(self) -> bool:
        return bool(self.groq_api_key and self.groq_api_key.strip())


def load_config() -> AppConfig:
    """Load configuration from environment variables."""
    return AppConfig(
        groq_api_key=os.getenv("GROQ_API_KEY"),
        groq_model=os.getenv("GROQ_MODEL", DEFAULT_MODEL),
        timeout_seconds=int(os.getenv("GROQ_TIMEOUT", str(DEFAULT_TIMEOUT))),
        max_retries=int(os.getenv("GROQ_MAX_RETRIES", str(MAX_RETRIES))),
        request_delay_seconds=float(
            os.getenv("GROQ_REQUEST_DELAY", str(DEFAULT_REQUEST_DELAY))
        ),
        temperatures=AgentTemperatures(
            proponent=float(os.getenv("TEMP_PROPONENT", "0.7")),
            opponent=float(os.getenv("TEMP_OPPONENT", "0.7")),
            moderator=float(os.getenv("TEMP_MODERATOR", "0.2")),
            judge=float(os.getenv("TEMP_JUDGE", "0.1")),
        ),
    )
