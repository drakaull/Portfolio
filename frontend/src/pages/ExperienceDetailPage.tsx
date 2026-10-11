import { useParams } from 'react-router'
import { useExperience } from '../api/experiences.ts'
import { Badge } from '../components/Badge/Badge.tsx'
import { MarkdownText } from '../components/MarkdownText/MarkdownText.tsx'
import { PageHeader } from '../components/PageHeader/PageHeader.tsx'
import { TextLink } from '../components/TextLink/TextLink.tsx'
import { useTranslation } from '../i18n/useTranslation.ts'
import { formatYears } from '../lib/years.ts'
import styles from './ExperienceDetailPage.module.css'
import { NotFoundPage } from './NotFoundPage.tsx'

export function ExperienceDetailPage() {
  const { t, lang } = useTranslation()
  const { slug = '' } = useParams()
  const state = useExperience(slug, lang)

  if (state.status === 'notFound') return <NotFoundPage />
  if (state.status === 'loading') return <p role="status">{t('experience.loading')}</p>
  if (state.status === 'error') return <p role="alert">{t('experience.error')}</p>

  const entry = state.data
  return (
    <article>
      <PageHeader eyebrow={`${t('eyebrow.experience')}/${entry.slug}`} title={entry.title}>
        <p className={styles.meta}>
          <Badge>{t(`experience.kind.${entry.kind}`)}</Badge>
          <span className={styles.years}>
            {formatYears(entry.start_year, entry.end_year, t('experience.present'))}
          </span>
          <span>{entry.organization}</span>
        </p>
      </PageHeader>
      <div className={styles.description}>
        <MarkdownText>{entry.description}</MarkdownText>
      </div>
      {entry.technologies.length > 0 && (
        <section className={styles.technologies} aria-labelledby="technologies-title">
          <h2 id="technologies-title" className={styles.subtitle}>
            {t('experience.technologies')}
          </h2>
          <ul>
            {entry.technologies.map((technology) => (
              <li key={technology}>{technology}</li>
            ))}
          </ul>
        </section>
      )}
      <p className={styles.back}>
        <TextLink to={`/${lang}/experience`}>← {t('experience.back')}</TextLink>
      </p>
    </article>
  )
}
