import { AGENT_META, type AgentRole, type DebateMessage } from '../types'

interface Props {
  message: DebateMessage
}

export default function AgentCard({ message }: Props) {
  const meta = AGENT_META[message.agent as AgentRole] ?? AGENT_META.Moderator

  return (
    <article className="msg" style={{ borderLeftColor: meta.border }}>
      <header className="msg-header">
        <strong>{message.agent}</strong>
        <span>
          R{message.round_number} · {message.round_name}
        </span>
      </header>
      <p className="msg-body">{message.content}</p>
    </article>
  )
}
