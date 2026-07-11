"""Tests for simple team login and live debate quotas."""

from __future__ import annotations

import importlib

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path, monkeypatch):
    usage_file = tmp_path / "usage.json"
    monkeypatch.setattr("api.auth.USAGE_FILE", usage_file)

    import api.auth as auth

    importlib.reload(auth)
    monkeypatch.setattr("api.main.login", auth.login)
    monkeypatch.setattr("api.main.logout", auth.logout)
    monkeypatch.setattr("api.main.require_user", auth.require_user)
    monkeypatch.setattr("api.main.user_info", auth.user_info)
    monkeypatch.setattr("api.main.consume_live_test", auth.consume_live_test)

    from api.main import app

    return TestClient(app)


def test_login_success(client):
    res = client.post("/api/auth/login", json={"username": "banana", "password": "banana1"})
    assert res.status_code == 200
    data = res.json()
    assert data["username"] == "banana"
    assert data["remaining_live_tests"] == 2
    assert data["token"]


def test_login_failure(client):
    res = client.post("/api/auth/login", json={"username": "banana", "password": "wrong"})
    assert res.status_code == 401


def test_start_requires_auth(client):
    res = client.post(
        "/api/debates/start",
        json={
            "topic": "Universities should adopt pass/fail grading for intro courses.",
            "background_context": "",
            "style": "Academic",
            "configured_rounds": 6,
            "response_length": "Concise",
            "stress_test": False,
        },
    )
    assert res.status_code == 401


def test_live_quota_enforced(client, monkeypatch):
    monkeypatch.setattr("api.main.manager.config.has_api_key", True)

    class FakeSession:
        debate_id = "test-debate"

        def start(self, _config):
            return None

    monkeypatch.setattr("api.main.manager.create_session", lambda: FakeSession())

    login = client.post("/api/auth/login", json={"username": "grape", "password": "grape1"})
    token = login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "topic": "Universities should adopt pass/fail grading for intro courses.",
        "background_context": "",
        "style": "Academic",
        "configured_rounds": 6,
        "response_length": "Concise",
        "stress_test": False,
    }

    for _ in range(2):
        res = client.post("/api/debates/start", json=payload, headers=headers)
        assert res.status_code == 200

    res = client.post("/api/debates/start", json=payload, headers=headers)
    assert res.status_code == 403

def test_master_unlimited(client, monkeypatch):
    monkeypatch.setattr("api.main.manager.config.has_api_key", True)

    class FakeSession:
        debate_id = "test-debate"

        def start(self, _config):
            return None

    monkeypatch.setattr("api.main.manager.create_session", lambda: FakeSession())

    login = client.post("/api/auth/login", json={"username": "lam", "password": "lam1"})
    assert login.status_code == 200
    data = login.json()
    assert data["is_master"] is True
    assert data["remaining_live_tests"] is None

    token = data["token"]
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "topic": "Universities should adopt pass/fail grading for intro courses.",
        "background_context": "",
        "style": "Academic",
        "configured_rounds": 6,
        "response_length": "Concise",
        "stress_test": False,
    }

    for _ in range(5):
        res = client.post("/api/debates/start", json=payload, headers=headers)
        assert res.status_code == 200

    me = client.get("/api/auth/me", headers=headers)
    assert me.json()["is_master"] is True
    assert me.json()["remaining_live_tests"] is None
