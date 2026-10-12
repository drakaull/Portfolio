import { expect, test } from 'vitest'
import { searchIcons, type IconChoice } from './simpleIcons.ts'

const icon = (title: string): IconChoice => ({
  title,
  slug: title.toLowerCase(),
  hex: '000000',
  path: 'M0 0z',
})
const ICONS = ['PyPI', 'Python', 'PyTorch', 'MicroPython', 'React', 'Pythonanywhere'].map(icon)

const titles = (query: string, limit?: number) =>
  searchIcons(ICONS, query, limit).map((found) => found.title)

test('exact name first, then names starting with the query, shorter first', () => {
  expect(titles('python')).toEqual(['Python', 'Pythonanywhere', 'MicroPython'])
})

test('ignores case, accents and surrounding spaces; empty query finds nothing', () => {
  expect(titles('  RÉACT ')).toEqual(['React'])
  expect(titles('   ')).toEqual([])
})

test('stops at the limit', () => {
  expect(titles('py', 2)).toEqual(['PyPI', 'Python'])
})
