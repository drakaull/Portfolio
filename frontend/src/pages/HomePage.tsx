import { useSharedHomeContent } from '../api/homeContentContext.ts'
import type { HomeContent } from '../api/useHomeContent.ts'
import { Eyebrow } from '../components/Eyebrow/Eyebrow.tsx'
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
      {/* Right-hand column intentionally empty: the Experience feature will show recent entries. */}
      <Reveal className={styles.intro}>
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
