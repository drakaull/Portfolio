import type { Translated } from './adminHome.ts'
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
}

export function useAdminExperiences() {
  return useJson<AdminExperience[]>('/api/admin/experiences')
}
