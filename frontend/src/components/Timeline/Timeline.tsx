import type { Experience } from '../../api/experiences.ts'
import { useTranslation } from '../../i18n/useTranslation.ts'
import { formatYears } from '../../lib/years.ts'
import { ExperienceCard } from '../ExperienceCard/ExperienceCard.tsx'
import { Reveal } from '../Reveal/Reveal.tsx'
import { Bone, BoneCard } from '../Skeleton/Skeleton.tsx'
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

/** The shape of the timeline while it loads (see Loading). */
export function TimelineSkeleton() {
  return (
    <ol className={styles.timeline}>
      {[1, 2, 3, 4].map((key) => (
        <li key={key} className={styles.item}>
          <span className={styles.years}>
            <Bone width="5.5rem" height="0.875rem" />
          </span>
          <span className={styles.dot} />
          <BoneCard>
            <Bone width="50%" height="1.1rem" />
            <Bone width="30%" />
            <Bone width="85%" />
            <Bone width="40%" height="0.75rem" />
          </BoneCard>
        </li>
      ))}
    </ol>
  )
}
