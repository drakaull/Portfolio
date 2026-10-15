import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { mockApi } from '../test/mockApi.ts'
import { renderApp } from '../test/renderApp.tsx'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('privacy page', () => {
  test.each([
    ['fr', 'Vie privée', 'Autorité de protection des données', '/fr/contact'],
    ['en', 'Privacy', 'Data Protection Authority', '/en/contact'],
    ['nl', 'Privacy', 'Gegevensbeschermingsautoriteit', '/nl/contact'],
  ])('exists in %s and sends people to the contact form', (lang, title, authority, contact) => {
    mockApi({})
    renderApp(`/${lang}/privacy`)

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(title)
    expect(screen.getByText(authority)).toBeDefined()
    const main = screen.getByRole('main')
    const contactLinks = within(main)
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href') === contact)
    expect(contactLinks.length).toBeGreaterThan(0)
  })

  test('is linked from the footer of every page', () => {
    mockApi({})
    renderApp('/fr/skills')

    const footer = screen.getByRole('contentinfo')
    expect(within(footer).getByRole('link', { name: 'Vie privée' }).getAttribute('href')).toBe(
      '/fr/privacy',
    )
  })

  test.each(['fr', 'en', 'nl'])(
    'shows only the public contact address, never the inbox behind it (%s)',
    (lang) => {
      mockApi({})
      renderApp(`/${lang}/privacy`)

      const addresses = screen.getByRole('main').textContent?.match(/[\w.+-]+@[\w.-]+/g)
      expect(addresses).toEqual(['contact@leonard-fontaine.com']) // legal notice; Gmail stays hidden
    },
  )
})
