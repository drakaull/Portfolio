import { Link } from 'react-router'
import type { Experience } from '../../api/experiences.ts'
import { useTranslation } from '../../i18n/useTranslation.ts'
import { formatYears } from '../../lib/years.ts'
import { Badge } from '../Badge/Badge.tsx'
import styles from './ExperienceCard.module.css'

/**
 * The whole card is one link to the detail page; `compact` drops summary and technologies,
 * `showYears={false}` lets a timeline show the years beside the card instead.
 */
export function ExperienceCard({
  entry,
  compact = false,
  showYears = true,
}: {
  entry: Experience
  compact?: boolean
  showYears?: boolean
}) {
  const { t, lang } = useTranslation()

  return (
    <Link to={`/${lang}/experience/${entry.slug}`} className={styles.card}>
      <span className={styles.meta}>
        {showYears && (
          <span className={styles.years}>
            {formatYears(entry.start_year, entry.end_year, t('experience.present'))}
          </span>
        )}
        <Badge>{t(`experience.kind.${entry.kind}`)}</Badge>
      </span>
      <span className={styles.title}>{entry.title}</span>
      <span className={styles.organization}>{entry.organization}</span>
      {!compact && <span className={styles.summary}>{entry.summary}</span>}
      {!compact && entry.technologies.length > 0 && (
        <span className={styles.technologies}>
          {entry.technologies.join(' · ')}
        </span>
      )}
    </Link>
  )
}
