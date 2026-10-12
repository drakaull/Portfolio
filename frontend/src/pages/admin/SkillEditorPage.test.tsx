import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import type { AdminSkill } from '../../api/adminSkills.ts'
import { mockApi, noContent, signedIn } from '../../test/mockApi.ts'
import { renderApp } from '../../test/renderApp.tsx'

// A few logos instead of the 3,000+ of the real package.
vi.mock('simple-icons', () => ({
  siPython: { title: 'Python', slug: 'python', hex: '3776AB', path: 'M1 1z', svg: '', source: '' },
  siPytorch: {
    title: 'PyTorch',
    slug: 'pytorch',
    hex: 'EE4C2C',
    path: 'M2 2z',
    svg: '',
    source: '',
  },
  siGit: { title: 'Git', slug: 'git', hex: 'F05032', path: 'M3 3z', svg: '', source: '' },
}))

const PYTHON_ICON = { slug: 'python', hex: '3776AB', path: 'M1 1z' }
const PYTHON: AdminSkill = { id: 7, name: 'Python', category: 'languages', icon: PYTHON_ICON }

const sentBody = (fetchMock: ReturnType<typeof mockApi>, method: string) => {
  const [, init] = fetchMock.mock.calls.find(([, init]) => init?.method === method)!
  return JSON.parse(String(init?.body))
}

const name = () => screen.findByLabelText('Name') as Promise<HTMLInputElement>
const results = () => screen.findByRole('list', { name: 'Logos found' })

describe('creating a skill', () => {
  test('searches logos from the name, picks one and goes back to the list', async () => {
    const fetchMock = mockApi({
      'GET /api/admin/me': signedIn,
      'POST /api/admin/skills': (init) =>
        Response.json({ id: 1, ...JSON.parse(String(init?.body)) }, { status: 201 }),
      'GET /api/admin/skills': () => Response.json([]),
    })
    renderApp('/en/admin/skills/new')

    fireEvent.change(await name(), { target: { value: 'py' } })
    const found = within(await results()).getAllByRole('button')
    expect(found.map((button) => button.textContent)).toEqual(['Python', 'PyTorch'])
    fireEvent.click(found[0])
    expect(found[0].getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText(/Chosen logo:/).textContent).toContain('python')
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'tools' } })

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('heading', { name: 'Edit the skills' })).toBeDefined()
    expect(sentBody(fetchMock, 'POST')).toEqual({
      name: 'py',
      category: 'tools',
      icon: PYTHON_ICON,
    })
  })

  test('a search typed by the admin stops following the name', async () => {
    mockApi({ 'GET /api/admin/me': signedIn })
    renderApp('/en/admin/skills/new')

    fireEvent.change(await screen.findByLabelText('Search a logo'), { target: { value: 'git' } })
    fireEvent.change(await name(), { target: { value: 'Python' } })

    const found = within(await results()).getAllByRole('button')
    expect(found.map((button) => button.textContent)).toEqual(['Git'])
  })

  test('explains a name already used in the category', async () => {
    mockApi({
      'GET /api/admin/me': signedIn,
      'POST /api/admin/skills': () => new Response(null, { status: 409 }),
    })
    renderApp('/en/admin/skills/new')
    fireEvent.change(await name(), { target: { value: 'Python' } })

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      await screen.findByText('This category already has a skill with this name.'),
    ).toBeDefined()
    expect((await name()).getAttribute('aria-invalid')).toBe('true')
  })
})

describe('editing a skill', () => {
  function mockEdit(handlers: Parameters<typeof mockApi>[0] = {}) {
    return mockApi({
      'GET /api/admin/me': signedIn,
      'GET /api/admin/skills/7': () => Response.json(PYTHON),
      'GET /api/admin/skills': () => Response.json([PYTHON]),
      ...handlers,
    })
  }

  test('removes the logo and saves without it', async () => {
    const fetchMock = mockEdit({
      'PUT /api/admin/skills/7': (init) =>
        Response.json({ id: 7, ...JSON.parse(String(init?.body)) }),
    })
    renderApp('/en/admin/skills/7')

    expect((await name()).value).toBe('Python')
    fireEvent.click(screen.getByRole('button', { name: 'Remove the logo' }))
    expect(screen.getByText('No logo: the name is shown alone.')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Saved.')).toBeDefined()
    expect(sentBody(fetchMock, 'PUT')).toEqual({
      name: 'Python',
      category: 'languages',
      icon: null,
    })
  })

  test('asks before deleting, then goes back to the list', async () => {
    const fetchMock = mockEdit({ 'DELETE /api/admin/skills/7': noContent })
    renderApp('/en/admin/skills/7')
    await name()

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByRole('alertdialog').textContent).toContain('Python')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByRole('heading', { name: 'Edit the skills' })).toBeDefined()
  })

  test('warns before leaving with unsaved changes', async () => {
    mockEdit()
    renderApp('/en/admin/skills/7')
    fireEvent.change(await name(), { target: { value: 'Python 3' } })

    fireEvent.click(screen.getByRole('link', { name: 'Back to the list' }))

    expect(screen.getByRole('alertdialog').textContent).toContain('unsaved changes')
  })

  test('says so when the skill does not exist', async () => {
    mockEdit()
    renderApp('/en/admin/skills/999')

    expect((await screen.findByRole('alert')).textContent).toBe('This skill does not exist.')
  })
})
