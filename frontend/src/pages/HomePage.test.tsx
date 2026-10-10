import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, test, vi } from 'vitest'
import { App } from '../App.tsx'
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

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('home page', () => {
  test('shows a loading message until the content arrives', () => {
    renderAt('/en')
    expect(screen.getByText('Loading…')).toBeDefined()
  })

  test('shows the content of the URL language', async () => {
    const fetchMock = mockApi()
    renderAt('/fr')

    expect(await screen.findByText('Développeur fullstack')).toBeDefined()
    expect(screen.getByText('applications web').tagName).toBe('STRONG')
    expect(fetchMock).toHaveBeenCalledWith('/api/home?lang=fr', expect.anything())
  })

  test('refetches in the other language after switching', async () => {
    mockApi()
    renderAt('/fr')
    await screen.findByText('Développeur fullstack')

    fireEvent.click(screen.getByRole('link', { name: 'English' }))

    expect(await screen.findByText('Fullstack developer')).toBeDefined()
  })

  test('shows HTML written in the introduction as text, never as markup', async () => {
    mockApi({ en: { intro: 'Hi <script>alert(1)</script><img src=x onerror=alert(1)>' } })
    renderAt('/en')
    await screen.findByText('Fullstack developer')

    expect(document.querySelector('main script, main img')).toBeNull()
  })

  test('opens external links in a new tab safely', async () => {
    mockApi()
    renderAt('/en')

    const linkedin = await screen.findByRole('link', { name: /LinkedIn/ })
    expect(linkedin.getAttribute('href')).toBe('https://www.linkedin.com/in/someone')
    expect(linkedin.getAttribute('target')).toBe('_blank')
    expect(linkedin.getAttribute('rel')).toBe('noopener noreferrer')
    expect(screen.getByRole('link', { name: /View my CV/ }).getAttribute('href')).toBe('/api/cv')
  })

  test('hides the CV link when there is no CV', async () => {
    mockApi({ en: { cv_url: null } })
    renderAt('/en')
    await screen.findByText('Fullstack developer')

    expect(screen.queryByRole('link', { name: /View my CV/ })).toBeNull()
  })

  test('shows an error message when the API fails', async () => {
    mockApi(CONTENT, 500)
    renderAt('/fr')

    expect((await screen.findByRole('alert')).textContent).toBe(
      "Ce contenu n'a pas pu être chargé. Réessayez plus tard.",
    )
  })
})
