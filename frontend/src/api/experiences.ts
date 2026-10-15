import type { Lang } from '../i18n/useTranslation.ts'
import { useJson } from './useJson.ts'

export type ExperienceKind = 'job' | 'student_job' | 'internship' | 'education'

export type Experience = {
  slug: string
  kind: ExperienceKind
  title: string
  organization: string
  start_year: number
  end_year: number | null
  summary: string
  technologies: string[]
}

export type ExperienceDetail = Experience & { description: string }

export function useExperiences(lang: Lang) {
  return useJson<Experience[]>(`/api/experiences?lang=${lang}`)
}

export function useExperience(slug: string, lang: Lang) {
  return useJson<ExperienceDetail>(`/api/experiences/${encodeURIComponent(slug)}?lang=${lang}`)
}
