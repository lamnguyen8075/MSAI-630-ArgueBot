interface Props {
  roundScores: { round_number: number }[]
  cumulative: { proponent: number; opponent: number; rounds_scored: number }
}

export default function ScorePanel({ cumulative }: Props) {
  return (
    <div className="score-simple">
      <div className="score-side proponent">
        <span className="score-label">Proponent</span>
        <span className="score-num">{cumulative.proponent.toFixed(1)}</span>
      </div>
      <span className="score-vs">vs</span>
      <div className="score-side opponent">
        <span className="score-label">Opponent</span>
        <span className="score-num">{cumulative.opponent.toFixed(1)}</span>
      </div>
    </div>
  )
}
