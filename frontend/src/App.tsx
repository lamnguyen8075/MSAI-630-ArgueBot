import { useEffect, useState } from 'react'
import './App.css'
import './components.css'
import Transcript from './components/Transcript'
import ScorePanel from './components/ScorePanel'
import VerdictPanel from './components/VerdictPanel'
import ExportButtons from './components/ExportButtons'
import { useDebate } from './hooks/useDebate'

const DEFAULT_MOTION =
  'Universities should permit students to use generative AI tools for graded assignments.'

export default function App() {
  const { health, state, isRunning, isDemo, error, activeAgent, runLive, runDemo, reset } =
    useDebate()

  const [motion, setMotion] = useState(DEFAULT_MOTION)
  const [demoMode, setDemoMode] = useState(true)

  useEffect(() => {
    if (health) setDemoMode(!health.has_api_key)
  }, [health])

  const handleStart = () => {
    if (demoMode) {
      runDemo()
      return
    }
    if (motion.trim().length < 10) return
    runLive({
      topic: motion.trim(),
      background_context: '',
      style: 'Academic',
      configured_rounds: 6,
      response_length: 'Concise',
      stress_test: false,
    })
  }

  const lastMsg = state?.messages[state.messages.length - 1]
  const statusLabel = isRunning
    ? `Round ${state?.current_round ?? 0}/6 · ${activeAgent ?? 'Working'}…`
    : state?.status === 'completed'
      ? 'Complete'
      : state
        ? state.status
        : 'Ready'

  return (
    <div className="app">
      <header className="app-header">
        <h1>ArgueBot</h1>
        <p>Four AI agents debate your motion. Optimized for Groq free tier.</p>
      </header>

      <section className="controls">
        <label htmlFor="motion">Motion</label>
        <textarea
          id="motion"
          rows={2}
          value={motion}
          onChange={(e) => setMotion(e.target.value)}
          disabled={isRunning}
          placeholder={DEFAULT_MOTION}
        />

        <div className="controls-row">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={demoMode}
              onChange={(e) => setDemoMode(e.target.checked)}
              disabled={isRunning}
            />
            Demo Mode (no API calls)
          </label>
          <div className="btn-group">
            <button className="btn-primary" onClick={handleStart} disabled={isRunning}>
              {isRunning ? 'Running…' : 'Start'}
            </button>
            <button className="btn-secondary" onClick={reset} disabled={isRunning}>
              Reset
            </button>
          </div>
        </div>

        <p className="tier-note">
          Free Groq allows ~12K tokens/min. Live debates use short responses, 6 rounds,
          and ~12s between API calls (~5 min total). Hit rate limits? Wait a minute or use Demo Mode.
        </p>

        {health && (
          <p className={`api-line ${health.has_api_key ? 'ok' : 'warn'}`}>
            {health.has_api_key
              ? `Connected · ${health.model}`
              : 'No API key — enable Demo Mode'}
          </p>
        )}
      </section>

      {error && <div className="error-banner">{error}</div>}
      {isDemo && state && <div className="info-banner">Demo Mode — prerecorded sample debate.</div>}

      {state && (
        <section className="status-line">
          <span className={`status-pill ${isRunning ? 'live' : ''}`}>{statusLabel}</span>
          {lastMsg && isRunning && (
            <span className="status-detail">{lastMsg.round_name}</span>
          )}
        </section>
      )}

      {state && state.round_scores.length > 0 && (
        <ScorePanel
          roundScores={state.round_scores}
          cumulative={state.cumulative_scores}
        />
      )}

      {state ? (
        <>
          <h2 className="section-heading">Transcript</h2>
          <Transcript messages={state.messages} isRunning={isRunning} />
          {state.final_verdict && <VerdictPanel verdict={state.final_verdict} />}
          {state.status === 'completed' && (
            <div className="export-row">
              <ExportButtons debateId={state.debate_id} />
            </div>
          )}
        </>
      ) : (
        <div className="empty">
          <p>Enter a motion and press Start, or use Demo Mode to preview a sample debate.</p>
        </div>
      )}
    </div>
  )
}
