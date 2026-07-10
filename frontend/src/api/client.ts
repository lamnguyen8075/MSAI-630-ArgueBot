import type { DebateState, HealthResponse, StartDebateRequest, WsEvent } from './types'

const API_BASE = ''

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/api/health`)
  if (!res.ok) throw new Error('API unavailable')
  return res.json()
}

export async function startDebate(config: StartDebateRequest): Promise<{ debate_id: string }> {
  const res = await fetch(`${API_BASE}/api/debates/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to start debate')
  return data
}

export async function loadDemo(): Promise<{ debate_id: string; state: DebateState }> {
  const res = await fetch(`${API_BASE}/api/debates/demo`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to load demo')
  return res.json()
}

export async function stopDebate(debateId: string): Promise<void> {
  await fetch(`${API_BASE}/api/debates/${debateId}/stop`, { method: 'POST' })
}

export function connectDebateStream(
  debateId: string,
  onEvent: (event: WsEvent) => void,
  onError: (err: string) => void,
): () => void {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const host = window.location.host
  const ws = new WebSocket(`${protocol}://${host}/ws/debate/${debateId}`)

  ws.onmessage = (msg) => {
    try {
      onEvent(JSON.parse(msg.data))
    } catch {
      onError('Invalid WebSocket message')
    }
  }

  ws.onerror = () => onError('WebSocket connection failed')

  return () => ws.close()
}

export function downloadExport(debateId: string, format: 'markdown' | 'json'): void {
  const path = format === 'markdown' ? 'markdown' : 'json'
  const ext = format === 'markdown' ? 'md' : 'json'
  const a = document.createElement('a')
  a.href = `${API_BASE}/api/debates/${debateId}/export/${path}`
  a.download = `arguebot_debate.${ext}`
  a.click()
}
