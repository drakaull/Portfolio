import type { Lang } from '../i18n/useTranslation.ts'
import type { PhotoFocus } from './useHomeContent.ts'

export type Translated = Record<Lang, string>

/** Languages translated from French, the writing language. */
export type TargetLang = Exclude<Lang, 'fr'>

export type HomeContentForm = {
  headline: Translated
  intro: Translated // Markdown
  linkedin_url: string
  github_url: string
  photo_focus: PhotoFocus
  contact_focus: PhotoFocus // framing of the contact page image
}

export type AdminHomeContent = HomeContentForm & {
  has_cv: boolean
  photo_url: string | null // versioned public URL
  contact_image_url: string | null // versioned public URL
}

/** Top-level form fields the server can reject. */
export type HomeField = Exclude<keyof HomeContentForm, 'photo_focus' | 'contact_focus'>

/** What PUT returns: the stored content plus what automatic translation did on this save. */
export type AdminHomeSaved = AdminHomeContent & {
  auto_translated: TargetLang[] // languages generated on this save
  translation_failed: boolean
}

export type SaveResult =
  | { status: 'saved'; content: AdminHomeSaved }
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
    if (response.ok) return { status: 'saved', content: (await response.json()) as AdminHomeSaved }
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

export type TranslateResult =
  { status: 'ok'; translations: string[] } | { status: 'unavailable' | 'expired' | 'error' }

/** Translates French texts with DeepL through the backend (the key never reaches the browser). */
export async function translateFromFrench(
  items: { text: string; format: 'plain' | 'markdown' }[],
  target: TargetLang,
): Promise<TranslateResult> {
  try {
    const response = await fetch('/api/admin/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, items }),
    })
    if (response.ok) {
      const { translations } = (await response.json()) as { translations: string[] }
      return { status: 'ok', translations }
    }
    if (response.status === 503) return { status: 'unavailable' }
    if (response.status === 401) return { status: 'expired' }
    return { status: 'error' }
  } catch {
    return { status: 'error' }
  }
}

/** Both stored files (CV, photo) are limited to 5 MB by the server. */
export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024

export type FileResult = 'ok' | 'tooLarge' | 'wrongType' | 'expired' | 'error'

const FILE_STATUSES: Record<number, FileResult> = {
  401: 'expired',
  413: 'tooLarge',
  415: 'wrongType',
}

/** Uploads to `/api/admin/cv` or `/api/admin/photo`; applied at once by the server. */
export async function uploadFile(url: string, file: File): Promise<FileResult> {
  // Convenience only: the server re-checks size and content.
  if (file.size > UPLOAD_MAX_BYTES) return 'tooLarge'
  const body = new FormData()
  body.append('file', file)
  try {
    const response = await fetch(url, { method: 'PUT', body })
    return response.ok ? 'ok' : (FILE_STATUSES[response.status] ?? 'error')
  } catch {
    return 'error'
  }
}

export async function deleteFile(url: string): Promise<FileResult> {
  try {
    const response = await fetch(url, { method: 'DELETE' })
    return response.ok ? 'ok' : (FILE_STATUSES[response.status] ?? 'error')
  } catch {
    return 'error'
  }
}
