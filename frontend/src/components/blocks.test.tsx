import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, test, vi } from 'vitest'
import { Badge } from './Badge/Badge.tsx'
import { Button } from './Button/Button.tsx'
import { Eyebrow } from './Eyebrow/Eyebrow.tsx'
import { Reveal } from './Reveal/Reveal.tsx'
import { TextLink } from './TextLink/TextLink.tsx'

describe('building blocks', () => {
  test('Eyebrow and Badge render their text', () => {
    render(
      <>
        <Eyebrow>~/portfolio/competences</Eyebrow>
        <Badge>Stage</Badge>
      </>,
    )

    expect(screen.getByText('~/portfolio/competences').tagName).toBe('P')
    expect(screen.getByText('Stage').tagName).toBe('SPAN')
  })

  test('Button is a real button that forwards its props', () => {
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} disabled={false}>
        Save
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Save' })
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
    expect(button.getAttribute('type')).toBe('button')
  })

  test('internal TextLink navigates within the app', () => {
    render(
      <MemoryRouter>
        <TextLink to="/en/skills">Skills</TextLink>
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: 'Skills' })
    expect(link.getAttribute('href')).toBe('/en/skills')
    expect(link.getAttribute('target')).toBeNull()
  })

  test('external TextLink opens a new tab safely and says so', () => {
    render(
      <MemoryRouter>
        <TextLink to="https://github.com/someone" external variant="button">
          GitHub
        </TextLink>
      </MemoryRouter>,
    )

    // jsdom drops the space before the hidden text when computing the name; screen readers keep it.
    const link = screen.getByRole('link', { name: /^GitHub\s*\(opens in a new tab\)$/ })
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  })

  test('Reveal keeps its children as direct children', () => {
    const { container } = render(
      <Reveal className="hero">
        <h1>Title</h1>
        <p>Text</p>
      </Reveal>,
    )

    const wrapper = container.firstElementChild!
    expect(wrapper.classList.contains('hero')).toBe(true)
    expect([...wrapper.children].map((child) => child.tagName)).toEqual(['H1', 'P'])
  })
})
