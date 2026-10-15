import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { SkillGroup } from '../api/skills.ts'
import { mockApi } from '../test/mockApi.ts'
import { contrast } from '../lib/contrast.ts'
import { renderApp } from '../test/renderApp.tsx'

const PYTHON = { slug: 'python', hex: '3776AB', path: 'M14.25.18l.9.2z' }
const GITHUB = { slug: 'github', hex: '181717', path: 'M12 .297z' }

const GROUPS: SkillGroup[] = [
  { category: 'languages', skills: [{ name: 'Python', icon: PYTHON }] },
  {
    category: 'tools',
    skills: [
      { name: 'GitHub', icon: GITHUB },
      { name: 'NoSQL', icon: null },
    ],
  },
]

const mockSkills = (groups: SkillGroup[] | Response) =>
  mockApi({
    'GET /api/skills': () => (groups instanceof Response ? groups : Response.json(groups)),
  })

afterEach(() => {
  vi.restoreAllMocks()
})

describe('skills page', () => {
  test('shows each category with its skills in order, in the interface language', async () => {
    mockSkills(GROUPS)
    renderApp('/fr/skills')

    const languages = await screen.findByRole('region', { name: 'Langages' })
    expect(
      within(languages)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Python'])
    const tools = screen.getByRole('region', { name: 'Outils' })
    expect(
      within(tools)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['GitHub', 'NoSQL'])
    expect(screen.queryByRole('region', { name: 'Front-end' })).toBeNull()
  })

  test('draws stored logos as decorative SVG paths, and nothing without a logo', async () => {
    mockSkills(GROUPS)
    renderApp('/en/skills')

    const python = await screen.findByText('Python')
    const svg = python.querySelector('svg')!
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.querySelector('path')!.getAttribute('d')).toBe(PYTHON.path)
    expect(screen.getByText('NoSQL').querySelector('svg')).toBeNull()
  })

  test('gives each theme a brand colour readable on its background', async () => {
    mockSkills(GROUPS)
    renderApp('/en/skills')

    const python = (await screen.findByText('Python')).querySelector('svg')!
    expect(python.style.getPropertyValue('--brand-light')).toBe(`#${PYTHON.hex.toLowerCase()}`)
    const github = screen.getByText('GitHub').querySelector('svg')!
    const onDark = github.style.getPropertyValue('--brand-dark').slice(1)
    expect(contrast(onDark, '1b1a17')).toBeGreaterThanOrEqual(3) // near-black, lightened
  })

  test('says when there is nothing yet', async () => {
    mockSkills([])
    renderApp('/en/skills')

    expect(await screen.findByText('Skills coming soon.')).toBeDefined()
  })

  test('says when loading fails', async () => {
    mockSkills(new Response(null, { status: 500 }))
    renderApp('/en/skills')

    expect((await screen.findByRole('alert')).textContent).toContain('could not be loaded')
  })
})
