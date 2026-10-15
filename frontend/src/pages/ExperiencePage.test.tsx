import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { Experience } from '../api/experiences.ts'
import { ENTRIES } from '../test/fixtures.ts'
import { formatYears } from '../lib/years.ts'
import { mockApi } from '../test/mockApi.ts'
import { renderApp } from '../test/renderApp.tsx'

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
    // Every technology, in the order written in the admin.
    expect(within(cards[0]).getByText('Amazon S3 · Python · NoSQL · Docker · FastAPI')).toBeDefined()
    expect(within(cards[1]).getByText('Formation')).toBeDefined()
  })

  test('shows the years beside each card, most recent at the top', async () => {
    mockTimeline()
    renderApp('/fr/experience')

    const timeline = await screen.findByRole('list', { name: 'Frise du parcours' })
    const items = within(timeline).getAllByRole('listitem')
    expect(items.map((item) => item.firstElementChild?.textContent)).toEqual([
      '2026',
      "2023 – Aujourd'hui",
    ])
    // The years are not repeated inside the card links.
    const card = within(items[0]).getByRole('link')
    expect(within(card).queryByText('2026')).toBeNull()
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
