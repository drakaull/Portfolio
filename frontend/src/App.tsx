import { useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useParams } from 'react-router'
import { DEFAULT_LANG, isLang } from './i18n/useTranslation.ts'
import { HomePage } from './pages/HomePage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'

function RootRedirect() {
  const lang = navigator.language.toLowerCase().startsWith('fr') ? 'fr' : DEFAULT_LANG
  return <Navigate to={`/${lang}`} replace />
}

function LocalizedRoutes() {
  const { lang } = useParams()
  const validLang = isLang(lang) ? lang : DEFAULT_LANG

  useEffect(() => {
    document.documentElement.lang = validLang
  }, [validLang])

  return isLang(lang) ? <Outlet /> : <NotFoundPage />
}

export function App() {
  return (
    <Routes>
      <Route index element={<RootRedirect />} />
      <Route path=":lang" element={<LocalizedRoutes />}>
        <Route index element={<HomePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
