import { useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useParams } from 'react-router'
import { AdminLayout } from './components/AdminLayout/AdminLayout.tsx'
import { Layout } from './components/Layout/Layout.tsx'
import { DEFAULT_LANG, isLang } from './i18n/useTranslation.ts'
import { AdminHomePage } from './pages/admin/AdminHomePage.tsx'
import { AdminLoginPage } from './pages/admin/AdminLoginPage.tsx'
import { ContactPage } from './pages/ContactPage.tsx'
import { ExperiencePage } from './pages/ExperiencePage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'
import { ProjectsPage } from './pages/ProjectsPage.tsx'
import { SkillsPage } from './pages/SkillsPage.tsx'

function browserLang() {
  return navigator.language.toLowerCase().startsWith('fr') ? 'fr' : DEFAULT_LANG
}

function LocalizedRoutes() {
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

export function App() {
  return (
    <Routes>
      <Route index element={<Navigate to={`/${browserLang()}`} replace />} />
      <Route path="admin/*" element={<Navigate to={`/${browserLang()}/admin`} replace />} />
      <Route path=":lang" element={<LocalizedRoutes />}>
        <Route
          element={
            <Layout>
              <Outlet />
            </Layout>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="experience" element={<ExperiencePage />} />
          <Route path="skills" element={<SkillsPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminHomePage />} />
          <Route path="login" element={<AdminLoginPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
