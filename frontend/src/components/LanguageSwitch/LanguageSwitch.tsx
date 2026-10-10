import { Link, useLocation } from 'react-router'
import { useTranslation, type Lang } from '../../i18n/useTranslation.ts'
import styles from './LanguageSwitch.module.css'

// Each label is written in its own language, so it is not part of the dictionaries.
const TARGETS: Record<Lang, { lang: Lang; short: string; label: string }> = {
  en: { lang: 'fr', short: 'FR', label: 'Français' },
  fr: { lang: 'en', short: 'EN', label: 'English' },
}

export function LanguageSwitch() {
  const { lang } = useTranslation()
  const { pathname } = useLocation()
  const target = TARGETS[lang]
  // Swap only the first path segment: /fr/skills -> /en/skills.
  const to = pathname.replace(/^\/[^/]*/, `/${target.lang}`)

  return (
    <Link
      to={to}
      className={styles.switch}
      lang={target.lang}
      hrefLang={target.lang}
      aria-label={target.label}
    >
      {target.short}
    </Link>
  )
}
