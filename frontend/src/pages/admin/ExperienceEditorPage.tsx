import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
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
import { SessionExpiredAlert, UnsavedChangesDialog } from './EditorParts.tsx'
import styles from './ExperienceEditorPage.module.css'
import { ImageField } from './FileField.tsx'
import editorStyles from './Editor.module.css'
import { TranslationTabs } from './TranslationTabs.tsx'
import { useUnsavedChanges } from './useUnsavedChanges.ts'

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

// Fields picked one by one: a save response also carries auto_translated and translation_failed,
// which the server refuses if they are sent back.
function toForm(entry: AdminExperience): ExperienceForm {
  const { slug, kind, organization, title, summary, description } = entry
  return {
    slug,
    kind,
    organization,
    start_year: String(entry.start_year),
    end_year: entry.end_year === null ? '' : String(entry.end_year),
    technologies: entry.technologies.join(', '),
    title,
    summary,
    description,
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

export function ExperienceEditorPage() {
  const { t, lang } = useTranslation()
  const { slug: editedSlug } = useParams()
  const creating = editedSlug === undefined
  const navigate = useNavigate()
  // Right after a creation, the edit page shows what the save did (see handleSubmit).
  const location = useLocation()
  const createdNotice = (location.state as { notice?: SaveNotice } | null)?.notice ?? null
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
  const [hasLogo, setHasLogo] = useState(false)
  const [logoVersion, setLogoVersion] = useState(0)
  // Set right before navigating away after a save or a delete: nothing is left to lose.
  const leaving = useRef(false)

  useEffect(() => {
    // Shown once: the history entry forgets it, so a reload does not show it again.
    if (createdNotice) navigate(location.pathname, { replace: true, state: null })
  }, [createdNotice, location.pathname, navigate])

  useEffect(() => {
    if (editedSlug === undefined) return
    leaving.current = false
    fetchAdminExperience(editedSlug)
      .then((entry) => {
        if (entry === null) {
          setLoadState('notFound')
          return
        }
        setHasLogo(entry.logo_url !== null)
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

  const blocker = useUnsavedChanges(dirty, leaving)

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

      <UnsavedChangesDialog blocker={blocker} />

      <form className={editorStyles.form} onSubmit={handleSubmit} noValidate>
        <div className={adminStyles.field}>
          <label htmlFor="experience-kind">{t('admin.experiences.kind')}</label>
          <select
            id="experience-kind"
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
        </div>

        <div className={adminStyles.field}>
          <label htmlFor="experience-organization">{t('admin.experiences.organization')}</label>
          <input
            id="experience-organization"
            value={form.organization}
            onChange={(event) => update({ organization: event.target.value })}
            maxLength={120}
            required
            aria-invalid={hasError('organization')}
            aria-describedby={describedBy('organization')}
          />
          {fieldError('organization')}
        </div>

        {/* A logo is stored under the slug: only once the experience exists. */}
        {!creating && (
          <ImageField
            id="experience-logo"
            url={`/api/admin/experiences/${slug}/logo`}
            legend="admin.logo.legend"
            present={hasLogo}
            onChange={(present) => {
              setHasLogo(present)
              setLogoVersion((count) => count + 1)
            }}
            preview={
              <img
                className={styles.logoPreview}
                src={`/api/images/logos/${slug}?preview=${logoVersion}`}
                alt={t('admin.image.preview')}
                width={64}
                height={64}
              />
            }
          />
        )}

        <div className={styles.years}>
          <div className={adminStyles.field}>
            <label htmlFor="experience-startYear">{t('admin.experiences.startYear')}</label>
            <input
              id="experience-startYear"
              inputMode="numeric"
              value={form.start_year}
              onChange={(event) => update({ start_year: event.target.value })}
              maxLength={4}
              required
              aria-invalid={hasError('start_year')}
              aria-describedby={describedBy('start_year')}
            />
            {fieldError('start_year')}
          </div>
          <div className={adminStyles.field}>
            <label htmlFor="experience-endYear">{t('admin.experiences.endYear')}</label>
            <input
              id="experience-endYear"
              inputMode="numeric"
              value={form.end_year}
              onChange={(event) => update({ end_year: event.target.value })}
              maxLength={4}
              aria-invalid={hasError('end_year')}
              aria-describedby={describedBy('end_year')}
            />
            {fieldError('end_year')}
          </div>
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

        <div className={adminStyles.field}>
          <label htmlFor="experience-technologies">{t('admin.experiences.technologies')}</label>
          <input
            id="experience-technologies"
            value={form.technologies}
            onChange={(event) => update({ technologies: event.target.value })}
            placeholder="Python, Docker, Amazon S3"
            aria-invalid={hasError('technologies')}
            aria-describedby={describedBy('technologies')}
          />
          {fieldError('technologies')}
        </div>

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

          <div className={adminStyles.field}>
            <label htmlFor="experience-titleField">{t('admin.experiences.titleField')}</label>
            <input
              id="experience-titleField"
              value={form.title[textLang]}
              onChange={(event) => updateText('title', event.target.value)}
              maxLength={120}
              required={textLang === 'fr'}
              aria-invalid={hasError('title')}
              aria-describedby={describedBy('title')}
            />
            {fieldError('title')}
          </div>

          <div className={adminStyles.field}>
            <label htmlFor="experience-summary">{t('admin.experiences.summary')}</label>
            <input
              id="experience-summary"
              value={form.summary[textLang]}
              onChange={(event) => updateText('summary', event.target.value)}
              maxLength={220}
              required={textLang === 'fr'}
              aria-invalid={hasError('summary')}
              aria-describedby={describedBy('summary')}
            />
            {fieldError('summary')}
          </div>

          <div className={editorStyles.introRow}>
            <div className={adminStyles.field}>
              <label htmlFor="experience-description">{t('admin.experiences.description')}</label>
              <textarea
                id="experience-description"
                value={form.description[textLang]}
                onChange={(event) => updateText('description', event.target.value)}
                maxLength={5000}
                rows={10}
                aria-invalid={hasError('description')}
                aria-describedby={describedBy('description')}
              />
              {fieldError('description')}
            </div>
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

        <div className={editorStyles.footer}>
          <span className={editorStyles.actions}>
            <Button type="submit" disabled={(!creating && !dirty) || saveState === 'saving'}>
              {saveState === 'saving' ? t('admin.home.saving') : t('admin.home.save')}
            </Button>
            <span role="status">{saveState === 'saved' && t('admin.home.saved')}</span>
          </span>
          {!creating && deleteState !== 'confirm' && (
            <button
              type="button"
              className={editorStyles.danger}
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
              {t('admin.cancel')}
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
        {saveState === 'expired' && <SessionExpiredAlert />}
        {saveState === 'error' && (
          <p className={adminStyles.error} role="alert">
            {t('admin.error')}
          </p>
        )}
      </form>
    </section>
  )
}
