"""Groq client wrapper, logging, and export utilities."""

from __future__ import annotations

import json
import logging
import re
import time
from typing import Any, TypeVar

from groq import (
    APIConnectionError,
    APITimeoutError,
    BadRequestError,
    Groq,
    NotFoundError,
    RateLimitError,
)
from pydantic import BaseModel, ValidationError

from src.config import AppConfig

logger = logging.getLogger("arguebot")

T = TypeVar("T", bound=BaseModel)


def setup_logging(level: int = logging.INFO) -> None:
    """Configure standard Python logging for ArgueBot."""
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


class LLMClient:
    """
    Reusable Groq client wrapper with retry, timeout, and structured parsing.

    Design choice: central API wrapper separates LLM calls from orchestration.
    All agents (Proponent, Opponent, Moderator, Judge) share this interface.
    """

    def __init__(self, config: AppConfig) -> None:
        self.config = config
        self.model = config.groq_model
        self.timeout = config.timeout_seconds
        self.max_retries = config.max_retries
        self._client: Groq | None = None
        if config.has_api_key:
            self._client = Groq(
                api_key=config.groq_api_key,
                timeout=self.timeout,
                max_retries=0,
            )

    @property
    def is_available(self) -> bool:
        return self._client is not None

    def generate_text(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7,
    ) -> str:
        """Generate a text response from the language model."""
        if not self._client:
            raise RuntimeError(
                "Groq API key is not configured. Set GROQ_API_KEY or use Demo Mode."
            )
        last_error: Exception | None = None
        for attempt in range(self.max_retries + 1):
            try:
                response = self._client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=temperature,
                )
                content = response.choices[0].message.content
                if not content:
                    raise ValueError("Empty response from model.")
                return content.strip()
            except RateLimitError as exc:
                last_error = exc
                logger.warning("Rate limit hit (attempt %d): %s", attempt + 1, exc)
                if attempt < self.max_retries:
                    time.sleep(2 ** attempt)
            except (APITimeoutError, APIConnectionError) as exc:
                last_error = exc
                logger.warning("Network error (attempt %d): %s", attempt + 1, exc)
                if attempt < self.max_retries:
                    time.sleep(2 ** attempt)
            except NotFoundError as exc:
                raise RuntimeError(
                    f"Invalid model name '{self.model}'. Check GROQ_MODEL."
                ) from exc
            except BadRequestError as exc:
                error_msg = str(exc).lower()
                if "model" in error_msg and (
                    "not found" in error_msg
                    or "invalid" in error_msg
                    or "does not exist" in error_msg
                ):
                    raise RuntimeError(
                        f"Invalid model name '{self.model}'. Check GROQ_MODEL."
                    ) from exc
                last_error = exc
                logger.error("Bad request: %s", exc)
                if attempt >= self.max_retries:
                    raise RuntimeError(f"API request failed: {exc}") from exc
            except Exception as exc:
                last_error = exc
                logger.error("API request failed: %s", exc)
                if attempt < self.max_retries:
                    time.sleep(1)
                else:
                    raise RuntimeError(f"API request failed: {exc}") from exc
        raise RuntimeError(f"API request failed after retries: {last_error}")

    def generate_structured(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        response_model: type[T],
        temperature: float = 0.1,
    ) -> T:
        """Generate and parse structured JSON output using Pydantic validation."""
        if not self._client:
            raise RuntimeError(
                "Groq API key is not configured. Set GROQ_API_KEY or use Demo Mode."
            )
        schema = response_model.model_json_schema()
        schema_instruction = (
            f"\n\nRespond with valid JSON matching this schema:\n"
            f"{json.dumps(schema, indent=2)}"
        )
        last_error: Exception | None = None
        for attempt in range(self.max_retries + 1):
            try:
                response = self._client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt + schema_instruction},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=temperature,
                    response_format={"type": "json_object"},
                )
                raw = response.choices[0].message.content
                if not raw:
                    raise ValueError("Empty structured response from model.")
                parsed = _parse_json_response(raw)
                return response_model.model_validate(parsed)
            except ValidationError as exc:
                last_error = exc
                logger.warning(
                    "Structured output validation failed (attempt %d): %s",
                    attempt + 1,
                    exc,
                )
                if attempt >= self.max_retries:
                    raise RuntimeError(
                        f"Structured output malformed after retries: {exc}"
                    ) from exc
            except RateLimitError as exc:
                last_error = exc
                logger.warning("Rate limit hit (attempt %d): %s", attempt + 1, exc)
                if attempt < self.max_retries:
                    time.sleep(2 ** attempt)
            except (APITimeoutError, APIConnectionError) as exc:
                last_error = exc
                logger.warning("Network error (attempt %d): %s", attempt + 1, exc)
                if attempt < self.max_retries:
                    time.sleep(2 ** attempt)
            except NotFoundError as exc:
                raise RuntimeError(
                    f"Invalid model name '{self.model}'. Check GROQ_MODEL."
                ) from exc
            except BadRequestError as exc:
                error_msg = str(exc).lower()
                if "model" in error_msg and (
                    "not found" in error_msg
                    or "invalid" in error_msg
                    or "does not exist" in error_msg
                ):
                    raise RuntimeError(
                        f"Invalid model name '{self.model}'. Check GROQ_MODEL."
                    ) from exc
                last_error = exc
                logger.error("Structured generation bad request: %s", exc)
                if attempt >= self.max_retries:
                    raise RuntimeError(f"Structured generation failed: {exc}") from exc
            except Exception as exc:
                last_error = exc
                logger.error("Structured generation failed: %s", exc)
                if attempt >= self.max_retries:
                    raise RuntimeError(f"Structured generation failed: {exc}") from exc
        raise RuntimeError(f"Structured generation failed: {last_error}")


def _parse_json_response(raw: str) -> dict[str, Any]:
    """Extract JSON from model response, handling markdown fences."""
    text = raw.strip()
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence_match:
        text = fence_match.group(1).strip()
    return json.loads(text)


def export_transcript_markdown(state: dict[str, Any]) -> str:
    """Export debate as Markdown transcript."""
    lines = [
        f"# ArgueBot Debate Transcript",
        "",
        f"**Motion:** {state.get('topic', 'N/A')}",
        f"**Style:** {state.get('style', 'N/A')}",
        f"**Debate ID:** {state.get('debate_id', 'N/A')}",
        "",
        "---",
        "",
    ]
    for msg in state.get("messages", []):
        agent = msg.get("agent", "Unknown")
        rnd = msg.get("round_number", "?")
        rnd_name = msg.get("round_name", "")
        content = msg.get("content", "")
        status = "✓" if msg.get("role_check_passed", True) else "⚠ role issue"
        lines.extend([
            f"## Round {rnd}: {rnd_name}",
            f"### {agent} {status}",
            "",
            content,
            "",
            "---",
            "",
        ])
    verdict = state.get("final_verdict")
    if verdict:
        lines.extend([
            "## Final Verdict",
            "",
            f"**Winner:** {verdict.get('winner', 'N/A')}",
            f"**Proponent Score:** {verdict.get('proponent_final_score', 0)}",
            f"**Opponent Score:** {verdict.get('opponent_final_score', 0)}",
            "",
            verdict.get("decision_summary", ""),
            "",
        ])
    return "\n".join(lines)


def export_debate_json(state: dict[str, Any]) -> str:
    """Export debate record as formatted JSON string."""
    return json.dumps(state, indent=2, default=str)
