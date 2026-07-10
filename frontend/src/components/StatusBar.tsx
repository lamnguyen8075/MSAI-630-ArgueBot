interface Props {
  status: string
  currentRound: number
  configuredRounds: number
  roundName: string
  activeAgent: string | null
  isRunning: boolean
  isDemo: boolean
  winner?: string
}

export default function StatusBar({
  status,
  currentRound,
  configuredRounds,
  roundName,
  activeAgent,
  isRunning,
  isDemo,
  winner,
}: Props) {
  const badgeClass = isRunning ? 'badge-live' : status === 'completed' ? 'badge-done' : 'badge-ready'
  const label = isRunning
    ? 'LIVE'
    : status === 'completed'
      ? 'COMPLETE'
      : status === 'stopped'
        ? 'STOPPED'
        : 'READY'

  return (
    <div className="status-bar">
      <div className={`badge ${badgeClass}`}>
        {isRunning && <span className="dot" />}
        {label}
      </div>
      {isDemo && <span className="status-chip demo">Demo — Prerecorded</span>}
      {isRunning && (
        <>
          <span className="status-divider" />
          <span>Round <strong>{currentRound}</strong> of {configuredRounds}</span>
          <span className="status-divider" />
          <span>{roundName || 'In progress'}</span>
          {activeAgent && (
            <>
              <span className="status-divider" />
              <span>Active: <strong>{activeAgent}</strong></span>
            </>
          )}
        </>
      )}
      {status === 'completed' && winner && (
        <>
          <span className="status-divider" />
          <span>Winner: <strong>{winner}</strong></span>
        </>
      )}
    </div>
  )
}
