import { useJson } from './useJson.ts'

export type SkillCategory = 'languages' | 'frontend' | 'backend' | 'tools' | 'ides'

/** A Simple Icons logo as stored by the admin: 24x24 SVG path and brand colour. */
export type SkillIconData = { slug: string; hex: string; path: string }

export type Skill = { name: string; icon: SkillIconData | null }

export type SkillGroup = { category: SkillCategory; skills: Skill[] }

/** Skills grouped by category, in display order; names are not translated. */
export function useSkills() {
  return useJson<SkillGroup[]>('/api/skills')
}
