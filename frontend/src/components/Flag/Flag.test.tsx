import { render } from '@testing-library/react'
import { expect, test } from 'vitest'
import type { Lang } from '../../i18n/useTranslation.ts'
import { Flag } from './Flag.tsx'

function colours(lang: Lang) {
  const { container } = render(<Flag lang={lang} />)
  const svg = container.querySelector('svg')!
  expect(svg.getAttribute('aria-hidden')).toBe('true')
  return [...svg.querySelectorAll('[fill], [stroke]')].map(
    (shape) => shape.getAttribute('fill') ?? shape.getAttribute('stroke'),
  )
}

const BELGIUM = ['#000000', '#FDDA24', '#EF3340']

test.each([
  ['fr', [...BELGIUM, '#002654', '#CE1126']],
  ['nl', [...BELGIUM, '#AE1C28', '#21468B']],
  ['en', ['#012169', '#C8102E']],
] as const)('the %s flag has the right colours', (lang, expected) => {
  // Spread: toEqual's matcher wants a mutable array.
  expect(colours(lang)).toEqual(expect.arrayContaining([...expected]))
})

test('only the French and Dutch flags show Belgium', () => {
  expect(colours('en')).not.toContain('#FDDA24')
})
