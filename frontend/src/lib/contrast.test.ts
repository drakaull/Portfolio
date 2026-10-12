import { expect, test } from 'vitest'
import { contrast } from './contrast.ts'

test('black on white is 21:1, a colour on itself 1:1, in any order', () => {
  expect(contrast('000000', 'FFFFFF')).toBeCloseTo(21)
  expect(contrast('FFFFFF', '000000')).toBeCloseTo(21)
  expect(contrast('3776AB', '3776ab')).toBeCloseTo(1)
})

test('matches the WCAG reference for a mid grey on white', () => {
  expect(contrast('767676', 'FFFFFF')).toBeCloseTo(4.54, 1)
})
