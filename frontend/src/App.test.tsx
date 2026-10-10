import { render, screen, within } from '@testing-library/react'
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
    expect(heading().textContent).toBe('Accueil')
  })

  test('goes to English for any other browser language', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('de-DE')
    renderAt('/')
    expect(heading().textContent).toBe('Home')
  })
})

describe('home page', () => {
  test.each([
    ['/en', 'Home', 'en'],
    ['/fr', 'Accueil', 'fr'],
  ])('%s renders its title and sets <html lang>', (path, title, lang) => {
    renderAt(path)
    expect(heading().textContent).toBe(title)
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
    expect(hrefs).toEqual(['/fr', '/fr/experience', '/fr/skills', '/fr/projects', '/fr/contact'])
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
