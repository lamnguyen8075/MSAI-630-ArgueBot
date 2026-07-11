"""In-memory debate session manager for the API layer."""

from __future__ import annotations

import asyncio
import logging
import threading
from pathlib import Path
from typing import Any
from uuid import uuid4

from src.config import AppConfig, load_config
from src.models import DebateConfig, DebateState, DebateStatus
from src.orchestrator import DebateOrchestrator
from src.utils import export_debate_json, export_transcript_markdown

logger = logging.getLogger("arguebot.api")

ROOT = Path(__file__).parent.parent
SAMPLE_PATH = ROOT / "examples" / "sample_debate.json"


class DebateSession:
    """Tracks a single debate run and its WebSocket subscribers."""

    def __init__(self, debate_id: str, config: AppConfig) -> None:
        self.debate_id = debate_id
        self.app_config = config
        self.orchestrator = DebateOrchestrator(config)
        self.state: DebateState | None = None
        self.error: str | None = None
        self._thread: threading.Thread | None = None
        self._subscribers: list[asyncio.Queue[dict[str, Any]]] = []
        self._lock = threading.Lock()
        self._loop: asyncio.AbstractEventLoop | None = None

    def subscribe(self, queue: asyncio.Queue[dict[str, Any]]) -> None:
        with self._lock:
            self._subscribers.append(queue)
            if self.state is not None:
                queue.put_nowait(self._event("update", self.state))

    def unsubscribe(self, queue: asyncio.Queue[dict[str, Any]]) -> None:
        with self._lock:
            if queue in self._subscribers:
                self._subscribers.remove(queue)

    def set_event_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    def _event(self, event_type: str, state: DebateState | None = None) -> dict[str, Any]:
        payload: dict[str, Any] = {"type": event_type, "debate_id": self.debate_id}
        if state is not None:
            payload["state"] = state.model_dump(mode="json")
        if self.error:
            payload["error"] = self.error
        return payload

    def _broadcast(self, event_type: str, state: DebateState | None = None) -> None:
        event = self._event(event_type, state)
        with self._lock:
            subscribers = list(self._subscribers)
        if self._loop is None:
            return
        for queue in subscribers:
            asyncio.run_coroutine_threadsafe(queue.put(event), self._loop)

    def start(self, debate_config: DebateConfig) -> None:
        """Start debate execution in a background thread."""

        def on_turn(state: DebateState) -> None:
            self.state = state
            self._broadcast("update", state)

        def run() -> None:
            try:
                self.orchestrator.set_turn_callback(on_turn)
                self.state = self.orchestrator.initialize(debate_config)
                self.state.status = DebateStatus.RUNNING
                self._broadcast("started", self.state)
                final = self.orchestrator.run_debate(debate_config)
                self.state = final
                event = "completed" if final.status == DebateStatus.COMPLETED else "stopped"
                self._broadcast(event, final)
            except Exception as exc:
                logger.exception("Debate %s failed", self.debate_id)
                self.error = str(exc)
                if self.state:
                    self.state.status = DebateStatus.ERROR
                self._broadcast("error", self.state)

        self._thread = threading.Thread(target=run, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self.orchestrator.request_stop()

    def load_demo(self) -> DebateState:
        self.state = DebateOrchestrator.load_demo_state(str(SAMPLE_PATH))
        self.state.debate_id = self.debate_id
        return self.state


class DebateManager:
    """Registry of active and completed debate sessions."""

    def __init__(self) -> None:
        self._sessions: dict[str, DebateSession] = {}
        self._config = load_config()

    @property
    def config(self) -> AppConfig:
        return self._config

    def has_running_live_debate(self) -> bool:
        for session in self._sessions.values():
            if session.state and session.state.status == DebateStatus.RUNNING:
                return True
        return False

    def create_session(self) -> DebateSession:
        debate_id = str(uuid4())
        session = DebateSession(debate_id, self._config)
        self._sessions[debate_id] = session
        return session

    def get_session(self, debate_id: str) -> DebateSession | None:
        return self._sessions.get(debate_id)

    def create_demo_session(self) -> DebateSession:
        session = self.create_session()
        session.load_demo()
        return session

    def export_markdown(self, debate_id: str) -> str:
        session = self._require_session(debate_id)
        if not session.state:
            raise ValueError("No debate state available.")
        return export_transcript_markdown(session.state.model_dump(mode="json"))

    def export_json(self, debate_id: str) -> str:
        session = self._require_session(debate_id)
        if not session.state:
            raise ValueError("No debate state available.")
        return export_debate_json(session.state.model_dump(mode="json"))

    def _require_session(self, debate_id: str) -> DebateSession:
        session = self.get_session(debate_id)
        if not session:
            raise KeyError(f"Debate {debate_id} not found.")
        return session


manager = DebateManager()
