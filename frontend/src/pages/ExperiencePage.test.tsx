import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { Experience } from '../api/experiences.ts'
import { formatYears } from '../lib/years.ts'
import { mockApi } from '../test/mockApi.ts'
import { renderApp } from '../test/renderApp.tsx'

export const ENTRIES: Experience[] = [
  {
    slug: 'icare-student-job-2026',
    kind: 'student_job',
    title: 'Ingénieur R&D',
    organization: 'I-care Group',
    start_year: 2026,
    end_year: 2026,
    summary: 'Stockage hybride chaud/froid.',
    technologies: ['Amazon S3', 'Python', 'NoSQL', 'Docker', 'FastAPI'],
  },
  {
    slug: 'helha-computer-science',
    kind: 'education',
    title: 'Bachelier en informatique',
    organization: 'HELHa',
    start_year: 2023,
    end_year: null,
    summary: 'Développement d’applications.',
    technologies: [],
  },
]

function mockTimeline(entries: Experience[] = ENTRIES, status = 200) {
  return mockApi({
    'GET /api/experiences?lang=fr': () => Response.json(entries, { status }),
    'GET /api/home?lang=fr': () => new Promise(() => {}),
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

test('formatYears shows one year, a range, or an ongoing range', () => {
  expect(formatYears(2026, 2026, 'Present')).toBe('2026')
  expect(formatYears(2019, 2023, 'Present')).toBe('2019 – 2023')
  expect(formatYears(2023, null, 'Present')).toBe('2023 – Present')
})

describe('experience timeline', () => {
  test('shows the entries in order as links to their detail pages', async () => {
    mockTimeline()
    renderApp('/fr/experience')

    const timeline = await screen.findByRole('list', { name: 'Frise du parcours' })
    const cards = within(timeline).getAllByRole('link')
    expect(cards.map((card) => card.getAttribute('href'))).toEqual([
      '/fr/experience/icare-student-job-2026',
      '/fr/experience/helha-computer-science',
    ])
    expect(within(cards[0]).getByText('Job étudiant')).toBeDefined()
    expect(within(cards[0]).getByText('2026')).toBeDefined()
    // At most 4 technologies on a card.
    expect(within(cards[0]).getByText('Amazon S3 · Python · NoSQL · Docker')).toBeDefined()
    expect(within(cards[1]).getByText("2023 – Aujourd'hui")).toBeDefined()
    expect(within(cards[1]).getByText('Formation')).toBeDefined()
  })

  test('shows previous/next buttons only when there is more to scroll', async () => {
    mockTimeline()
    renderApp('/fr/experience')
    const track = await screen.findByRole('list', { name: 'Frise du parcours' })
    const scrollBy = vi.fn()
    // jsdom has no layout: give the track a scrollable width.
    Object.defineProperties(track, {
      scrollWidth: { value: 1000, configurable: true },
      clientWidth: { value: 400, configurable: true },
      scrollLeft: { value: 0, writable: true, configurable: true },
      scrollBy: { value: scrollBy, configurable: true },
    })

    fireEvent.scroll(track)
    expect(screen.queryByRole('button', { name: /Précédent/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Suivant/ }))
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: 320 }))

    track.scrollLeft = 600 // the end: 1000 - 400
    fireEvent.scroll(track)
    expect(screen.queryByRole('button', { name: /Suivant/ })).toBeNull()
    expect(screen.getByRole('button', { name: /Précédent/ })).toBeDefined()
  })

  test('says when the timeline is empty', async () => {
    mockTimeline([])
    renderApp('/fr/experience')

    expect(await screen.findByText('Le parcours arrive bientôt.')).toBeDefined()
  })

  test('says when the timeline cannot be loaded', async () => {
    mockTimeline([], 500)
    renderApp('/fr/experience')

    expect((await screen.findByRole('alert')).textContent).toContain("n'a pas pu être chargé")
  })
})
