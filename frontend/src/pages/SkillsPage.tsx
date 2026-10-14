import { useSkills } from '../api/skills.ts'
import { PageHeader } from '../components/PageHeader/PageHeader.tsx'
import { Bone, Loading } from '../components/Skeleton/Skeleton.tsx'
import { SkillIcon } from '../components/SkillIcon/SkillIcon.tsx'
import { useTranslation } from '../i18n/useTranslation.ts'
import styles from './SkillsPage.module.css'

export function SkillsPage() {
  const { t } = useTranslation()
  const state = useSkills()

  return (
    <>
      <PageHeader eyebrow={t('eyebrow.skills')} title={t('skills.title')} />
      {state.status === 'loading' && (
        <Loading label={t('skills.loading')} className={styles.groups}>
          {[1, 2, 3].map((group) => (
            <div key={group}>
              <Bone width="7rem" height="0.75rem" />
              <ul className={styles.list}>
                {[5, 4, 6, 4].map((letters, chip) => (
                  <li key={chip} className={styles.chip}>
                    <Bone width="1.125rem" height="1.125rem" round />
                    <Bone width={`${letters}ch`} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Loading>
      )}
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
