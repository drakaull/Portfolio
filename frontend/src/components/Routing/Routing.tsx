import { useEffect } from 'react'
import { Navigate, Outlet, useParams } from 'react-router'
import { DEFAULT_LANG, isLang } from '../../i18n/useTranslation.ts'
import { NotFoundPage } from '../../pages/NotFoundPage.tsx'
import { Layout } from '../Layout/Layout.tsx'

/** Redirects to `/<browser language><path>`; the language is read at each visit. */
export function BrowserLanguageRedirect({ path = '' }: { path?: string }) {
  const lang = navigator.language.toLowerCase().startsWith('fr') ? 'fr' : DEFAULT_LANG
  return <Navigate to={`/${lang}${path}`} replace />
}

/** Validates the `:lang` segment and keeps `<html lang>` in sync with it. */
export function LocalizedRoutes() {
  const { lang } = useParams()
  const validLang = isLang(lang) ? lang : DEFAULT_LANG

  useEffect(() => {
    document.documentElement.lang = validLang
  }, [validLang])

  return isLang(lang) ? (
    <Outlet />
  ) : (
    <Layout>
      <NotFoundPage />
    </Layout>
  )
}
