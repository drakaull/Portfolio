import { Link, Outlet } from 'react-router'
import { useTranslation } from '../../i18n/useTranslation.ts'
import { LanguageSwitch } from '../LanguageSwitch/LanguageSwitch.tsx'
import { ThemeToggle } from '../ThemeToggle/ThemeToggle.tsx'
import styles from './AdminLayout.module.css'

export function AdminLayout() {
  const { t, lang } = useTranslation()

  return (
    <>
      {/* Admin pages must never appear in search results. */}
      <meta name="robots" content="noindex" />
      <header className={styles.header}>
        <span className={styles.brand}>{t('admin.title')}</span>
        <Link to={`/${lang}`} className={styles.back}>
          {t('admin.backToSite')}
        </Link>
        <LanguageSwitch />
        <ThemeToggle />
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </>
  )
}
