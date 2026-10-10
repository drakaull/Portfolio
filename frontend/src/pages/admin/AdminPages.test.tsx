import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, test, vi } from 'vitest'
import { App } from '../../App.tsx'

type Handler = (init?: RequestInit) => Response

/** Fake backend: one handler per "METHOD /path"; `me` answers 200 only after a successful login. */
function mockApi(handlers: Record<string, Handler>) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const handler = handlers[`${init?.method ?? 'GET'} ${url}`]
    return Promise.resolve(handler ? handler(init) : new Response(null, { status: 404 }))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const signedIn = () => Response.json({ username: 'leonard' })
const signedOut = () => new Response(null, { status: 401 })
const noContent = () => new Response(null, { status: 204 })

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

async function submitLogin(username = 'leonard', password = 'correct horse battery') {
  fireEvent.change(await screen.findByLabelText('Username'), { target: { value: username } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('admin area', () => {
  test('redirects to the login page without a session', async () => {
    mockApi({ 'GET /api/admin/me': signedOut })
    renderAt('/fr/admin')

    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeDefined()
  })

  test('/admin goes to the admin area in the browser language', async () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-GB')
    mockApi({ 'GET /api/admin/me': signedOut })
    renderAt('/admin')

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeDefined()
  })

  test('shows the signed-in admin and signs out', async () => {
    let session = true
    const fetchMock = mockApi({
      'GET /api/admin/me': () => (session ? signedIn() : signedOut()),
      'POST /api/admin/logout': () => {
        session = false
        return noContent()
      },
    })
    renderAt('/en/admin')

    expect(await screen.findByText('leonard')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeDefined()
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/logout', { method: 'POST' })
  })

  test('is hidden from search engines', async () => {
    mockApi({ 'GET /api/admin/me': signedOut })
    renderAt('/en/admin/login')
    await screen.findByRole('heading', { name: 'Sign in' })

    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex')
  })
})

describe('admin login', () => {
  test('sends the credentials as JSON and opens the admin area', async () => {
    let session = false
    const fetchMock = mockApi({
      'POST /api/admin/login': () => {
        session = true
        return noContent()
      },
      'GET /api/admin/me': () => (session ? signedIn() : signedOut()),
    })
    renderAt('/en/admin/login')

    await submitLogin()

    expect(await screen.findByText('leonard')).toBeDefined()
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'leonard', password: 'correct horse battery' }),
    })
  })

  test.each([
    [401, 'Wrong username or password.'],
    [429, 'Too many attempts. Try again in 15 minutes.'],
    [500, 'Something went wrong. Please try again.'],
  ])('shows an error when the API answers %i', async (status, message) => {
    mockApi({ 'POST /api/admin/login': () => new Response(null, { status }) })
    renderAt('/en/admin/login')

    await submitLogin()

    expect((await screen.findByRole('alert')).textContent).toBe(message)
  })

  test('lets password managers fill the form', () => {
    renderAt('/en/admin/login')

    expect(screen.getByLabelText('Username').getAttribute('autocomplete')).toBe('username')
    expect(screen.getByLabelText('Password').getAttribute('autocomplete')).toBe('current-password')
  })
})
