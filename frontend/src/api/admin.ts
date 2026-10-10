// The session lives in an HttpOnly cookie set by the backend: this code never sees or stores it.

export type LoginResult = 'ok' | 'invalid' | 'blocked' | 'error'

export async function login(username: string, password: string): Promise<LoginResult> {
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (response.ok) return 'ok'
    if (response.status === 401) return 'invalid'
    if (response.status === 429) return 'blocked'
    return 'error'
  } catch {
    return 'error'
  }
}

/** The signed-in admin's username, or null when there is no valid session. */
export async function fetchCurrentAdmin(): Promise<string | null> {
  const response = await fetch('/api/admin/me')
  if (response.status === 401) return null
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const { username } = (await response.json()) as { username: string }
  return username
}

export async function logout(): Promise<void> {
  await fetch('/api/admin/logout', { method: 'POST' })
}
