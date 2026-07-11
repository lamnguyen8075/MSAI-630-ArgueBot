import { useEffect, useState } from 'react'
import './App.css'
import ChatThread from './components/ChatThread'
import ChatComposer from './components/ChatComposer'
import ExportButtons from './components/ExportButtons'
import Logo from './components/Logo'
import { useDebate } from './hooks/useDebate'
import { SEED_MOTIONS } from './seedMotions'

export default function App() {
  const {
    health,
    state,
    topic,
    isRunning,
    isDemo,
    error,
    typingAgent,
    visibleMessages,
    animatingIndex,
    runLive,
    runDemo,
    reset,
  } = useDebate()

  const [motion, setMotion] = useState('')
  const [demoMode, setDemoMode] = useState(true)

  useEffect(() => {
    if (health) setDemoMode(!health.has_api_key)
  }, [health])

  const startDebate = (text: string) => {
    const trimmed = text.trim()
    if (trimmed.length < 10) return

    setMotion(trimmed)

    if (demoMode) {
      runDemo()
      return
    }

    runLive({
      topic: trimmed,
      background_context: '',
      style: 'Academic',
      configured_rounds: 6,
      response_length: 'Concise',
      stress_test: false,
    })
  }

  const handleSeed = (seedTopic: string) => startDebate(seedTopic)

  const cumulative = state?.cumulative_scores
  const verdict = state?.final_verdict
  const displayTopic = topic ?? motion
  const showChat = state || isRunning
  const hasApiKey = health?.has_api_key ?? false

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <Logo size={28} isActive={isRunning} />
          <span className="brand-name">ArgueBot</span>
        </div>

        {cumulative && cumulative.rounds_scored > 0 && (
          <div className="header-score">
            <span className="pro">{cumulative.proponent.toFixed(0)}</span>
            <span className="vs">vs</span>
            <span className="opp">{cumulative.opponent.toFixed(0)}</span>
          </div>
        )}

        <div className={`header-status ${isRunning ? 'live' : ''}`}>
          {isRunning ? 'Live' : state?.status === 'completed' ? 'Done' : ''}
        </div>
      </header>

      <main className="chat-main">
        {!showChat && (
          <div className="empty-hero">
            <Logo size={52} isActive={isRunning} />
            <h1>What should they debate?</h1>
            <p>Four AI agents argue your motion — turn by turn, like a live panel.</p>
            <div className="hero-seeds">
              {SEED_MOTIONS.slice(0, 4).map((seed) => (
                <button
                  key={seed.label}
                  type="button"
                  className="hero-seed"
                  onClick={() => handleSeed(seed.topic)}
                >
                  {seed.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {showChat && (
          <div className="chat-scroll">
            <ChatThread
              topic={displayTopic}
              messages={visibleMessages}
              isRunning={isRunning}
              typingAgent={typingAgent}
              animatingIndex={animatingIndex}
              showMotion
            />

            {error && <div className="inline-error">{error}</div>}
            {isDemo && !isRunning && state && (
              <div className="inline-info">Demo replay — no API calls used.</div>
            )}

            {verdict && !isRunning && (
              <div className="verdict-inline">
                <strong>{verdict.winner} wins</strong>
                <p>{verdict.decision_summary}</p>
                {state?.status === 'completed' && (
                  <ExportButtons debateId={state.debate_id} />
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <ChatComposer
        value={motion}
        onChange={setMotion}
        onSubmit={() => startDebate(motion)}
        onSeed={handleSeed}
        onNewChat={reset}
        onToggleDemo={() => setDemoMode((d) => !d)}
        demoMode={demoMode}
        isRunning={isRunning}
        hasApiKey={hasApiKey}
      />
    </div>
  )
}
