import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import type { AdminHomeContent } from '../../api/adminHome.ts'
import { mockApi, signedIn, signedOut } from '../../test/mockApi.ts'
import { renderApp } from '../../test/renderApp.tsx'

const CONTENT: AdminHomeContent = {
  headline: { en: 'Fullstack developer', fr: 'Développeur fullstack' },
  intro: { en: 'I build **web apps**.', fr: '' },
  linkedin_url: 'https://www.linkedin.com/in/someone',
  github_url: 'https://github.com/someone',
  has_cv: false,
}

function mockEditorApi(save: (body: unknown) => Response = (body) => Response.json(body)) {
  return mockApi({
    'GET /api/admin/me': signedIn,
    'GET /api/admin/home': () => Response.json(CONTENT),
    'PUT /api/admin/home': (init) => save({ ...JSON.parse(String(init?.body)), has_cv: false }),
    'GET /api/home?lang=en': () => new Promise(() => {}),
  })
}

const headline = () => screen.findByLabelText('Headline')
const saveButton = () => screen.getByRole('button', { name: 'Save' })

describe('home editor', () => {
  test('requires a session', async () => {
    mockApi({ 'GET /api/admin/me': signedOut })
    renderApp('/en/admin/home')

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeDefined()
  })

  test('loads the current content, in the UI language first', async () => {
    mockEditorApi()
    renderApp('/en/admin/home')

    expect(((await headline()) as HTMLInputElement).value).toBe('Fullstack developer')
    fireEvent.click(screen.getByRole('tab', { name: 'FR' }))
    expect(((await headline()) as HTMLInputElement).value).toBe('Développeur fullstack')
    expect(screen.getByText(/Leave a French field empty/)).toBeDefined()
  })

  test('previews the Markdown while typing, without running HTML', async () => {
    mockEditorApi()
    renderApp('/en/admin/home')
    const intro = await screen.findByLabelText('Introduction (Markdown)')

    fireEvent.change(intro, { target: { value: '**bold** <script>alert(1)</script>' } })

    const preview = screen.getByRole('region', { name: 'Preview' })
    expect(within(preview).getByText('bold').tagName).toBe('STRONG')
    expect(preview.querySelector('script')).toBeNull()
  })

  test('saves the whole form and confirms', async () => {
    const fetchMock = mockEditorApi()
    renderApp('/en/admin/home')
    fireEvent.change(await headline(), { target: { value: 'Software engineer' } })

    fireEvent.click(saveButton())

    expect(await screen.findByText('Saved.')).toBeDefined()
    const [, init] = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')!
    expect(JSON.parse(String(init?.body))).toEqual({
      headline: { en: 'Software engineer', fr: 'Développeur fullstack' },
      intro: CONTENT.intro,
      linkedin_url: CONTENT.linkedin_url,
      github_url: CONTENT.github_url,
    })
    expect((saveButton() as HTMLButtonElement).disabled).toBe(true) // nothing left to save
  })

  test('shows server validation errors next to the field', async () => {
    mockEditorApi(() =>
      Response.json({ detail: [{ loc: ['body', 'github_url'] }] }, { status: 422 }),
    )
    renderApp('/en/admin/home')
    fireEvent.change(await screen.findByLabelText('GitHub address'), {
      target: { value: 'http://github.com/someone' },
    })

    fireEvent.click(saveButton())

    const github = screen.getByLabelText('GitHub address')
    expect(await screen.findByText('Enter a full address starting with https://')).toBeDefined()
    expect(github.getAttribute('aria-invalid')).toBe('true')
  })

  test('keeps the text and explains what to do when the session expired', async () => {
    mockEditorApi(() => new Response(null, { status: 401 }))
    renderApp('/en/admin/home')
    fireEvent.change(await headline(), { target: { value: 'Unsaved work' } })

    fireEvent.click(saveButton())

    expect((await screen.findByRole('alert')).textContent).toContain('Your session has expired')
    expect(((await headline()) as HTMLInputElement).value).toBe('Unsaved work')
    const signIn = screen.getByRole('link', { name: 'Sign in (new tab)' })
    expect(signIn.getAttribute('target')).toBe('_blank')
  })
})

describe('unsaved changes', () => {
  test('asks before leaving, and can stay', async () => {
    mockEditorApi()
    renderApp('/en/admin/home')
    fireEvent.change(await headline(), { target: { value: 'Changed' } })

    fireEvent.click(screen.getByRole('link', { name: 'Back to the dashboard' }))
    expect(screen.getByRole('alertdialog')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Stay on the page' }))

    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(((await headline()) as HTMLInputElement).value).toBe('Changed')
  })

  test('leaves when confirmed', async () => {
    mockEditorApi()
    renderApp('/en/admin/home')
    fireEvent.change(await headline(), { target: { value: 'Changed' } })

    fireEvent.click(screen.getByRole('link', { name: 'Back to the site' }))
    fireEvent.click(screen.getByRole('button', { name: 'Leave without saving' }))

    expect(await screen.findByRole('heading', { name: 'Léonard Fontaine' })).toBeDefined()
  })

  test('switching the UI language keeps the form without asking', async () => {
    mockEditorApi()
    renderApp('/en/admin/home')
    fireEvent.change(await headline(), { target: { value: 'Changed' } })

    fireEvent.click(screen.getByRole('link', { name: 'Français' }))

    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(((await screen.findByLabelText('Titre')) as HTMLInputElement).value).toBe('Changed')
  })

  test('does not ask after saving', async () => {
    mockEditorApi()
    renderApp('/en/admin/home')
    fireEvent.change(await headline(), { target: { value: 'Changed' } })
    fireEvent.click(saveButton())
    await screen.findByText('Saved.')

    fireEvent.click(screen.getByRole('link', { name: 'Back to the dashboard' }))

    expect(await screen.findByRole('heading', { name: 'Administration' })).toBeDefined()
  })
})
