import AgentCard from './AgentCard'
import type { DebateMessage } from '../types'

interface Props {
  messages: DebateMessage[]
  isRunning: boolean
}

export default function Transcript({ messages, isRunning }: Props) {
  if (!messages.length) {
    return <p className="transcript-empty">Waiting for first message…</p>
  }

  return (
    <div className="transcript-list">
      {messages.map((msg, i) => (
        <AgentCard key={i} message={msg} />
      ))}
      {isRunning && <p className="transcript-waiting">Generating next turn…</p>}
    </div>
  )
}
