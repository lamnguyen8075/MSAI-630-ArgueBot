import type { FinalVerdict } from '../types'

interface Props {
  verdict: FinalVerdict
}

export default function VerdictPanel({ verdict }: Props) {
  const pct = Math.round(verdict.confidence * 100)

  return (
    <div className="verdict-panel">
      <div className="verdict-hero">
        <span className="verdict-label">Final Verdict</span>
        <h2 className="verdict-winner">{verdict.winner}</h2>
        <div className="verdict-scores">
          <div>
            <span className="vs-label proponent">Proponent</span>
            <span className="vs-score">{verdict.proponent_final_score.toFixed(1)}</span>
          </div>
          <span className="vs-divider">vs</span>
          <div>
            <span className="vs-label opponent">Opponent</span>
            <span className="vs-score">{verdict.opponent_final_score.toFixed(1)}</span>
          </div>
        </div>
        <div className="confidence-bar">
          <div className="confidence-fill" style={{ width: `${pct}%` }} />
          <span>Confidence: {pct}%</span>
        </div>
      </div>

      <p className="verdict-summary">{verdict.decision_summary}</p>

      <div className="verdict-grid">
        <div>
          <h4>Decisive Factors</h4>
          <ul>
            {verdict.decisive_factors.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
          <h4>Proponent's Best Argument</h4>
          <p className="best-arg">{verdict.proponent_best_argument}</p>
        </div>
        <div>
          <h4>Limitations</h4>
          <ul>
            {verdict.major_limitations.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
          <h4>Opponent's Best Argument</h4>
          <p className="best-arg">{verdict.opponent_best_argument}</p>
        </div>
      </div>
    </div>
  )
}
