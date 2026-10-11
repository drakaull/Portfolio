import type { ReactNode } from 'react'
import { useTranslation } from '../../i18n/useTranslation.ts'
import { Eyebrow } from '../Eyebrow/Eyebrow.tsx'
import { Reveal } from '../Reveal/Reveal.tsx'
import styles from './PageHeader.module.css'

/** Path eyebrow, page title and browser tab title of a section page. */
export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children?: ReactNode
}) {
  const { t } = useTranslation()

  return (
    <Reveal className={styles.header}>
      <title>{`${title} · ${t('site.name')}`}</title>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className={styles.title}>{title}</h1>
      {children}
    </Reveal>
  )
}
