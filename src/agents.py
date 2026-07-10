"""Agent classes and role-consistency detection."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass

from src.config import AppConfig
from src.memory import DebateMemory
from src.models import (
    AgentRole,
    DebateConfig,
    DebateMessage,
    ResponseLength,
    RoleViolation,
    ViolationType,
)
from src.prompts import (
    CORRECTIVE_PROMPTS,
    SYSTEM_PROMPTS,
    build_turn_prompt,
)
from src.utils import LLMClient

logger = logging.getLogger("arguebot")


@dataclass
class RoleCheckResult:
    """Result of a role-consistency check."""

    passed: bool
    violation_type: ViolationType | None = None
    excerpt: str = ""


# ---------------------------------------------------------------------------
# Role-consistency patterns — lightweight programmatic checks
# ---------------------------------------------------------------------------

PROPONENT_VIOLATIONS = [
    (r"\bi (?:now )?(?:oppose|reject|argue against) the motion\b", ViolationType.SIDE_SWITCH),
    (r"\bthe motion should be rejected\b", ViolationType.SIDE_SWITCH),
    (r"\bthe opponent is (?:correct|right) overall\b", ViolationType.SIDE_SWITCH),
    (r"\bi (?:agree|concede) that the motion (?:is wrong|should not)\b", ViolationType.SIDE_SWITCH),
    (r"\bas (?:the )?moderator\b", ViolationType.ROLE_COLLAPSE),
    (r"\bas (?:the )?judge\b", ViolationType.ROLE_COLLAPSE),
    (r"\bi (?:cannot|won't|will not) defend\b", ViolationType.REFUSAL),
    (r"\b(?:proponent|opponent) score[s]?\s*(?:is|are|:)\s*\d", ViolationType.SCORE_ASSIGNMENT),
]

OPPONENT_VIOLATIONS = [
    (r"\bi (?:now )?(?:support|endorse|favor) the motion\b", ViolationType.SIDE_SWITCH),
    (r"\bthe motion should (?:pass|be adopted|be accepted)\b", ViolationType.SIDE_SWITCH),
    (r"\bthe proponent is (?:correct|right) overall\b", ViolationType.SIDE_SWITCH),
    (r"\bi (?:agree|concede) that the motion should pass\b", ViolationType.SIDE_SWITCH),
    (r"\bas (?:the )?moderator\b", ViolationType.ROLE_COLLAPSE),
    (r"\bas (?:the )?judge\b", ViolationType.ROLE_COLLAPSE),
    (r"\bi (?:cannot|won't|will not) (?:oppose|challenge)\b", ViolationType.REFUSAL),
    (r"\b(?:proponent|opponent) score[s]?\s*(?:is|are|:)\s*\d", ViolationType.SCORE_ASSIGNMENT),
]

MODERATOR_VIOLATIONS = [
    (r"\bi (?:believe|think|feel) (?:the motion|that we should)\b", ViolationType.MODERATOR_BIAS),
    (r"\bthe motion (?:is clearly|should be) (?:correct|wrong|good|bad)\b", ViolationType.MODERATOR_BIAS),
    (r"\b(?:proponent|opponent) (?:wins|is the winner)\b", ViolationType.SCORE_ASSIGNMENT),
    (r"\b(?:proponent|opponent) score[s]?\s*(?:is|are|:)\s*\d", ViolationType.SCORE_ASSIGNMENT),
    (r"\bi (?:strongly )?(?:support|oppose|favor)\b", ViolationType.MODERATOR_BIAS),
]

JUDGE_VIOLATIONS = [
    (r"\bi argue that\b", ViolationType.JUDGE_DEBATING),
    (r"\bthe motion should (?:pass|be rejected)\b", ViolationType.JUDGE_DEBATING),
    (r"\bcore position maintained\b", ViolationType.JUDGE_DEBATING),
    (r"\bmoderator neutrality maintained\b", ViolationType.ROLE_COLLAPSE),
]

# Permitted acknowledgment patterns — avoid false positives
ACKNOWLEDGMENT_PATTERN = re.compile(
    r"(?:however|but|nevertheless|yet|still|nonetheless|does not defeat|does not outweigh)",
    re.IGNORECASE,
)

ROLE_PATTERNS: dict[AgentRole, list[tuple[str, ViolationType]]] = {
    AgentRole.PROPONENT: PROPONENT_VIOLATIONS,
    AgentRole.OPPONENT: OPPONENT_VIOLATIONS,
    AgentRole.MODERATOR: MODERATOR_VIOLATIONS,
    AgentRole.JUDGE: JUDGE_VIOLATIONS,
}


def check_role_consistency(role: AgentRole, content: str) -> RoleCheckResult:
    """
    Programmatic role-consistency check.

    Design choice: combine pattern checks with acknowledgment allowances.
    """
    patterns = ROLE_PATTERNS.get(role, [])
    content_lower = content.lower()

    for pattern, vtype in patterns:
        match = re.search(pattern, content_lower)
        if match:
            excerpt = content[max(0, match.start() - 20) : match.end() + 40].strip()
            if _is_permitted_acknowledgment(content, match.start()):
                continue
            return RoleCheckResult(passed=False, violation_type=vtype, excerpt=excerpt)

    required_endings = {
        AgentRole.PROPONENT: "core position maintained: for the motion",
        AgentRole.OPPONENT: "core position maintained: against the motion",
        AgentRole.MODERATOR: "moderator neutrality maintained",
    }
    required = required_endings.get(role)
    if required and required not in content_lower:
        return RoleCheckResult(
            passed=False,
            violation_type=ViolationType.ROLE_COLLAPSE,
            excerpt="Missing required role affirmation at end of response.",
        )

    return RoleCheckResult(passed=True)


def _is_permitted_acknowledgment(content: str, match_pos: int) -> bool:
    """Allow brief acknowledgments followed by rebuttal."""
    window = content[match_pos : match_pos + 200]
    return bool(ACKNOWLEDGMENT_PATTERN.search(window))


def should_retry(violation_type: ViolationType | None) -> bool:
    """Determine if a severe violation warrants one automatic retry."""
    if violation_type is None:
        return False
    severe = {
        ViolationType.SIDE_SWITCH,
        ViolationType.ROLE_COLLAPSE,
        ViolationType.REFUSAL,
        ViolationType.MODERATOR_BIAS,
        ViolationType.JUDGE_DEBATING,
    }
    return violation_type in severe


class BaseAgent:
    """Base class for all debate agents with shared generation logic."""

    role: AgentRole

    def __init__(self, client: LLMClient, config: AppConfig) -> None:
        self.client = client
        self.config = config

    def get_temperature(self) -> float:
        temps = self.config.temperatures
        mapping = {
            AgentRole.PROPONENT: temps.proponent,
            AgentRole.OPPONENT: temps.opponent,
            AgentRole.MODERATOR: temps.moderator,
            AgentRole.JUDGE: temps.judge,
        }
        return mapping[self.role]

    def generate(
        self,
        *,
        debate_config: DebateConfig,
        memory: DebateMemory,
        round_number: int,
        round_name: str,
        task: str,
        stress_instruction: str = "",
        corrective: str = "",
    ) -> tuple[str, RoleCheckResult]:
        """Generate a response with role checking and optional retry."""
        user_prompt = build_turn_prompt(
            role=self.role,
            motion=memory.motion,
            background_context=memory.background_context,
            style=debate_config.style,
            round_name=round_name,
            task=task,
            transcript_summary=memory.get_transcript_summary(),
            opponent_latest=memory.get_opponent_latest(self.role),
            own_claims=memory.get_own_claims(self.role),
            judge_feedback=memory.get_judge_feedback_for(self.role),
            response_length=debate_config.response_length,
            stress_instruction=stress_instruction,
        )
        if corrective:
            user_prompt = f"{corrective}\n\n{user_prompt}"

        content = self.client.generate_text(
            system_prompt=SYSTEM_PROMPTS[self.role],
            user_prompt=user_prompt,
            temperature=self.get_temperature(),
        )
        check = check_role_consistency(self.role, content)
        return content, check


class ProponentAgent(BaseAgent):
    role = AgentRole.PROPONENT


class OpponentAgent(BaseAgent):
    role = AgentRole.OPPONENT


class ModeratorAgent(BaseAgent):
    role = AgentRole.MODERATOR


class JudgeAgent(BaseAgent):
    role = AgentRole.JUDGE


AGENT_CLASSES: dict[AgentRole, type[BaseAgent]] = {
    AgentRole.PROPONENT: ProponentAgent,
    AgentRole.OPPONENT: OpponentAgent,
    AgentRole.MODERATOR: ModeratorAgent,
    AgentRole.JUDGE: JudgeAgent,
}


def create_agent(role: AgentRole, client: LLMClient, config: AppConfig) -> BaseAgent:
    """Factory for agent instances."""
    return AGENT_CLASSES[role](client, config)


def execute_agent_turn(
    *,
    role: AgentRole,
    client: LLMClient,
    config: AppConfig,
    debate_config: DebateConfig,
    memory: DebateMemory,
    round_number: int,
    round_name: str,
    task: str,
    stress_instruction: str = "",
) -> DebateMessage:
    """
    Execute a single agent turn with role check and one retry on severe violation.

    Design choice: automatic retry on persona collapse.
    """
    agent = create_agent(role, client, config)
    content, check = agent.generate(
        debate_config=debate_config,
        memory=memory,
        round_number=round_number,
        round_name=round_name,
        task=task,
        stress_instruction=stress_instruction,
    )

    if not check.passed and should_retry(check.violation_type):
        logger.warning(
            "Role violation detected for %s in round %d: %s",
            role.value,
            round_number,
            check.violation_type,
        )
        violation = RoleViolation(
            agent=role,
            round_number=round_number,
            violation_type=check.violation_type or ViolationType.ROLE_COLLAPSE,
            excerpt=check.excerpt,
            corrective_action=CORRECTIVE_PROMPTS[role],
            retry_attempted=True,
        )
        memory.add_violation(violation)

        content, retry_check = agent.generate(
            debate_config=debate_config,
            memory=memory,
            round_number=round_number,
            round_name=round_name,
            task=task,
            stress_instruction=stress_instruction,
            corrective=CORRECTIVE_PROMPTS[role],
        )
        violation.retry_succeeded = retry_check.passed
        check = retry_check

        if not retry_check.passed:
            logger.error("Retry failed for %s in round %d", role.value, round_number)

    elif not check.passed:
        memory.add_violation(
            RoleViolation(
                agent=role,
                round_number=round_number,
                violation_type=check.violation_type or ViolationType.ROLE_COLLAPSE,
                excerpt=check.excerpt,
                corrective_action="Logged for failure analysis.",
                retry_attempted=False,
            )
        )

    return DebateMessage(
        round_number=round_number,
        round_name=round_name,
        agent=role,
        content=content,
        role_check_passed=check.passed,
        is_retry=any(v.retry_attempted for v in memory.violations if v.agent == role and v.round_number == round_number),
    )
