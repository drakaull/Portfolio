import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { App } from './App.tsx'

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

const heading = () => screen.getByRole('heading', { level: 1 })

afterEach(() => {
  vi.restoreAllMocks()
})

describe('root redirect', () => {
  test('goes to French when the browser language is French', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-BE')
    renderAt('/')
    expect(screen.getByRole('link', { name: 'Parcours' })).toBeDefined()
  })

  test('goes to English for any other browser language', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('de-DE')
    renderAt('/')
    expect(screen.getByRole('link', { name: 'Experience' })).toBeDefined()
  })
})

describe('home page', () => {
  test.each([
    ['/en', 'en'],
    ['/fr', 'fr'],
  ])('%s renders the name as title and sets <html lang>', (path, lang) => {
    renderAt(path)
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
    renderAt(path)
    expect(heading().textContent).toBe(title)
  })

  test('sets the document title', () => {
    renderAt('/fr/skills')
    expect(document.title).toBe('Compétences · Léonard Fontaine')
  })
})

describe('navbar', () => {
  test('links to home and every section in the current language', () => {
    renderAt('/fr')
    const nav = screen.getByRole('navigation', { name: 'Principale' })
    const hrefs = within(nav)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
    // Last link is the language switch.
    expect(hrefs).toEqual([
      '/fr',
      '/fr/experience',
      '/fr/skills',
      '/fr/projects',
      '/fr/contact',
      '/en',
    ])
  })

  test('marks the current section link with aria-current', () => {
    renderAt('/en/projects')
    expect(screen.getByRole('link', { name: 'Projects' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Skills' }).getAttribute('aria-current')).toBeNull()
  })

  test('offers a skip link to the main content', () => {
    renderAt('/en')
    expect(screen.getByRole('link', { name: 'Skip to content' }).getAttribute('href')).toBe('#main')
  })
})

describe('mobile menu', () => {
  const menuButton = () => screen.getByRole('button', { name: 'Menu' })

  test('opens and closes with the menu button', () => {
    renderAt('/en')
    expect(menuButton().getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(menuButton())
    expect(menuButton().getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(menuButton())
    expect(menuButton().getAttribute('aria-expanded')).toBe('false')
  })

  test('closes on Escape and gives focus back to the button', () => {
    renderAt('/en')
    fireEvent.click(menuButton())
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(menuButton().getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(menuButton())
  })

  test('closes after choosing a section', () => {
    renderAt('/en')
    fireEvent.click(menuButton())
    fireEvent.click(screen.getByRole('link', { name: 'Skills' }))
    expect(heading().textContent).toBe('Skills')
    expect(menuButton().getAttribute('aria-expanded')).toBe('false')
  })
})

describe('language switch', () => {
  test('switches to English and keeps the current section', () => {
    renderAt('/fr/skills')
    fireEvent.click(screen.getByRole('link', { name: 'English' }))
    expect(heading().textContent).toBe('Skills')
    expect(document.documentElement.lang).toBe('en')
  })

  test('switches to French from the home page', () => {
    renderAt('/en')
    fireEvent.click(screen.getByRole('link', { name: 'Français' }))
    expect(screen.getByRole('link', { name: 'Parcours' })).toBeDefined()
  })
})

describe('not found page', () => {
  test.each([
    ['/de', 'Page not found'],
    ['/de/skills', 'Page not found'],
    ['/en/nope', 'Page not found'],
    ['/fr/nope', 'Page introuvable'],
  ])('%s shows the 404 page', (path, title) => {
    renderAt(path)
    expect(heading().textContent).toBe(title)
  })
})
