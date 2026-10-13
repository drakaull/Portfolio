import { useExperiences } from '../api/experiences.ts'
import { useSharedHomeContent } from '../api/homeContentContext.ts'
import type { HomeContent } from '../api/useHomeContent.ts'
import { ExperienceCard } from '../components/ExperienceCard/ExperienceCard.tsx'
import { Eyebrow } from '../components/Eyebrow/Eyebrow.tsx'
import { HeroPhoto } from '../components/HeroPhoto/HeroPhoto.tsx'
import { MarkdownText } from '../components/MarkdownText/MarkdownText.tsx'
import { Reveal } from '../components/Reveal/Reveal.tsx'
import { TextLink } from '../components/TextLink/TextLink.tsx'
import { useTranslation } from '../i18n/useTranslation.ts'
import styles from './HomePage.module.css'

export function HomePage() {
  const { t } = useTranslation()
  const state = useSharedHomeContent()

  return (
    <section className={styles.hero}>
      <title>{t('site.name')}</title>
      <Reveal className={styles.intro}>
        {state.status === 'ready' && state.content.photo_url && (
          <HeroPhoto src={state.content.photo_url} alt={t('home.photoAlt')} />
        )}
        <Eyebrow>{t('eyebrow.home')}</Eyebrow>
        <h1 className={styles.name}>{t('site.name')}</h1>
        {state.status === 'loading' && (
          <p className={styles.status} role="status">
            {t('home.loading')}
          </p>
        )}
        {state.status === 'error' && (
          <p className={styles.status} role="alert">
            {t('home.error')}
          </p>
        )}
        {state.status === 'ready' && <HomeDetails content={state.content} />}
      </Reveal>
      <RecentPath />
    </section>
  )
}

function HomeDetails({ content }: { content: HomeContent }) {
  const { t } = useTranslation()

  return (
    <>
      <p className={styles.headline}>{content.headline}</p>
      <div className={styles.text}>
        <MarkdownText>{content.intro}</MarkdownText>
      </div>
      <div className={styles.actions}>
        {content.cv_url && (
          <TextLink to={content.cv_url} external variant="button">
            {t('home.cv')}
          </TextLink>
        )}
        <TextLink to={content.linkedin_url} external>
          LinkedIn
        </TextLink>
        <TextLink to={content.github_url} external>
          GitHub
        </TextLink>
      </div>
    </>
  )
}

const RECENT_COUNT = 3

/** Latest entries of the timeline; nothing at all while loading, on error or when empty. */
function RecentPath() {
  const { t, lang } = useTranslation()
  const state = useExperiences(lang)

  if (state.status !== 'ready' || state.data.length === 0) return null
  return (
    <aside className={styles.recent} aria-labelledby="recent-path-title">
      <h2 id="recent-path-title" className={styles.recentTitle}>
        {t('home.recentPath')}
      </h2>
      <Reveal className={styles.recentList}>
        {state.data.slice(0, RECENT_COUNT).map((entry) => (
          <ExperienceCard key={entry.slug} entry={entry} compact />
        ))}
      </Reveal>
      <TextLink to={`/${lang}/experience`}>{t('home.fullPath')} →</TextLink>
    </aside>
  )
}
