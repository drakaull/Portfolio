import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useBlocker, useLocation, useNavigate, useParams } from 'react-router'
import {
  deleteExperience,
  fetchAdminExperience,
  saveExperience,
  type AdminExperience,
  type AdminExperienceSaved,
  type ExperienceBody,
  type ExperienceField,
} from '../../api/adminExperiences.ts'
import type { Translated } from '../../api/adminHome.ts'
import type { ExperienceKind } from '../../api/experiences.ts'
import { Button } from '../../components/Button/Button.tsx'
import { MarkdownText } from '../../components/MarkdownText/MarkdownText.tsx'
import type { TranslationKey } from '../../i18n/en.ts'
import { useTranslation, type Lang } from '../../i18n/useTranslation.ts'
import { SLUG_MAX_LENGTH, slugify } from '../../lib/slug.ts'
import adminStyles from './Admin.module.css'
import styles from './ExperienceEditorPage.module.css'
import editorStyles from './HomeEditorPage.module.css'
import { TranslationTabs } from './TranslationTabs.tsx'

const KINDS: ExperienceKind[] = ['job', 'student_job', 'internship', 'education']

const FIELD_ERRORS: Record<ExperienceField, TranslationKey> = {
  slug: 'admin.experiences.invalidSlug',
  kind: 'admin.experiences.invalidKind',
  organization: 'admin.experiences.invalidOrganization',
  start_year: 'admin.experiences.invalidStartYear',
  end_year: 'admin.experiences.invalidEndYear',
  technologies: 'admin.experiences.invalidTechnologies',
  title: 'admin.experiences.invalidTitle',
  summary: 'admin.experiences.invalidSummary',
  description: 'admin.experiences.invalidDescription',
}

type TextField = 'title' | 'summary' | 'description'

/** The form keeps what the inputs show: years and technologies as typed text. */
type ExperienceForm = {
  slug: string
  kind: ExperienceKind
  organization: string
  start_year: string
  end_year: string
  technologies: string
} & Record<TextField, Translated>

type SaveState = 'idle' | 'saving' | 'saved' | 'expired' | 'error'
type SaveNotice = Pick<AdminExperienceSaved, 'auto_translated' | 'translation_failed'>

const EMPTY_TEXT: Translated = { fr: '', en: '', nl: '' }

const EMPTY_FORM: ExperienceForm = {
  slug: '',
  kind: 'job',
  organization: '',
  start_year: String(new Date().getFullYear()),
  end_year: '',
  technologies: '',
  title: EMPTY_TEXT,
  summary: EMPTY_TEXT,
  description: EMPTY_TEXT,
}

function toForm(entry: AdminExperience): ExperienceForm {
  return {
    ...entry,
    start_year: String(entry.start_year),
    end_year: entry.end_year === null ? '' : String(entry.end_year),
    technologies: entry.technologies.join(', '),
  }
}

const toYear = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value) : value.trim())

function toBody(form: ExperienceForm): ExperienceBody {
  const { start_year, end_year, technologies, ...rest } = form
  return {
    ...rest,
    start_year: toYear(start_year),
    end_year: end_year.trim() === '' ? null : toYear(end_year),
    technologies: technologies
      .split(',')
      .map((technology) => technology.trim())
      .filter(Boolean),
  }
}

// "/fr/admin/..." and "/en/admin/..." are the same page: switching the UI language keeps the form.
const withoutLang = (pathname: string) => pathname.replace(/^\/[^/]+/, '')

export function ExperienceEditorPage() {
  const { t, lang } = useTranslation()
  const { slug: editedSlug } = useParams()
  const creating = editedSlug === undefined
  const navigate = useNavigate()
  // Right after a creation, the edit page shows what the save did (see handleSubmit).
  const createdNotice = (useLocation().state as { notice?: SaveNotice } | null)?.notice ?? null
  const [saved, setSaved] = useState<ExperienceForm | null>(creating ? EMPTY_FORM : null)
  const [form, setForm] = useState<ExperienceForm | null>(creating ? EMPTY_FORM : null)
  const [loadState, setLoadState] = useState<'ok' | 'notFound' | 'error'>('ok')
  // While creating, the address follows the title and organisation until the admin edits it.
  const [slugEdited, setSlugEdited] = useState(false)
  const [textLang, setTextLang] = useState<Lang>('fr')
  const [saveState, setSaveState] = useState<SaveState>(createdNotice ? 'saved' : 'idle')
  const [invalid, setInvalid] = useState<ExperienceField[]>([])
  const [slugTaken, setSlugTaken] = useState(false)
  // Bumped on each save: remounts the translation tabs, which clears their messages.
  const [saves, setSaves] = useState(0)
  const [saveNotice, setSaveNotice] = useState<SaveNotice | null>(createdNotice)
  const [deleteState, setDeleteState] = useState<'idle' | 'confirm' | 'deleting' | 'error'>('idle')
  // Set right before navigating away after a save or a delete: nothing is left to lose.
  const leaving = useRef(false)

  useEffect(() => {
    if (editedSlug === undefined) return
    leaving.current = false
    fetchAdminExperience(editedSlug)
      .then((entry) => {
        if (entry === null) {
          setLoadState('notFound')
          return
        }
        setSaved(toForm(entry))
        setForm(toForm(entry))
      })
      .catch(() => setLoadState('error'))
  }, [editedSlug])

  const slug =
    form === null || !creating || slugEdited
      ? (form?.slug ?? '')
      : slugify(form.title.fr, form.organization)
  const dirty = form !== null && JSON.stringify(form) !== JSON.stringify(saved)

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !leaving.current &&
      dirty &&
      withoutLang(currentLocation.pathname) !== withoutLang(nextLocation.pathname),
  )

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const backToList = <Link to={`/${lang}/admin/experiences`}>{t('admin.experiences.back')}</Link>

  if (loadState !== 'ok') {
    return (
      <section className={editorStyles.editor}>
        {backToList}
        <p className={adminStyles.error} role="alert">
          {t(loadState === 'notFound' ? 'admin.experiences.notFound' : 'admin.error')}
        </p>
      </section>
    )
  }
  if (form === null) return <p role="status">{t('admin.loading')}</p>

  function update(changes: Partial<ExperienceForm>) {
    setForm((current) => current && { ...current, ...changes })
    setSaveState('idle')
  }

  function updateText(field: TextField, value: string) {
    setForm(
      (current) => current && { ...current, [field]: { ...current[field], [textLang]: value } },
    )
    setSaveState('idle')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form) return
    setSaveState('saving')
    const body = toBody({ ...form, slug })
    const result = creating
      ? await saveExperience(body, null)
      : await saveExperience({ ...body, slug: undefined }, slug)
    setSlugTaken(result.status === 'taken')
    if (result.status === 'saved') {
      setInvalid([])
      setSaveState('saved')
      setSaves((count) => count + 1)
      setSaveNotice(result.entry)
      // The server trims spaces and fills empty translations: show exactly what was stored.
      setSaved(toForm(result.entry))
      setForm(toForm(result.entry))
      if (creating) {
        // The new entry now has its own address: edit it there.
        leaving.current = true
        navigate(`/${lang}/admin/experiences/${result.entry.slug}`, {
          replace: true,
          state: { notice: result.entry },
        })
      }
    } else if (result.status === 'invalid') {
      setInvalid(result.fields)
      setSaveState('idle')
    } else if (result.status === 'taken') {
      setSaveState('idle')
    } else {
      setSaveState(result.status === 'notFound' ? 'error' : result.status)
    }
  }

  async function handleDelete() {
    setDeleteState('deleting')
    const result = await deleteExperience(slug)
    if (result !== 'ok') {
      setDeleteState('error')
      if (result === 'expired') setSaveState('expired')
      return
    }
    leaving.current = true
    navigate(`/${lang}/admin/experiences`)
  }

  const hasError = (field: ExperienceField) =>
    invalid.includes(field) || (field === 'slug' && slugTaken)
  const fieldError = (field: ExperienceField) =>
    hasError(field) && (
      <span id={`${field}-error`} className={adminStyles.error}>
        {t(field === 'slug' && slugTaken ? 'admin.experiences.slugTaken' : FIELD_ERRORS[field])}
      </span>
    )
  const describedBy = (field: ExperienceField) => (hasError(field) ? `${field}-error` : undefined)
  const heading = creating ? t('admin.experiences.new') : t('admin.experiences.edit')

  return (
    <section className={editorStyles.editor}>
      <title>{`${heading} · ${t('admin.title')}`}</title>
      {backToList}
      <h1 className={adminStyles.title}>{heading}</h1>

      {blocker.state === 'blocked' && (
        <div className={editorStyles.confirm} role="alertdialog" aria-labelledby="unsaved-message">
          <p id="unsaved-message">{t('admin.home.unsaved')}</p>
          <Button onClick={() => blocker.reset()}>{t('admin.home.stay')}</Button>
          <button
            type="button"
            className={editorStyles.secondary}
            onClick={() => blocker.proceed()}
          >
            {t('admin.home.leave')}
          </button>
        </div>
      )}

      <form className={editorStyles.form} onSubmit={handleSubmit} noValidate>
        <label className={adminStyles.field}>
          {t('admin.experiences.kind')}
          <select
            value={form.kind}
            onChange={(event) => update({ kind: event.target.value as ExperienceKind })}
            aria-invalid={hasError('kind')}
            aria-describedby={describedBy('kind')}
          >
            {KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {t(`experience.kind.${kind}`)}
              </option>
            ))}
          </select>
          {fieldError('kind')}
        </label>

        <label className={adminStyles.field}>
          {t('admin.experiences.organization')}
          <input
            value={form.organization}
            onChange={(event) => update({ organization: event.target.value })}
            maxLength={120}
            required
            aria-invalid={hasError('organization')}
            aria-describedby={describedBy('organization')}
          />
          {fieldError('organization')}
        </label>

        <div className={styles.years}>
          <label className={adminStyles.field}>
            {t('admin.experiences.startYear')}
            <input
              inputMode="numeric"
              value={form.start_year}
              onChange={(event) => update({ start_year: event.target.value })}
              maxLength={4}
              required
              aria-invalid={hasError('start_year')}
              aria-describedby={describedBy('start_year')}
            />
            {fieldError('start_year')}
          </label>
          <label className={adminStyles.field}>
            {t('admin.experiences.endYear')}
            <input
              inputMode="numeric"
              value={form.end_year}
              onChange={(event) => update({ end_year: event.target.value })}
              maxLength={4}
              aria-invalid={hasError('end_year')}
              aria-describedby={describedBy('end_year')}
            />
            {fieldError('end_year')}
          </label>
        </div>

        {creating ? (
          // A div, not a wrapping label: the label must name the input only, not the hint.
          <div className={adminStyles.field}>
            <label htmlFor="experience-slug">{t('admin.experiences.slug')}</label>
            <span className={styles.slugRow}>
              <span className={styles.slugPrefix} aria-hidden="true">
                /experience/
              </span>
              <input
                id="experience-slug"
                value={slug}
                onChange={(event) => {
                  setSlugEdited(true)
                  update({ slug: event.target.value })
                }}
                maxLength={SLUG_MAX_LENGTH}
                required
                aria-invalid={hasError('slug')}
                aria-describedby={describedBy('slug') ?? 'slug-hint'}
              />
            </span>
            <span id="slug-hint" className={editorStyles.hint}>
              {t('admin.experiences.slugHint')}
            </span>
            {fieldError('slug')}
          </div>
        ) : (
          <p className={adminStyles.field}>
            {t('admin.experiences.slug')}
            <code className={styles.slugFixed}>/experience/{slug}</code>
          </p>
        )}

        <label className={adminStyles.field}>
          {t('admin.experiences.technologies')}
          <input
            value={form.technologies}
            onChange={(event) => update({ technologies: event.target.value })}
            placeholder="Python, Docker, Amazon S3"
            aria-invalid={hasError('technologies')}
            aria-describedby={describedBy('technologies')}
          />
          {fieldError('technologies')}
        </label>

        <fieldset className={editorStyles.panel}>
          <legend>{t('admin.home.texts')}</legend>
          <TranslationTabs
            key={saves}
            textLang={textLang}
            onSelect={setTextLang}
            fields={[
              { value: form.title, format: 'plain' },
              { value: form.summary, format: 'plain' },
              { value: form.description, format: 'markdown' },
            ]}
            onTranslated={(target, [title, summary, description]) => {
              setForm(
                (current) =>
                  current && {
                    ...current,
                    title: { ...current.title, [target]: title },
                    summary: { ...current.summary, [target]: summary },
                    description: { ...current.description, [target]: description },
                  },
              )
              setSaveState('idle')
            }}
          />

          <label className={adminStyles.field}>
            {t('admin.experiences.titleField')}
            <input
              value={form.title[textLang]}
              onChange={(event) => updateText('title', event.target.value)}
              maxLength={120}
              required={textLang === 'fr'}
              aria-invalid={hasError('title')}
              aria-describedby={describedBy('title')}
            />
            {fieldError('title')}
          </label>

          <label className={adminStyles.field}>
            {t('admin.experiences.summary')}
            <input
              value={form.summary[textLang]}
              onChange={(event) => updateText('summary', event.target.value)}
              maxLength={220}
              required={textLang === 'fr'}
              aria-invalid={hasError('summary')}
              aria-describedby={describedBy('summary')}
            />
            {fieldError('summary')}
          </label>

          <div className={editorStyles.introRow}>
            <label className={adminStyles.field}>
              {t('admin.experiences.description')}
              <textarea
                value={form.description[textLang]}
                onChange={(event) => updateText('description', event.target.value)}
                maxLength={5000}
                rows={10}
                aria-invalid={hasError('description')}
                aria-describedby={describedBy('description')}
              />
              {fieldError('description')}
            </label>
            <div
              className={editorStyles.preview}
              aria-label={t('admin.home.preview')}
              role="region"
            >
              <span className={editorStyles.previewLabel}>{t('admin.home.preview')}</span>
              <MarkdownText>{form.description[textLang] || form.description.fr}</MarkdownText>
            </div>
          </div>
        </fieldset>

        <div className={styles.actions}>
          <span className={editorStyles.actions}>
            <Button type="submit" disabled={(!creating && !dirty) || saveState === 'saving'}>
              {saveState === 'saving' ? t('admin.home.saving') : t('admin.home.save')}
            </Button>
            <span role="status">{saveState === 'saved' && t('admin.home.saved')}</span>
          </span>
          {!creating && deleteState !== 'confirm' && (
            <button
              type="button"
              className={styles.danger}
              onClick={() => setDeleteState('confirm')}
              disabled={deleteState === 'deleting'}
            >
              {t('admin.experiences.delete')}
            </button>
          )}
        </div>

        {deleteState === 'confirm' && (
          <div className={editorStyles.confirm} role="alertdialog" aria-labelledby="delete-message">
            <p id="delete-message">
              {t('admin.experiences.confirmDelete')} <strong>{saved?.title.fr}</strong>
            </p>
            <Button onClick={() => void handleDelete()}>{t('admin.experiences.delete')}</Button>
            <button
              type="button"
              className={editorStyles.secondary}
              onClick={() => setDeleteState('idle')}
            >
              {t('admin.cv.cancel')}
            </button>
          </div>
        )}
        {deleteState === 'error' && (
          <p className={adminStyles.error} role="alert">
            {t('admin.error')}
          </p>
        )}

        {/* Both can show: one language may be generated while the other fails. */}
        {saveState === 'saved' && saveNotice && saveNotice.auto_translated.length > 0 && (
          <p className={editorStyles.hint} role="status">
            {t('admin.home.autoTranslated')}{' '}
            {saveNotice.auto_translated.map((code) => code.toUpperCase()).join(', ')}
          </p>
        )}
        {saveState === 'saved' && saveNotice?.translation_failed && (
          <p className={adminStyles.error} role="alert">
            {t('admin.home.translationFailed')}
          </p>
        )}
        {saveState === 'expired' && (
          <p className={adminStyles.error} role="alert">
            {t('admin.home.expired')}{' '}
            <a href={`/${lang}/admin/login`} target="_blank" rel="noopener noreferrer">
              {t('admin.home.signInNewTab')}
            </a>
          </p>
        )}
        {saveState === 'error' && (
          <p className={adminStyles.error} role="alert">
            {t('admin.error')}
          </p>
        )}
      </form>
    </section>
  )
}
