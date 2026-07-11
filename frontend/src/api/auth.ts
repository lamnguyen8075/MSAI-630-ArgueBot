import { apiUrl } from './config'

const TOKEN_KEY = 'arguebot_token'

export interface AuthUser {
  username: string
  remaining_live_tests: number
  max_live_tests: number
  live_tests_used?: number
}

export interface LoginResponse extends AuthUser {
  token: string
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function authHeaders(): Record<string, string> {
  const token = getStoredToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    const detail = data.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) return detail.map((d: { msg?: string }) => d.msg).join(', ')
  } catch {
    /* ignore */
  }
  return 'Request failed'
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(apiUrl('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  const data: LoginResponse = await res.json()
  setStoredToken(data.token)
  return data
}

export async function fetchMe(): Promise<AuthUser> {
  const res = await fetch(apiUrl('/api/auth/me'), { headers: authHeaders() })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function logout(): Promise<void> {
  const token = getStoredToken()
  if (token) {
    await fetch(apiUrl('/api/auth/logout'), {
      method: 'POST',
      headers: authHeaders(),
    }).catch(() => {})
  }
  clearStoredToken()
}
