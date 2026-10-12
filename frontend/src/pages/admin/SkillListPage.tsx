import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  SKILL_CATEGORIES,
  fetchAdminSkills,
  moveSkill,
  type AdminResult,
  type AdminSkill,
} from '../../api/adminSkills.ts'
import { SkillIcon } from '../../components/SkillIcon/SkillIcon.tsx'
import { useTranslation } from '../../i18n/useTranslation.ts'
import adminStyles from './Admin.module.css'
import styles from './SkillListPage.module.css'

type Direction = 'up' | 'down'

export function SkillListPage() {
  const { t, lang } = useTranslation()
  const [skills, setSkills] = useState<AdminSkill[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [moveResult, setMoveResult] = useState<AdminResult>('ok')
  // The arrow just used: focus stays on it while its skill moves (keyboard reordering).
  const [lastMove, setLastMove] = useState<{ id: number; direction: Direction } | null>(null)

  useEffect(() => {
    fetchAdminSkills()
      .then(setSkills)
      .catch(() => setLoadFailed(true))
  }, [])

  useEffect(() => {
    if (!lastMove) return
    const arrow = document.getElementById(`move-${lastMove.direction}-${lastMove.id}`)
    // At the edge of its category the arrow is disabled: fall back to the other one.
    const other = lastMove.direction === 'up' ? 'down' : 'up'
    const target = arrow?.matches(':disabled')
      ? document.getElementById(`move-${other}-${lastMove.id}`)
      : arrow
    target?.focus()
  }, [skills, lastMove])

  async function move(id: number, direction: Direction) {
    const result = await moveSkill(id, direction)
    setMoveResult(result)
    if (result !== 'ok') return
    setSkills(await fetchAdminSkills().catch(() => skills))
    setLastMove({ id, direction })
  }

  return (
    <section className={adminStyles.listPage}>
      <title>{`${t('admin.skills.title')} · ${t('admin.title')}`}</title>
      <Link to={`/${lang}/admin`}>{t('admin.home.backToDashboard')}</Link>
      <div className={adminStyles.listHeader}>
        <h1 className={adminStyles.title}>{t('admin.skills.title')}</h1>
        <Link to={`/${lang}/admin/skills/new`} className={adminStyles.newLink}>
          {t('admin.skills.new')}
        </Link>
      </div>

      {loadFailed && (
        <p className={adminStyles.error} role="alert">
          {t('admin.error')}
        </p>
      )}
      {moveResult !== 'ok' && (
        <p className={adminStyles.error} role="alert">
          {t(moveResult === 'expired' ? 'admin.home.expired' : 'admin.error')}
        </p>
      )}
      {!skills && !loadFailed && <p role="status">{t('admin.loading')}</p>}
      {skills &&
        SKILL_CATEGORIES.map((category) => {
          const inCategory = skills.filter((skill) => skill.category === category)
          return (
            <section key={category} aria-labelledby={`admin-skills-${category}`}>
              <h2 id={`admin-skills-${category}`} className={adminStyles.subtitle}>
                {t(`skills.category.${category}`)}
              </h2>
              {inCategory.length === 0 ? (
                <p className={styles.none}>{t('admin.skills.none')}</p>
              ) : (
                <ol className={adminStyles.list}>
                  {inCategory.map((skill, index) => (
                    <li key={skill.id} className={styles.item}>
                      <span className={styles.name}>
                        {skill.icon && <SkillIcon icon={skill.icon} />}
                        <Link
                          to={`/${lang}/admin/skills/${skill.id}`}
                          className={adminStyles.listTitle}
                        >
                          {skill.name}
                        </Link>
                      </span>
                      <span className={styles.arrows}>
                        <button
                          id={`move-up-${skill.id}`}
                          type="button"
                          className={styles.arrow}
                          aria-label={`${t('admin.moveUp')}: ${skill.name}`}
                          disabled={index === 0}
                          onClick={() => void move(skill.id, 'up')}
                        >
                          ▲
                        </button>
                        <button
                          id={`move-down-${skill.id}`}
                          type="button"
                          className={styles.arrow}
                          aria-label={`${t('admin.moveDown')}: ${skill.name}`}
                          disabled={index === inCategory.length - 1}
                          onClick={() => void move(skill.id, 'down')}
                        >
                          ▼
                        </button>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )
        })}
    </section>
  )
}
