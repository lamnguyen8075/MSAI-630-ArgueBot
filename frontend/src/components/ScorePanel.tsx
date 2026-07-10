import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { RoundScore } from '../types'

interface Props {
  roundScores: RoundScore[]
  cumulative: { proponent: number; opponent: number; rounds_scored: number }
}

export default function ScorePanel({ roundScores, cumulative }: Props) {
  if (!roundScores.length) return null

  const chartData = roundScores.map((rs) => ({
    round: rs.round_number,
    Proponent: rs.proponent.weighted_total,
    Opponent: rs.opponent.weighted_total,
  }))

  return (
    <div className="score-panel">
      <h3 className="panel-title">Live Scorecard</h3>

      <div className="cumulative-metrics">
        <div className="metric proponent">
          <span className="metric-label">Proponent</span>
          <span className="metric-value">{cumulative.proponent.toFixed(1)}</span>
        </div>
        <div className="metric vs">vs</div>
        <div className="metric opponent">
          <span className="metric-label">Opponent</span>
          <span className="metric-value">{cumulative.opponent.toFixed(1)}</span>
        </div>
      </div>

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
            <XAxis dataKey="round" stroke="#8b949e" fontSize={12} />
            <YAxis domain={[0, 100]} stroke="#8b949e" fontSize={12} />
            <Tooltip
              contentStyle={{ background: '#1c2128', border: '1px solid #30363d', borderRadius: 8 }}
            />
            <Legend />
            <Line type="monotone" dataKey="Proponent" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="Opponent" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <table className="score-table">
        <thead>
          <tr>
            <th>Round</th>
            <th>Proponent</th>
            <th>Opponent</th>
            <th>Leader</th>
          </tr>
        </thead>
        <tbody>
          {roundScores.map((rs) => (
            <tr key={rs.round_number}>
              <td>{rs.round_number}</td>
              <td className="score-prop">{rs.proponent.weighted_total.toFixed(1)}</td>
              <td className="score-opp">{rs.opponent.weighted_total.toFixed(1)}</td>
              <td>{rs.round_leader}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
