import { useCallback, useEffect, useRef, useState } from 'react'
import {
  connectDebateStream,
  fetchHealth,
  loadDemo,
  startDebate,
  stopDebate,
} from '../api/client'
import type { DebateState, HealthResponse, StartDebateRequest } from '../types'

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
  const [activeAgent, setActiveAgent] = useState<string | null>(null)
  const disconnectRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => setHealth({ status: 'error', has_api_key: false, model: 'unknown' }))
  }, [])

  const cleanup = useCallback(() => {
    disconnectRef.current?.()
    disconnectRef.current = null
  }, [])

  useEffect(() => cleanup, [cleanup])

  const handleWsEvent = useCallback((event: { type: string; state?: DebateState; error?: string }) => {
    if (event.state) {
      setState(event.state)
      const lastMsg = event.state.messages[event.state.messages.length - 1]
      if (lastMsg && event.type === 'update') {
        setActiveAgent(lastMsg.agent)
      }
    }
    if (event.type === 'completed' || event.type === 'stopped' || event.type === 'error') {
      setIsRunning(false)
      setActiveAgent(null)
      if (event.error) setError(formatError(event.error))
      cleanup()
    }
  }, [cleanup])

  const runLive = useCallback(async (config: StartDebateRequest) => {
    setError(null)
    setIsDemo(false)
    setIsRunning(true)
    setState(null)
    cleanup()

    try {
      const { debate_id } = await startDebate(config)
      disconnectRef.current = connectDebateStream(
        debate_id,
        handleWsEvent,
        (err) => { setError(formatError(err)); setIsRunning(false) },
      )
    } catch (err) {
      setError(formatError(err))
      setIsRunning(false)
    }
  }, [cleanup, handleWsEvent])

  const runDemo = useCallback(async () => {
    setError(null)
    setIsDemo(true)
    setIsRunning(false)
    cleanup()
    try {
      const { state: demoState } = await loadDemo()
      setState(demoState)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo load failed')
    }
  }, [cleanup])

  const reset = useCallback(() => {
    cleanup()
    setState(null)
    setError(null)
    setIsRunning(false)
    setIsDemo(false)
    setActiveAgent(null)
  }, [cleanup])

  const stop = useCallback(async () => {
    if (state?.debate_id) await stopDebate(state.debate_id)
    setIsRunning(false)
  }, [state?.debate_id])

  return {
    health,
    state,
    isRunning,
    isDemo,
    error,
    activeAgent,
    runLive,
    runDemo,
    reset,
    stop,
  }
}
