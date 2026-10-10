import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, expect, test } from 'vitest'
import { ThemeToggle } from './ThemeToggle.tsx'

function renderToggle() {
  render(
    <MemoryRouter>
      <ThemeToggle />
    </MemoryRouter>,
  )
  return screen.getByRole('button', { name: 'Dark mode' })
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.dataset.theme = 'light'
})

test('starts from the theme already set on <html>', () => {
  document.documentElement.dataset.theme = 'dark'
  expect(renderToggle().getAttribute('aria-pressed')).toBe('true')
})

test('toggles the theme and remembers the choice', () => {
  const button = renderToggle()

  fireEvent.click(button)
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(localStorage.getItem('theme')).toBe('dark')
  expect(button.getAttribute('aria-pressed')).toBe('true')

  fireEvent.click(button)
  expect(document.documentElement.dataset.theme).toBe('light')
  expect(localStorage.getItem('theme')).toBe('light')
  expect(button.getAttribute('aria-pressed')).toBe('false')
})
