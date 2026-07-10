import type { HealthResponse } from '../types'

interface Props {
  health: HealthResponse | null
  motion: string
  background: string
  style: string
  rounds: number
  responseLength: string
  stressTest: boolean
  demoMode: boolean
  presentationMode: boolean
  isRunning: boolean
  onMotionChange: (v: string) => void
  onBackgroundChange: (v: string) => void
  onStyleChange: (v: string) => void
  onRoundsChange: (v: number) => void
  onResponseLengthChange: (v: string) => void
  onStressTestChange: (v: boolean) => void
  onDemoModeChange: (v: boolean) => void
  onPresentationModeChange: (v: boolean) => void
  onStart: () => void
  onStop: () => void
  onReset: () => void
}

export default function Sidebar({
  health,
  motion,
  background,
  style,
  rounds,
  responseLength,
  stressTest,
  demoMode,
  presentationMode,
  isRunning,
  onMotionChange,
  onBackgroundChange,
  onStyleChange,
  onRoundsChange,
  onResponseLengthChange,
  onStressTestChange,
  onDemoModeChange,
  onPresentationModeChange,
  onStart,
  onStop,
  onReset,
}: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-mark">AB</div>
        <div>
          <h2>ArgueBot</h2>
          <span>Control Panel</span>
        </div>
      </div>

      {health && (
        <div className={`api-status ${health.has_api_key ? 'ok' : 'warn'}`}>
          {health.has_api_key ? (
            <>API connected · <code>{health.model}</code></>
          ) : (
            <>No API key — use Demo Mode</>
          )}
        </div>
      )}

      <div className="field">
        <label htmlFor="motion">Debate Motion</label>
        <textarea
          id="motion"
          rows={3}
          value={motion}
          onChange={(e) => onMotionChange(e.target.value)}
          placeholder="Universities should permit students to use generative AI tools for graded assignments."
          disabled={isRunning}
        />
      </div>

      <div className="field">
        <label htmlFor="background">Background Context</label>
        <textarea
          id="background"
          rows={2}
          value={background}
          onChange={(e) => onBackgroundChange(e.target.value)}
          placeholder="Optional context..."
          disabled={isRunning}
        />
      </div>

      <div className="field">
        <label htmlFor="style">Debate Style</label>
        <select id="style" value={style} onChange={(e) => onStyleChange(e.target.value)} disabled={isRunning}>
          <option>Academic</option>
          <option>Policy</option>
          <option>Business</option>
          <option>Casual</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="rounds">Rounds ({rounds})</label>
        <input
          id="rounds"
          type="range"
          min={6}
          max={10}
          value={rounds}
          onChange={(e) => onRoundsChange(Number(e.target.value))}
          disabled={isRunning}
        />
      </div>

      <div className="field">
        <label htmlFor="length">Response Length</label>
        <select
          id="length"
          value={responseLength}
          onChange={(e) => onResponseLengthChange(e.target.value)}
          disabled={isRunning}
        >
          <option>Concise</option>
          <option>Standard</option>
          <option>Detailed</option>
        </select>
      </div>

      <div className="checkbox-row">
        <input
          id="demo"
          type="checkbox"
          checked={demoMode}
          onChange={(e) => onDemoModeChange(e.target.checked)}
          disabled={isRunning}
        />
        <label htmlFor="demo">Demo Mode (prerecorded sample)</label>
      </div>

      <div className="checkbox-row">
        <input
          id="stress"
          type="checkbox"
          checked={stressTest}
          onChange={(e) => onStressTestChange(e.target.checked)}
          disabled={isRunning || demoMode}
        />
        <label htmlFor="stress">Stress Test Role Consistency</label>
      </div>

      <div className="checkbox-row">
        <input
          id="presentation"
          type="checkbox"
          checked={presentationMode}
          onChange={(e) => onPresentationModeChange(e.target.checked)}
        />
        <label htmlFor="presentation">Presentation Mode (hide sidebar)</label>
      </div>

      <div className="sidebar-actions">
        <button className="btn-primary" onClick={onStart} disabled={isRunning}>
          {isRunning ? 'Running…' : '▶ Start Debate'}
        </button>
        <div className="btn-row">
          <button className="btn-secondary" onClick={onStop} disabled={!isRunning}>
            Stop
          </button>
          <button className="btn-secondary" onClick={onReset}>
            Reset
          </button>
        </div>
      </div>
    </aside>
  )
}
