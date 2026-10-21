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
  photo_focus: { x: 50, y: 50 },
  has_cv: false,
  photo_url: null,
  contact_focus: { x: 50, y: 50 },
  contact_image_url: null,
}

const savedAsSent = (body: unknown) =>
  Response.json({ ...(body as object), auto_translated: [], translation_failed: false })

function mockEditorApi(
  save: (body: unknown) => Response = savedAsSent,
  translate: (body: { target: string; items: { text: string }[] }) => Response = ({
    target,
    items,
  }) => Response.json({ translations: items.map((item) => `[${target}] ${item.text}`) }),
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
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['FR', 'EN', 'NL'])
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
      photo_focus: CONTENT.photo_focus, // sent back as loaded
      contact_focus: CONTENT.contact_focus,
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

  test('translates the Dutch tab into Dutch, keeping English', async () => {
    const fetchMock = mockEditorApi()
    renderApp('/en/admin/home')
    await headline()
    fireEvent.click(screen.getByRole('tab', { name: 'NL' }))
    fireEvent.change(await headline(), { target: { value: '' } })

    fireEvent.click(screen.getByRole('button', { name: 'Translate from French' }))

    expect(await screen.findByDisplayValue('[nl] Développeur fullstack')).toBeDefined()
    const [, init] = fetchMock.mock.calls.find(([url]) => url === '/api/admin/translate')!
    expect(JSON.parse(String(init?.body)).target).toBe('nl')
    fireEvent.click(screen.getByRole('tab', { name: 'EN' }))
    expect(((await headline()) as HTMLInputElement).value).toBe('Fullstack developer')
  })

  test('tabs are locked while a translation runs', async () => {
    mockEditorApi(savedAsSent, () => new Promise(() => {}) as unknown as Response)
    renderApp('/en/admin/home')
    await openEnglishTab()
    fireEvent.change(await headline(), { target: { value: '' } })

    fireEvent.click(screen.getByRole('button', { name: 'Translate from French' }))

    expect(screen.getByRole('tab', { name: 'NL' }).hasAttribute('disabled')).toBe(true)
  })

  test('a confirmation does not follow to another tab', async () => {
    mockEditorApi()
    renderApp('/en/admin/home')
    await openEnglishTab()
    fireEvent.click(screen.getByRole('button', { name: 'Translate from French' }))
    expect(screen.getByRole('alertdialog')).toBeDefined()

    fireEvent.click(screen.getByRole('tab', { name: 'NL' }))

    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  test('explains when translation is unavailable', async () => {
    mockEditorApi(savedAsSent, () => new Response(null, { status: 503 }))
    renderApp('/en/admin/home')
    await openEnglishTab()
    fireEvent.change(await headline(), { target: { value: '' } })

    fireEvent.click(screen.getByRole('button', { name: 'Translate from French' }))

    expect((await screen.findByRole('alert')).textContent).toContain('Translation is unavailable')
  })

  test('tells that missing translations were generated on save', async () => {
    mockEditorApi((body) =>
      Response.json({ ...(body as object), auto_translated: ['nl'], translation_failed: false }),
    )
    renderApp('/en/admin/home')
    fireEvent.change(await headline(), { target: { value: 'Ingénieur logiciel' } })

    fireEvent.click(saveButton())

    expect((await screen.findByText(/Missing translations were generated/)).textContent).toMatch(
      /tabs: NL$/,
    )
  })

  test('warns when translations could not be generated on save', async () => {
    mockEditorApi((body) =>
      Response.json({ ...(body as object), auto_translated: [], translation_failed: true }),
    )
    renderApp('/en/admin/home')
    fireEvent.change(await headline(), { target: { value: 'Ingénieur logiciel' } })

    fireEvent.click(saveButton())

    expect((await screen.findByRole('alert')).textContent).toContain('could not be generated')
  })
})

describe('photo', () => {
  const photo = () => new File(['fake-jpeg'], 'me.jpg', { type: 'image/jpeg' })
  const fileInput = () => screen.findByLabelText(/Upload a photo|Replace the photo/)

  function mockPhotoApi(photoUrl: string | null, status = 204) {
    return mockApi({
      'GET /api/admin/me': signedIn,
      'GET /api/admin/home': () => Response.json({ ...CONTENT, photo_url: photoUrl }),
      'PUT /api/admin/photo': () => new Response(null, { status }),
      'DELETE /api/admin/photo': () => new Response(null, { status: 204 }),
    })
  }

  test('uploads a photo and shows its preview', async () => {
    const fetchMock = mockPhotoApi(null)
    renderApp('/en/admin/home')
    expect(await screen.findByText(/No photo online/)).toBeDefined()
    expect(screen.queryByRole('img', { name: 'Current photo' })).toBeNull()

    fireEvent.change(await fileInput(), { target: { files: [photo()] } })

    expect(await screen.findByText(/Photo uploaded: turned upright/)).toBeDefined()
    expect(screen.getByRole('img', { name: 'Current photo' })).toBeDefined()
    const [, init] = fetchMock.mock.calls.find(([url]) => url === '/api/admin/photo')!
    expect(init?.method).toBe('PUT')
    expect((init!.body as FormData).get('file')).toBeInstanceOf(File)
  })

  test.each([
    [415, 'This file is not a JPEG, PNG or WebP image.'],
    [413, /larger than 5 MB/],
  ])('explains a refused upload (%i)', async (status, message) => {
    mockPhotoApi(null, status)
    renderApp('/en/admin/home')

    fireEvent.change(await fileInput(), { target: { files: [photo()] } })

    expect((await screen.findByRole('alert')).textContent).toMatch(message)
  })

  test('removes the photo after confirming', async () => {
    const fetchMock = mockPhotoApi('/api/photo?v=1')
    renderApp('/en/admin/home')

    fireEvent.click(await screen.findByRole('button', { name: 'Remove the photo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))

    expect(await screen.findByText('Photo removed.')).toBeDefined()
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) => url === '/api/admin/photo' && init?.method === 'DELETE',
      ),
    ).toBe(true)
  })
})

describe('photo framing', () => {
  function mockFramingApi(photo_focus = { x: 50, y: 50 }) {
    return mockApi({
      'GET /api/admin/me': signedIn,
      'GET /api/admin/home': () =>
        Response.json({ ...CONTENT, photo_url: '/api/photo?v=1', photo_focus }),
      'PUT /api/admin/home': (init) => savedAsSent(JSON.parse(String(init?.body))),
      'PUT /api/admin/photo': () => new Response(null, { status: 204 }),
    })
  }

  /** jsdom loads no image: give the photo its natural size by hand. */
  async function photoLoaded(width: number, height: number) {
    const photo = await screen.findByRole('img', { name: 'Current photo' })
    Object.defineProperty(photo, 'naturalWidth', { value: width, configurable: true })
    Object.defineProperty(photo, 'naturalHeight', { value: height, configurable: true })
    fireEvent.load(photo)
  }

  const frame = () => screen.getByRole('slider', { name: 'Photo framing' })

  test('a wide photo is framed left to right, a tall one top to bottom', async () => {
    mockFramingApi()
    renderApp('/en/admin/home')

    await photoLoaded(1200, 600)
    expect(frame().getAttribute('aria-orientation')).toBe('horizontal')
    expect(parseFloat(frame().style.width)).toBeCloseTo((240 / 156 / 2) * 100) // what cover keeps
    expect(frame().style.height).toBe('100%')
  })

  test('a tall photo moves top to bottom', async () => {
    mockFramingApi()
    renderApp('/en/admin/home')

    await photoLoaded(600, 900)
    expect(frame().getAttribute('aria-orientation')).toBe('vertical')
  })

  test('a photo with the frame shape has nothing to frame', async () => {
    mockFramingApi()
    renderApp('/en/admin/home')

    await photoLoaded(240, 156)
    expect(screen.queryByRole('slider')).toBeNull()
    expect(screen.getByText(/already has the frame's shape/)).toBeDefined()
  })

  test('arrows move the frame, Shift faster, never past the edges', async () => {
    mockFramingApi({ x: 5, y: 50 })
    renderApp('/en/admin/home')
    await photoLoaded(1200, 600)

    fireEvent.keyDown(frame(), { key: 'ArrowRight' })
    expect(frame().getAttribute('aria-valuenow')).toBe('6')
    fireEvent.keyDown(frame(), { key: 'ArrowLeft', shiftKey: true })
    expect(frame().getAttribute('aria-valuenow')).toBe('0')
    fireEvent.keyDown(frame(), { key: 'End' })
    expect(frame().getAttribute('aria-valuenow')).toBe('100')
    expect(frame().getAttribute('aria-valuetext')).toBe('100 %')
  })

  test('a moved frame is a change, saved with the texts', async () => {
    const fetchMock = mockFramingApi()
    renderApp('/en/admin/home')
    await photoLoaded(1200, 600)
    expect((saveButton() as HTMLButtonElement).disabled).toBe(true)

    fireEvent.keyDown(frame(), { key: 'ArrowLeft', shiftKey: true })
    fireEvent.click(saveButton())

    expect(await screen.findByText('Saved.')).toBeDefined()
    const [, init] = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')!
    expect(JSON.parse(String(init?.body)).photo_focus).toEqual({ x: 40, y: 50 })
  })

  test('a new photo starts centred, without being an unsaved change', async () => {
    mockFramingApi({ x: 10, y: 50 })
    renderApp('/en/admin/home')
    const input = await screen.findByLabelText(/Replace the photo/)

    fireEvent.change(input, {
      target: { files: [new File(['x'], 'me.jpg', { type: 'image/jpeg' })] },
    })
    await screen.findByText(/Photo uploaded/)
    await photoLoaded(1200, 600)

    expect(frame().getAttribute('aria-valuenow')).toBe('50')
    expect((saveButton() as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('dragging the photo frame', () => {
  /** A 300 × 150 px photo on screen (jsdom has no layout), with pointer capture available. */
  async function wideStage() {
    mockApi({
      'GET /api/admin/me': signedIn,
      'GET /api/admin/home': () =>
        Response.json({ ...CONTENT, photo_url: '/api/photo?v=1', photo_focus: { x: 50, y: 50 } }),
    })
    renderApp('/en/admin/home')
    const photo = await screen.findByRole('img', { name: 'Current photo' })
    Object.defineProperty(photo, 'naturalWidth', { value: 1200 })
    Object.defineProperty(photo, 'naturalHeight', { value: 600 })
    fireEvent.load(photo)
    const stage = photo.parentElement!
    stage.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 150 }) as DOMRect
    Object.assign(stage, { setPointerCapture: () => {}, hasPointerCapture: () => true })
    return stage
  }
  const value = () => screen.getByRole('slider').getAttribute('aria-valuenow')

  test('grabbed near its edge, the frame does not jump', async () => {
    const stage = await wideStage() // the frame covers 34.6–265.4 px

    fireEvent.pointerDown(stage, { button: 0, pointerId: 1, clientX: 40 })
    expect(value()).toBe('50')
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 70 })
    expect(value()).toBe('93') // frame start 34.6 → 64.4 px: moved by the 30 px dragged
  })

  test('pressed outside the frame, it comes there, centred', async () => {
    const stage = await wideStage()

    fireEvent.pointerDown(stage, { button: 0, pointerId: 1, clientX: 290 })
    expect(value()).toBe('100')
  })
})

describe('contact image', () => {
  test('uploads the contact image, framed in portrait from the centre', async () => {
    const fetchMock = mockApi({
      'GET /api/admin/me': signedIn,
      'GET /api/admin/home': () => Response.json(CONTENT),
      'PUT /api/admin/contact-image': () => new Response(null, { status: 204 }),
    })
    renderApp('/en/admin/home')
    const block = (await screen.findByText('Contact page image')).closest('fieldset')!
    expect(within(block).getByText(/No image online/)).toBeDefined()

    fireEvent.change(within(block).getByLabelText(/Upload an image/), {
      target: { files: [new File(['fake-jpeg'], 'desk.jpg', { type: 'image/jpeg' })] },
    })

    expect(await within(block).findByText(/Image uploaded/)).toBeDefined()
    expect(within(block).getByText('On the Contact page')).toBeDefined()
    const result = block.querySelector('img[alt=""]')! // the preview of the site
    expect([result.getAttribute('width'), result.getAttribute('height')]).toEqual(['240', '300'])
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/admin/contact-image')).toBe(true)
  })
})
