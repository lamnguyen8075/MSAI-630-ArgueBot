"""Scoring calculations and validation — math kept separate from LLM generation."""

from __future__ import annotations

from src.models import AgentScore, CumulativeScores, FinalVerdict, RoundScore


# Weighted rubric coefficients (design choice: programmatic recalculation)
RUBRIC_WEIGHTS = {
    "logical_reasoning": 2.5,
    "evidence_support": 2.0,
    "relevance_responsiveness": 1.5,
    "rebuttal_quality": 1.5,
    "consistency_role_adherence": 1.5,
    "clarity_organization": 1.0,
}


def calculate_weighted_total(score: AgentScore) -> float:
    """Recalculate weighted total from category scores — never trust model arithmetic."""
    total = (
        score.logical_reasoning * RUBRIC_WEIGHTS["logical_reasoning"]
        + score.evidence_support * RUBRIC_WEIGHTS["evidence_support"]
        + score.relevance_responsiveness * RUBRIC_WEIGHTS["relevance_responsiveness"]
        + score.rebuttal_quality * RUBRIC_WEIGHTS["rebuttal_quality"]
        + score.consistency_role_adherence * RUBRIC_WEIGHTS["consistency_role_adherence"]
        + score.clarity_organization * RUBRIC_WEIGHTS["clarity_organization"]
    )
    return round(total, 2)


def apply_weighted_totals(score: AgentScore) -> AgentScore:
    """Return a copy of AgentScore with programmatically computed weighted_total."""
    updated = score.model_copy()
    updated.weighted_total = calculate_weighted_total(updated)
    return updated


def finalize_round_score(round_score: RoundScore) -> RoundScore:
    """Validate and recalculate weighted totals for a round score."""
    proponent = apply_weighted_totals(round_score.proponent)
    opponent = apply_weighted_totals(round_score.opponent)

    prop_total = proponent.weighted_total
    opp_total = opponent.weighted_total
    if abs(prop_total - opp_total) < 2.0:
        leader = "Tie"
    elif prop_total > opp_total:
        leader = "Proponent"
    else:
        leader = "Opponent"

    return RoundScore(
        round_number=round_score.round_number,
        proponent=proponent,
        opponent=opponent,
        round_leader=round_score.round_leader if round_score.round_leader else leader,
        judge_commentary=round_score.judge_commentary,
        confidence=max(0.0, min(1.0, round_score.confidence)),
    )


class ScoreManager:
    """Manages cumulative score aggregation across rounds."""

    def __init__(self) -> None:
        self.round_scores: list[RoundScore] = []
        self.cumulative = CumulativeScores()

    def add_round_score(self, round_score: RoundScore) -> RoundScore:
        """Add a validated round score and update cumulative averages."""
        finalized = finalize_round_score(round_score)
        self.round_scores.append(finalized)
        self._update_cumulative(finalized)
        return finalized

    def _update_cumulative(self, round_score: RoundScore) -> None:
        """Average weighted totals across all scored rounds."""
        n = len(self.round_scores)
        if n == 0:
            return
        prop_sum = sum(rs.proponent.weighted_total for rs in self.round_scores)
        opp_sum = sum(rs.opponent.weighted_total for rs in self.round_scores)
        self.cumulative = CumulativeScores(
            proponent=round(prop_sum / n, 2),
            opponent=round(opp_sum / n, 2),
            rounds_scored=n,
        )

    def compute_final_verdict_scores(self) -> tuple[float, float]:
        """Return cumulative average scores for final verdict."""
        return self.cumulative.proponent, self.cumulative.opponent

    def build_prior_scores_summary(self) -> str:
        """Format prior scores for judge context."""
        if not self.round_scores:
            return "No prior scores."
        lines = []
        for rs in self.round_scores:
            lines.append(
                f"Round {rs.round_number}: Proponent {rs.proponent.weighted_total}, "
                f"Opponent {rs.opponent.weighted_total} — Leader: {rs.round_leader}"
            )
        lines.append(
            f"Cumulative average: Proponent {self.cumulative.proponent}, "
            f"Opponent {self.cumulative.opponent}"
        )
        return "\n".join(lines)

    def determine_winner(self) -> str:
        """Determine winner from cumulative scores."""
        diff = self.cumulative.proponent - self.cumulative.opponent
        if abs(diff) < 2.0:
            return "Tie"
        return "Proponent" if diff > 0 else "Opponent"

    def finalize_verdict(self, verdict: FinalVerdict) -> FinalVerdict:
        """Ensure final verdict uses programmatic cumulative scores."""
        prop, opp = self.compute_final_verdict_scores()
        winner = self.determine_winner()
        return verdict.model_copy(
            update={
                "proponent_final_score": prop,
                "opponent_final_score": opp,
                "winner": winner,
            }
        )
