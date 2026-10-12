import { expect, test } from 'vitest'
import type { Project } from '../api/projects.ts'
import { colouredLanguages } from './languages.ts'

const project = (languages: [string, number][]) =>
  ({ languages: languages.map(([name, percent]) => ({ name, percent })) }) as Project

test('colours the three most used languages across the shown projects', () => {
  const projects = [
    project([
      ['Java', 99],
      ['Dockerfile', 1],
    ]),
    project([
      ['TypeScript', 70],
      ['CSS', 20],
      ['HTML', 10],
    ]),
    project([
      ['Java', 85],
      ['CSS', 15],
    ]),
  ]

  expect(colouredLanguages(projects)).toEqual(['Java', 'TypeScript', 'CSS'])
})

test('no projects, no colours', () => {
  expect(colouredLanguages([])).toEqual([])
})
