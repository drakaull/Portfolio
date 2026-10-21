import { Link } from 'react-router'
import type { Experience } from '../../api/experiences.ts'
import { useTranslation } from '../../i18n/useTranslation.ts'
import { formatYears } from '../../lib/years.ts'
import { Badge } from '../Badge/Badge.tsx'
import styles from './ExperienceCard.module.css'

// The organisation's image: 2:1, the shape framed in the admin.
export const EXPERIENCE_IMAGE_WIDTH = 288
export const EXPERIENCE_IMAGE_HEIGHT = 144

/**
 * The whole card is one link to the detail page; `compact` drops summary, technologies and image,
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
  const image = !compact && entry.logo_url

  return (
    <Link
      to={`/${lang}/experience/${entry.slug}`}
      className={image ? `${styles.card} ${styles.withImage}` : styles.card}
    >
      {image && (
        // Decorative: the organisation's name is written in the card.
        <img
          className={styles.image}
          src={image}
          alt=""
          width={EXPERIENCE_IMAGE_WIDTH}
          height={EXPERIENCE_IMAGE_HEIGHT}
          loading="lazy"
          style={{ objectPosition: `${entry.logo_focus.x}% ${entry.logo_focus.y}%` }}
        />
      )}
      <span className={styles.body}>
        <span className={styles.meta}>
          <Badge>{t(`experience.kind.${entry.kind}`)}</Badge>
          {showYears && (
            <span className={styles.years}>
              {formatYears(entry.start_year, entry.end_year, t('experience.present'))}
            </span>
          )}
        </span>
        <span className={styles.title}>{entry.title}</span>
        <span className={styles.organization}>{entry.organization}</span>
        {!compact && <span className={styles.summary}>{entry.summary}</span>}
        {!compact && entry.technologies.length > 0 && (
          <span className={styles.technologies}>{entry.technologies.join(' · ')}</span>
        )}
      </span>
    </Link>
  )
}
