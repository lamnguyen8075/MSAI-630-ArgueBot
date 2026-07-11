"""Simple hardcoded login and per-user live debate limits."""

from __future__ import annotations

import json
import secrets
import threading
from pathlib import Path

from fastapi import Header, HTTPException

MAX_LIVE_TESTS = 2

# Team accounts — 2 live debates each
ACCOUNTS: dict[str, str] = {
    "banana": "banana1",
    "orange": "orange1",
    "apple": "apple1",
    "grape": "grape1",
    "lam": "lam1",
}

# Master account — unlimited live debates
MASTER_USERS = {"lam"}

USAGE_FILE = Path(__file__).parent / "usage_store.json"
_lock = threading.Lock()
_sessions: dict[str, str] = {}  # token -> username
_usage: dict[str, int] = {}  # username -> live debate count


def _load_usage() -> None:
    global _usage
    if USAGE_FILE.exists():
        try:
            _usage = json.loads(USAGE_FILE.read_text())
        except (json.JSONDecodeError, OSError):
            _usage = {}


def _save_usage() -> None:
    USAGE_FILE.parent.mkdir(parents=True, exist_ok=True)
    USAGE_FILE.write_text(json.dumps(_usage, indent=2))


_load_usage()


def is_master(username: str) -> bool:
    return username in MASTER_USERS


def login(username: str, password: str) -> dict:
    user = username.strip().lower()
    if user not in ACCOUNTS or ACCOUNTS[user] != password:
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    token = secrets.token_urlsafe(24)
    with _lock:
        _sessions[token] = user

    return _auth_payload(user, token)


def logout(token: str) -> None:
    with _lock:
        _sessions.pop(token, None)


def remaining_tests(username: str) -> int | None:
    if is_master(username):
        return None
    used = _usage.get(username, 0)
    return max(0, MAX_LIVE_TESTS - used)


def user_info(username: str) -> dict:
    return _auth_payload(username)


def _auth_payload(username: str, token: str | None = None) -> dict:
    master = is_master(username)
    payload = {
        "username": username,
        "is_master": master,
        "remaining_live_tests": remaining_tests(username),
        "max_live_tests": None if master else MAX_LIVE_TESTS,
        "live_tests_used": _usage.get(username, 0),
    }
    if token is not None:
        payload["token"] = token
    return payload


def require_user(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Login required.")

    token = authorization.removeprefix("Bearer ").strip()
    with _lock:
        username = _sessions.get(token)

    if not username:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")

    return username


def consume_live_test(username: str) -> None:
    if is_master(username):
        return

    with _lock:
        used = _usage.get(username, 0)
        if used >= MAX_LIVE_TESTS:
            raise HTTPException(
                status_code=403,
                detail=f"No live tests remaining. Each account gets {MAX_LIVE_TESTS} live debates.",
            )
        _usage[username] = used + 1
        _save_usage()
