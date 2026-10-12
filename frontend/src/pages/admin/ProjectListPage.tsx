import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  deleteProject,
  detailsOf,
  fetchAdminProjects,
  mainLanguage,
  moveProject,
  saveProjectDetails,
  syncProjects,
  type AdminProject,
  type SyncResult,
} from '../../api/adminProjects.ts'
import { Button } from '../../components/Button/Button.tsx'
import type { TranslationKey } from '../../i18n/en.ts'
import { useTranslation } from '../../i18n/useTranslation.ts'
import adminStyles from './Admin.module.css'
import { SessionExpiredAlert } from './EditorParts.tsx'
import editorStyles from './Editor.module.css'
import styles from './ProjectListPage.module.css'
import skillStyles from './SkillListPage.module.css'

type Direction = 'up' | 'down'
type ActionResult = 'ok' | 'expired' | 'error'

const SYNC_ERRORS: Partial<Record<SyncResult['status'], TranslationKey>> = {
  unavailable: 'admin.projects.syncUnavailable',
  error: 'admin.error',
}

export function ProjectListPage() {
  const { t, lang } = useTranslation()
  const [projects, setProjects] = useState<AdminProject[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [sync, setSync] = useState<SyncResult | 'running' | null>(null)
  const [actionResult, setActionResult] = useState<ActionResult>('ok')
  const [confirmingDelete, setConfirmingDelete] = useState<number | null>(null)
  // The arrow just used: focus stays on it while its project moves (keyboard reordering).
  const [lastMove, setLastMove] = useState<{ id: number; direction: Direction } | null>(null)

  async function reload() {
    try {
      setProjects(await fetchAdminProjects())
    } catch {
      setLoadFailed(true)
    }
  }

  useEffect(() => {
    fetchAdminProjects()
      .then(setProjects)
      .catch(() => setLoadFailed(true))
  }, [])

  useEffect(() => {
    if (!lastMove) return
    const arrow = document.getElementById(`move-${lastMove.direction}-${lastMove.id}`)
    // At either end the arrow is disabled: fall back to the other one.
    const other = lastMove.direction === 'up' ? 'down' : 'up'
    const target = arrow?.matches(':disabled')
      ? document.getElementById(`move-${other}-${lastMove.id}`)
      : arrow
    target?.focus()
  }, [projects, lastMove])

  async function runSync() {
    setSync('running')
    const result = await syncProjects()
    setSync(result)
    if (result.status === 'ok') await reload()
  }

  async function act(action: Promise<ActionResult | { status: string }>) {
    const outcome = await action
    const result: ActionResult =
      typeof outcome === 'string'
        ? outcome
        : outcome.status === 'saved'
          ? 'ok'
          : outcome.status === 'expired'
            ? 'expired'
            : 'error'
    setActionResult(result)
    if (result === 'ok') await reload()
    return result
  }

  async function toggleVisible(project: AdminProject) {
    await act(saveProjectDetails(project.id, { ...detailsOf(project), visible: !project.visible }))
  }

  async function move(id: number, direction: Direction) {
    if ((await act(moveProject(id, direction))) === 'ok') setLastMove({ id, direction })
  }

  async function remove(id: number) {
    setConfirmingDelete(null)
    await act(deleteProject(id))
  }

  const syncError = sync && sync !== 'running' && SYNC_ERRORS[sync.status]

  return (
    <section className={adminStyles.listPage}>
      <title>{`${t('admin.projects.title')} · ${t('admin.title')}`}</title>
      <Link to={`/${lang}/admin`}>{t('admin.home.backToDashboard')}</Link>
      <div className={adminStyles.listHeader}>
        <h1 className={adminStyles.title}>{t('admin.projects.title')}</h1>
        <Button onClick={() => void runSync()} disabled={sync === 'running'}>
          {sync === 'running' ? t('admin.projects.syncing') : t('admin.projects.sync')}
        </Button>
      </div>
      <p className={editorStyles.hint}>{t('admin.projects.syncHint')}</p>

      {sync && sync !== 'running' && sync.status === 'ok' && (
        <div role="status" className={styles.report}>
          <p>
            {t('admin.projects.reportNew')} {sync.report.new} · {t('admin.projects.reportUpdated')}{' '}
            {sync.report.updated} · {t('admin.projects.reportMissing')} {sync.report.missing}
          </p>
          {sync.report.translation_failed && <p>{t('admin.projects.translationFailed')}</p>}
        </div>
      )}
      {syncError && (
        <p className={adminStyles.error} role="alert">
          {t(syncError)}
        </p>
      )}
      {(actionResult === 'expired' || (sync !== 'running' && sync?.status === 'expired')) && (
        <SessionExpiredAlert />
      )}
      {actionResult === 'error' && (
        <p className={adminStyles.error} role="alert">
          {t('admin.error')}
        </p>
      )}
      {loadFailed && (
        <p className={adminStyles.error} role="alert">
          {t('admin.error')}
        </p>
      )}
      {!projects && !loadFailed && <p role="status">{t('admin.loading')}</p>}
      {projects?.length === 0 && <p>{t('admin.projects.empty')}</p>}

      {projects && projects.length > 0 && (
        <ol className={adminStyles.list}>
          {projects.map((project, index) => {
            const language = mainLanguage(project)
            const year = new Date(project.github.created_at).getFullYear()
            return (
              <li key={project.id} className={styles.item}>
                <label className={styles.visible}>
                  <input
                    type="checkbox"
                    checked={project.visible}
                    disabled={project.missing}
                    onChange={() => void toggleVisible(project)}
                    aria-label={`${t('admin.projects.visible')}: ${project.title}`}
                  />
                </label>
                <span className={styles.main}>
                  <Link
                    to={`/${lang}/admin/projects/${project.id}`}
                    className={adminStyles.listTitle}
                  >
                    {project.title}
                  </Link>
                  <span className={styles.meta}>
                    {[language, year, project.context && t(`projects.context.${project.context}`)]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  {project.missing && (
                    <span className={styles.missing}>⚠ {t('admin.projects.missing')}</span>
                  )}
                </span>
                <span className={skillStyles.arrows}>
                  <button
                    id={`move-up-${project.id}`}
                    type="button"
                    className={skillStyles.arrow}
                    aria-label={`${t('admin.moveUp')}: ${project.title}`}
                    disabled={index === 0}
                    onClick={() => void move(project.id, 'up')}
                  >
                    ▲
                  </button>
                  <button
                    id={`move-down-${project.id}`}
                    type="button"
                    className={skillStyles.arrow}
                    aria-label={`${t('admin.moveDown')}: ${project.title}`}
                    disabled={index === projects.length - 1}
                    onClick={() => void move(project.id, 'down')}
                  >
                    ▼
                  </button>
                </span>
                {project.missing &&
                  (confirmingDelete === project.id ? (
                    <span
                      className={styles.confirmDelete}
                      role="alertdialog"
                      aria-label={project.title}
                    >
                      {t('admin.projects.confirmDelete')}
                      <button
                        type="button"
                        className={editorStyles.danger}
                        onClick={() => void remove(project.id)}
                      >
                        {t('admin.projects.delete')}
                      </button>
                      <button
                        type="button"
                        className={editorStyles.secondary}
                        onClick={() => setConfirmingDelete(null)}
                      >
                        {t('admin.cv.cancel')}
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={editorStyles.danger}
                      onClick={() => setConfirmingDelete(project.id)}
                      aria-label={`${t('admin.projects.delete')}: ${project.title}`}
                    >
                      {t('admin.projects.delete')}
                    </button>
                  ))}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
