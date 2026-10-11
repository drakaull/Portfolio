import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useTranslation, type Lang } from '../../i18n/useTranslation.ts'
import { Flag } from '../Flag/Flag.tsx'
import styles from './LanguageSwitch.module.css'

// Each name is written in its own language, so it is not part of the dictionaries.
const LANGUAGES: Record<Lang, string> = { fr: 'Français', en: 'English', nl: 'Nederlands' }

export function LanguageSwitch() {
  const { t, lang } = useTranslation()
  const { pathname, search, hash } = useLocation()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        button.current?.focus()
      }
    }
    function closeOnOutsideClick(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('keydown', closeOnEscape)
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('pointerdown', closeOnOutsideClick)
    }
  }, [open])

  return (
    <div
      ref={root}
      className={styles.root}
      // Keyboard users tabbing out of the list close it.
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button
        ref={button}
        type="button"
        className={styles.button}
        aria-label={`${t('language.label')} ${LANGUAGES[lang]}`}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <Flag lang={lang} />
        <span className={styles.code}>{lang.toUpperCase()}</span>
        <svg className={styles.chevron} viewBox="0 0 10 6" aria-hidden="true">
          <path d="M1 1l4 4 4-4" />
        </svg>
      </button>
      <ul id={listId} className={styles.list} hidden={!open}>
        {(Object.keys(LANGUAGES) as Lang[]).map((code) => (
          <li key={code}>
            <Link
              // Swap only the first path segment: /fr/skills -> /en/skills.
              to={{ pathname: pathname.replace(/^\/[^/]*/, `/${code}`), search, hash }}
              className={styles.item}
              lang={code}
              hrefLang={code}
              aria-current={code === lang ? 'true' : undefined}
              onClick={() => setOpen(false)}
            >
              <Flag lang={code} />
              {LANGUAGES[code]}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
