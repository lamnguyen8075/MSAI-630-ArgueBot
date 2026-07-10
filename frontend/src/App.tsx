import { useState } from 'react'
import './App.css'
import './components.css'
import Sidebar from './components/Sidebar'
import StatusBar from './components/StatusBar'
import RoundStepper from './components/RoundStepper'
import ScorePanel from './components/ScorePanel'
import Transcript from './components/Transcript'
import VerdictPanel from './components/VerdictPanel'
import FailureAnalysis from './components/FailureAnalysis'
import ExportButtons from './components/ExportButtons'
import RulesPanel from './components/RulesPanel'
import { useDebate } from './hooks/useDebate'

export default function App() {
  const {
    health,
    state,
    isRunning,
    isDemo,
    error,
    activeAgent,
    runLive,
    runDemo,
    reset,
    stop,
  } = useDebate()

  const [motion, setMotion] = useState(
    'Universities should permit students to use generative AI tools for graded assignments.',
  )
  const [background, setBackground] = useState('')
  const [style, setStyle] = useState('Academic')
  const [rounds, setRounds] = useState(6)
  const [responseLength, setResponseLength] = useState('Standard')
  const [stressTest, setStressTest] = useState(false)
  const [demoMode, setDemoMode] = useState(false)
  const [presentationMode, setPresentationMode] = useState(false)

  const handleStart = () => {
    if (demoMode) {
      runDemo()
      return
    }
    if (motion.trim().length < 10) return
    runLive({
      topic: motion.trim(),
      background_context: background,
      style,
      configured_rounds: rounds,
      response_length: responseLength,
      stress_test: stressTest,
    })
  }

  const lastMsg = state?.messages[state.messages.length - 1]
  const roundName = lastMsg?.round_name ?? ''

  return (
    <div className={`app-layout ${presentationMode ? 'presentation' : ''}`}>
      {!presentationMode && (
        <Sidebar
          health={health}
          motion={motion}
          background={background}
          style={style}
          rounds={rounds}
          responseLength={responseLength}
          stressTest={stressTest}
          demoMode={demoMode}
          presentationMode={presentationMode}
          isRunning={isRunning}
          onMotionChange={setMotion}
          onBackgroundChange={setBackground}
          onStyleChange={setStyle}
          onRoundsChange={setRounds}
          onResponseLengthChange={setResponseLength}
          onStressTestChange={setStressTest}
          onDemoModeChange={setDemoMode}
          onPresentationModeChange={setPresentationMode}
          onStart={handleStart}
          onStop={stop}
          onReset={reset}
        />
      )}

      <main className="main-content">
        <header className="page-header">
          <h1>ArgueBot: Multi-Agent Debate System</h1>
          <p>
            Four autonomous agents — Proponent, Opponent, Moderator, and Judge —
            conduct structured debates with live scoring and a final verdict.
          </p>
        </header>

        {presentationMode && (
          <button className="btn-exit-presentation" onClick={() => setPresentationMode(false)}>
            Exit Presentation Mode
          </button>
        )}

        {error && <div className="error-banner">{error}</div>}
        {isDemo && state && (
          <div className="info-banner">
            Demo Mode — This is prerecorded example data, not a live API debate.
          </div>
        )}

        {state ? (
          <>
            <StatusBar
              status={state.status}
              currentRound={state.current_round}
              configuredRounds={state.configured_rounds}
              roundName={roundName}
              activeAgent={activeAgent}
              isRunning={isRunning}
              isDemo={isDemo}
              winner={state.final_verdict?.winner}
            />

            <RoundStepper
              currentRound={state.current_round}
              configuredRounds={state.configured_rounds}
            />

            <ScorePanel
              roundScores={state.round_scores}
              cumulative={state.cumulative_scores}
            />

            <h3 className="section-title">Debate Transcript</h3>
            <Transcript messages={state.messages} isRunning={isRunning} />

            {state.final_verdict && <VerdictPanel verdict={state.final_verdict} />}
            <FailureAnalysis violations={state.violations} />

            {state.status === 'completed' && (
              <>
                <h3 className="section-title">Export</h3>
                <ExportButtons debateId={state.debate_id} />
              </>
            )}
          </>
        ) : (
          <div className="empty-state">
            <h2>Ready to Debate</h2>
            <p>
              Enter a motion in the sidebar and click Start Debate, or enable Demo Mode
              to load a sample debate instantly.
            </p>
          </div>
        )}

        <RulesPanel />
      </main>
    </div>
  )
}
