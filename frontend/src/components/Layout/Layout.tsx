import type { ReactNode } from 'react'
import { HomeContentContext } from '../../api/homeContentContext.ts'
import { useHomeContent } from '../../api/useHomeContent.ts'
import { useTranslation } from '../../i18n/useTranslation.ts'
import { Footer } from '../Footer/Footer.tsx'
import { Navbar } from '../Navbar/Navbar.tsx'
import styles from './Layout.module.css'

export function Layout({ children }: { children: ReactNode }) {
  const { t, lang } = useTranslation()
  const home = useHomeContent(lang)

  return (
    <HomeContentContext value={home}>
      <a href="#main" className={styles.skipLink}>
        {t('nav.skip')}
      </a>
      <header className={styles.header}>
        <Navbar />
      </header>
      <main id="main" className={styles.main}>
        {children}
      </main>
      <Footer />
    </HomeContentContext>
  )
}
