"""FastAPI application exposing ArgueBot to the React frontend."""

from __future__ import annotations

import asyncio
import os
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from api.auth import consume_live_test, login, logout, require_user, user_info
from api.debate_manager import manager
from src.models import DebateConfig, DebateStyle, ResponseLength
from src.utils import setup_logging

setup_logging()


def _cors_origins() -> list[str]:
    origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "https://lamnguyen8075.github.io",
    ]
    extra = os.getenv("CORS_ORIGINS", "")
    if extra:
        origins.extend(origin.strip() for origin in extra.split(",") if origin.strip())
    return origins


app = FastAPI(title="ArgueBot API", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StartDebateRequest(BaseModel):
    topic: str = Field(..., min_length=10)
    background_context: str = ""
    style: DebateStyle = DebateStyle.ACADEMIC
    configured_rounds: int = Field(default=6, ge=6, le=6)
    response_length: ResponseLength = ResponseLength.CONCISE
    stress_test: bool = False


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


@app.post("/api/auth/login")
def auth_login(req: LoginRequest) -> dict:
    return login(req.username, req.password)


@app.get("/api/auth/me")
def auth_me(username: str = Depends(require_user)) -> dict:
    return user_info(username)


@app.post("/api/auth/logout")
def auth_logout_endpoint(authorization: str | None = Header(default=None)) -> dict:
    if authorization and authorization.startswith("Bearer "):
        logout(authorization.removeprefix("Bearer ").strip())
    return {"status": "ok"}


@app.get("/api/health")
def health() -> dict:
    cfg = manager.config
    return {
        "status": "ok",
        "has_api_key": cfg.has_api_key,
        "model": cfg.groq_model,
        "auth_enabled": True,
        "revision": "2026-07-10-restart",
    }


@app.post("/api/debates/start")
def start_debate(req: StartDebateRequest, username: str = Depends(require_user)) -> dict:
    if not manager.config.has_api_key:
        raise HTTPException(
            status_code=400,
            detail="Groq API key is not configured. Use Demo Mode or set GROQ_API_KEY.",
        )
    consume_live_test(username)
    try:
        debate_config = DebateConfig(
            topic=req.topic,
            background_context=req.background_context,
            style=req.style,
            configured_rounds=req.configured_rounds,
            response_length=req.response_length,
            stress_test=req.stress_test,
        )
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    session = manager.create_session()
    session.start(debate_config)
    return {"debate_id": session.debate_id}


@app.post("/api/debates/demo")
def load_demo() -> dict:
    session = manager.create_demo_session()
    return {
        "debate_id": session.debate_id,
        "state": session.state.model_dump(mode="json") if session.state else None,
    }


@app.get("/api/debates/{debate_id}")
def get_debate(debate_id: str) -> dict:
    session = manager.get_session(debate_id)
    if not session or not session.state:
        raise HTTPException(status_code=404, detail="Debate not found.")
    return session.state.model_dump(mode="json")


@app.post("/api/debates/{debate_id}/stop")
def stop_debate(debate_id: str) -> dict:
    session = manager.get_session(debate_id)
    if not session:
        raise HTTPException(status_code=404, detail="Debate not found.")
    session.stop()
    return {"status": "stop_requested"}


@app.get("/api/debates/{debate_id}/export/markdown", response_class=PlainTextResponse)
def export_markdown(debate_id: str) -> str:
    try:
        return manager.export_markdown(debate_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/debates/{debate_id}/export/json", response_class=PlainTextResponse)
def export_json(debate_id: str) -> str:
    try:
        return manager.export_json(debate_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.websocket("/ws/debate/{debate_id}")
async def debate_websocket(websocket: WebSocket, debate_id: str) -> None:
    session = manager.get_session(debate_id)
    if not session:
        await websocket.close(code=4004)
        return

    await websocket.accept()
    queue: asyncio.Queue = asyncio.Queue()
    session.set_event_loop(asyncio.get_running_loop())
    session.subscribe(queue)

    try:
        if session.state:
            await websocket.send_json(
                {"type": "update", "debate_id": debate_id, "state": session.state.model_dump(mode="json")}
            )
        while True:
            event = await queue.get()
            await websocket.send_json(event)
            if event.get("type") in ("completed", "stopped", "error"):
                break
    except WebSocketDisconnect:
        pass
    finally:
        session.unsubscribe(queue)


# Serve built React app in production
frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
