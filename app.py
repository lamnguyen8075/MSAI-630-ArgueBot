"""ArgueBot Streamlit application."""

from __future__ import annotations

import sys
from pathlib import Path

import streamlit as st

# Ensure project root is on path
ROOT = Path(__file__).parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.config import load_config
from src.models import (
    DebateConfig,
    DebateStatus,
    DebateStyle,
    ResponseLength,
)
from src.orchestrator import DebateOrchestrator
from src.utils import export_debate_json, export_transcript_markdown, setup_logging

setup_logging()

AGENT_ICONS = {
    "Proponent": "🟢",
    "Opponent": "🔴",
    "Moderator": "⚖️",
    "Judge": "📋",
}

AGENT_COLORS = {
    "Proponent": "#e8f5e9",
    "Opponent": "#ffebee",
    "Moderator": "#e3f2fd",
    "Judge": "#fff8e1",
}

DEBATE_RULES = """
**Debate Rules**

1. The **Proponent** defends the motion; the **Opponent** challenges it.
2. The **Moderator** manages process and remains neutral throughout.
3. The **Judge** evaluates arguments and assigns scores at defined checkpoints.
4. All agents must stay in their assigned roles for the entire debate.
5. Acknowledgments of strong points must be immediately followed by rebuttal.
6. No fabricated citations, statistics, or quotations are permitted.
7. Scoring uses a 100-point weighted rubric across six categories.
8. The orchestrator controls turn order — agents do not choose the next speaker.

**Round Structure (Default)**
- Round 0: Moderator Introduction
- Round 1: Opening Statements + Judge scoring
- Round 2: Evidence and Main Case + Judge scoring
- Round 3: Rebuttals + Judge scoring
- Round 4: Cross-Examination + Judge scoring
- Round 5: Final Rebuttal + Judge scoring
- Round 6: Closing Statements + Final Verdict
"""


def init_session_state() -> None:
    """Initialize Streamlit session state."""
    defaults = {
        "debate_state": None,
        "debate_running": False,
        "debate_error": None,
        "orchestrator": None,
    }
    for key, val in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = val


def render_agent_message(msg: dict) -> None:
    """Render a single debate message in a styled container."""
    agent = msg.get("agent", "Unknown")
    if hasattr(agent, "value"):
        agent = agent.value
    icon = AGENT_ICONS.get(agent, "💬")
    bg = AGENT_COLORS.get(agent, "#f5f5f5")
    rnd = msg.get("round_number", "?")
    rnd_name = msg.get("round_name", "")
    content = msg.get("content", "")
    passed = msg.get("role_check_passed", True)

    status_badge = "✓ Role OK" if passed else "⚠ Role issue detected"
    st.markdown(
        f"""<div style="background-color:{bg}; padding:16px; border-radius:8px;
        border-left:4px solid #555; margin-bottom:12px;">
        <strong>{icon} {agent}</strong> — Round {rnd}: {rnd_name}<br>
        <small>{status_badge}</small>
        </div>""",
        unsafe_allow_html=True,
    )
    st.markdown(content)


def render_scorecard(state: dict) -> None:
    """Render live scorecard and chart."""
    round_scores = state.get("round_scores", [])
    if not round_scores:
        return

    st.subheader("📊 Live Scorecard")
    rows = []
    for rs in round_scores:
        if hasattr(rs, "model_dump"):
            rs = rs.model_dump()
        rows.append({
            "Round": rs["round_number"],
            "Proponent": rs["proponent"]["weighted_total"],
            "Opponent": rs["opponent"]["weighted_total"],
            "Leader": rs["round_leader"],
        })
    st.table(rows)

    cumulative = state.get("cumulative_scores", {})
    if hasattr(cumulative, "model_dump"):
        cumulative = cumulative.model_dump()

    chart_data = {
        "Round": [r["Round"] for r in rows],
        "Proponent": [r["Proponent"] for r in rows],
        "Opponent": [r["Opponent"] for r in rows],
    }
    st.line_chart(chart_data, x="Round", y=["Proponent", "Opponent"])

    st.metric(
        "Cumulative Average",
        f"Proponent: {cumulative.get('proponent', 0)} | Opponent: {cumulative.get('opponent', 0)}",
    )


def render_final_verdict(state: dict) -> None:
    """Render final verdict section."""
    verdict = state.get("final_verdict")
    if not verdict:
        return
    if hasattr(verdict, "model_dump"):
        verdict = verdict.model_dump()

    st.subheader("🏆 Final Verdict")
    col1, col2, col3 = st.columns(3)
    col1.metric("Winner", verdict.get("winner", "N/A"))
    col2.metric("Proponent Score", f"{verdict.get('proponent_final_score', 0):.1f}")
    col3.metric("Opponent Score", f"{verdict.get('opponent_final_score', 0):.1f}")
    st.progress(verdict.get("confidence", 0.5), text=f"Confidence: {verdict.get('confidence', 0):.0%}")

    st.markdown(f"**Decision Summary:** {verdict.get('decision_summary', '')}")

    col_a, col_b = st.columns(2)
    with col_a:
        st.markdown("**Decisive Factors**")
        for f in verdict.get("decisive_factors", []):
            st.markdown(f"- {f}")
        st.markdown(f"**Proponent's Best Argument:** {verdict.get('proponent_best_argument', '')}")
    with col_b:
        st.markdown("**Limitations**")
        for l in verdict.get("major_limitations", []):
            st.markdown(f"- {l}")
        st.markdown(f"**Opponent's Best Argument:** {verdict.get('opponent_best_argument', '')}")


def render_failure_analysis(state: dict) -> None:
    """Render expandable failure analysis section."""
    violations = state.get("violations", [])
    if not violations:
        return

    with st.expander("🔍 Failure Analysis — Role Violations", expanded=False):
        for v in violations:
            if hasattr(v, "model_dump"):
                v = v.model_dump()
            agent = v.get("agent", "Unknown")
            if hasattr(agent, "value"):
                agent = agent.value
            st.markdown(
                f"**{agent}** — Round {v.get('round_number')} — "
                f"Type: `{v.get('violation_type')}`"
            )
            st.markdown(f"*Excerpt:* {v.get('excerpt', '')}")
            st.markdown(f"*Corrective action:* {v.get('corrective_action', '')}")
            if v.get("retry_attempted"):
                status = "Succeeded" if v.get("retry_succeeded") else "Failed"
                st.markdown(f"*Retry:* {status}")
            st.divider()


def render_debate_messages(state: dict) -> None:
    """Render all debate messages grouped by agent sections."""
    messages = state.get("messages", [])
    if not messages:
        st.info("No messages yet. Start a debate to begin.")
        return

    for msg in messages:
        if hasattr(msg, "model_dump"):
            msg = msg.model_dump()
        render_agent_message(msg)


def main() -> None:
    """Main Streamlit application entry point."""
    st.set_page_config(
        page_title="ArgueBot",
        page_icon="🎙️",
        layout="wide",
    )
    init_session_state()
    config = load_config()

    st.title("ArgueBot: Multi-Agent Debate System")
    st.markdown(
        "A four-agent autonomous debate system featuring a **Proponent**, **Opponent**, "
        "**Moderator**, and **Scoring Judge**. Enter any motion and watch structured "
        "multi-round debate unfold with live scoring."
    )

    # Sidebar configuration
    with st.sidebar:
        st.header("Configuration")
        demo_mode = st.checkbox(
            "Demo Mode (prerecorded)",
            value=not config.has_api_key,
            help="Load a saved example debate. No API key required. Clearly simulated data.",
        )
        if config.has_api_key:
            st.success(f"Model: `{config.groq_model}`")
        else:
            st.warning("No API key detected. Enable Demo Mode or set GROQ_API_KEY.")

        motion = st.text_input(
            "Debate Motion",
            placeholder="Universities should permit students to use generative AI for graded assignments.",
        )
        background = st.text_area("Background Context (optional)", height=80)
        style = st.selectbox(
            "Debate Style",
            [s.value for s in DebateStyle],
            index=0,
        )
        num_rounds = st.slider("Number of Rounds", min_value=6, max_value=10, value=6)
        response_length = st.selectbox(
            "Response Length",
            [r.value for r in ResponseLength],
            index=1,
        )
        stress_test = st.checkbox(
            "Stress Test Role Consistency",
            value=False,
            help="Inject adversarial instructions to test persona-collapse prevention. Off by default.",
        )

        col_start, col_stop = st.columns(2)
        with col_start:
            start_clicked = st.button("▶ Start Debate", type="primary", use_container_width=True)
        with col_stop:
            stop_clicked = st.button("⏹ Reset", use_container_width=True)

    with st.expander("📜 Debate Rules"):
        st.markdown(DEBATE_RULES)

    if stop_clicked:
        st.session_state.debate_state = None
        st.session_state.debate_running = False
        st.session_state.debate_error = None
        st.rerun()

    if start_clicked:
        if demo_mode:
            sample_path = ROOT / "examples" / "sample_debate.json"
            try:
                state = DebateOrchestrator.load_demo_state(str(sample_path))
                st.session_state.debate_state = state.model_dump(mode="json")
                st.session_state.debate_running = False
                st.session_state.debate_error = None
            except Exception as exc:
                st.session_state.debate_error = str(exc)
        else:
            if not config.has_api_key:
                st.session_state.debate_error = "Groq API key is required. Set GROQ_API_KEY or use Demo Mode."
            elif not motion or len(motion.strip()) < 10:
                st.session_state.debate_error = "Please enter a debate motion of at least 10 characters."
            else:
                try:
                    debate_config = DebateConfig(
                        topic=motion,
                        background_context=background,
                        style=DebateStyle(style),
                        configured_rounds=num_rounds,
                        response_length=ResponseLength(response_length),
                        stress_test=stress_test,
                    )
                    orchestrator = DebateOrchestrator(config)
                    st.session_state.debate_running = True
                    st.session_state.debate_error = None

                    live_container = st.empty()
                    status_container = st.empty()

                    def on_turn(state_obj) -> None:
                        st.session_state.debate_state = state_obj.model_dump(mode="json")
                        with live_container.container():
                            status_container.info(
                                f"Round {state_obj.current_round} — "
                                f"Processing... ({len(state_obj.messages)} messages)"
                            )

                    orchestrator.set_turn_callback(on_turn)
                    final_state = orchestrator.run_debate(debate_config)
                    st.session_state.debate_state = final_state.model_dump(mode="json")
                    st.session_state.debate_running = False
                except ValueError as exc:
                    st.session_state.debate_error = str(exc)
                    st.session_state.debate_running = False
                except Exception as exc:
                    st.session_state.debate_error = f"Debate failed: {exc}"
                    st.session_state.debate_running = False

    if st.session_state.debate_error:
        st.error(st.session_state.debate_error)

    state = st.session_state.debate_state
    if state:
        if demo_mode and start_clicked:
            st.info("📼 **Demo Mode** — This is prerecorded example data, not a live API debate.")

        status = state.get("status", "pending")
        current_round = state.get("current_round", 0)
        if st.session_state.debate_running:
            st.warning(f"⏳ Debate in progress — Round {current_round}...")
        elif status == "completed":
            st.success("✅ Debate completed.")
        elif status == "stopped":
            st.warning("⏹ Debate stopped by user.")

        render_scorecard(state)

        st.subheader("Debate Transcript")
        tabs = st.tabs(["All Messages", "Proponent", "Opponent", "Moderator", "Judge"])
        messages = state.get("messages", [])
        with tabs[0]:
            render_debate_messages(state)
        for i, agent_name in enumerate(["Proponent", "Opponent", "Moderator", "Judge"], 1):
            with tabs[i]:
                agent_msgs = [
                    m for m in messages
                    if (m.get("agent") if isinstance(m, dict) else m.agent.value if hasattr(m, "agent") else "") == agent_name
                    or (hasattr(m, "agent") and m.agent.value == agent_name)
                ]
                if not agent_msgs:
                    st.info(f"No {agent_name} messages yet.")
                for msg in agent_msgs:
                    m = msg if isinstance(msg, dict) else msg.model_dump()
                    render_agent_message(m)

        render_final_verdict(state)
        render_failure_analysis(state)

        # Downloads
        st.subheader("📥 Export")
        col_md, col_json = st.columns(2)
        md_content = export_transcript_markdown(state)
        json_content = export_debate_json(state)
        with col_md:
            st.download_button(
                "Download Transcript (Markdown)",
                md_content,
                file_name="arguebot_transcript.md",
                mime="text/markdown",
            )
        with col_json:
            st.download_button(
                "Download Debate Record (JSON)",
                json_content,
                file_name="arguebot_debate.json",
                mime="application/json",
            )


if __name__ == "__main__":
    main()
