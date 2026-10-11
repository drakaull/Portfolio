/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

// Read from disk: Vitest does not process CSS, so a `?raw` import would be empty.
// Tests run from frontend/ (jsdom gives import.meta.url an http: scheme, so no relative URL).
const css = readFileSync('src/styles/global.css', 'utf8')

test('reduced motion disables animations and transitions everywhere', () => {
  const rule = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))

  expect(rule).toContain('animation-duration: 0.01ms !important')
  expect(rule).toContain('transition-duration: 0.01ms !important')
})

test('both themes define every color token', () => {
  const light = css.slice(css.indexOf(':root {'), css.indexOf(":root[data-theme='dark']"))
  const dark = css.slice(css.indexOf(":root[data-theme='dark']"))
  const colorTokens = [...light.matchAll(/(--color-[\w-]+):/g)].map((match) => match[1])

  expect(colorTokens.length).toBeGreaterThan(0)
  for (const token of colorTokens) expect(dark).toContain(`${token}:`)
})
