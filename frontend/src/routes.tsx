import { createRoutesFromElements, Outlet, Route } from 'react-router'
import { AdminLayout } from './components/AdminLayout/AdminLayout.tsx'
import { Layout } from './components/Layout/Layout.tsx'
import { BrowserLanguageRedirect, LocalizedRoutes } from './components/Routing/Routing.tsx'
import { RequireAdmin } from './components/RequireAdmin/RequireAdmin.tsx'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage.tsx'
import { AdminLoginPage } from './pages/admin/AdminLoginPage.tsx'
import { ExperienceEditorPage } from './pages/admin/ExperienceEditorPage.tsx'
import { ExperienceListPage } from './pages/admin/ExperienceListPage.tsx'
import { HomeEditorPage } from './pages/admin/HomeEditorPage.tsx'
import { ContactPage } from './pages/ContactPage.tsx'
import { ExperienceDetailPage } from './pages/ExperienceDetailPage.tsx'
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
        <Route path="experience/:slug" element={<ExperienceDetailPage />} />
        <Route path="skills" element={<SkillsPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route path="admin" element={<AdminLayout />}>
        <Route path="login" element={<AdminLoginPage />} />
        <Route element={<RequireAdmin />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="home" element={<HomeEditorPage />} />
          <Route path="experiences" element={<ExperienceListPage />} />
          <Route path="experiences/new" element={<ExperienceEditorPage />} />
          <Route path="experiences/:slug" element={<ExperienceEditorPage />} />
        </Route>
      </Route>
    </Route>
  </>,
)
