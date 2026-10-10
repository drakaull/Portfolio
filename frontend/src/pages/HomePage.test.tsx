import { act, fireEvent, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { renderApp } from '../test/renderApp.tsx'
import type { HomeContent } from '../api/useHomeContent.ts'

const CONTENT: Record<string, HomeContent> = {
  en: {
    headline: 'Fullstack developer',
    intro: 'I build **web apps**.',
    linkedin_url: 'https://www.linkedin.com/in/someone',
    github_url: 'https://github.com/someone',
    cv_url: '/api/cv',
  },
  fr: {
    headline: 'Développeur fullstack',
    intro: 'Je crée des **applications web**.',
    linkedin_url: 'https://www.linkedin.com/in/someone',
    github_url: 'https://github.com/someone',
    cv_url: '/api/cv',
  },
}

/** Fake backend answering /api/home?lang=xx with the given content per language. */
function mockApi(content: Record<string, Partial<HomeContent>> = CONTENT, status = 200) {
  const fetchMock = vi.fn((url: string) => {
    const lang = new URL(url, 'http://test').searchParams.get('lang') ?? ''
    return Promise.resolve(
      new Response(JSON.stringify({ ...CONTENT[lang], ...content[lang] }), { status }),
    )
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Fake backend whose answers the test releases one by one; aborted requests reject like fetch. */
function controlledApi() {
  const pending: Record<string, () => void> = {}
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (url: string, init: RequestInit) =>
        new Promise<Response>((resolve, reject) => {
          const lang = new URL(url, 'http://test').searchParams.get('lang') ?? ''
          pending[lang] = () => resolve(new Response(JSON.stringify(CONTENT[lang])))
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          )
        }),
    ),
  )
  return {
    answer: (lang: string) =>
      act(async () => {
        pending[lang]()
      }),
  }
}

describe('home page', () => {
  test('shows a loading message until the content arrives', () => {
    renderApp('/en')
    expect(screen.getByText('Loading…')).toBeDefined()
  })

  test('shows the content of the URL language', async () => {
    const fetchMock = mockApi()
    renderApp('/fr')

    expect(await screen.findByText('Développeur fullstack')).toBeDefined()
    expect(screen.getByText('applications web').tagName).toBe('STRONG')
    expect(fetchMock).toHaveBeenCalledWith('/api/home?lang=fr', expect.anything())
  })

  test('refetches in the other language after switching', async () => {
    mockApi()
    renderApp('/fr')
    await screen.findByText('Développeur fullstack')

    fireEvent.click(screen.getByRole('link', { name: 'English' }))

    expect(await screen.findByText('Fullstack developer')).toBeDefined()
  })

  test('does not show the previous language while the new one loads', async () => {
    const api = controlledApi()
    renderApp('/fr')
    await api.answer('fr')
    await screen.findByText('Développeur fullstack')

    fireEvent.click(screen.getByRole('link', { name: 'English' }))

    expect(screen.getByText('Loading…')).toBeDefined()
    expect(screen.queryByText('Développeur fullstack')).toBeNull()
  })

  test('ignores a late answer for the previous language', async () => {
    const api = controlledApi()
    renderApp('/fr')
    fireEvent.click(screen.getByRole('link', { name: 'English' }))
    await api.answer('en')
    await screen.findByText('Fullstack developer')

    await api.answer('fr') // the French request was cancelled; a real fetch would reject it

    expect(await screen.findByText('Fullstack developer')).toBeDefined()
    expect(screen.queryByText('Développeur fullstack')).toBeNull()
  })

  test('shows HTML written in the introduction as text, never as markup', async () => {
    mockApi({ en: { intro: 'Hi <script>alert(1)</script><img src=x onerror=alert(1)>' } })
    renderApp('/en')
    await screen.findByText('Fullstack developer')

    expect(document.querySelector('main script, main img')).toBeNull()
  })

  test('opens external links in a new tab safely', async () => {
    mockApi()
    renderApp('/en')

    const linkedin = await screen.findByRole('link', { name: /LinkedIn/ })
    expect(linkedin.getAttribute('href')).toBe('https://www.linkedin.com/in/someone')
    expect(linkedin.getAttribute('target')).toBe('_blank')
    expect(linkedin.getAttribute('rel')).toBe('noopener noreferrer')
    expect(screen.getByRole('link', { name: /View my CV/ }).getAttribute('href')).toBe('/api/cv')
  })

  test('hides the CV link when there is no CV', async () => {
    mockApi({ en: { cv_url: null } })
    renderApp('/en')
    await screen.findByText('Fullstack developer')

    expect(screen.queryByRole('link', { name: /View my CV/ })).toBeNull()
  })

  test('shows an error message when the API fails', async () => {
    mockApi(CONTENT, 500)
    renderApp('/fr')

    expect((await screen.findByRole('alert')).textContent).toBe(
      "Ce contenu n'a pas pu être chargé. Réessayez plus tard.",
    )
  })
})
