import type { Project } from '../../api/projects.ts'
import { useTranslation } from '../../i18n/useTranslation.ts'
import styles from './LanguageDonut.module.css'

type Language = Project['languages'][number]

type Segment = { name: string; percent: number; slot: number | null } // null: "Others"

function segments(languages: Language[], coloured: string[]): Segment[] {
  const kept: Segment[] = languages
    .filter(({ name }) => coloured.includes(name))
    .map(({ name, percent }) => ({ name, percent, slot: coloured.indexOf(name) + 1 }))
  const others = languages
    .filter(({ name }) => !coloured.includes(name))
    .reduce((sum, { percent }) => sum + percent, 0)
  return others > 0 ? [...kept, { name: '', percent: others, slot: null }] : kept
}

const RADIUS = 15.9155 // circumference of 100, so a dash length is a percentage
const GAP = 1.2 // surface gap between segments, in percent of the ring

/** Share of each language of a project: a ring (decorative) and a legend that carries the
 * names and numbers. */
export function LanguageDonut({
  languages,
  coloured,
}: {
  languages: Language[]
  coloured: string[]
}) {
  const { t, lang } = useTranslation()
  const parts = segments(languages, coloured)
  const percent = new Intl.NumberFormat(lang, { style: 'percent', maximumFractionDigits: 1 })
  const gap = parts.length > 1 ? GAP : 0
  const starts = parts.map((_, index) =>
    parts.slice(0, index).reduce((sum, part) => sum + part.percent, 0),
  )

  return (
    <div className={styles.donut}>
      <svg className={styles.ring} viewBox="0 0 42 42" aria-hidden="true">
        {parts.map((part, index) => {
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
      <ul className={styles.legend} aria-label={t('projects.languages')}>
        {parts.map((part) => (
          <li key={part.name || 'others'}>
            <span className={styles.swatch} data-slot={part.slot ?? 'others'} aria-hidden="true" />
            {part.name || t('projects.otherLanguages')}{' '}
            <span className={styles.value}>{percent.format(part.percent / 100)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
