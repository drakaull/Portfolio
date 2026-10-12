import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import type { Inbox, Message } from '../../api/adminContact.ts'
import { mockApi, noContent, signedIn } from '../../test/mockApi.ts'
import { renderApp } from '../../test/renderApp.tsx'

const ADA: Message = {
  id: 1,
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  message: 'Bonjour,\nune offre pour vous.\n<script>alert(1)</script>',
  lang: 'fr',
  created_at: '2026-10-12T15:30:00Z',
  read: false,
}
const BOB: Message = { ...ADA, id: 2, name: 'Bob', email: 'bob@example.com', read: true }

function inboxApi(messages: Message[], handlers: Parameters<typeof mockApi>[0] = {}) {
  const inbox: Inbox = { unread: messages.filter((m) => !m.read).length, messages }
  return mockApi({
    'GET /api/admin/me': signedIn,
    'GET /api/admin/messages': () => Response.json(inbox),
    'GET /api/admin/messages/1': () => Response.json({ ...ADA, read: true }),
    ...handlers,
  })
}

describe('inbox', () => {
  test('lists the messages, unread ones marked, newest first', async () => {
    inboxApi([ADA, BOB])
    renderApp('/fr/admin/messages')

    const items = within(await screen.findByRole('list')).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]).getByLabelText('Non lu')).toBeDefined()
    expect(within(items[1]).queryByLabelText('Non lu')).toBeNull()
    expect(screen.getByRole('link', { name: /Ada Lovelace/ }).getAttribute('href')).toBe(
      '/fr/admin/messages/1',
    )
  })

  test('the dashboard shows the unread count', async () => {
    inboxApi([ADA, BOB])
    renderApp('/fr/admin')

    expect(
      (await screen.findByRole('link', { name: /Messages \(1 non lu\)/ })).getAttribute('href'),
    ).toBe('/fr/admin/messages')
  })
})

describe('message', () => {
  test('shows the message as plain text, with a safe reply link', async () => {
    inboxApi([ADA])
    renderApp('/fr/admin/messages/1')

    const body = await screen.findByText(/une offre pour vous/)
    expect(body.textContent).toContain('<script>alert(1)</script>') // shown, never run
    expect(screen.getByRole('link', { name: 'Répondre par e-mail' }).getAttribute('href')).toBe(
      'mailto:ada@example.com?subject=Re%3A%20votre%20message%20sur%20mon%20portfolio',
    )
  })

  test('a crafted address cannot add recipients to the reply', async () => {
    inboxApi([], {
      'GET /api/admin/messages/1': () =>
        Response.json({ ...ADA, email: 'a?bcc=victim@example.com' }),
    })
    renderApp('/fr/admin/messages/1')

    const href = (await screen.findByRole('link', { name: 'Répondre par e-mail' })).getAttribute(
      'href',
    )
    expect(href).toBe(
      'mailto:a%3Fbcc%3Dvictim@example.com?subject=Re%3A%20votre%20message%20sur%20mon%20portfolio',
    )
  })

  test('mark as unread goes back to the inbox', async () => {
    const fetchMock = inboxApi([ADA], { 'PUT /api/admin/messages/1/read': noContent })
    renderApp('/fr/admin/messages/1')

    fireEvent.click(await screen.findByRole('button', { name: 'Marquer comme non lu' }))

    expect(await screen.findByRole('heading', { name: 'Messages' })).toBeDefined()
    const [, init] = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')!
    expect(JSON.parse(String(init?.body))).toEqual({ read: false })
  })

  test('asks before deleting', async () => {
    const fetchMock = inboxApi([ADA], { 'DELETE /api/admin/messages/1': noContent })
    renderApp('/fr/admin/messages/1')

    fireEvent.click(await screen.findByRole('button', { name: 'Supprimer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }))
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Supprimer' }),
    )

    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(true),
    )
    expect(await screen.findByRole('heading', { name: 'Messages' })).toBeDefined()
  })

  test('says so when the message does not exist', async () => {
    inboxApi([])
    renderApp('/fr/admin/messages/999')

    expect((await screen.findByRole('alert')).textContent).toBe("Ce message n'existe pas.")
  })
})
