import { screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import type { ExperienceDetail } from '../api/experiences.ts'
import { mockApi } from '../test/mockApi.ts'
import { renderApp } from '../test/renderApp.tsx'

const DETAIL: ExperienceDetail = {
  slug: 'icare-internship-2026',
  kind: 'internship',
  title: 'Ingénieur R&D',
  organization: 'I-care Group',
  start_year: 2026,
  end_year: 2026,
  summary: 'Résumé.',
  description: 'Conception d’un stockage **hybride**.\n\n- Données IoT',
  technologies: ['Python', 'Docker'],
  logo_url: '/api/images/logos/icare-internship-2026?v=1',
}

function mockDetail() {
  return mockApi({
    'GET /api/experiences/icare-internship-2026?lang=fr': () => Response.json(DETAIL),
    'GET /api/experiences/unknown?lang=fr': () => new Response(null, { status: 404 }),
    'GET /api/home?lang=fr': () => new Promise(() => {}),
  })
}

describe('experience detail page', () => {
  test('shows the entry with its Markdown description and technologies', async () => {
    mockDetail()
    renderApp('/fr/experience/icare-internship-2026')

    expect(await screen.findByRole('heading', { level: 1, name: 'Ingénieur R&D' })).toBeDefined()
    expect(screen.getByText('~/portfolio/parcours/icare-internship-2026')).toBeDefined()
    expect(screen.getByText('Stage')).toBeDefined()
    expect(screen.getByText('2026')).toBeDefined()
    expect(screen.getByText('I-care Group')).toBeDefined()
    expect(document.querySelector(`img[src="${DETAIL.logo_url}"]`)).not.toBeNull()
    expect(screen.getByText('hybride').tagName).toBe('STRONG')
    expect(screen.getByText('Docker')).toBeDefined()
    expect(screen.getByRole('link', { name: /Retour au parcours/ }).getAttribute('href')).toBe(
      '/fr/experience',
    )
    expect(document.title).toBe('Ingénieur R&D · Léonard Fontaine')
  })

  test('shows the 404 page for an unknown entry', async () => {
    mockDetail()
    renderApp('/fr/experience/unknown')

    expect(await screen.findByRole('heading', { name: 'Page introuvable' })).toBeDefined()
  })

  test('timeline cards lead to this page', async () => {
    mockApi({
      'GET /api/experiences?lang=fr': () => Response.json([DETAIL]),
      'GET /api/experiences/icare-internship-2026?lang=fr': () => Response.json(DETAIL),
      'GET /api/home?lang=fr': () => new Promise(() => {}),
    })
    renderApp('/fr/experience')

    ;(await screen.findByRole('link', { name: /Ingénieur R&D/ })).click()

    expect(await screen.findByRole('heading', { level: 1, name: 'Ingénieur R&D' })).toBeDefined()
  })
})
