import { useSharedHomeContent } from '../../api/homeContentContext.ts'
import { useTranslation } from '../../i18n/useTranslation.ts'
import { TextLink } from '../TextLink/TextLink.tsx'
import styles from './Footer.module.css'

const YEAR = new Date().getFullYear()

export function Footer() {
  const { t } = useTranslation()
  const home = useSharedHomeContent()

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.signature}>
          © {YEAR} {t('site.name')} · {t('footer.place')}
        </p>
        {home.status === 'ready' && (
          <ul className={styles.links}>
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
          </ul>
        )}
      </div>
    </footer>
  )
}
