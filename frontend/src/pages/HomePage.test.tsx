import { act, fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { renderApp } from '../test/renderApp.tsx'
import type { Experience } from '../api/experiences.ts'
import type { HomeContent } from '../api/useHomeContent.ts'
import { ENTRIES } from '../test/fixtures.ts'

const CONTENT: Record<string, HomeContent> = {
  en: {
    headline: 'Fullstack developer',
    intro: 'I build **web apps**.',
    linkedin_url: 'https://www.linkedin.com/in/someone',
    github_url: 'https://github.com/someone',
    cv_url: '/api/cv',
    photo_url: null,
  },
  fr: {
    headline: 'Développeur fullstack',
    intro: 'Je crée des **applications web**.',
    linkedin_url: 'https://www.linkedin.com/in/someone',
    github_url: 'https://github.com/someone',
    cv_url: '/api/cv',
    photo_url: null,
  },
}

function switchToEnglish() {
  fireEvent.click(screen.getByRole('button', { name: 'Langue : Français' }))
  fireEvent.click(screen.getByRole('link', { name: 'English' }))
}

/** Fake backend answering /api/home?lang=xx with the given content per language. */
function mockApi(
  content: Record<string, Partial<HomeContent>> = CONTENT,
  status = 200,
  experiences: Experience[] = [],
) {
  const fetchMock = vi.fn((url: string) => {
    if (url.startsWith('/api/experiences')) return Promise.resolve(Response.json(experiences))
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
          if (url.startsWith('/api/experiences')) return resolve(Response.json([]))
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

    switchToEnglish()

    expect(await screen.findByText('Fullstack developer')).toBeDefined()
  })

  test('does not show the previous language while the new one loads', async () => {
    const api = controlledApi()
    renderApp('/fr')
    await api.answer('fr')
    await screen.findByText('Développeur fullstack')

    switchToEnglish()

    expect(screen.getByText('Loading…')).toBeDefined()
    expect(screen.queryByText('Développeur fullstack')).toBeNull()
  })

  test('ignores a late answer for the previous language', async () => {
    const api = controlledApi()
    renderApp('/fr')
    switchToEnglish()
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

    // The footer repeats LinkedIn and GitHub: look inside the page content only.
    await screen.findByText('Fullstack developer')
    const main = within(screen.getByRole('main'))
    const linkedin = main.getByRole('link', { name: /LinkedIn/ })
    expect(linkedin.getAttribute('href')).toBe('https://www.linkedin.com/in/someone')
    expect(linkedin.getAttribute('target')).toBe('_blank')
    expect(linkedin.getAttribute('rel')).toBe('noopener noreferrer')
    expect(main.getByRole('link', { name: /View my CV/ }).getAttribute('href')).toBe('/api/cv')
  })

  test('hides the CV link when there is no CV', async () => {
    mockApi({ en: { cv_url: null } })
    renderApp('/en')
    await screen.findByText('Fullstack developer')

    expect(screen.queryByRole('link', { name: /View my CV/ })).toBeNull()
  })

  test('shows the photo with its alt text, and the real HTML of the image behind it', async () => {
    mockApi({ fr: { photo_url: '/api/photo?v=123' } })
    renderApp('/fr')

    const photo = await screen.findByRole('img', { name: 'Photo de Léonard Fontaine' })
    expect(photo.getAttribute('src')).toBe('/api/photo?v=123')
    expect([photo.getAttribute('width'), photo.getAttribute('height')]).toEqual(['168', '168'])
    const code = photo.parentElement!.querySelector('pre')!
    expect(code.getAttribute('aria-hidden')).toBe('true') // decorative: the alt text is enough
    expect(code.textContent).toBe(
      [
        '<img',
        '  src="/api/photo?v=…"',
        '  alt="Photo de Léonard Fontaine"',
        '  width="168"',
        '  height="168"',
        '/>',
      ].join('\n'),
    )
  })

  test('a tap shows the code on touch screens', async () => {
    mockApi({ fr: { photo_url: '/api/photo?v=123' } })
    renderApp('/fr')
    const figure = (await screen.findByRole('img', { name: /Léonard Fontaine/ })).parentElement!

    fireEvent.click(figure)
    expect(figure.hasAttribute('data-code')).toBe(true)
    fireEvent.click(figure)
    expect(figure.hasAttribute('data-code')).toBe(false)
  })

  test('without a photo the page is unchanged', async () => {
    mockApi()
    renderApp('/en')
    await screen.findByText('Fullstack developer')

    expect(screen.queryByRole('img', { name: /Léonard Fontaine/ })).toBeNull()
  })

  test('shows an error message when the API fails', async () => {
    mockApi(CONTENT, 500)
    renderApp('/fr')

    expect((await screen.findByRole('alert')).textContent).toBe(
      "Ce contenu n'a pas pu être chargé. Réessayez plus tard.",
    )
  })
})

describe('footer', () => {
  test('shows the social links on every public page with a single API request', async () => {
    const fetchMock = mockApi()
    renderApp('/fr')
    await screen.findByText('Développeur fullstack')

    const footer = within(screen.getByRole('contentinfo'))
    expect(footer.getByRole('link', { name: /GitHub/ }).getAttribute('href')).toBe(
      'https://github.com/someone',
    )
    expect(footer.getByText(/© \d{4} Léonard Fontaine · Belgique/)).toBeDefined()
    const homeCalls = fetchMock.mock.calls.filter(([url]) => url.startsWith('/api/home'))
    expect(homeCalls).toHaveLength(1)
  })
})

describe('recent path', () => {
  test('shows the latest 3 entries linking to their detail pages', async () => {
    const four = [...ENTRIES, ...ENTRIES].map((entry, index) => ({
      ...entry,
      slug: `entry-${index}`,
    }))
    mockApi(CONTENT, 200, four)
    renderApp('/fr')

    const recent = await screen.findByRole('complementary', { name: 'Parcours récent' })
    const links = within(recent).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/fr/experience/entry-0',
      '/fr/experience/entry-1',
      '/fr/experience/entry-2',
      '/fr/experience',
    ])
  })

  test('is hidden when there is no entry', async () => {
    mockApi(CONTENT, 200, [])
    renderApp('/fr')
    await screen.findByText('Développeur fullstack')

    expect(screen.queryByRole('complementary', { name: 'Parcours récent' })).toBeNull()
  })
})
