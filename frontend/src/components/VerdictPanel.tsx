import type { FinalVerdict } from '../types'

interface Props {
  verdict: FinalVerdict
}

export default function VerdictPanel({ verdict }: Props) {
  return (
    <div className="verdict-simple">
      <h2 className="section-heading">Verdict</h2>
      <p className="verdict-winner">
        Winner: <strong>{verdict.winner}</strong>
      </p>
      <p className="verdict-scores">
        {verdict.proponent_final_score.toFixed(1)} — {verdict.opponent_final_score.toFixed(1)}
      </p>
      <p className="verdict-summary">{verdict.decision_summary}</p>
    </div>
  )
}
