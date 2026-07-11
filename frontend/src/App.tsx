import { useEffect, useState } from 'react'
import './App.css'
import ChatThread from './components/ChatThread'
import ChatComposer from './components/ChatComposer'
import ExportButtons from './components/ExportButtons'
import LoginPage from './components/LoginPage'
import Logo from './components/Logo'
import { useAuth } from './hooks/useAuth'
import { useDebate } from './hooks/useDebate'
import { SEED_MOTIONS } from './seedMotions'

export default function App() {
  const { user, loading: authLoading, loginSuccess, logout, refreshUser } = useAuth()
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

  const startDebate = async (text: string) => {
    const trimmed = text.trim()
    if (trimmed.length < 10) return

    setMotion(trimmed)

    if (demoMode) {
      runDemo()
      return
    }

    await runLive({
      topic: trimmed,
      background_context: '',
      style: 'Academic',
      configured_rounds: 6,
      response_length: 'Concise',
      stress_test: false,
    })
    await refreshUser()
  }

  const handleSeed = (seedTopic: string) => startDebate(seedTopic)

  if (authLoading) {
    return <div className="login-shell"><p className="login-sub">Loading…</p></div>
  }

  if (!user) {
    return <LoginPage onLogin={loginSuccess} />
  }

  const cumulative = state?.cumulative_scores
  const verdict = state?.final_verdict
  const displayTopic = topic ?? motion
  const showChat = state || isRunning
  const hasApiKey = health?.has_api_key ?? false
  const canRunLive = user.remaining_live_tests > 0

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <Logo size={28} isActive={isRunning} />
          <span className="brand-name">ArgueBot</span>
        </div>

        <div className="header-user">
          <span className="header-username">{user.username}</span>
          <span className="header-quota">
            {user.remaining_live_tests}/{user.max_live_tests} live tests left
          </span>
          <button type="button" className="header-logout" onClick={() => logout()}>
            Log out
          </button>
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
            {!canRunLive && hasApiKey && (
              <p className="hero-quota">No live tests left on this account. Demo Mode still works.</p>
            )}
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
        hasApiKey={hasApiKey && canRunLive}
        liveBlocked={hasApiKey && !canRunLive}
      />
    </div>
  )
}
