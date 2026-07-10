import { AGENT_META, type AgentRole } from '../types'

interface Props {
  agent: AgentRole
  size?: number
  className?: string
}

export default function AgentAvatar({ agent, size = 32, className = '' }: Props) {
  const meta = AGENT_META[agent]

  return (
    <div
      className={`agent-avatar ${className}`.trim()}
      style={{ width: size, height: size, background: meta.color }}
      title={`${meta.name} (${agent})`}
    >
      <img src={meta.image} alt={meta.name} width={size * 0.7} height={size * 0.7} draggable={false} />
    </div>
  )
}
