import { Link } from 'react-router'
import { useAdminExperiences } from '../../api/adminExperiences.ts'
import { Badge } from '../../components/Badge/Badge.tsx'
import { useTranslation } from '../../i18n/useTranslation.ts'
import { formatYears } from '../../lib/years.ts'
import adminStyles from './Admin.module.css'
import styles from './ExperienceListPage.module.css'

export function ExperienceListPage() {
  const { t, lang } = useTranslation()
  const state = useAdminExperiences()

  return (
    <section className={styles.page}>
      <title>{`${t('admin.experiences.title')} · ${t('admin.title')}`}</title>
      <Link to={`/${lang}/admin`}>{t('admin.home.backToDashboard')}</Link>
      <div className={styles.header}>
        <h1 className={adminStyles.title}>{t('admin.experiences.title')}</h1>
        <Link to={`/${lang}/admin/experiences/new`} className={styles.newLink}>
          {t('admin.experiences.new')}
        </Link>
      </div>

      {state.status === 'loading' && <p role="status">{t('admin.loading')}</p>}
      {(state.status === 'error' || state.status === 'notFound') && (
        <p className={adminStyles.error} role="alert">
          {t('admin.error')}
        </p>
      )}
      {state.status === 'ready' && state.data.length === 0 && <p>{t('admin.experiences.empty')}</p>}
      {state.status === 'ready' && state.data.length > 0 && (
        // Same order as the public timeline (the server sorts by years).
        <ul className={styles.list}>
          {state.data.map((entry) => (
            <li key={entry.slug} className={styles.item}>
              <span className={styles.years}>
                {formatYears(entry.start_year, entry.end_year, t('experience.present'))}
              </span>
              <span className={styles.main}>
                <Link to={`/${lang}/admin/experiences/${entry.slug}`} className={styles.title}>
                  {entry.title[lang] || entry.title.fr}
                </Link>
                <span className={styles.organization}>{entry.organization}</span>
              </span>
              <Badge>{t(`experience.kind.${entry.kind}`)}</Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
