import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import type { AdminHomeContent } from '../../api/adminHome.ts'
import { mockApi, signedIn, signedOut } from '../../test/mockApi.ts'
import { renderApp } from '../../test/renderApp.tsx'

const CONTENT: AdminHomeContent = {
  headline: {
    en: 'Fullstack developer',
    fr: 'Développeur fullstack',
    nl: 'Fullstack-ontwikkelaar',
  },
  intro: { en: '', fr: 'Je crée des **applications web**.', nl: '' },
  linkedin_url: 'https://www.linkedin.com/in/someone',
  github_url: 'https://github.com/someone',
  has_cv: false,
}

const savedAsSent = (body: unknown) =>
  Response.json({ ...(body as object), auto_translated: [], translation_failed: false })

function mockEditorApi(
  save: (body: unknown) => Response = savedAsSent,
  translate: (body: { items: { text: string }[] }) => Response = ({ items }) =>
    Response.json({ translations: items.map((item) => `[en] ${item.text}`) }),
) {
  return mockApi({
    'GET /api/admin/me': signedIn,
    'GET /api/admin/home': () => Response.json(CONTENT),
    'PUT /api/admin/home': (init) => save({ ...JSON.parse(String(init?.body)), has_cv: false }),
    'POST /api/admin/translate': (init) => translate(JSON.parse(String(init?.body))),
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

  test('loads the current content, French first', async () => {
    mockEditorApi()
    renderApp('/en/admin/home')

    expect(((await headline()) as HTMLInputElement).value).toBe('Développeur fullstack')
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['FR', 'EN'])
    fireEvent.click(screen.getByRole('tab', { name: 'EN' }))
    expect(((await headline()) as HTMLInputElement).value).toBe('Fullstack developer')
    expect(screen.getByText(/its translation is generated when you save/)).toBeDefined()
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
    fireEvent.change(await headline(), { target: { value: 'Ingénieur logiciel' } })

    fireEvent.click(saveButton())

    expect(await screen.findByText('Saved.')).toBeDefined()
    const [, init] = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')!
    expect(JSON.parse(String(init?.body))).toEqual({
      headline: { ...CONTENT.headline, fr: 'Ingénieur logiciel' },
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

    fireEvent.click(screen.getByRole('button', { name: 'Language: English' }))
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

describe('CV', () => {
  const pdf = () => new File(['%PDF-1.7'], 'cv.pdf', { type: 'application/pdf' })
  const fileInput = () => screen.findByLabelText(/Upload a CV|Replace the CV/)

  function mockCvApi(hasCv: boolean, cvStatus = 204) {
    return mockApi({
      'GET /api/admin/me': signedIn,
      'GET /api/admin/home': () => Response.json({ ...CONTENT, has_cv: hasCv }),
      'PUT /api/admin/cv': () => new Response(null, { status: cvStatus }),
      'DELETE /api/admin/cv': () => new Response(null, { status: 204 }),
    })
  }

  test('uploads a PDF as multipart and shows it online', async () => {
    const fetchMock = mockCvApi(false)
    renderApp('/en/admin/home')
    expect(await screen.findByText(/No CV online/)).toBeDefined()

    fireEvent.change(await fileInput(), { target: { files: [pdf()] } })

    expect(await screen.findByText('CV uploaded.')).toBeDefined()
    expect(screen.getByRole('link', { name: 'View the CV' }).getAttribute('href')).toBe('/api/cv')
    const [, init] = fetchMock.mock.calls.find(([url]) => url === '/api/admin/cv')!
    expect(init?.method).toBe('PUT')
    expect((init!.body as FormData).get('file')).toBeInstanceOf(File)
  })

  test('refuses a file over 5 MB without sending it', async () => {
    const fetchMock = mockCvApi(false)
    renderApp('/en/admin/home')
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'cv.pdf', {
      type: 'application/pdf',
    })

    fireEvent.change(await fileInput(), { target: { files: [big] } })

    expect(await screen.findByText('The file is larger than 5 MB.')).toBeDefined()
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/admin/cv')).toBe(false)
  })

  test('explains when the server refuses a non-PDF', async () => {
    mockCvApi(false, 415)
    renderApp('/en/admin/home')

    fireEvent.change(await fileInput(), { target: { files: [pdf()] } })

    expect(await screen.findByText('This file is not a PDF.')).toBeDefined()
    expect(screen.getByText(/No CV online/)).toBeDefined()
  })

  test('removes the CV after confirmation', async () => {
    const fetchMock = mockCvApi(true)
    renderApp('/en/admin/home')

    fireEvent.click(await screen.findByRole('button', { name: 'Remove the CV' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Remove the CV' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))

    expect(await screen.findByText('CV removed.')).toBeDefined()
    expect(screen.getByText(/No CV online/)).toBeDefined()
  })
})

describe('automatic translation', () => {
  const openEnglishTab = async () => {
    await headline()
    fireEvent.click(screen.getByRole('tab', { name: 'EN' }))
  }

  test('fills the English fields from French and asks for a review', async () => {
    mockEditorApi()
    renderApp('/en/admin/home')
    await openEnglishTab()
    fireEvent.change(await headline(), { target: { value: '' } }) // no English left to replace

    fireEvent.click(screen.getByRole('button', { name: 'Translate from French' }))

    expect(await screen.findByText(/please review it before saving/)).toBeDefined()
    expect(((await headline()) as HTMLInputElement).value).toBe('[en] Développeur fullstack')
    const intro = screen.getByLabelText('Introduction (Markdown)') as HTMLTextAreaElement
    expect(intro.value).toBe('[en] Je crée des **applications web**.')
  })

  test('asks before replacing English text that already exists', async () => {
    const fetchMock = mockEditorApi()
    renderApp('/en/admin/home')
    await openEnglishTab()
    const translateCalls = () =>
      fetchMock.mock.calls.filter(([url]) => url === '/api/admin/translate').length

    fireEvent.click(screen.getByRole('button', { name: 'Translate from French' }))
    expect(screen.getByRole('alertdialog')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(translateCalls()).toBe(0)
    expect(((await headline()) as HTMLInputElement).value).toBe('Fullstack developer')

    fireEvent.click(screen.getByRole('button', { name: 'Translate from French' }))
    fireEvent.click(screen.getByRole('button', { name: 'Replace' }))

    expect(await screen.findByDisplayValue('[en] Développeur fullstack')).toBeDefined()
    expect(translateCalls()).toBe(1)
  })

  test('explains when translation is unavailable', async () => {
    mockEditorApi(savedAsSent, () => new Response(null, { status: 503 }))
    renderApp('/en/admin/home')
    await openEnglishTab()
    fireEvent.change(await headline(), { target: { value: '' } })

    fireEvent.click(screen.getByRole('button', { name: 'Translate from French' }))

    expect((await screen.findByRole('alert')).textContent).toContain('Translation is unavailable')
  })

  test('tells which English fields were generated on save', async () => {
    mockEditorApi((body) =>
      Response.json({ ...(body as object), auto_translated: ['intro'], translation_failed: false }),
    )
    renderApp('/en/admin/home')
    fireEvent.change(await headline(), { target: { value: 'Ingénieur logiciel' } })

    fireEvent.click(saveButton())

    expect(await screen.findByText(/English was generated automatically/)).toBeDefined()
  })

  test('warns when English could not be generated on save', async () => {
    mockEditorApi((body) =>
      Response.json({ ...(body as object), auto_translated: [], translation_failed: true }),
    )
    renderApp('/en/admin/home')
    fireEvent.change(await headline(), { target: { value: 'Ingénieur logiciel' } })

    fireEvent.click(saveButton())

    expect((await screen.findByRole('alert')).textContent).toContain('could not be generated')
  })
})
