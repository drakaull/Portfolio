import type { SkillIconData } from '../api/skills.ts'

export type IconChoice = SkillIconData & { title: string }

let loading: Promise<IconChoice[]> | null = null

/** Every Simple Icons logo, loaded on first use: its own chunk, kept out of the public bundle. */
export function loadSimpleIcons(): Promise<IconChoice[]> {
  loading ??= import('simple-icons').then((module) =>
    Object.values(module as Record<string, unknown>)
      .filter(
        (value): value is IconChoice =>
          typeof value === 'object' && value !== null && 'path' in value,
      )
      .map(({ title, slug, hex, path }) => ({ title, slug, hex, path })),
  )
  return loading
}

const normalize = (text: string) =>
  text.normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '').toLowerCase().trim()

/** Logos whose name contains the query: exact match first, then names starting with it. */
export function searchIcons(icons: IconChoice[], query: string, limit = 12): IconChoice[] {
  const wanted = normalize(query)
  if (wanted === '') return []
  const rank = (icon: IconChoice) => {
    const title = normalize(icon.title)
    return title === wanted ? 0 : title.startsWith(wanted) ? 1 : 2
  }
  return icons
    .filter((icon) => normalize(icon.title).includes(wanted))
    .sort((a, b) => rank(a) - rank(b) || a.title.length - b.title.length)
    .slice(0, limit)
}
