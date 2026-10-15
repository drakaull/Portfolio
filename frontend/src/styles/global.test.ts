/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

// Read from disk: Vitest does not process CSS, so a `?raw` import would be empty.
// Tests run from frontend/ (jsdom gives import.meta.url an http: scheme, so no relative URL).
const css = readFileSync('src/styles/global.css', 'utf8')

test('reduced motion turns off smooth scrolling, and moving entrances only fade', () => {
  const rule = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
  const reveal = readFileSync('src/components/Reveal/Reveal.module.css', 'utf8')
  const revealRule = reveal.slice(reveal.indexOf('@media (prefers-reduced-motion: reduce)'))

  expect(rule).toContain('scroll-behavior: auto')
  expect(revealRule).toContain('animation-name: fade')
})

test('high contrast makes borders at least 3:1 in both themes', () => {
  const rule = css.slice(css.indexOf('@media (prefers-contrast: more)'))

  expect(rule).toMatch(/:root \{\s*--color-border: #857d6f/)
  expect(rule).toMatch(/data-theme='dark'\] \{\s*--color-border: #76705f/)
})

test('both themes define every color token', () => {
  const light = css.slice(css.indexOf(':root {'), css.indexOf(":root[data-theme='dark']"))
  const dark = css.slice(css.indexOf(":root[data-theme='dark']"))
  const colorTokens = [...light.matchAll(/(--color-[\w-]+):/g)].map((match) => match[1])

  expect(colorTokens.length).toBeGreaterThan(0)
  for (const token of colorTokens) expect(dark).toContain(`${token}:`)
})
