import { useSkills } from '../api/skills.ts'
import { PageHeader } from '../components/PageHeader/PageHeader.tsx'
import { SkillIcon } from '../components/SkillIcon/SkillIcon.tsx'
import { useTranslation } from '../i18n/useTranslation.ts'
import styles from './SkillsPage.module.css'

export function SkillsPage() {
  const { t } = useTranslation()
  const state = useSkills()

  return (
    <>
      <PageHeader eyebrow={t('eyebrow.skills')} title={t('skills.title')} />
      {state.status === 'loading' && <p role="status">{t('skills.loading')}</p>}
      {(state.status === 'error' || state.status === 'notFound') && (
        <p role="alert">{t('skills.error')}</p>
      )}
      {state.status === 'ready' && state.data.length === 0 && <p>{t('skills.empty')}</p>}
      {state.status === 'ready' && state.data.length > 0 && (
        <div className={styles.groups}>
          {/* The server sends only non-empty categories, already in display order. */}
          {state.data.map(({ category, skills }) => (
            <section key={category} aria-labelledby={`skills-${category}`}>
              <h2 id={`skills-${category}`} className={styles.category}>
                {t(`skills.category.${category}`)}
              </h2>
              <ul className={styles.list}>
                {skills.map((skill) => (
                  <li key={skill.name} className={styles.chip}>
                    {skill.icon && <SkillIcon icon={skill.icon} />}
                    {skill.name}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
