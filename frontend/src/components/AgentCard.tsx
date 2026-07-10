import { AGENT_META, type AgentRole, type DebateMessage } from '../types'

interface Props {
  message: DebateMessage
}

export default function AgentCard({ message }: Props) {
  const meta = AGENT_META[message.agent as AgentRole] ?? AGENT_META.Moderator

  return (
    <article
      className="agent-card"
      style={{ borderLeftColor: meta.border, background: meta.color }}
    >
      <header className="agent-card-header">
        <div className="agent-identity">
          <span className="agent-avatar" style={{ background: meta.border }}>
            {meta.icon}
          </span>
          <div>
            <strong>{message.agent}</strong>
            <span className="agent-round">
              Round {message.round_number} · {message.round_name}
            </span>
          </div>
        </div>
        <span className={`role-badge ${message.role_check_passed ? 'ok' : 'warn'}`}>
          {message.role_check_passed ? '✓ Role OK' : '⚠ Role issue'}
        </span>
      </header>
      <div className="agent-card-body">
        {message.content.split('\n').map((line, i) => (
          <p key={i}>{line || '\u00A0'}</p>
        ))}
      </div>
    </article>
  )
}
