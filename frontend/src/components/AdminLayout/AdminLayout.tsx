import { Outlet } from 'react-router'
import { useTranslation } from '../../i18n/useTranslation.ts'
import { LanguageSwitch } from '../LanguageSwitch/LanguageSwitch.tsx'
import { TextLink } from '../TextLink/TextLink.tsx'
import { ThemeToggle } from '../ThemeToggle/ThemeToggle.tsx'
import styles from './AdminLayout.module.css'

export function AdminLayout() {
  const { t, lang } = useTranslation()

  return (
    <>
      {/* Admin pages must never appear in search results. */}
      <meta name="robots" content="noindex" />
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.brand}>{t('admin.title')}</span>
          <TextLink to={`/${lang}`}>{t('admin.backToSite')}</TextLink>
          <LanguageSwitch />
          <ThemeToggle />
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </>
  )
}
