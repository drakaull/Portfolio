import type { Lang } from '../i18n/useTranslation.ts'
import type { AdminResult } from './adminSkills.ts'

export type Message = {
  id: number
  name: string
  email: string
  message: string
  lang: Lang // language of the page it was sent from
  created_at: string
  read: boolean
}

export type Inbox = { unread: number; messages: Message[] } // newest first

/** The inbox; messages older than 12 months are deleted by the server first. */
export async function fetchInbox(): Promise<Inbox> {
  const response = await fetch('/api/admin/messages')
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return (await response.json()) as Inbox
}

/** Opens a message, which marks it as read; null when it does not exist. */
export async function openMessage(id: string): Promise<Message | null> {
  const response = await fetch(`/api/admin/messages/${encodeURIComponent(id)}`)
  if (response.status === 404 || response.status === 422) return null // 422: not a number
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return (await response.json()) as Message
}

async function change(url: string, init: RequestInit): Promise<AdminResult> {
  try {
    const response = await fetch(url, init)
    // 404: already gone, which is what the admin wanted.
    if (response.ok || response.status === 404) return 'ok'
    return response.status === 401 ? 'expired' : 'error'
  } catch {
    return 'error'
  }
}

export function markUnread(id: number): Promise<AdminResult> {
  return change(`/api/admin/messages/${id}/read`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ read: false }),
  })
}

export function deleteMessage(id: number): Promise<AdminResult> {
  return change(`/api/admin/messages/${id}`, { method: 'DELETE' })
}
