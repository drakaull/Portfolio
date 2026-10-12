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

export type SkillBody = Omit<AdminSkill, 'id'>

/** Top-level fields the server can reject. */
export type SkillField = keyof SkillBody

export type SkillSaveResult =
  | { status: 'saved'; skill: AdminSkill }
  | { status: 'invalid'; fields: SkillField[] }
  | { status: 'taken' | 'notFound' | 'expired' | 'error' }

/** The skill, or null when it does not exist. */
export async function fetchAdminSkill(id: string): Promise<AdminSkill | null> {
  const response = await fetch(`/api/admin/skills/${encodeURIComponent(id)}`)
  if (response.status === 404 || response.status === 422) return null // 422: not a number
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return (await response.json()) as AdminSkill
}

type ValidationError = { loc: (string | number)[] }

/** Creates the skill when `id` is null, else replaces it. */
export async function saveSkill(body: SkillBody, id: number | null): Promise<SkillSaveResult> {
  try {
    const response = await fetch(id === null ? '/api/admin/skills' : `/api/admin/skills/${id}`, {
      method: id === null ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (response.ok) return { status: 'saved', skill: (await response.json()) as AdminSkill }
    if (response.status === 422) {
      // FastAPI reports e.g. loc = ["body", "icon", "path"]: keep the top-level field.
      const { detail } = (await response.json()) as { detail: ValidationError[] }
      return { status: 'invalid', fields: detail.map((error) => error.loc[1] as SkillField) }
    }
    if (response.status === 409) return { status: 'taken' }
    if (response.status === 404) return { status: 'notFound' }
    if (response.status === 401) return { status: 'expired' }
    return { status: 'error' }
  } catch {
    return { status: 'error' }
  }
}

export async function deleteSkill(id: number): Promise<AdminResult> {
  try {
    const response = await fetch(`/api/admin/skills/${id}`, { method: 'DELETE' })
    // 404: already gone, which is what the admin wanted.
    if (response.ok || response.status === 404) return 'ok'
    return response.status === 401 ? 'expired' : 'error'
  } catch {
    return 'error'
  }
}
