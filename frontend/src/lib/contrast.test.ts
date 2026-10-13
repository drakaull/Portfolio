import { expect, test } from 'vitest'
import { contrast, readableOn } from './contrast.ts'

test('black on white is 21:1, a colour on itself 1:1, in any order', () => {
  expect(contrast('000000', 'FFFFFF')).toBeCloseTo(21)
  expect(contrast('FFFFFF', '000000')).toBeCloseTo(21)
  expect(contrast('3776AB', '3776ab')).toBeCloseTo(1)
})

test('matches the WCAG reference for a mid grey on white', () => {
  expect(contrast('767676', 'FFFFFF')).toBeCloseTo(4.54, 1)
})

test('a pale colour is darkened on a light background and lightened on a dark one', () => {
  const postmanOnCream = readableOn('FF6C37', 'f7f4ec', 3) // too pale as is
  expect(contrast(postmanOnCream, 'f7f4ec')).toBeGreaterThanOrEqual(3)
  expect(parseInt(postmanOnCream.slice(0, 2), 16)).toBeLessThan(0xff)

  const githubOnDark = readableOn('181717', '1b1a17', 3)
  expect(contrast(githubOnDark, '1b1a17')).toBeGreaterThanOrEqual(3)
  expect(parseInt(githubOnDark.slice(0, 2), 16)).toBeGreaterThan(0x18)
})

test('a colour that is already readable is kept as is', () => {
  expect(readableOn('3776ab', 'f7f4ec', 3)).toBe('3776ab')
})
