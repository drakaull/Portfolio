import { useEffect, useState } from 'react'
import type { Lang } from '../i18n/useTranslation.ts'

/** The point of the photo (in % of its width and height) kept in view by its frame. */
export type PhotoFocus = { x: number; y: number }

/** Where a new photo's framing starts (the server does the same). */
export const PHOTO_FOCUS_CENTRE: PhotoFocus = { x: 50, y: 50 }

export type HomeContent = {
  headline: string
  intro: string // Markdown
  linkedin_url: string
  github_url: string
  cv_url: string | null
  photo_url: string | null // versioned: changes when the photo is replaced
  photo_focus: PhotoFocus
  contact_image_url: string | null // the contact page image, versioned
  contact_focus: PhotoFocus
}

type Result = { lang: Lang; content: HomeContent } | { lang: Lang; error: true }

export type HomeContentState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; content: HomeContent }

export function useHomeContent(lang: Lang): HomeContentState {
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    // Aborting on language change stops a slow, outdated answer from overwriting the new one.
    const controller = new AbortController()

    fetch(`/api/home?lang=${lang}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<HomeContent>
      })
      .then((content) => setResult({ lang, content }))
      .catch(() => {
        if (!controller.signal.aborted) setResult({ lang, error: true })
      })

    return () => controller.abort()
  }, [lang])

  // A result for another language means the new request is still in flight.
  if (result?.lang !== lang) return { status: 'loading' }
  return 'error' in result ? { status: 'error' } : { status: 'ready', content: result.content }
}
