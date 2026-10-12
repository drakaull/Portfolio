import { expect, test } from 'vitest'
import { SLUG_MAX_LENGTH, slugify } from './slug.ts'

test.each([
  [['Ingénieur R&D', 'I-care Group'], 'ingenieur-r-d-i-care-group'],
  [['  Formation IA  ', 'Ateliers Créatifs'], 'formation-ia-ateliers-creatifs'],
  [['Stage — été 2026!', ''], 'stage-ete-2026'],
  [['', ''], ''],
])('slugify(%j) = %s', (parts, expected) => {
  expect(slugify(...parts)).toBe(expected)
})

test('stays within the length limit without a trailing hyphen', () => {
  const slug = slugify('a'.repeat(79), 'b')
  expect(slug.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH)
  expect(slug.endsWith('-')).toBe(false)
})
