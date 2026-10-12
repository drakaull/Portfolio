import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { Project } from '../api/projects.ts'
import { mockApi } from '../test/mockApi.ts'
import { renderApp } from '../test/renderApp.tsx'

const TTMC: Project = {
  title: 'Projet TTMC',
  summary: 'Jeu de plateau de quiz.',
  context: 'school',
  team_size: 4,
  url: 'https://github.com/drakaull/Projet_TTMC',
  homepage: null,
  languages: [
    { name: 'Java', percent: 80 },
    { name: 'CSS', percent: 15 },
    { name: 'HTML', percent: 4 },
    { name: 'Shell', percent: 1 },
  ],
  topics: [],
  created_at: '2025-03-26T15:54:14Z',
  pushed_at: '2025-05-01T10:00:00Z',
  stars: 0,
}

const OTEAL: Project = {
  ...TTMC,
  title: 'OTEAL ceremony',
  summary: null,
  context: null,
  team_size: 1,
  url: 'https://github.com/drakaull/OTEAL_ceremony',
  homepage: 'https://oteal.example.com',
  languages: [],
  created_at: '2026-07-23T11:39:06Z',
}

const mockProjects = (projects: Project[] | Response, lang = 'fr') =>
  mockApi({
    [`GET /api/projects?lang=${lang}`]: () =>
      projects instanceof Response ? projects : Response.json(projects),
  })

afterEach(() => {
  vi.restoreAllMocks()
})

describe('projects page', () => {
  test('one card per visible project, in the admin order', async () => {
    mockProjects([TTMC, OTEAL])
    renderApp('/fr/projects')

    const cards = await screen.findAllByRole('article')
    expect(cards.map((card) => within(card).getByRole('heading').textContent)).toEqual([
      'Projet TTMC',
      'OTEAL ceremony',
    ])
    const ttmc = cards[0]
    expect(within(ttmc).getByText('École · 2025')).toBeDefined()
    expect(within(ttmc).getByText('Jeu de plateau de quiz.')).toBeDefined()
    expect(within(ttmc).getByText('Java · CSS · HTML')).toBeDefined() // 3 main languages
    expect(within(ttmc).getByText('Équipe de 4')).toBeDefined()
  })

  test('links to GitHub and the website in a new tab, named for their project', async () => {
    mockProjects([TTMC, OTEAL])
    renderApp('/fr/projects')

    const github = await screen.findByRole('link', { name: /GitHub.*OTEAL ceremony/ })
    expect(github.getAttribute('href')).toBe(OTEAL.url)
    expect(github.getAttribute('target')).toBe('_blank')
    const site = screen.getByRole('link', { name: /Site.*OTEAL ceremony/ })
    expect(site.getAttribute('href')).toBe(OTEAL.homepage)
    expect(screen.queryByRole('link', { name: /Site.*Projet TTMC/ })).toBeNull()
  })

  test('a card without About, context or languages shows what it has', async () => {
    mockProjects([OTEAL])
    renderApp('/fr/projects')

    const card = await screen.findByRole('article')
    expect(within(card).getByText('2026')).toBeDefined()
    expect(within(card).getByText('Projet solo')).toBeDefined()
    expect(card.querySelectorAll('p')).toHaveLength(1) // only the team line
  })

  test('says when there is nothing yet, or when loading fails', async () => {
    mockProjects([], 'en')
    renderApp('/en/projects')
    expect(await screen.findByText('Projects coming soon.')).toBeDefined()
  })

  test('says when loading fails', async () => {
    mockProjects(new Response(null, { status: 500 }), 'en')
    renderApp('/en/projects')
    expect((await screen.findByRole('alert')).textContent).toContain('could not be loaded')
  })
})
