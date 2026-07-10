"""Tests for scoring calculations and validation."""

import pytest
from pydantic import ValidationError

from src.models import AgentScore, RoundScore
from src.scoring import (
    ScoreManager,
    apply_weighted_totals,
    calculate_weighted_total,
    finalize_round_score,
)


def test_weighted_score_calculation():
    score = AgentScore(
        logical_reasoning=8.0,
        evidence_support=7.0,
        relevance_responsiveness=7.5,
        rebuttal_quality=7.0,
        consistency_role_adherence=9.0,
        clarity_organization=8.0,
    )
    total = calculate_weighted_total(score)
    expected = 8.0 * 2.5 + 7.0 * 2.0 + 7.5 * 1.5 + 7.0 * 1.5 + 9.0 * 1.5 + 8.0 * 1.0
    assert total == round(expected, 2)


def test_weighted_total_recalculated_not_trusted():
    score = AgentScore(
        logical_reasoning=8.0,
        evidence_support=7.0,
        relevance_responsiveness=7.5,
        rebuttal_quality=7.0,
        consistency_role_adherence=9.0,
        clarity_organization=8.0,
        weighted_total=999.0,
    )
    updated = apply_weighted_totals(score)
    assert updated.weighted_total != 999.0
    assert updated.weighted_total == calculate_weighted_total(score)


def test_score_validation_boundaries():
    score = AgentScore(
        logical_reasoning=15.0,
        evidence_support=-2.0,
        relevance_responsiveness=5.0,
        rebuttal_quality=5.0,
        consistency_role_adherence=5.0,
        clarity_organization=5.0,
    )
    assert score.logical_reasoning == 10.0
    assert score.evidence_support == 0.0


def test_score_validation_rejects_invalid():
    with pytest.raises(ValidationError):
        AgentScore(
            logical_reasoning="not a number",
            evidence_support=5.0,
            relevance_responsiveness=5.0,
            rebuttal_quality=5.0,
            consistency_role_adherence=5.0,
            clarity_organization=5.0,
        )


def test_finalize_round_score():
    rs = RoundScore(
        round_number=1,
        proponent=AgentScore(
            logical_reasoning=8.0,
            evidence_support=7.0,
            relevance_responsiveness=7.0,
            rebuttal_quality=7.0,
            consistency_role_adherence=9.0,
            clarity_organization=8.0,
        ),
        opponent=AgentScore(
            logical_reasoning=7.0,
            evidence_support=8.0,
            relevance_responsiveness=8.0,
            rebuttal_quality=7.5,
            consistency_role_adherence=9.0,
            clarity_organization=7.5,
        ),
        round_leader="Opponent",
        judge_commentary="Close round.",
        confidence=0.7,
    )
    finalized = finalize_round_score(rs)
    assert finalized.proponent.weighted_total == calculate_weighted_total(finalized.proponent)
    assert finalized.opponent.weighted_total == calculate_weighted_total(finalized.opponent)


def test_cumulative_score_aggregation():
    manager = ScoreManager()
    for rnd, (p, o) in enumerate([(70.0, 75.0), (80.0, 78.0)], 1):
        rs = RoundScore(
            round_number=rnd,
            proponent=AgentScore(
                logical_reasoning=7.0,
                evidence_support=7.0,
                relevance_responsiveness=7.0,
                rebuttal_quality=7.0,
                consistency_role_adherence=7.0,
                clarity_organization=7.0,
                weighted_total=p,
            ),
            opponent=AgentScore(
                logical_reasoning=7.5,
                evidence_support=7.5,
                relevance_responsiveness=7.5,
                rebuttal_quality=7.5,
                consistency_role_adherence=7.5,
                clarity_organization=7.5,
                weighted_total=o,
            ),
            round_leader="Tie",
            judge_commentary="Test",
            confidence=0.5,
        )
        manager.add_round_score(rs)

    assert manager.cumulative.proponent == 75.0
    assert manager.cumulative.opponent == 76.5
    assert manager.cumulative.rounds_scored == 2
