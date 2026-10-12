import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { logout } from '../../api/admin.ts'
import type { Inbox } from '../../api/adminContact.ts'
import { useJson } from '../../api/useJson.ts'
import { Button } from '../../components/Button/Button.tsx'
import { useAdmin } from '../../components/RequireAdmin/useAdmin.ts'
import { useTranslation } from '../../i18n/useTranslation.ts'
import styles from './Admin.module.css'

export function AdminDashboardPage() {
  const { t, lang } = useTranslation()
  const { username } = useAdmin()
  const navigate = useNavigate()
  const [logoutFailed, setLogoutFailed] = useState(false)
  const inbox = useJson<Inbox>('/api/admin/messages')
  const unread = inbox.status === 'ready' ? inbox.data.unread : 0

  async function handleLogout() {
    try {
      await logout()
    } catch {
      // The session may still be alive: say so instead of pretending the user is signed out.
      setLogoutFailed(true)
      return
    }
    navigate(`/${lang}/admin/login`, { replace: true })
  }

  return (
    <section className={styles.card}>
      <title>{t('admin.title')}</title>
      <h1 className={styles.title}>{t('admin.title')}</h1>
      <p>
        {t('admin.connectedAs')} <strong>{username}</strong>
      </p>
      <nav aria-label={t('admin.sections')}>
        <h2 className={styles.subtitle}>{t('admin.sections')}</h2>
        <ul className={styles.sectionList}>
          <li>
            <Link to={`/${lang}/admin/home`}>{t('admin.sections.home')}</Link>
          </li>
          <li>
            <Link to={`/${lang}/admin/experiences`}>{t('admin.sections.experiences')}</Link>
          </li>
          <li>
            <Link to={`/${lang}/admin/skills`}>{t('admin.sections.skills')}</Link>
          </li>
          <li>
            <Link to={`/${lang}/admin/projects`}>{t('admin.sections.projects')}</Link>
          </li>
          <li>
            <Link to={`/${lang}/admin/messages`}>
              {t('admin.sections.messages')}
              {unread > 0 &&
                ` (${unread} ${t(unread === 1 ? 'admin.messages.unreadOne' : 'admin.messages.unreadMany')})`}
            </Link>
          </li>
        </ul>
      </nav>
      <Button onClick={handleLogout}>{t('admin.logout')}</Button>
      {logoutFailed && (
        <p className={styles.error} role="alert">
          {t('admin.logoutError')}
        </p>
      )}
    </section>
  )
}
