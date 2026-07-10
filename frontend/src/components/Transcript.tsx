import { useEffect, useRef, useState } from 'react'
import AgentCard from './AgentCard'
import type { AgentRole, DebateMessage } from '../types'

const TABS: Array<'All' | AgentRole> = ['All', 'Proponent', 'Opponent', 'Moderator', 'Judge']

interface Props {
  messages: DebateMessage[]
  isRunning: boolean
}

export default function Transcript({ messages, isRunning }: Props) {
  const [tab, setTab] = useState<'All' | AgentRole>('All')
  const bottomRef = useRef<HTMLDivElement>(null)

  const filtered =
    tab === 'All' ? messages : messages.filter((m) => m.agent === tab)

  useEffect(() => {
    if (isRunning) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length, isRunning])

  return (
    <div className="transcript">
      <div className="transcript-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={`tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="transcript-messages">
        {filtered.length === 0 ? (
          <p className="transcript-empty">No messages yet.</p>
        ) : (
          filtered.map((msg, i) => <AgentCard key={i} message={msg} />)
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
