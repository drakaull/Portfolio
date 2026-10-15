import type { Project } from '../api/projects.ts'

/** How many languages get a colour of their own; the rest share "Others" (the palette was
 * validated for colour-blind readers in both themes: three hues pass, a fourth does not). */
export const COLOURED_LANGUAGES = 3

/**
 * The languages coloured on the page: the most used across the shown projects, so a language
 * keeps the same colour on every card.
 */
export function colouredLanguages(projects: Project[]): string[] {
  const totals = new Map<string, number>()
  for (const { languages } of projects) {
    for (const { name, percent } of languages) {
      totals.set(name, (totals.get(name) ?? 0) + percent)
    }
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, COLOURED_LANGUAGES)
    .map(([name]) => name)
}
