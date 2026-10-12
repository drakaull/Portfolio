import type { Translated } from './adminHome.ts'
import type { AdminResult } from './adminSkills.ts'

export type ProjectContext = 'school' | 'personal' | 'professional'

export const PROJECT_CONTEXTS: ProjectContext[] = ['school', 'personal', 'professional']

/** What the admin edits; everything else comes from GitHub. */
export type ProjectDetails = {
  title: string
  context: ProjectContext | null
  team_size: number | null
  visible: boolean
}

/** What the form sends; a team size that is not a whole number is sent as typed. */
export type ProjectDetailsBody = Omit<ProjectDetails, 'team_size'> & {
  team_size: number | string | null
}

export type AdminProject = ProjectDetails & {
  id: number
  missing: boolean // gone from the public repositories at the last sync
  about_lang: string | null
  summary: Translated // "" until the "About" is translated
  github: {
    id: number
    name: string
    url: string
    homepage: string | null
    about: string | null
    languages: Record<string, number> // bytes of code per language
    topics: string[]
    created_at: string
    pushed_at: string
    stars: number
  }
}

export type SyncReport = {
  new: number
  updated: number
  missing: number
  translation_failed: boolean
}

export type SyncResult =
  { status: 'ok'; report: SyncReport } | { status: 'unavailable' | 'expired' | 'error' }

export type DetailsResult =
  | { status: 'saved'; project: AdminProject }
  | { status: 'invalid'; fields: (keyof ProjectDetails)[] }
  | { status: 'missing' | 'notFound' | 'expired' | 'error' }

export function detailsOf({ title, context, team_size, visible }: ProjectDetails): ProjectDetails {
  return { title, context, team_size, visible }
}

/** Largest language first, e.g. "Java". */
export function mainLanguage(project: AdminProject): string | null {
  const languages = Object.entries(project.github.languages)
  return languages.length === 0 ? null : languages.sort((a, b) => b[1] - a[1])[0][0]
}

export async function fetchAdminProjects(): Promise<AdminProject[]> {
  const response = await fetch('/api/admin/projects')
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return (await response.json()) as AdminProject[]
}

/** The project, or null when it does not exist. */
export async function fetchAdminProject(id: string): Promise<AdminProject | null> {
  const response = await fetch(`/api/admin/projects/${encodeURIComponent(id)}`)
  if (response.status === 404 || response.status === 422) return null // 422: not a number
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return (await response.json()) as AdminProject
}

/** Import or refresh the public repositories: the only call that reaches GitHub. */
export async function syncProjects(): Promise<SyncResult> {
  try {
    const response = await fetch('/api/admin/projects/sync', { method: 'POST' })
    if (response.ok) return { status: 'ok', report: (await response.json()) as SyncReport }
    if (response.status === 503) return { status: 'unavailable' }
    return { status: response.status === 401 ? 'expired' : 'error' }
  } catch {
    return { status: 'error' }
  }
}

type ValidationError = { loc: (string | number)[] }

export async function saveProjectDetails(
  id: number,
  details: ProjectDetailsBody,
): Promise<DetailsResult> {
  try {
    const response = await fetch(`/api/admin/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details),
    })
    if (response.ok) return { status: 'saved', project: (await response.json()) as AdminProject }
    if (response.status === 422) {
      const { detail } = (await response.json()) as { detail: ValidationError[] }
      return {
        status: 'invalid',
        fields: detail.map((error) => error.loc[1] as keyof ProjectDetails),
      }
    }
    if (response.status === 409) return { status: 'missing' }
    if (response.status === 404) return { status: 'notFound' }
    return { status: response.status === 401 ? 'expired' : 'error' }
  } catch {
    return { status: 'error' }
  }
}

export async function moveProject(id: number, direction: 'up' | 'down'): Promise<AdminResult> {
  try {
    const response = await fetch(`/api/admin/projects/${id}/move`, {
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

export async function deleteProject(id: number): Promise<AdminResult> {
  try {
    const response = await fetch(`/api/admin/projects/${id}`, { method: 'DELETE' })
    // 404: already gone, which is what the admin wanted.
    if (response.ok || response.status === 404) return 'ok'
    return response.status === 401 ? 'expired' : 'error'
  } catch {
    return 'error'
  }
}
