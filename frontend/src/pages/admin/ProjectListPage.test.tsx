import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import type { AdminProject } from '../../api/adminProjects.ts'
import { mockApi, noContent, signedIn } from '../../test/mockApi.ts'
import { renderApp } from '../../test/renderApp.tsx'

function project(id: number, title: string, changes: Partial<AdminProject> = {}): AdminProject {
  return {
    id,
    title,
    context: null,
    team_size: null,
    visible: false,
    missing: false,
    about_lang: 'fr',
    summary: { fr: 'Jeu', en: '[en] Jeu', nl: '[nl] Jeu' },
    github: {
      id: id * 10,
      name: title.replace(' ', '_'),
      url: `https://github.com/drakaull/${title}`,
      homepage: null,
      about: 'Jeu',
      languages: { CSS: 100, Java: 900 },
      topics: [],
      created_at: '2024-02-01T10:00:00Z',
      pushed_at: '2025-03-04T11:00:00Z',
      stars: 0,
    },
    ...changes,
  }
}

const TTMC = project(1, 'Projet TTMC', { context: 'school' })
const PORTFOLIO = project(2, 'Portfolio', { visible: true })
const OLD = project(3, 'Old repo', { missing: true })

function projectsApi(initial: AdminProject[], handlers: Parameters<typeof mockApi>[0] = {}) {
  let projects = initial
  return mockApi({
    'GET /api/admin/me': signedIn,
    'GET /api/admin/projects': () => Response.json(projects),
    'POST /api/admin/projects/sync': () => {
      projects = [TTMC, PORTFOLIO, OLD]
      return Response.json({ new: 2, updated: 0, missing: 1, translation_failed: false })
    },
    'PUT /api/admin/projects/1': (init) => {
      const details = JSON.parse(String(init?.body))
      projects = projects.map((entry) => (entry.id === 1 ? { ...entry, ...details } : entry))
      return Response.json({ ...TTMC, ...details })
    },
    'POST /api/admin/projects/2/move': () => {
      projects = [projects[1], projects[0], ...projects.slice(2)]
      return noContent()
    },
    'DELETE /api/admin/projects/3': () => {
      projects = projects.filter((entry) => entry.id !== 3)
      return noContent()
    },
    ...handlers,
  })
}

const items = () => within(screen.getByRole('list')).getAllByRole('listitem')

describe('project list', () => {
  test('syncs with GitHub and shows the report and the projects', async () => {
    projectsApi([])
    renderApp('/en/admin/projects')
    expect(await screen.findByText(/No project yet/)).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Sync with GitHub' }))

    expect((await screen.findByText(/New: 2/)).textContent).toBe(
      'New: 2 · Updated: 0 · Not found on GitHub: 1',
    )
    await waitFor(() => expect(items()).toHaveLength(3))
    expect(items()[0].textContent).toContain('Java · 2024 · School')
    expect(within(items()[2]).getByText(/Not found on GitHub/)).toBeDefined()
    expect(screen.getByRole('link', { name: 'Projet TTMC' }).getAttribute('href')).toBe(
      '/en/admin/projects/1',
    )
  })

  test('explains when GitHub is unavailable', async () => {
    projectsApi([], {
      'POST /api/admin/projects/sync': () => new Response(null, { status: 503 }),
    })
    renderApp('/en/admin/projects')

    fireEvent.click(await screen.findByRole('button', { name: 'Sync with GitHub' }))

    expect((await screen.findByRole('alert')).textContent).toContain('Nothing was changed')
  })

  test('the checkbox shows or hides a project at once', async () => {
    const fetchMock = projectsApi([TTMC, PORTFOLIO, OLD])
    renderApp('/en/admin/projects')

    const checkbox = (await screen.findByRole('checkbox', {
      name: 'Visible on the site: Projet TTMC',
    })) as HTMLInputElement
    expect(checkbox.checked).toBe(false)
    fireEvent.click(checkbox)

    await waitFor(() => expect(checkbox.checked).toBe(true))
    const [, init] = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')!
    expect(JSON.parse(String(init?.body))).toEqual({
      title: 'Projet TTMC',
      context: 'school',
      team_size: null,
      visible: true,
    })
    expect(
      (screen.getByRole('checkbox', { name: 'Visible on the site: Old repo' }) as HTMLInputElement)
        .disabled,
    ).toBe(true)
  })

  test('arrows reorder the projects', async () => {
    projectsApi([TTMC, PORTFOLIO])
    renderApp('/en/admin/projects')

    fireEvent.click(await screen.findByRole('button', { name: 'Move up: Portfolio' }))

    await waitFor(() => expect(items()[0].textContent).toContain('Portfolio'))
  })

  test('a project gone from GitHub can be deleted after confirming', async () => {
    projectsApi([TTMC, OLD])
    renderApp('/en/admin/projects')
    expect(screen.queryByRole('button', { name: 'Delete: Projet TTMC' })).toBeNull()

    fireEvent.click(await screen.findByRole('button', { name: 'Delete: Old repo' }))
    expect(screen.getByRole('alertdialog').textContent).toContain('Delete this project for good?')
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(items()).toHaveLength(1))
  })
})
