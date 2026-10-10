export type Translated = { en: string; fr: string }

export type HomeContentForm = {
  headline: Translated
  intro: Translated // Markdown
  linkedin_url: string
  github_url: string
}

export type AdminHomeContent = HomeContentForm & { has_cv: boolean }

/** Top-level form fields the server can reject. */
export type HomeField = keyof HomeContentForm

export type SaveResult =
  | { status: 'saved'; content: AdminHomeContent }
  | { status: 'invalid'; fields: HomeField[] }
  | { status: 'expired' }
  | { status: 'error' }

export async function fetchAdminHome(): Promise<AdminHomeContent> {
  const response = await fetch('/api/admin/home')
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return (await response.json()) as AdminHomeContent
}

type ValidationError = { loc: (string | number)[] }

export async function saveAdminHome(form: HomeContentForm): Promise<SaveResult> {
  try {
    const response = await fetch('/api/admin/home', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (response.ok)
      return { status: 'saved', content: (await response.json()) as AdminHomeContent }
    if (response.status === 401) return { status: 'expired' }
    if (response.status === 422) {
      // FastAPI reports e.g. loc = ["body", "headline", "en"]: keep the top-level field.
      const { detail } = (await response.json()) as { detail: ValidationError[] }
      return { status: 'invalid', fields: detail.map((error) => error.loc[1] as HomeField) }
    }
    return { status: 'error' }
  } catch {
    return { status: 'error' }
  }
}
