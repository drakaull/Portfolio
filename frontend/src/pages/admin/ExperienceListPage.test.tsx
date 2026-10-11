import { screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import type { AdminExperience } from '../../api/adminExperiences.ts'
import { mockApi, signedIn } from '../../test/mockApi.ts'
import { renderApp } from '../../test/renderApp.tsx'

const text = (fr: string, en = '', nl = '') => ({ fr, en, nl })

const ENTRIES: AdminExperience[] = [
  {
    slug: 'icare-student-job',
    kind: 'student_job',
    organization: 'I-care Group',
    start_year: 2026,
    end_year: null,
    technologies: [],
    title: text('Ingénieur R&D', 'R&D Engineer'),
    summary: text('Résumé'),
    description: text(''),
  },
  {
    slug: 'ateliers-ai',
    kind: 'education',
    organization: 'Ateliers Créatifs',
    start_year: 2024,
    end_year: 2024,
    technologies: [],
    title: text('Formation IA'), // not translated yet: French shown
    summary: text('Résumé'),
    description: text(''),
  },
]

function mockList(entries: AdminExperience[] | Response) {
  mockApi({
    'GET /api/admin/me': signedIn,
    'GET /api/admin/experiences': () =>
      entries instanceof Response ? entries : Response.json(entries),
  })
}

describe('experience list', () => {
  test('lists the entries in the server order, in the interface language', async () => {
    mockList(ENTRIES)
    renderApp('/en/admin/experiences')

    const items = within(await screen.findByRole('list')).getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      '2026 – PresentR&D EngineerI-care GroupStudent job',
      '2024Formation IAAteliers CréatifsEducation',
    ])
    const link = screen.getByRole('link', { name: 'R&D Engineer' })
    expect(link.getAttribute('href')).toBe('/en/admin/experiences/icare-student-job')
  })

  test('offers to create an entry', async () => {
    mockList([])
    renderApp('/fr/admin/experiences')

    expect(await screen.findByText('Aucune expérience pour le moment.')).toBeDefined()
    const link = screen.getByRole('link', { name: 'Nouvelle expérience' })
    expect(link.getAttribute('href')).toBe('/fr/admin/experiences/new')
  })

  test('says so when the list cannot load', async () => {
    mockList(new Response(null, { status: 500 }))
    renderApp('/en/admin/experiences')

    expect(await screen.findByRole('alert')).toBeDefined()
  })
})
