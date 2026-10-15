import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import type { AdminExperience } from '../../api/adminExperiences.ts'
import { mockApi, noContent, signedIn } from '../../test/mockApi.ts'
import { renderApp } from '../../test/renderApp.tsx'

const ENTRY: AdminExperience = {
  slug: 'icare-internship-2026',
  kind: 'internship',
  organization: 'I-care Group',
  start_year: 2026,
  end_year: 2026,
  technologies: ['Python', 'Docker'],
  title: { fr: 'Ingénieur R&D', en: 'R&D Engineer', nl: '' },
  summary: { fr: 'Stockage hybride.', en: 'Hybrid storage.', nl: '' },
  description: { fr: '## Missions', en: '## Tasks', nl: '' },
}
const ENTRY_URL = '/api/admin/experiences/icare-internship-2026'

const savedAs = (body: object, auto_translated: string[] = []) =>
  Response.json({ ...ENTRY, ...body, auto_translated, translation_failed: false })

const sentBody = (fetchMock: ReturnType<typeof mockApi>, method: string) => {
  const [, init] = fetchMock.mock.calls.find(([, init]) => init?.method === method)!
  return JSON.parse(String(init?.body))
}

const field = (label: string | RegExp) => screen.findByLabelText(label) as Promise<HTMLInputElement>
const change = async (label: string | RegExp, value: string) =>
  fireEvent.change(await field(label), { target: { value } })

describe('creating an experience', () => {
  function mockCreate(post: (init?: RequestInit) => Response) {
    return mockApi({
      'GET /api/admin/me': signedIn,
      'POST /api/admin/experiences': post,
      'GET /api/admin/experiences/developpeur-acme': () =>
        Response.json({ ...ENTRY, slug: 'developpeur-acme', title: { fr: 'Développeur' } }),
    })
  }

  test('proposes the address, sends the entry and opens its editor', async () => {
    const fetchMock = mockCreate((init) => savedAs(JSON.parse(String(init?.body)), ['en', 'nl']))
    renderApp('/en/admin/experiences/new')

    await change('Organisation', 'Acme')
    await change('Title', 'Développeur')
    await change('Summary (shown on the card)', 'Je développe.')
    await change('Start year', '2027')
    await change('Technologies (comma-separated)', ' Python,  React ,, ')
    expect((await field('Address')).value).toBe('developpeur-acme')

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('heading', { name: 'Edit an experience' })).toBeDefined()
    expect(screen.getByText('/experience/developpeur-acme')).toBeDefined()
    expect(screen.getByText(/Missing translations were generated/).textContent).toMatch(/EN, NL$/)
    expect(sentBody(fetchMock, 'POST')).toEqual({
      slug: 'developpeur-acme',
      kind: 'job',
      organization: 'Acme',
      start_year: 2027,
      end_year: null,
      technologies: ['Python', 'React'],
      title: { fr: 'Développeur', en: '', nl: '' },
      summary: { fr: 'Je développe.', en: '', nl: '' },
      description: { fr: '', en: '', nl: '' },
    })
  })

  test('an address typed by the admin stops following the title', async () => {
    mockCreate(() => savedAs({}))
    renderApp('/en/admin/experiences/new')

    await change('Address', 'my-address')
    await change('Title', 'Développeur')

    expect((await field('Address')).value).toBe('my-address')
  })

  test('explains a taken address next to the field', async () => {
    mockCreate(() => new Response(null, { status: 409 }))
    renderApp('/en/admin/experiences/new')
    await change('Title', 'Développeur')

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText(/already used by another experience/)).toBeDefined()
    expect((await field('Address')).getAttribute('aria-invalid')).toBe('true')
  })

  test('shows the server validation errors on their fields', async () => {
    mockCreate(() =>
      Response.json(
        { detail: [{ loc: ['body', 'end_year'] }, { loc: ['body', 'title', 'fr'] }] },
        { status: 422 },
      ),
    )
    renderApp('/en/admin/experiences/new')
    await change('End year (empty while ongoing)', 'soon')

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText(/Empty while ongoing, otherwise/)).toBeDefined()
    expect(screen.getByText('French is required; 120 characters max.')).toBeDefined()
    // The error describes the field without becoming part of its name.
    expect(screen.getByLabelText('Title').getAttribute('aria-invalid')).toBe('true')
  })
})

describe('editing an experience', () => {
  function mockEdit(handlers: Parameters<typeof mockApi>[0] = {}) {
    return mockApi({
      'GET /api/admin/me': signedIn,
      [`GET ${ENTRY_URL}`]: () => Response.json(ENTRY),
      'GET /api/admin/experiences': () => Response.json([]),
      ...handlers,
    })
  }

  test('loads the entry with a fixed address and saves it without the slug', async () => {
    const fetchMock = mockEdit({
      [`PUT ${ENTRY_URL}`]: (init) => savedAs(JSON.parse(String(init?.body))),
    })
    renderApp('/en/admin/experiences/icare-internship-2026')

    expect((await field('Organisation')).value).toBe('I-care Group')
    expect((await field('Technologies (comma-separated)')).value).toBe('Python, Docker')
    expect(screen.queryByLabelText('Address')).toBeNull()
    expect(screen.getByText('/experience/icare-internship-2026')).toBeDefined()

    await change('End year (empty while ongoing)', '')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Saved.')).toBeDefined()
    const body = sentBody(fetchMock, 'PUT')
    expect(body.slug).toBeUndefined()
    expect(body.end_year).toBeNull()
  })

  test('saves twice in a row', async () => {
    const fetchMock = mockEdit({
      [`PUT ${ENTRY_URL}`]: (init) => savedAs(JSON.parse(String(init?.body)), ['nl']),
    })
    renderApp('/en/admin/experiences/icare-internship-2026')

    await change('Organisation', 'First')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText('Saved.')
    await change('Organisation', 'Second')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText('Saved.')

    const bodies = fetchMock.mock.calls
      .filter(([, init]) => init?.method === 'PUT')
      .map(([, init]) => JSON.parse(String(init?.body)))
    expect(bodies.map((body) => body.organization)).toEqual(['First', 'Second'])
    // Only the form's fields go back: the server refuses unknown ones.
    expect(Object.keys(bodies[1]).sort()).toEqual([
      'description',
      'end_year',
      'kind',
      'organization',
      'start_year',
      'summary',
      'technologies',
      'title',
    ])
  })

  test('translates the Dutch tab from French', async () => {
    mockEdit({
      'POST /api/admin/translate': (init) => {
        const { target, items } = JSON.parse(String(init?.body))
        return Response.json({
          translations: items.map((item: { text: string }) => `[${target}] ${item.text}`),
        })
      },
    })
    renderApp('/en/admin/experiences/icare-internship-2026')
    await field('Organisation')
    fireEvent.click(screen.getByRole('tab', { name: 'NL' }))

    fireEvent.click(screen.getByRole('button', { name: 'Translate from French' }))

    expect((await screen.findByDisplayValue('[nl] Ingénieur R&D')).tagName).toBe('INPUT')
    expect(screen.getByDisplayValue('[nl] Stockage hybride.')).toBeDefined()
    expect(screen.getByDisplayValue('[nl] ## Missions')).toBeDefined()
  })

  test('asks before deleting, then goes back to the list', async () => {
    const fetchMock = mockEdit({ [`DELETE ${ENTRY_URL}`]: noContent })
    renderApp('/en/admin/experiences/icare-internship-2026')
    await field('Organisation')

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByRole('alertdialog').textContent).toContain('Ingénieur R&D')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByRole('heading', { name: 'Edit the timeline' })).toBeDefined()
  })

  test('warns before leaving with unsaved changes', async () => {
    mockEdit()
    renderApp('/en/admin/experiences/icare-internship-2026')
    await change('Organisation', 'Changed')

    fireEvent.click(screen.getByRole('link', { name: 'Back to the list' }))

    expect(screen.getByRole('alertdialog').textContent).toContain('unsaved changes')
  })

  test('says so when the entry does not exist', async () => {
    mockEdit()
    renderApp('/en/admin/experiences/unknown')

    expect((await screen.findByRole('alert')).textContent).toBe('This experience does not exist.')
  })
})
