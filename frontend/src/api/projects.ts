import type { Lang } from '../i18n/useTranslation.ts'
import type { ProjectContext } from './adminProjects.ts'
import type { PhotoFocus } from './useHomeContent.ts'
import { useJson } from './useJson.ts'

export type Project = {
  title: string
  summary: string | null // the repository's "About", translated; null without one
  context: ProjectContext | null
  team_size: number | null
  url: string
  homepage: string | null
  languages: { name: string; percent: number }[] // largest first
  topics: string[]
  created_at: string
  pushed_at: string
  stars: number
  image_url: string | null // the screenshot, versioned
  image_focus: PhotoFocus
}

/** Visible projects, in the order chosen in the admin. */
export function useProjects(lang: Lang) {
  return useJson<Project[]>(`/api/projects?lang=${lang}`)
}
