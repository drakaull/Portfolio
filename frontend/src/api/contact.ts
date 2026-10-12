import type { Lang } from '../i18n/useTranslation.ts'

export type ContactForm = {
  name: string
  email: string
  message: string
  leave_empty: string // trap: stays empty for people, filled in by robots
}

export type ContactField = 'name' | 'email' | 'message'

export type ContactResult =
  | { status: 'sent' }
  | { status: 'invalid'; fields: ContactField[] }
  | { status: 'tooMany' | 'error' }

type ValidationError = { loc: (string | number)[] }

export async function sendContactMessage(form: ContactForm, lang: Lang): Promise<ContactResult> {
  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, lang }),
    })
    if (response.ok) return { status: 'sent' }
    if (response.status === 422) {
      const { detail } = (await response.json()) as { detail: ValidationError[] }
      return { status: 'invalid', fields: detail.map((error) => error.loc[1] as ContactField) }
    }
    return { status: response.status === 429 ? 'tooMany' : 'error' }
  } catch {
    return { status: 'error' }
  }
}
