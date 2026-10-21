import type { Project } from '../../api/projects.ts'
import { useTranslation } from '../../i18n/useTranslation.ts'
import styles from './LanguageList.module.css'

type Language = Project['languages'][number]

type Part = { name: string; percent: number; slot: number | null } // null: "Others"

function parts(languages: Language[], coloured: string[]): Part[] {
  const kept: Part[] = languages
    .filter(({ name }) => coloured.includes(name))
    .map(({ name, percent }) => ({ name, percent, slot: coloured.indexOf(name) + 1 }))
  const others = languages
    .filter(({ name }) => !coloured.includes(name))
    .reduce((sum, { percent }) => sum + percent, 0)
  return others > 0 ? [...kept, { name: '', percent: others, slot: null }] : kept
}

/** Share of each language of a project, on one line: a coloured dot, the name, the percentage. */
export function LanguageList({
  languages,
  coloured,
}: {
  languages: Language[]
  coloured: string[]
}) {
  const { t, lang } = useTranslation()
  const percent = new Intl.NumberFormat(lang, { style: 'percent', maximumFractionDigits: 1 })

  return (
    <ul className={styles.list} aria-label={t('projects.languages')}>
      {parts(languages, coloured).map((part) => (
        <li key={part.name || 'others'}>
          <span className={styles.swatch} data-slot={part.slot ?? 'others'} aria-hidden="true" />
          {part.name || t('projects.otherLanguages')}{' '}
          <span className={styles.value}>{percent.format(part.percent / 100)}</span>
        </li>
      ))}
    </ul>
  )
}
