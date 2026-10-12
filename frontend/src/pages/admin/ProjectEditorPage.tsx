import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import {
  PROJECT_CONTEXTS,
  detailsOf,
  fetchAdminProject,
  saveProjectDetails,
  type AdminProject,
  type ProjectContext,
  type ProjectDetails,
} from '../../api/adminProjects.ts'
import { Button } from '../../components/Button/Button.tsx'
import type { TranslationKey } from '../../i18n/en.ts'
import { useTranslation } from '../../i18n/useTranslation.ts'
import adminStyles from './Admin.module.css'
import { SessionExpiredAlert, UnsavedChangesDialog } from './EditorParts.tsx'
import editorStyles from './Editor.module.css'
import styles from './ProjectEditorPage.module.css'
import { useUnsavedChanges } from './useUnsavedChanges.ts'

type Field = keyof ProjectDetails

const FIELD_ERRORS: Record<Field, TranslationKey> = {
  title: 'admin.projects.invalidTitle',
  context: 'admin.projects.invalidContext',
  team_size: 'admin.projects.invalidTeamSize',
  visible: 'admin.projects.missingVisible',
}

/** The form keeps the team size as typed; empty means unknown. */
type ProjectForm = Omit<ProjectDetails, 'team_size'> & { team_size: string }

const toForm = (project: AdminProject): ProjectForm => ({
  ...detailsOf(project),
  team_size: project.team_size === null ? '' : String(project.team_size),
})

type SaveState = 'idle' | 'saving' | 'saved' | 'expired' | 'error'

export function ProjectEditorPage() {
  const { t, lang } = useTranslation()
  const { id } = useParams()
  const [project, setProject] = useState<AdminProject | null>(null)
  const [saved, setSaved] = useState<ProjectForm | null>(null)
  const [form, setForm] = useState<ProjectForm | null>(null)
  const [loadState, setLoadState] = useState<'ok' | 'notFound' | 'error'>('ok')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [invalid, setInvalid] = useState<Field[]>([])

  useEffect(() => {
    if (id === undefined) return
    fetchAdminProject(id)
      .then((found) => {
        if (found === null) {
          setLoadState('notFound')
          return
        }
        setProject(found)
        setSaved(toForm(found))
        setForm(toForm(found))
      })
      .catch(() => setLoadState('error'))
  }, [id])

  const dirty = form !== null && JSON.stringify(form) !== JSON.stringify(saved)
  const blocker = useUnsavedChanges(dirty)
  const backToList = <Link to={`/${lang}/admin/projects`}>{t('admin.projects.back')}</Link>

  if (loadState !== 'ok') {
    return (
      <section className={editorStyles.editor}>
        {backToList}
        <p className={adminStyles.error} role="alert">
          {t(loadState === 'notFound' ? 'admin.projects.notFound' : 'admin.error')}
        </p>
      </section>
    )
  }
  if (project === null || form === null) return <p role="status">{t('admin.loading')}</p>

  function update(changes: Partial<ProjectForm>) {
    setForm((current) => current && { ...current, ...changes })
    setSaveState('idle')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form || !project) return
    setSaveState('saving')
    const teamSize = form.team_size.trim()
    const result = await saveProjectDetails(project.id, {
      ...form,
      team_size: teamSize === '' ? null : /^\d+$/.test(teamSize) ? Number(teamSize) : teamSize,
    })
    if (result.status === 'saved') {
      setProject(result.project)
      setSaved(toForm(result.project))
      setForm(toForm(result.project))
      setInvalid([])
      setSaveState('saved')
    } else if (result.status === 'invalid' || result.status === 'missing') {
      setInvalid(result.status === 'invalid' ? result.fields : ['visible'])
      setSaveState('idle')
    } else {
      setSaveState(result.status === 'notFound' ? 'error' : result.status)
    }
  }

  // Hints and errors sit next to the label, not in it, so the field's name stays just its label.
  const fieldError = (field: Field) =>
    invalid.includes(field) && (
      <span id={`project-${field}-error`} className={adminStyles.error}>
        {t(FIELD_ERRORS[field])}
      </span>
    )
  const describedBy = (field: Field) =>
    invalid.includes(field) ? `project-${field}-error` : undefined

  const github = project.github
  const totalBytes = Object.values(github.languages).reduce((sum, size) => sum + size, 0) || 1
  const languages = Object.entries(github.languages)
    .sort((a, b) => b[1] - a[1])
    .map(([name, size]) => `${name} ${((100 * size) / totalBytes).toFixed(1)} %`)
  const date = (iso: string) => new Date(iso).toLocaleDateString(lang)

  return (
    <section className={editorStyles.editor}>
      <title>{`${t('admin.projects.edit')} · ${t('admin.title')}`}</title>
      {backToList}
      <h1 className={adminStyles.title}>{t('admin.projects.edit')}</h1>

      <UnsavedChangesDialog blocker={blocker} />

      {project.missing && (
        <p className={adminStyles.error} role="status">
          ⚠ {t('admin.projects.missingVisible')}
        </p>
      )}

      <form className={editorStyles.form} onSubmit={handleSubmit} noValidate>
        <div className={adminStyles.field}>
          <label htmlFor="project-title">{t('admin.projects.fieldTitle')}</label>
          <input
            id="project-title"
            value={form.title}
            onChange={(event) => update({ title: event.target.value })}
            maxLength={120}
            required
            aria-invalid={invalid.includes('title')}
            aria-describedby={describedBy('title')}
          />
          {fieldError('title')}
        </div>

        <div className={styles.row}>
          <div className={adminStyles.field}>
            <label htmlFor="project-context">{t('admin.projects.context')}</label>
            <select
              id="project-context"
              value={form.context ?? ''}
              onChange={(event) =>
                update({ context: (event.target.value || null) as ProjectContext | null })
              }
              aria-invalid={invalid.includes('context')}
              aria-describedby={describedBy('context')}
            >
              <option value="">{t('admin.projects.contextNone')}</option>
              {PROJECT_CONTEXTS.map((context) => (
                <option key={context} value={context}>
                  {t(`projects.context.${context}`)}
                </option>
              ))}
            </select>
            {fieldError('context')}
          </div>
          <div className={adminStyles.field}>
            <label htmlFor="project-team-size">{t('admin.projects.teamSize')}</label>
            <input
              id="project-team-size"
              inputMode="numeric"
              value={form.team_size}
              onChange={(event) => update({ team_size: event.target.value })}
              maxLength={3}
              aria-invalid={invalid.includes('team_size')}
              aria-describedby={describedBy('team_size')}
            />
            {fieldError('team_size')}
          </div>
        </div>

        <div className={styles.checkbox}>
          <input
            id="project-visible"
            type="checkbox"
            checked={form.visible}
            disabled={project.missing}
            onChange={(event) => update({ visible: event.target.checked })}
            aria-invalid={invalid.includes('visible')}
            aria-describedby={describedBy('visible')}
          />
          <label htmlFor="project-visible">{t('admin.projects.visible')}</label>
          {!project.missing && fieldError('visible')}
        </div>

        <div className={editorStyles.actions}>
          <Button type="submit" disabled={!dirty || saveState === 'saving'}>
            {saveState === 'saving' ? t('admin.home.saving') : t('admin.home.save')}
          </Button>
          <span role="status">{saveState === 'saved' && t('admin.home.saved')}</span>
        </div>
        {saveState === 'expired' && <SessionExpiredAlert />}
        {saveState === 'error' && (
          <p className={adminStyles.error} role="alert">
            {t('admin.error')}
          </p>
        )}
      </form>

      <section className={editorStyles.panel} aria-labelledby="project-github">
        <h2 id="project-github" className={adminStyles.subtitle}>
          {t('admin.projects.github')}
        </h2>
        <dl className={styles.facts}>
          <dt>{t('admin.projects.repository')}</dt>
          <dd>
            <a href={github.url} target="_blank" rel="noopener noreferrer">
              {github.name}
            </a>
          </dd>
          <dt>{t('admin.projects.about')}</dt>
          <dd>
            {github.about ?? t('admin.projects.aboutNone')}
            {project.about_lang && (
              <span className={styles.muted}>
                {' '}
                ({t('admin.projects.aboutLang')} {project.about_lang.toUpperCase()})
              </span>
            )}
            <span className={editorStyles.hint}>
              {' '}
              <a href={github.url} target="_blank" rel="noopener noreferrer">
                {t('admin.projects.aboutEdit')}
              </a>
            </span>
          </dd>
          {github.about && (
            <>
              <dt>{t('admin.projects.translations')}</dt>
              <dd>
                <ul className={styles.translations}>
                  {(['fr', 'en', 'nl'] as const).map((code) => (
                    <li key={code} lang={code}>
                      <span className={styles.code}>{code.toUpperCase()}</span>{' '}
                      {project.summary[code] || t('admin.projects.notTranslated')}
                    </li>
                  ))}
                </ul>
              </dd>
            </>
          )}
          <dt>{t('admin.projects.languages')}</dt>
          <dd>{languages.join(' · ') || '—'}</dd>
          {github.topics.length > 0 && (
            <>
              <dt>{t('admin.projects.topics')}</dt>
              <dd>{github.topics.join(', ')}</dd>
            </>
          )}
          {github.homepage && (
            <>
              <dt>{t('admin.projects.homepage')}</dt>
              <dd>
                <a href={github.homepage} target="_blank" rel="noopener noreferrer">
                  {github.homepage}
                </a>
              </dd>
            </>
          )}
          <dt>{t('admin.projects.dates')}</dt>
          <dd>
            {date(github.created_at)} → {date(github.pushed_at)}
          </dd>
          <dt>{t('admin.projects.stars')}</dt>
          <dd>{github.stars}</dd>
        </dl>
      </section>
    </section>
  )
}
