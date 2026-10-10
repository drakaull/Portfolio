import { useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useParams } from 'react-router'
import { DEFAULT_LANG, isLang } from './i18n/useTranslation.ts'
import { ContactPage } from './pages/ContactPage.tsx'
import { ExperiencePage } from './pages/ExperiencePage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'
import { ProjectsPage } from './pages/ProjectsPage.tsx'
import { SkillsPage } from './pages/SkillsPage.tsx'

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
        <Route path="experience" element={<ExperiencePage />} />
        <Route path="skills" element={<SkillsPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
