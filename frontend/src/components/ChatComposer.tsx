import { SEED_MOTIONS } from '../seedMotions'

interface Props {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onSeed: (topic: string) => void
  onNewChat: () => void
  onToggleDemo: () => void
  demoMode: boolean
  isRunning: boolean
  hasApiKey: boolean
  liveBlocked?: boolean
  placeholder?: string
}

export default function ChatComposer({
  value,
  onChange,
  onSubmit,
  onSeed,
  onNewChat,
  onToggleDemo,
  demoMode,
  isRunning,
  hasApiKey,
  liveBlocked = false,
  placeholder = 'Propose a debate motion…',
}: Props) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isRunning && value.trim().length >= 10) onSubmit()
    }
  }

  const canSend = !isRunning && value.trim().length >= 10

  return (
    <footer className="composer-dock">
      {!isRunning && (
        <div className="seed-scroll">
          {SEED_MOTIONS.map((seed) => (
            <button
              key={seed.label}
              type="button"
              className="seed-chip"
              onClick={() => onSeed(seed.topic)}
              disabled={isRunning}
            >
              {seed.label}
            </button>
          ))}
        </div>
      )}

      <div className="composer-box">
        <textarea
          className="composer-input"
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isRunning}
          placeholder={isRunning ? 'Debate in progress…' : placeholder}
        />
        <button
          type="button"
          className="composer-send"
          onClick={onSubmit}
          disabled={!canSend}
          aria-label="Start debate"
        >
          ↑
        </button>
      </div>

      <nav className="bottom-nav">
        <button type="button" className="nav-btn" onClick={onNewChat} disabled={isRunning}>
          New debate
        </button>
        <button
          type="button"
          className={`nav-btn ${demoMode ? 'active' : ''}`}
          onClick={onToggleDemo}
          disabled={isRunning}
        >
          {demoMode ? '● Demo on' : 'Demo off'}
        </button>
        <span className={`nav-status ${hasApiKey && !liveBlocked ? 'ok' : 'warn'}`}>
          {liveBlocked
            ? 'No live tests left'
            : hasApiKey
              ? 'Live ready'
              : 'No API key'}
        </span>
      </nav>
    </footer>
  )
}
