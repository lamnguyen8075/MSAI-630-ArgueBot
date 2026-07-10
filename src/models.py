"""Pydantic data models for debate state and scoring."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator, model_validator


class AgentRole(str, Enum):
    PROPONENT = "Proponent"
    OPPONENT = "Opponent"
    MODERATOR = "Moderator"
    JUDGE = "Judge"


class DebateStyle(str, Enum):
    ACADEMIC = "Academic"
    POLICY = "Policy"
    BUSINESS = "Business"
    CASUAL = "Casual"


class ResponseLength(str, Enum):
    CONCISE = "Concise"
    STANDARD = "Standard"
    DETAILED = "Detailed"


class DebateStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    STOPPED = "stopped"
    ERROR = "error"


class ViolationType(str, Enum):
    SIDE_SWITCH = "side_switch"
    ROLE_COLLAPSE = "role_collapse"
    MODERATOR_BIAS = "moderator_bias"
    JUDGE_DEBATING = "judge_debating"
    REFUSAL = "refusal"
    SCORE_ASSIGNMENT = "score_assignment"


WORD_LIMITS: dict[ResponseLength, int] = {
    ResponseLength.CONCISE: 150,
    ResponseLength.STANDARD: 300,
    ResponseLength.DETAILED: 500,
}


class DebateConfig(BaseModel):
    """User-supplied debate configuration."""

    topic: str = Field(..., min_length=10, max_length=500)
    background_context: str = ""
    style: DebateStyle = DebateStyle.ACADEMIC
    configured_rounds: int = Field(default=6, ge=6, le=10)
    response_length: ResponseLength = ResponseLength.CONCISE
    stress_test: bool = False
    demo_mode: bool = False

    @field_validator("topic")
    @classmethod
    def validate_topic(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 10:
            raise ValueError("Debate topic must be at least 10 characters.")
        return cleaned


class DebateMessage(BaseModel):
    """A single message in the debate transcript."""

    round_number: int
    round_name: str
    agent: AgentRole
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    content: str
    role_check_passed: bool = True
    is_retry: bool = False


class RoundSummary(BaseModel):
    """Concise summary of a completed round."""

    round_number: int
    round_name: str
    summary: str
    proponent_key_claims: list[str] = Field(default_factory=list)
    opponent_key_claims: list[str] = Field(default_factory=list)
    unanswered_questions: list[str] = Field(default_factory=list)


class AgentScore(BaseModel):
    """Per-side rubric scores for one scoring checkpoint."""

    logical_reasoning: float = Field(ge=0, le=10)
    evidence_support: float = Field(ge=0, le=10)
    relevance_responsiveness: float = Field(ge=0, le=10)
    rebuttal_quality: float = Field(ge=0, le=10)
    consistency_role_adherence: float = Field(ge=0, le=10)
    clarity_organization: float = Field(ge=0, le=10)
    weighted_total: float = 0.0
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)

    @field_validator(
        "logical_reasoning",
        "evidence_support",
        "relevance_responsiveness",
        "rebuttal_quality",
        "consistency_role_adherence",
        "clarity_organization",
        mode="before",
    )
    @classmethod
    def clamp_score(cls, v: float) -> float:
        return max(0.0, min(10.0, float(v)))


class RoundScore(BaseModel):
    """Judge output for a scored round."""

    round_number: int
    proponent: AgentScore
    opponent: AgentScore
    round_leader: Literal["Proponent", "Opponent", "Tie"]
    judge_commentary: str
    confidence: float = Field(ge=0.0, le=1.0)


class FinalVerdict(BaseModel):
    """Final debate verdict from the judge."""

    winner: Literal["Proponent", "Opponent", "Tie"]
    proponent_final_score: float
    opponent_final_score: float
    decision_summary: str
    decisive_factors: list[str] = Field(default_factory=list)
    proponent_best_argument: str = ""
    opponent_best_argument: str = ""
    major_limitations: list[str] = Field(default_factory=list)
    role_violations: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)


class RoleViolation(BaseModel):
    """Record of a detected role-consistency violation."""

    agent: AgentRole
    round_number: int
    violation_type: ViolationType
    excerpt: str
    corrective_action: str
    retry_attempted: bool = False
    retry_succeeded: bool | None = None


class CumulativeScores(BaseModel):
    """Running average scores across scored rounds."""

    proponent: float = 0.0
    opponent: float = 0.0
    rounds_scored: int = 0


class DebateState(BaseModel):
    """Complete debate state persisted during execution."""

    debate_id: str = Field(default_factory=lambda: str(uuid4()))
    topic: str
    background_context: str = ""
    style: DebateStyle = DebateStyle.ACADEMIC
    configured_rounds: int = 6
    response_length: ResponseLength = ResponseLength.CONCISE
    current_round: int = 0
    status: DebateStatus = DebateStatus.PENDING
    messages: list[DebateMessage] = Field(default_factory=list)
    round_summaries: list[RoundSummary] = Field(default_factory=list)
    round_scores: list[RoundScore] = Field(default_factory=list)
    cumulative_scores: CumulativeScores = Field(default_factory=CumulativeScores)
    violations: list[RoleViolation] = Field(default_factory=list)
    final_verdict: FinalVerdict | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: datetime | None = None
    stress_test: bool = False

    def model_dump_json_safe(self) -> dict:
        """Export state as JSON-serializable dict."""
        return self.model_dump(mode="json")


class TurnSpec(BaseModel):
    """Specification for a single turn in the debate sequence."""

    round_number: int
    round_name: str
    agent: AgentRole
    task: str
    requires_scoring: bool = False
    is_final_verdict: bool = False


class RoundPlan(BaseModel):
    """Ordered list of turns for the entire debate."""

    turns: list[TurnSpec]

    @model_validator(mode="after")
    def validate_minimum_rounds(self) -> RoundPlan:
        round_numbers = {t.round_number for t in self.turns}
        if max(round_numbers) < 6:
            raise ValueError("Debate must include at least 6 rounds.")
        return self
