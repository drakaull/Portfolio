import type { ReactNode } from 'react'
import { useTranslation } from '../../i18n/useTranslation.ts'
import { Navbar } from '../Navbar/Navbar.tsx'
import styles from './Layout.module.css'

export function Layout({ children }: { children: ReactNode }) {
  const { t } = useTranslation()

  return (
    <>
      <a href="#main" className={styles.skipLink}>
        {t('nav.skip')}
      </a>
      <header className={styles.header}>
        <Navbar />
      </header>
      <main id="main" className={styles.main}>
        {children}
      </main>
    </>
  )
}
