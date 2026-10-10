import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useTranslation } from '../../i18n/useTranslation.ts'
import buttonStyles from '../Button/Button.module.css'
import styles from './TextLink.module.css'

type Props = {
  to: string
  children: ReactNode
  /** Opens in a new tab, safely, and tells screen readers so. */
  external?: boolean
  variant?: 'text' | 'button'
}

export function TextLink({ to, children, external = false, variant = 'text' }: Props) {
  const { t } = useTranslation()
  const className = variant === 'button' ? buttonStyles.button : styles.link

  if (!external) {
    return (
      <Link to={to} className={className}>
        {children}
      </Link>
    )
  }
  return (
    <a href={to} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="visually-hidden"> ({t('link.newTab')})</span>
    </a>
  )
}
