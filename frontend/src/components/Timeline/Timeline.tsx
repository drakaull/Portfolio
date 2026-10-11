import type { Experience } from '../../api/experiences.ts'
import { useTranslation } from '../../i18n/useTranslation.ts'
import { formatYears } from '../../lib/years.ts'
import { ExperienceCard } from '../ExperienceCard/ExperienceCard.tsx'
import { Reveal } from '../Reveal/Reveal.tsx'
import styles from './Timeline.module.css'

/** Vertical timeline, most recent at the top: years on the left, a line with dots, the cards. */
export function Timeline({ entries }: { entries: Experience[] }) {
  const { t } = useTranslation()

  return (
    <ol className={styles.timeline} aria-label={t('experience.timeline')}>
      {entries.map((entry) => (
        <li key={entry.slug} className={styles.item}>
          <span className={styles.years}>
            {formatYears(entry.start_year, entry.end_year, t('experience.present'))}
          </span>
          <span className={styles.dot} aria-hidden="true" />
          <Reveal className={styles.card}>
            <ExperienceCard entry={entry} showYears={false} />
          </Reveal>
        </li>
      ))}
    </ol>
  )
}
