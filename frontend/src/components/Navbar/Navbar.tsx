import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router'
import { useTranslation } from '../../i18n/useTranslation.ts'
import { LanguageSwitch } from '../LanguageSwitch/LanguageSwitch.tsx'
import { ThemeToggle } from '../ThemeToggle/ThemeToggle.tsx'
import styles from './Navbar.module.css'

const SECTIONS = ['experience', 'skills', 'projects', 'contact'] as const

export function Navbar() {
  const { t, lang } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen) return

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        menuButton.current?.focus()
      }
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  return (
    <nav className={styles.nav} aria-label={t('nav.label')}>
      <Link to={`/${lang}`} className={styles.brand}>
        {t('site.name')}
      </Link>
      {/* Only visible on narrow screens (see the CSS media query). */}
      <button
        ref={menuButton}
        type="button"
        className={styles.menuButton}
        aria-expanded={menuOpen}
        aria-controls="nav-links"
        onClick={() => setMenuOpen((open) => !open)}
      >
        {t('nav.menu')}
      </button>
      <ul id="nav-links" className={`${styles.links} ${menuOpen ? styles.open : ''}`}>
        {SECTIONS.map((section) => (
          <li key={section}>
            {/* NavLink sets aria-current="page" on the active link; the CSS styles that attribute. */}
            <NavLink
              to={`/${lang}/${section}`}
              className={styles.link}
              onClick={() => setMenuOpen(false)}
            >
              {t(`${section}.title`)}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className={styles.controls}>
        <LanguageSwitch />
        <ThemeToggle />
      </div>
    </nav>
  )
}
