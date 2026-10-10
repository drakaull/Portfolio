import { createRoutesFromElements, Outlet, Route } from 'react-router'
import { AdminLayout } from './components/AdminLayout/AdminLayout.tsx'
import { Layout } from './components/Layout/Layout.tsx'
import { BrowserLanguageRedirect, LocalizedRoutes } from './components/Routing/Routing.tsx'
import { AdminHomePage } from './pages/admin/AdminHomePage.tsx'
import { AdminLoginPage } from './pages/admin/AdminLoginPage.tsx'
import { ContactPage } from './pages/ContactPage.tsx'
import { ExperiencePage } from './pages/ExperiencePage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'
import { ProjectsPage } from './pages/ProjectsPage.tsx'
import { SkillsPage } from './pages/SkillsPage.tsx'

// Single route list, used by the browser router (main.tsx) and by tests (test/renderApp.tsx).
export const routes = createRoutesFromElements(
  <>
    <Route index element={<BrowserLanguageRedirect />} />
    <Route path="admin/*" element={<BrowserLanguageRedirect path="/admin" />} />
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
  </>,
)
