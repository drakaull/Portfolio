import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { mockApi, noContent, signedIn, signedOut } from '../../test/mockApi.ts'
import { renderApp } from '../../test/renderApp.tsx'

async function submitLogin(username = 'leonard', password = 'correct horse battery') {
  fireEvent.change(await screen.findByLabelText('Username'), { target: { value: username } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('admin area', () => {
  test('redirects to the login page without a session', async () => {
    mockApi({ 'GET /api/admin/me': signedOut })
    renderApp('/fr/admin')

    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeDefined()
  })

  test('/admin goes to the admin area in the browser language', async () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-GB')
    mockApi({ 'GET /api/admin/me': signedOut })
    renderApp('/admin')

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
    renderApp('/en/admin')

    expect(await screen.findByText('leonard')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeDefined()
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/logout', { method: 'POST' })
  })

  test('says so when signing out fails, instead of leaving', async () => {
    mockApi({
      'GET /api/admin/me': signedIn,
      'POST /api/admin/logout': () => new Response(null, { status: 503 }),
    })
    renderApp('/en/admin')

    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }))

    expect((await screen.findByRole('alert')).textContent).toContain('you are still signed in')
    expect(screen.getByText('leonard')).toBeDefined()
  })

  test('dashboard links to the editable sections', async () => {
    mockApi({ 'GET /api/admin/me': signedIn })
    renderApp('/fr/admin')

    const link = await screen.findByRole('link', { name: "Page d'accueil" })
    expect(link.getAttribute('href')).toBe('/fr/admin/home')
    expect(screen.getByRole('link', { name: 'Parcours' }).getAttribute('href')).toBe(
      '/fr/admin/experiences',
    )
    expect(screen.getByRole('link', { name: 'Compétences' }).getAttribute('href')).toBe(
      '/fr/admin/skills',
    )
    expect(screen.getByRole('link', { name: 'Projets' }).getAttribute('href')).toBe(
      '/fr/admin/projects',
    )
  })

  test('is hidden from search engines', async () => {
    mockApi({ 'GET /api/admin/me': signedOut })
    renderApp('/en/admin/login')
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
    renderApp('/en/admin/login')

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
    renderApp('/en/admin/login')

    await submitLogin()

    expect((await screen.findByRole('alert')).textContent).toBe(message)
  })

  test('lets password managers fill the form', () => {
    renderApp('/en/admin/login')

    expect(screen.getByLabelText('Username').getAttribute('autocomplete')).toBe('username')
    expect(screen.getByLabelText('Password').getAttribute('autocomplete')).toBe('current-password')
  })
})
