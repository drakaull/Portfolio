import { fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { mockApi } from '../test/mockApi.ts'
import { renderApp } from '../test/renderApp.tsx'

afterEach(() => {
  vi.restoreAllMocks()
})

const field = (label: string) =>
  screen.getByLabelText(label) as HTMLInputElement | HTMLTextAreaElement

function fill() {
  fireEvent.change(field('Nom'), { target: { value: 'Ada' } })
  fireEvent.change(field('E-mail'), { target: { value: 'ada@example.com' } })
  fireEvent.change(field('Message'), { target: { value: 'Bonjour, une question.' } })
}

const sentBody = (fetchMock: ReturnType<typeof mockApi>) =>
  JSON.parse(String(fetchMock.mock.calls.find(([url]) => url === '/api/contact')![1]?.body))

describe('contact form', () => {
  test('sends the message with the page language, then thanks and empties the form', async () => {
    const fetchMock = mockApi({ 'POST /api/contact': () => new Response(null, { status: 204 }) })
    renderApp('/fr/contact')
    fill()

    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }))

    expect((await screen.findByRole('status')).textContent).toContain('bien envoyé')
    expect(field('Nom').value).toBe('')
    expect(sentBody(fetchMock)).toEqual({
      name: 'Ada',
      email: 'ada@example.com',
      message: 'Bonjour, une question.',
      leave_empty: '',
      lang: 'fr',
    })
  })

  test('shows server errors next to their field', async () => {
    mockApi({
      'POST /api/contact': () =>
        Response.json({ detail: [{ loc: ['body', 'email'] }] }, { status: 422 }),
    })
    renderApp('/fr/contact')
    fill()

    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }))

    expect(await screen.findByText(/adresse e-mail valide/)).toBeDefined()
    expect(field('E-mail').getAttribute('aria-invalid')).toBe('true')
  })

  test.each([
    [429, 'Réessayez dans une heure'],
    [500, 'votre texte est conservé'],
  ])('keeps the text when the server answers %i', async (status, message) => {
    mockApi({ 'POST /api/contact': () => new Response(null, { status }) })
    renderApp('/fr/contact')
    fill()

    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }))

    expect((await screen.findByRole('alert')).textContent).toContain(message)
    expect(field('Message').value).toBe('Bonjour, une question.')
  })

  test('the trap field is hidden from people and screen readers', () => {
    mockApi({})
    renderApp('/en/contact')

    const trap = document.getElementById('contact-leave-empty') as HTMLInputElement
    expect(trap.tabIndex).toBe(-1)
    expect(trap.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(screen.queryByRole('textbox', { name: 'Leave this field empty' })).toBeNull()
  })

  test('links to the privacy page', () => {
    mockApi({})
    renderApp('/nl/contact')

    expect(screen.getByRole('link', { name: 'privacy' }).getAttribute('href')).toBe('/nl/privacy')
  })
})

describe('contact image', () => {
  const home = (contact_image_url: string | null) =>
    mockApi({
      'GET /api/home?lang=fr': () =>
        Response.json({
          headline: 'Développeur',
          intro: '',
          linkedin_url: 'https://www.linkedin.com/in/x',
          github_url: 'https://github.com/x',
          cv_url: null,
          photo_url: null,
          photo_focus: { x: 50, y: 50 },
          contact_image_url,
          contact_focus: { x: 40, y: 60 },
        }),
    })

  test('shows the image chosen in the admin, decorative and framed', async () => {
    home('/api/images/contact/page?v=1')
    renderApp('/fr/contact')

    await vi.waitFor(() => expect(document.querySelector('main img')).not.toBeNull())
    const image = document.querySelector('main img') as HTMLImageElement
    expect([image.getAttribute('src'), image.getAttribute('alt')]).toEqual([
      '/api/images/contact/page?v=1',
      '',
    ])
    expect(image.style.objectPosition).toBe('40% 60%')
  })

  test('the page has no image until one is chosen', async () => {
    home(null)
    renderApp('/fr/contact')

    // The footer's LinkedIn link shows the shared content has arrived.
    expect(await screen.findByRole('link', { name: /LinkedIn/ })).toBeDefined()
    expect(document.querySelector('main img')).toBeNull()
  })
})
