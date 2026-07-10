import type { DebateState, HealthResponse, StartDebateRequest, WsEvent } from '../types'
import { apiUrl, wsUrl } from './config'

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(apiUrl('/api/health'))
  if (!res.ok) throw new Error('API unavailable')
  return res.json()
}

export async function startDebate(config: StartDebateRequest): Promise<{ debate_id: string }> {
  const res = await fetch(apiUrl('/api/debates/start'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to start debate')
  return data
}

export async function loadDemo(): Promise<{ debate_id: string; state: DebateState }> {
  const res = await fetch(apiUrl('/api/debates/demo'), { method: 'POST' })
  if (!res.ok) throw new Error('Failed to load demo')
  return res.json()
}

export async function stopDebate(debateId: string): Promise<void> {
  await fetch(apiUrl(`/api/debates/${debateId}/stop`), { method: 'POST' })
}

export function connectDebateStream(
  debateId: string,
  onEvent: (event: WsEvent) => void,
  onError: (err: string) => void,
): () => void {
  const ws = new WebSocket(wsUrl(`/ws/debate/${debateId}`))

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

export async function downloadExport(debateId: string, format: 'markdown' | 'json'): Promise<void> {
  const ext = format === 'markdown' ? 'md' : 'json'
  const res = await fetch(apiUrl(`/api/debates/${debateId}/export/${format === 'markdown' ? 'markdown' : 'json'}`))
  if (!res.ok) throw new Error('Export failed')

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `arguebot_debate.${ext}`
  anchor.click()
  URL.revokeObjectURL(url)
}
