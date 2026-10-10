import { Link, NavLink } from 'react-router'
import { useTranslation } from '../../i18n/useTranslation.ts'
import styles from './Navbar.module.css'

const SECTIONS = ['experience', 'skills', 'projects', 'contact'] as const

export function Navbar() {
  const { t, lang } = useTranslation()

  return (
    <nav className={styles.nav} aria-label={t('nav.label')}>
      <Link to={`/${lang}`} className={styles.brand}>
        {t('site.name')}
      </Link>
      <ul className={styles.links}>
        {SECTIONS.map((section) => (
          <li key={section}>
            {/* NavLink sets aria-current="page" on the active link; the CSS styles that attribute. */}
            <NavLink to={`/${lang}/${section}`} className={styles.link}>
              {t(`${section}.title`)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
