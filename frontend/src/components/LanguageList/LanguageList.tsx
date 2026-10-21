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

const RADIUS = 15.9155 // circumference of 100, so a dash length is a percentage
const GAP = 1.2 // surface gap between segments, in percent of the ring

/** The same shares as a ring, decorative: the list carries the names and numbers. */
function LanguageRing({ languages, coloured }: { languages: Language[]; coloured: string[] }) {
  const shares = parts(languages, coloured)
  const gap = shares.length > 1 ? GAP : 0
  const starts = shares.map((_, index) =>
    shares.slice(0, index).reduce((sum, part) => sum + part.percent, 0),
  )
  return (
    <svg className={styles.ring} viewBox="0 0 42 42" aria-hidden="true">
      {shares.map((part, index) => {
        const length = Math.max(part.percent - gap, 0.4)
        return (
          <circle
            key={part.name || 'others'}
            className={styles.segment}
            data-slot={part.slot ?? 'others'}
            cx="21"
            cy="21"
            r={RADIUS}
            strokeDasharray={`${length} ${100 - length}`}
            // Starts at 12 o'clock, then clockwise.
            strokeDashoffset={25 - starts[index]}
          />
        )
      })}
    </svg>
  )
}

/** Share of each language of a project, on one line: a coloured dot, the name, the percentage. */
export function LanguageList({
  languages,
  coloured,
  stacked = false,
}: {
  languages: Language[]
  coloured: string[]
  stacked?: boolean // one language per line, as next to the ring
}) {
  const { t, lang } = useTranslation()
  const percent = new Intl.NumberFormat(lang, { style: 'percent', maximumFractionDigits: 1 })

  return (
    <ul className={stacked ? styles.stacked : styles.list} aria-label={t('projects.languages')}>
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

/** The ring with the list next to it: for a project without a screenshot. */
export function LanguageDonut(props: { languages: Language[]; coloured: string[] }) {
  return (
    <div className={styles.donut}>
      <LanguageRing {...props} />
      <LanguageList {...props} stacked />
    </div>
  )
}
