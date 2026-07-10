import { useCallback, useEffect, useRef, useState } from 'react'
import {
  connectDebateStream,
  fetchHealth,
  loadDemo,
  startDebate,
  stopDebate,
} from '../api/client'
import { getNextAgent } from '../turnPlan'
import type { AgentRole, DebateState, HealthResponse, StartDebateRequest } from '../types'

function formatError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg.includes('rate limit') || msg.includes('429') || msg.includes('tokens/min')) {
    return 'Groq rate limit hit. Wait about a minute, then try again — or use Demo Mode.'
  }
  return msg
}

export function useDebate() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [state, setState] = useState<DebateState | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isDemo, setIsDemo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [topic, setTopic] = useState<string | null>(null)
  const [typingAgent, setTypingAgent] = useState<AgentRole | null>(null)
  const [visibleCount, setVisibleCount] = useState(0)
  const [animatingIndex, setAnimatingIndex] = useState<number | null>(null)
  const disconnectRef = useRef<(() => void) | null>(null)
  const demoTimerRef = useRef<number | null>(null)
  const prevMessageCount = useRef(0)

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => setHealth({ status: 'error', has_api_key: false, model: 'unknown' }))
  }, [])

  const cleanup = useCallback(() => {
    disconnectRef.current?.()
    disconnectRef.current = null
    if (demoTimerRef.current !== null) {
      window.clearInterval(demoTimerRef.current)
      demoTimerRef.current = null
    }
  }, [])

  useEffect(() => cleanup, [cleanup])

  const updateTyping = useCallback((messageCount: number, running: boolean) => {
    setTypingAgent(running ? getNextAgent(messageCount) : null)
  }, [])

  const handleWsEvent = useCallback(
    (event: { type: string; state?: DebateState; error?: string }) => {
      if (event.state) {
        const count = event.state.messages.length
        if (count > prevMessageCount.current) {
          setAnimatingIndex(count - 1)
          prevMessageCount.current = count
        }
        setState(event.state)
        setVisibleCount(count)
        updateTyping(count, event.type === 'update' || event.type === 'started')
      }
      if (event.type === 'completed' || event.type === 'stopped' || event.type === 'error') {
        setIsRunning(false)
        setTypingAgent(null)
        setAnimatingIndex(null)
        if (event.error) setError(formatError(event.error))
        cleanup()
      }
    },
    [cleanup, updateTyping],
  )

  const runLive = useCallback(
    async (config: StartDebateRequest) => {
      setError(null)
      setIsDemo(false)
      setIsRunning(true)
      setState(null)
      setTopic(config.topic)
      setVisibleCount(0)
      setAnimatingIndex(null)
      prevMessageCount.current = 0
      updateTyping(0, true)
      cleanup()

      try {
        const { debate_id } = await startDebate(config)
        disconnectRef.current = connectDebateStream(
          debate_id,
          handleWsEvent,
          (err) => {
            setError(formatError(err))
            setIsRunning(false)
            setTypingAgent(null)
          },
        )
      } catch (err) {
        setError(formatError(err))
        setIsRunning(false)
        setTypingAgent(null)
      }
    },
    [cleanup, handleWsEvent, updateTyping],
  )

  const runDemo = useCallback(async () => {
    setError(null)
    setIsDemo(true)
    setIsRunning(true)
    setVisibleCount(0)
    setAnimatingIndex(null)
    prevMessageCount.current = 0
    cleanup()

    try {
      const { state: demoState } = await loadDemo()
      setTopic(demoState.topic)
      setState(demoState)
      updateTyping(0, true)

      let index = 0
      demoTimerRef.current = window.setInterval(() => {
        index += 1
        setVisibleCount(index)
        setAnimatingIndex(index - 1)
        updateTyping(index, index < demoState.messages.length)

        if (index >= demoState.messages.length) {
          if (demoTimerRef.current !== null) {
            window.clearInterval(demoTimerRef.current)
            demoTimerRef.current = null
          }
          setIsRunning(false)
          setTypingAgent(null)
          setAnimatingIndex(null)
        }
      }, 900)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo load failed')
      setIsRunning(false)
    }
  }, [cleanup, updateTyping])

  const reset = useCallback(() => {
    cleanup()
    setState(null)
    setTopic(null)
    setError(null)
    setIsRunning(false)
    setIsDemo(false)
    setTypingAgent(null)
    setVisibleCount(0)
    setAnimatingIndex(null)
    prevMessageCount.current = 0
  }, [cleanup])

  const stop = useCallback(async () => {
    if (state?.debate_id) await stopDebate(state.debate_id)
    setIsRunning(false)
    setTypingAgent(null)
  }, [state?.debate_id])

  const visibleMessages = state?.messages.slice(0, visibleCount) ?? []

  useEffect(() => {
    if (animatingIndex === null || !state?.messages[animatingIndex]) return
    const len = state.messages[animatingIndex].content.length
    const timer = window.setTimeout(() => setAnimatingIndex(null), len * 8 + 300)
    return () => window.clearTimeout(timer)
  }, [animatingIndex, state])

  return {
    health,
    state,
    topic,
    isRunning,
    isDemo,
    error,
    typingAgent,
    visibleMessages,
    animatingIndex,
    runLive,
    runDemo,
    reset,
    stop,
  }
}
