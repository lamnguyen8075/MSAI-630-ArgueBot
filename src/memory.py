"""Debate memory and compact context management."""

from __future__ import annotations

from src.models import (
    AgentRole,
    DebateConfig,
    DebateMessage,
    DebateState,
    RoundSummary,
    RoleViolation,
)


DEBATE_RULES = """
1. The Proponent defends the motion; the Opponent challenges it.
2. The Moderator manages process and remains neutral.
3. The Judge evaluates arguments and assigns scores at checkpoints.
4. Agents must stay in role throughout all rounds.
5. Acknowledgments of strong points must be immediately followed by rebuttal.
6. No fabricated citations, statistics, or quotations.
7. Scoring uses a 100-point weighted rubric across six categories.
"""


class DebateMemory:
    """
    Stores full debate history and builds compact per-turn context.

    Design choice: compact role-specific context instead of unlimited transcript replay.
    """

    def __init__(self, config: DebateConfig) -> None:
        self.motion = config.topic
        self.background_context = config.background_context
        self.style = config.style
        self.rules = DEBATE_RULES
        self.messages: list[DebateMessage] = []
        self.round_summaries: list[RoundSummary] = []
        self.key_claims: dict[AgentRole, list[str]] = {
            AgentRole.PROPONENT: [],
            AgentRole.OPPONENT: [],
        }
        self.unanswered_questions: list[str] = []
        self.judge_feedback: dict[AgentRole, list[str]] = {
            AgentRole.PROPONENT: [],
            AgentRole.OPPONENT: [],
        }
        self.violations: list[RoleViolation] = []

    def add_message(self, message: DebateMessage) -> None:
        """Append a message to history."""
        self.messages.append(message)
        if message.agent in (AgentRole.PROPONENT, AgentRole.OPPONENT):
            self._extract_claims(message)

    def add_round_summary(self, summary: RoundSummary) -> None:
        """Store a round summary for compact context."""
        self.round_summaries.append(summary)
        self.key_claims[AgentRole.PROPONENT].extend(summary.proponent_key_claims)
        self.key_claims[AgentRole.OPPONENT].extend(summary.opponent_key_claims)
        self.unanswered_questions.extend(summary.unanswered_questions)

    def add_judge_feedback(self, agent: AgentRole, feedback: str) -> None:
        """Store judge feedback relevant to a debater."""
        if agent in self.judge_feedback:
            self.judge_feedback[agent].append(feedback)

    def add_violation(self, violation: RoleViolation) -> None:
        """Record a role violation."""
        self.violations.append(violation)

    def get_opponent_latest(self, role: AgentRole) -> str:
        """Return the opponent's most recent argument."""
        opponent = AgentRole.OPPONENT if role == AgentRole.PROPONENT else AgentRole.PROPONENT
        for msg in reversed(self.messages):
            if msg.agent == opponent:
                return msg.content
        return ""

    def get_own_claims(self, role: AgentRole) -> str:
        """Return agent's prior key claims as formatted text."""
        claims = self.key_claims.get(role, [])
        if not claims:
            return self._extract_from_messages(role)
        return "\n".join(f"- {c}" for c in claims[-5:])

    def _extract_from_messages(self, role: AgentRole) -> str:
        """Fallback: summarize from recent messages."""
        recent = [m.content[:200] for m in self.messages if m.agent == role][-3:]
        return "\n".join(f"- {r}..." for r in recent) if recent else "No prior claims recorded."

    def get_judge_feedback_for(self, role: AgentRole) -> str:
        """Return recent judge feedback for an agent."""
        feedback = self.judge_feedback.get(role, [])
        return "\n".join(f"- {f}" for f in feedback[-3:]) if feedback else ""

    def get_transcript_summary(self, max_rounds: int = 3) -> str:
        """Build compact summary from recent round summaries."""
        if not self.round_summaries:
            return self._summarize_recent_messages()
        recent = self.round_summaries[-max_rounds:]
        parts = []
        for rs in recent:
            parts.append(f"Round {rs.round_number} ({rs.round_name}): {rs.summary}")
        return "\n".join(parts)

    def _summarize_recent_messages(self, limit: int = 6) -> str:
        """Programmatic fallback summary from recent messages."""
        recent = self.messages[-limit:]
        if not recent:
            return "Debate has just begun."
        lines = []
        for msg in recent:
            lines.append(f"[{msg.agent.value}, Round {msg.round_number}] {msg.content[:150]}...")
        return "\n".join(lines)

    def get_round_transcript(self, round_number: int) -> str:
        """Get all messages from a specific round."""
        round_msgs = [m for m in self.messages if m.round_number == round_number]
        return "\n\n".join(
            f"{m.agent.value}: {m.content}" for m in round_msgs
        )

    def get_full_transcript(self) -> str:
        """Return complete transcript."""
        return "\n\n".join(
            f"## Round {m.round_number}: {m.round_name}\n"
            f"**{m.agent.value}** ({m.timestamp.isoformat()})\n\n{m.content}"
            for m in self.messages
        )

    def create_round_summary(self, round_number: int, round_name: str) -> RoundSummary:
        """Programmatically create a concise round summary."""
        round_msgs = [m for m in self.messages if m.round_number == round_number]
        prop_msgs = [m for m in round_msgs if m.agent == AgentRole.PROPONENT]
        opp_msgs = [m for m in round_msgs if m.agent == AgentRole.OPPONENT]
        mod_msgs = [m for m in round_msgs if m.agent == AgentRole.MODERATOR]

        summary_parts = []
        for msg in round_msgs:
            summary_parts.append(f"{msg.agent.value}: {msg.content[:120]}...")
        summary = " | ".join(summary_parts) if summary_parts else f"Round {round_number} completed."

        prop_claims = [m.content[:100] for m in prop_msgs]
        opp_claims = [m.content[:100] for m in opp_msgs]
        questions = []
        for m in mod_msgs:
            if "?" in m.content:
                for q in m.content.split("?"):
                    if q.strip():
                        questions.append(q.strip() + "?")
                    if len(questions) >= 2:
                        break

        rs = RoundSummary(
            round_number=round_number,
            round_name=round_name,
            summary=summary[:500],
            proponent_key_claims=prop_claims[:3],
            opponent_key_claims=opp_claims[:3],
            unanswered_questions=questions[:2],
        )
        self.add_round_summary(rs)
        return rs

    def _extract_claims(self, message: DebateMessage) -> None:
        """Extract first sentence as a key claim."""
        first_sentence = message.content.split(".")[0].strip()
        if len(first_sentence) > 20:
            claims = self.key_claims.get(message.agent, [])
            claims.append(first_sentence[:150])
            self.key_claims[message.agent] = claims[-10:]

    def sync_to_state(self, state: DebateState) -> None:
        """Sync memory contents back to debate state."""
        state.messages = list(self.messages)
        state.round_summaries = list(self.round_summaries)
        state.violations = list(self.violations)
