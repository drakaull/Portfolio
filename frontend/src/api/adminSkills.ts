import type { SkillCategory, SkillIconData } from './skills.ts'

export const SKILL_CATEGORIES: SkillCategory[] = [
  'languages',
  'frontend',
  'backend',
  'tools',
  'ides',
]

export type AdminSkill = {
  id: number
  name: string
  category: SkillCategory
  icon: SkillIconData | null
}

export type AdminResult = 'ok' | 'expired' | 'error'

/** Every skill, by category (display order) then position. */
export async function fetchAdminSkills(): Promise<AdminSkill[]> {
  const response = await fetch('/api/admin/skills')
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return (await response.json()) as AdminSkill[]
}

export async function moveSkill(id: number, direction: 'up' | 'down'): Promise<AdminResult> {
  try {
    const response = await fetch(`/api/admin/skills/${id}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction }),
    })
    if (response.ok) return 'ok'
    return response.status === 401 ? 'expired' : 'error'
  } catch {
    return 'error'
  }
}
