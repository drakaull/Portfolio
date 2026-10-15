import { useSharedHomeContent } from '../../api/homeContentContext.ts'
import { useTranslation } from '../../i18n/useTranslation.ts'
import { TextLink } from '../TextLink/TextLink.tsx'
import styles from './Footer.module.css'

const YEAR = new Date().getFullYear()

export function Footer() {
  const { t, lang } = useTranslation()
  const home = useSharedHomeContent()

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.signature}>
          © {YEAR} {t('site.name')} · {t('footer.place')}
        </p>
        <ul className={styles.links}>
          <li>
            <TextLink to={`/${lang}/privacy`}>{t('footer.privacy')}</TextLink>
          </li>
          {home.status === 'ready' && (
            <>
              <li>
                <TextLink to={home.content.linkedin_url} external>
                  LinkedIn
                </TextLink>
              </li>
              <li>
                <TextLink to={home.content.github_url} external>
                  GitHub
                </TextLink>
              </li>
            </>
          )}
        </ul>
      </div>
    </footer>
  )
}
