import type { TargetLang, Translated } from './adminHome.ts'
import type { ExperienceKind } from './experiences.ts'
import { useJson } from './useJson.ts'

/** An experience as the admin edits it: every language of each translated text. */
export type AdminExperience = {
  slug: string
  kind: ExperienceKind
  organization: string
  start_year: number
  end_year: number | null
  technologies: string[]
  title: Translated
  summary: Translated
  description: Translated // Markdown
  logo_url: string | null // versioned public URL
}

/** What a save returns: the stored entry plus what automatic translation did. */
export type AdminExperienceSaved = AdminExperience & {
  auto_translated: TargetLang[]
  translation_failed: boolean
}

/** What the form sends. A year that is not a number is sent as typed: the server explains why. */
export type ExperienceBody = Omit<
  AdminExperience,
  'slug' | 'start_year' | 'end_year' | 'logo_url'
> & {
  slug?: string
  start_year: number | string
  end_year: number | string | null
}

/** Top-level fields the server can reject. */
export type ExperienceField = Exclude<keyof AdminExperience, 'logo_url'>

export type ExperienceSaveResult =
  | { status: 'saved'; entry: AdminExperienceSaved }
  | { status: 'invalid'; fields: ExperienceField[] }
  | { status: 'taken' | 'notFound' | 'expired' | 'error' }

export function useAdminExperiences() {
  return useJson<AdminExperience[]>('/api/admin/experiences')
}

const url = (slug: string) => `/api/admin/experiences/${encodeURIComponent(slug)}`

/** The entry, or null when it does not exist. */
export async function fetchAdminExperience(slug: string): Promise<AdminExperience | null> {
  const response = await fetch(url(slug))
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return (await response.json()) as AdminExperience
}

type ValidationError = { loc: (string | number)[] }

/** Creates the entry when `slug` is null (the body then carries its slug), else replaces it. */
export async function saveExperience(
  body: ExperienceBody,
  slug: string | null,
): Promise<ExperienceSaveResult> {
  try {
    const response = await fetch(slug === null ? '/api/admin/experiences' : url(slug), {
      method: slug === null ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (response.ok) {
      return { status: 'saved', entry: (await response.json()) as AdminExperienceSaved }
    }
    if (response.status === 422) {
      // FastAPI reports e.g. loc = ["body", "title", "fr"]: keep the top-level field.
      const { detail } = (await response.json()) as { detail: ValidationError[] }
      return { status: 'invalid', fields: detail.map((error) => error.loc[1] as ExperienceField) }
    }
    if (response.status === 409) return { status: 'taken' }
    if (response.status === 404) return { status: 'notFound' }
    if (response.status === 401) return { status: 'expired' }
    return { status: 'error' }
  } catch {
    return { status: 'error' }
  }
}

export async function deleteExperience(slug: string): Promise<'ok' | 'expired' | 'error'> {
  try {
    const response = await fetch(url(slug), { method: 'DELETE' })
    // 404: already gone, which is what the admin wanted.
    if (response.ok || response.status === 404) return 'ok'
    return response.status === 401 ? 'expired' : 'error'
  } catch {
    return 'error'
  }
}
