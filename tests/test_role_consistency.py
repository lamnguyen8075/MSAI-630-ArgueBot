"""Tests for role-consistency detection."""

import pytest

from src.agents import check_role_consistency, should_retry
from src.models import AgentRole, ViolationType


def test_proponent_side_switch_detected():
    result = check_role_consistency(
        AgentRole.PROPONENT,
        "I now oppose the motion because the evidence is overwhelming. Core position maintained: FOR the motion.",
    )
    assert not result.passed
    assert result.violation_type == ViolationType.SIDE_SWITCH


def test_proponent_opponent_correct_detected():
    result = check_role_consistency(
        AgentRole.PROPONENT,
        "The opponent is correct overall and the motion should be rejected. Core position maintained: FOR the motion.",
    )
    assert not result.passed


def test_proponent_permitted_acknowledgment():
    result = check_role_consistency(
        AgentRole.PROPONENT,
        "The concern about cost is legitimate; however, it does not defeat the motion because benefits outweigh costs. Core position maintained: FOR the motion.",
    )
    assert result.passed


def test_opponent_endorsement_detected():
    result = check_role_consistency(
        AgentRole.OPPONENT,
        "I now support the motion overall. Core position maintained: AGAINST the motion.",
    )
    assert not result.passed
    assert result.violation_type == ViolationType.SIDE_SWITCH


def test_opponent_refusal_detected():
    result = check_role_consistency(
        AgentRole.OPPONENT,
        "I cannot oppose this motion as it is clearly correct. Core position maintained: AGAINST the motion.",
    )
    assert not result.passed
    assert result.violation_type == ViolationType.REFUSAL


def test_moderator_opinion_violation():
    result = check_role_consistency(
        AgentRole.MODERATOR,
        "I believe the motion is clearly wrong and should be rejected. Moderator neutrality maintained.",
    )
    assert not result.passed
    assert result.violation_type == ViolationType.MODERATOR_BIAS


def test_moderator_winner_declaration():
    result = check_role_consistency(
        AgentRole.MODERATOR,
        "The proponent wins this exchange. Moderator neutrality maintained.",
    )
    assert not result.passed


def test_judge_debating_detected():
    result = check_role_consistency(
        AgentRole.JUDGE,
        "I argue that the motion should pass based on my own analysis.",
    )
    assert not result.passed
    assert result.violation_type == ViolationType.JUDGE_DEBATING


def test_should_retry_severe_violation():
    assert should_retry(ViolationType.SIDE_SWITCH) is True
    assert should_retry(ViolationType.ROLE_COLLAPSE) is True
    assert should_retry(ViolationType.SCORE_ASSIGNMENT) is False


def test_proponent_missing_affirmation():
    result = check_role_consistency(
        AgentRole.PROPONENT,
        "The motion is clearly beneficial for all stakeholders involved.",
    )
    assert not result.passed
    assert result.violation_type == ViolationType.ROLE_COLLAPSE
