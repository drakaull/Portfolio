import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import type { AdminProject } from '../../api/adminProjects.ts'
import { mockApi, signedIn } from '../../test/mockApi.ts'
import { renderApp } from '../../test/renderApp.tsx'

const TTMC: AdminProject = {
  id: 1,
  title: 'Projet TTMC',
  context: null,
  team_size: null,
  visible: false,
  image_focus: { x: 50, y: 50 },
  image_url: null,
  missing: false,
  about_lang: 'fr',
  summary: { fr: 'Jeu de plateau', en: 'Board game', nl: '' },
  github: {
    id: 10,
    name: 'Projet_TTMC',
    url: 'https://github.com/drakaull/Projet_TTMC',
    homepage: null,
    about: 'Jeu de plateau',
    languages: { CSS: 250, Java: 750 },
    topics: ['game'],
    created_at: '2024-02-01T10:00:00Z',
    pushed_at: '2025-03-04T11:00:00Z',
    stars: 3,
  },
}

function mockProject(project: AdminProject, put?: (init?: RequestInit) => Response) {
  return mockApi({
    'GET /api/admin/me': signedIn,
    'GET /api/admin/projects/1': () => Response.json(project),
    'GET /api/admin/projects': () => Response.json([project]),
    ...(put && { 'PUT /api/admin/projects/1': put }),
  })
}

const sentBody = (fetchMock: ReturnType<typeof mockApi>) => {
  const [, init] = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')!
  return JSON.parse(String(init?.body))
}

const title = () => screen.findByLabelText('Title') as Promise<HTMLInputElement>

describe('project editor', () => {
  test('edits the details and saves them', async () => {
    const fetchMock = mockProject(TTMC, (init) =>
      Response.json({ ...TTMC, ...JSON.parse(String(init?.body)) }),
    )
    renderApp('/en/admin/projects/1')

    fireEvent.change(await title(), { target: { value: 'TTMC' } })
    fireEvent.change(screen.getByLabelText('Context'), { target: { value: 'school' } })
    fireEvent.change(screen.getByLabelText('Team size (empty if unknown)'), {
      target: { value: '4' },
    })
    fireEvent.click(screen.getByLabelText('Visible on the site'))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Saved.')).toBeDefined()
    expect(sentBody(fetchMock)).toEqual({
      title: 'TTMC',
      context: 'school',
      team_size: 4,
      visible: true,
      image_focus: { x: 50, y: 50 }, // sent back as loaded
    })
  })

  test('shows the GitHub data read-only, with the translated About', async () => {
    mockProject(TTMC)
    renderApp('/en/admin/projects/1')
    await title()

    expect(screen.getByRole('link', { name: 'Projet_TTMC' }).getAttribute('href')).toBe(
      TTMC.github.url,
    )
    expect(screen.getByText(/written in FR/)).toBeDefined()
    expect(screen.getByText('Board game')).toBeDefined()
    expect(screen.getByText('not translated yet')).toBeDefined()
    expect(screen.getByText('Java 75.0 % · CSS 25.0 %')).toBeDefined()
  })

  test('explains invalid values next to their field', async () => {
    mockProject(TTMC, () =>
      Response.json({ detail: [{ loc: ['body', 'team_size'] }] }, { status: 422 }),
    )
    renderApp('/en/admin/projects/1')
    fireEvent.change(await screen.findByLabelText('Team size (empty if unknown)'), {
      target: { value: 'many' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('A whole number from 1 to 100, or empty.')).toBeDefined()
    expect(screen.getByLabelText('Team size (empty if unknown)').getAttribute('aria-invalid')).toBe(
      'true',
    )
  })

  test('a project gone from GitHub cannot be made visible', async () => {
    mockProject({ ...TTMC, missing: true })
    renderApp('/en/admin/projects/1')
    await title()

    expect((screen.getByLabelText('Visible on the site') as HTMLInputElement).disabled).toBe(true)
    expect(screen.getByText(/no longer public on GitHub/)).toBeDefined()
  })

  test('warns before leaving with unsaved changes', async () => {
    mockProject(TTMC)
    renderApp('/en/admin/projects/1')
    fireEvent.change(await title(), { target: { value: 'Changed' } })

    fireEvent.click(screen.getByRole('link', { name: 'Back to the list' }))

    expect(screen.getByRole('alertdialog').textContent).toContain('unsaved changes')
  })

  test('says so when the project does not exist', async () => {
    mockProject(TTMC)
    renderApp('/en/admin/projects/999')

    expect((await screen.findByRole('alert')).textContent).toBe('This project does not exist.')
  })
})

describe('screenshot', () => {
  test('a new screenshot can be framed and starts centred', async () => {
    const fetchMock = mockApi({
      'GET /api/admin/me': signedIn,
      'GET /api/admin/projects/1': () =>
        Response.json({
          ...TTMC,
          image_url: '/api/images/projects/1?v=1',
          image_focus: { x: 10, y: 10 },
        }),
      'PUT /api/admin/projects/1/image': () => new Response(null, { status: 204 }),
    })
    renderApp('/en/admin/projects/1')
    expect(await screen.findByText(/An image is online/)).toBeDefined()

    fireEvent.change(await screen.findByLabelText(/Replace the image/), {
      target: { files: [new File(['fake-png'], 'shot.png', { type: 'image/png' })] },
    })

    expect(await screen.findByText(/Image uploaded/)).toBeDefined()
    expect(screen.getByText('On the Projects page')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Save' }).hasAttribute('disabled')).toBe(true)
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/admin/projects/1/image')).toBe(true)
  })
})
