import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { renderApp } from './test/renderApp.tsx'

const heading = () => screen.getByRole('heading', { level: 1 })

afterEach(() => {
  vi.restoreAllMocks()
})

describe('root redirect', () => {
  test('goes to French when the browser language is French', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-BE')
    renderApp('/')
    expect(screen.getByRole('link', { name: 'Parcours' })).toBeDefined()
  })

  test('goes to Dutch when the browser language is Dutch', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('nl-BE')
    renderApp('/')
    expect(screen.getByRole('link', { name: 'Ervaring' })).toBeDefined()
  })

  test('goes to English for any other browser language', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('de-DE')
    renderApp('/')
    expect(screen.getByRole('link', { name: 'Experience' })).toBeDefined()
  })
})

describe('home page', () => {
  test.each([
    ['/en', 'en'],
    ['/fr', 'fr'],
  ])('%s renders the name as title and sets <html lang>', (path, lang) => {
    renderApp(path)
    expect(heading().textContent).toBe('Léonard Fontaine')
    expect(document.documentElement.lang).toBe(lang)
  })
})

describe('section pages', () => {
  test.each([
    ['/en/experience', 'Experience'],
    ['/fr/experience', 'Parcours'],
    ['/en/skills', 'Skills'],
    ['/fr/skills', 'Compétences'],
    ['/en/projects', 'Projects'],
    ['/fr/projects', 'Projets'],
    ['/en/contact', 'Contact'],
    ['/fr/contact', 'Contact'],
  ])('%s renders its translated title', (path, title) => {
    renderApp(path)
    expect(heading().textContent).toBe(title)
  })

  test('sets the document title', () => {
    renderApp('/fr/skills')
    expect(document.title).toBe('Compétences · Léonard Fontaine')
  })
})

describe('navbar', () => {
  test('links to home and every section in the current language', () => {
    renderApp('/fr')
    const nav = screen.getByRole('navigation', { name: 'Principale' })
    const hrefs = within(nav)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
    // Brand, then the "Accueil" link and the sections (the closed language list is hidden).
    expect(hrefs).toEqual([
      '/fr',
      '/fr',
      '/fr/experience',
      '/fr/skills',
      '/fr/projects',
      '/fr/contact',
    ])
  })

  test('marks the home link as current on the home page only', () => {
    renderApp('/fr')
    expect(screen.getByRole('link', { name: 'Accueil' }).getAttribute('aria-current')).toBe('page')
  })

  test('marks the current section link with aria-current', () => {
    renderApp('/en/projects')
    expect(screen.getByRole('link', { name: 'Projects' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Skills' }).getAttribute('aria-current')).toBeNull()
    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('aria-current')).toBeNull()
  })

  test('offers a skip link to the main content', () => {
    renderApp('/en')
    expect(screen.getByRole('link', { name: 'Skip to content' }).getAttribute('href')).toBe('#main')
  })
})

describe('mobile menu', () => {
  const menuButton = () => screen.getByRole('button', { name: 'Menu' })

  test('opens and closes with the menu button', () => {
    renderApp('/en')
    expect(menuButton().getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(menuButton())
    expect(menuButton().getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(menuButton())
    expect(menuButton().getAttribute('aria-expanded')).toBe('false')
  })

  test('closes on Escape and gives focus back to the button', () => {
    renderApp('/en')
    fireEvent.click(menuButton())
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(menuButton().getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(menuButton())
  })

  test('closes after choosing a section', () => {
    renderApp('/en')
    fireEvent.click(menuButton())
    fireEvent.click(screen.getByRole('link', { name: 'Skills' }))
    expect(heading().textContent).toBe('Skills')
    expect(menuButton().getAttribute('aria-expanded')).toBe('false')
  })
})

describe('language switch', () => {
  const switchButton = (name: string) => screen.getByRole('button', { name })

  test('shows the current language, closed', () => {
    renderApp('/fr/skills')
    const button = switchButton('Langue : Français')
    expect(button.textContent).toBe('FR')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('link', { name: 'English' })).toBeNull()
  })

  test('lists every language, linking to the current page', () => {
    renderApp('/fr/skills')
    fireEvent.click(switchButton('Langue : Français'))

    const links = [
      ['Français', 'fr'],
      ['English', 'en'],
      ['Nederlands', 'nl'],
    ].map(([name, lang]) => {
      const link = screen.getByRole('link', { name })
      expect(link.getAttribute('href')).toBe(`/${lang}/skills`)
      expect(link.getAttribute('hreflang')).toBe(lang)
      expect(link.getAttribute('lang')).toBe(lang)
      return link
    })
    expect(links.map((link) => link.getAttribute('aria-current'))).toEqual(['true', null, null])
  })

  test('switches language, keeps the current section and closes', () => {
    renderApp('/fr/skills')
    fireEvent.click(switchButton('Langue : Français'))
    fireEvent.click(screen.getByRole('link', { name: 'English' }))

    expect(heading().textContent).toBe('Skills')
    expect(document.documentElement.lang).toBe('en')
    expect(switchButton('Language: English').getAttribute('aria-expanded')).toBe('false')
  })

  test('switches to Dutch from the home page', () => {
    renderApp('/en')
    fireEvent.click(switchButton('Language: English'))
    fireEvent.click(screen.getByRole('link', { name: 'Nederlands' }))
    expect(screen.getByRole('link', { name: 'Ervaring' })).toBeDefined()
  })

  test('Escape closes the list and returns focus to the button', () => {
    renderApp('/en')
    const button = switchButton('Language: English')
    fireEvent.click(button)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(button)
  })

  test('keeps the query and the anchor', () => {
    renderApp('/fr/skills?tab=1#top')
    fireEvent.click(switchButton('Langue : Français'))
    expect(screen.getByRole('link', { name: 'Nederlands' }).getAttribute('href')).toBe(
      '/nl/skills?tab=1#top',
    )
  })

  test('closes when the focus leaves it', () => {
    renderApp('/en')
    const button = switchButton('Language: English')
    fireEvent.click(button)

    fireEvent.blur(button, { relatedTarget: screen.getByRole('link', { name: 'Skills' }) })

    expect(button.getAttribute('aria-expanded')).toBe('false')
  })

  test('stays open when the focus goes nowhere (Safari clicks)', () => {
    renderApp('/en')
    const button = switchButton('Language: English')
    fireEvent.click(button)

    fireEvent.blur(button, { relatedTarget: null })

    expect(button.getAttribute('aria-expanded')).toBe('true')
  })

  test('stays open while the focus moves inside it', () => {
    renderApp('/en')
    const button = switchButton('Language: English')
    fireEvent.click(button)

    fireEvent.blur(button, { relatedTarget: screen.getByRole('link', { name: 'Nederlands' }) })

    expect(button.getAttribute('aria-expanded')).toBe('true')
  })

  test('a click outside closes the list', () => {
    renderApp('/en')
    const button = switchButton('Language: English')
    fireEvent.click(button)

    fireEvent.pointerDown(heading())

    expect(button.getAttribute('aria-expanded')).toBe('false')
  })
})

describe('path eyebrows', () => {
  test.each([
    ['/fr', '~/portfolio'],
    ['/en', '~/portfolio'],
    ['/fr/skills', '~/portfolio/competences'],
    ['/en/experience', '~/portfolio/experience'],
    ['/fr/nope', '~/portfolio/404'],
    ['/nl', '~/portfolio'],
    ['/nl/skills', '~/portfolio/vaardigheden'],
  ])('%s shows %s', (path, eyebrow) => {
    renderApp(path)
    expect(screen.getByText(eyebrow)).toBeDefined()
  })
})

describe('not found page', () => {
  test.each([
    ['/de', 'Page not found'],
    ['/de/skills', 'Page not found'],
    ['/en/nope', 'Page not found'],
    ['/fr/nope', 'Page introuvable'],
  ])('%s shows the 404 page', (path, title) => {
    renderApp(path)
    expect(heading().textContent).toBe(title)
  })

  test('asks search engines not to index it', () => {
    renderApp('/en/nope')
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex')
  })
})
