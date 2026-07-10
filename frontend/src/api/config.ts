const rawApiUrl = import.meta.env.VITE_API_URL ?? ''

/** Backend origin for REST calls. Empty in local dev (Vite proxy). */
export const API_BASE = rawApiUrl.replace(/\/$/, '')

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`
}

export function wsUrl(path: string): string {
  if (API_BASE) {
    const url = new URL(API_BASE)
    const protocol = url.protocol === 'https:' ? 'wss' : 'ws'
    return `${protocol}://${url.host}${path}`
  }

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${window.location.host}${path}`
}

export function exportUrl(debateId: string, format: 'markdown' | 'json'): string {
  const path = format === 'markdown' ? 'markdown' : 'json'
  return apiUrl(`/api/debates/${debateId}/export/${path}`)
}
