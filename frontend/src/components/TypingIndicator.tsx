import { AGENT_META, type AgentRole } from '../types'
import AgentAvatar from './AgentAvatar'

interface Props {
  agent: AgentRole
  roundName?: string
}

export default function TypingIndicator({ agent, roundName }: Props) {
  const meta = AGENT_META[agent]

  return (
    <div className={`typing-row align-${agent.toLowerCase()}`}>
      <AgentAvatar agent={agent} className="typing-avatar" />
      <div className="typing-bubble">
        <span className="typing-name">{meta.name}</span>
        {roundName && <span className="typing-round">{roundName}</span>}
        <span className="typing-dots">
          <span />
          <span />
          <span />
        </span>
      </div>
    </div>
  )
}
