import { AGENT_META, type AgentRole, type DebateMessage } from '../types'
import { useTypewriter } from '../hooks/useTypewriter'
import AgentAvatar from './AgentAvatar'

interface Props {
  message: DebateMessage
  animate: boolean
}

function alignment(agent: AgentRole): string {
  if (agent === 'Opponent') return 'right'
  if (agent === 'Moderator' || agent === 'Judge') return 'center'
  return 'left'
}

export default function ChatBubble({ message, animate }: Props) {
  const meta = AGENT_META[message.agent]
  const displayed = useTypewriter(message.content, animate, 8)
  const align = alignment(message.agent)

  return (
    <div className={`bubble-row align-${align}`}>
      {align !== 'right' && <AgentAvatar agent={message.agent} className="bubble-avatar" />}
      <div className="bubble-content">
        <div className="bubble-meta">
          <strong>{meta.name}</strong>
          <span>
            {message.agent} · Round {message.round_number}
          </span>
        </div>
        <div className="bubble-text" style={{ borderColor: meta.border }}>
          {displayed}
          {animate && displayed.length < message.content.length && (
            <span className="cursor-blink">|</span>
          )}
        </div>
      </div>
      {align === 'right' && <AgentAvatar agent={message.agent} className="bubble-avatar" />}
    </div>
  )
}
