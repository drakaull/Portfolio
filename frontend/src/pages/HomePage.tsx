import { useSharedHomeContent } from '../api/homeContentContext.ts'
import type { HomeContent } from '../api/useHomeContent.ts'
import { MarkdownText } from '../components/MarkdownText/MarkdownText.tsx'
import { useTranslation } from '../i18n/useTranslation.ts'
import styles from './HomePage.module.css'

export function HomePage() {
  const { t } = useTranslation()
  const state = useSharedHomeContent()

  return (
    <section className={styles.hero}>
      <title>{t('site.name')}</title>
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
    </section>
  )
}

function HomeDetails({ content }: { content: HomeContent }) {
  const { t } = useTranslation()

  return (
    <>
      <p className={styles.headline}>{content.headline}</p>
      <div className={styles.intro}>
        <MarkdownText>{content.intro}</MarkdownText>
      </div>
      <ul className={styles.links}>
        {content.cv_url && (
          <li>
            <ExternalLink href={content.cv_url} primary>
              {t('home.cv')}
            </ExternalLink>
          </li>
        )}
        <li>
          <ExternalLink href={content.linkedin_url}>LinkedIn</ExternalLink>
        </li>
        <li>
          <ExternalLink href={content.github_url}>GitHub</ExternalLink>
        </li>
      </ul>
    </>
  )
}

function ExternalLink({
  href,
  primary = false,
  children,
}: {
  href: string
  primary?: boolean
  children: string
}) {
  const { t } = useTranslation()

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={primary ? styles.primary : styles.secondary}
    >
      {children}
      <span className={styles.visuallyHidden}> ({t('home.newTab')})</span>
    </a>
  )
}
