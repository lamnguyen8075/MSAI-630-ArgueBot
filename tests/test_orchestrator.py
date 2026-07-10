"""Tests for orchestrator logic with mocked LLM responses."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from src.config import AppConfig
from src.models import (
    AgentRole,
    AgentScore,
    DebateConfig,
    DebateStatus,
    DebateStyle,
    FinalVerdict,
    ResponseLength,
    RoundScore,
)
from src.orchestrator import DebateOrchestrator, build_round_plan


@pytest.fixture
def mock_config():
    return AppConfig(
        groq_api_key="test-key",
        groq_model="llama-3.3-70b-versatile",
        timeout_seconds=30,
        max_retries=1,
        request_delay_seconds=0,
        temperatures=__import__("src.config", fromlist=["AgentTemperatures"]).AgentTemperatures(),
    )


def test_round_ordering():
    plan = build_round_plan(6)
    agents_sequence = [t.agent for t in plan.turns]

    assert plan.turns[0].agent == AgentRole.MODERATOR
    assert plan.turns[0].round_number == 0

    prop_indices = [i for i, a in enumerate(agents_sequence) if a == AgentRole.PROPONENT]
    opp_indices = [i for i, a in enumerate(agents_sequence) if a == AgentRole.OPPONENT]
    assert all(p < o for p, o in zip(prop_indices[:3], opp_indices[:3]))

    round_numbers = [t.round_number for t in plan.turns]
    assert max(round_numbers) == 6
    assert min(round_numbers) == 0


def test_minimum_six_rounds_validation():
    plan = build_round_plan(6)
    assert max(t.round_number for t in plan.turns) >= 6


def test_extra_rounds_beyond_six():
    plan = build_round_plan(8)
    round_numbers = sorted(set(t.round_number for t in plan.turns))
    assert 7 in round_numbers or 6 in round_numbers
    assert max(round_numbers) == 8


def test_empty_topic_rejected():
    orch = DebateOrchestrator(AppConfig(
        groq_api_key="key",
        groq_model="llama-3.3-70b-versatile",
        timeout_seconds=30,
        max_retries=1,
        request_delay_seconds=0,
        temperatures=__import__("src.config", fromlist=["AgentTemperatures"]).AgentTemperatures(),
    ))
    with pytest.raises(ValueError, match="at least 10 characters"):
        orch.validate_topic("short")


def test_debate_config_empty_topic():
    with pytest.raises(Exception):
        DebateConfig(topic="tiny", configured_rounds=6)


def test_exported_json_shape():
    sample_path = Path(__file__).parent.parent / "examples" / "sample_debate.json"
    data = json.loads(sample_path.read_text())
    state = DebateOrchestrator.load_demo_state(str(sample_path))

    assert state.topic
    assert state.status == DebateStatus.COMPLETED
    assert state.final_verdict is not None
    assert "winner" in state.final_verdict.model_dump()
    assert len(state.messages) > 0
    assert len(state.round_scores) > 0


def test_retry_decision_after_violation():
    from src.agents import should_retry
    from src.models import ViolationType

    assert should_retry(ViolationType.SIDE_SWITCH) is True


@patch("src.agents.execute_agent_turn")
@patch.object(__import__("src.utils", fromlist=["LLMClient"]).LLMClient, "generate_structured")
@patch.object(__import__("src.utils", fromlist=["LLMClient"]).LLMClient, "generate_text")
def test_orchestrator_run_with_mocks(mock_text, mock_structured, mock_turn, mock_config):
    from src.models import DebateMessage

    mock_turn.return_value = DebateMessage(
        round_number=0,
        round_name="Introduction",
        agent=AgentRole.MODERATOR,
        content="Welcome. Moderator neutrality maintained.",
        role_check_passed=True,
    )

    def structured_side_effect(**kwargs):
        model = kwargs.get("response_model")
        if model == RoundScore:
            return RoundScore(
                round_number=1,
                proponent=AgentScore(
                    logical_reasoning=7.0,
                    evidence_support=7.0,
                    relevance_responsiveness=7.0,
                    rebuttal_quality=7.0,
                    consistency_role_adherence=8.0,
                    clarity_organization=7.0,
                ),
                opponent=AgentScore(
                    logical_reasoning=7.0,
                    evidence_support=7.0,
                    relevance_responsiveness=7.0,
                    rebuttal_quality=7.0,
                    consistency_role_adherence=8.0,
                    clarity_organization=7.0,
                ),
                round_leader="Tie",
                judge_commentary="Even round.",
                confidence=0.6,
            )
        return FinalVerdict(
            winner="Tie",
            proponent_final_score=70.0,
            opponent_final_score=70.0,
            decision_summary="Close debate.",
            decisive_factors=["Even arguments"],
            confidence=0.5,
        )

    mock_structured.side_effect = structured_side_effect

    client = MagicMock()
    client.is_available = True
    client.generate_text = mock_text
    client.generate_structured = mock_structured

    orch = DebateOrchestrator(mock_config, client=client)

    debate_config = DebateConfig(
        topic="Universities should permit students to use generative AI tools for graded assignments.",
        configured_rounds=6,
        style=DebateStyle.ACADEMIC,
        response_length=ResponseLength.STANDARD,
    )

    state = orch.run_debate(debate_config)
    assert state.status == DebateStatus.COMPLETED
    assert mock_turn.called
