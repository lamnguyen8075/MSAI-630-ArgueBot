import { useEffect, useRef } from 'react'
import ChatBubble from './ChatBubble'
import TypingIndicator from './TypingIndicator'
import { USER_AVATAR } from '../types'
import type { AgentRole, DebateMessage } from '../types'

interface Props {
  topic: string
  messages: DebateMessage[]
  isRunning: boolean
  typingAgent: AgentRole | null
  animatingIndex: number | null
  showMotion: boolean
}

export default function ChatThread({
  topic,
  messages,
  isRunning,
  typingAgent,
  animatingIndex,
  showMotion,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, typingAgent, animatingIndex])

  return (
    <div className="chat-thread">
      {showMotion && (
        <div className="bubble-row align-right user-motion">
          <div className="bubble-content">
            <div className="bubble-meta">
              <strong>You</strong>
              <span>Debate motion</span>
            </div>
            <div className="bubble-text user-bubble">{topic}</div>
          </div>
          <div className="bubble-avatar user-avatar">
            <img src={USER_AVATAR} alt="You" width={22} height={22} draggable={false} />
          </div>
        </div>
      )}

      {messages.length === 0 && isRunning && typingAgent && (
        <div className="chat-kickoff">
          <p>Debate started — agents are taking the floor.</p>
        </div>
      )}

      {messages.map((msg, i) => {
        const showDivider =
          i === 0 || msg.round_number !== messages[i - 1].round_number
        return (
          <div key={`${msg.round_number}-${msg.agent}-${i}`}>
            {showDivider && (
              <div className="round-divider">
                <span>Round {msg.round_number}</span>
                <span>{msg.round_name}</span>
              </div>
            )}
            <ChatBubble message={msg} animate={animatingIndex === i} />
          </div>
        )
      })}

      {isRunning && typingAgent && (
        <TypingIndicator
          agent={typingAgent}
          roundName={
            messages.length > 0
              ? messages[messages.length - 1].round_name
              : 'Introduction'
          }
        />
      )}

      <div ref={bottomRef} />
    </div>
  )
}
