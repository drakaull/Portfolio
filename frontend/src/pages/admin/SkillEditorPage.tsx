import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  SKILL_CATEGORIES,
  deleteSkill,
  fetchAdminSkill,
  saveSkill,
  type SkillBody,
  type SkillField,
} from '../../api/adminSkills.ts'
import type { SkillCategory } from '../../api/skills.ts'
import { Button } from '../../components/Button/Button.tsx'
import { SkillIcon } from '../../components/SkillIcon/SkillIcon.tsx'
import type { TranslationKey } from '../../i18n/en.ts'
import { useTranslation } from '../../i18n/useTranslation.ts'
import { loadSimpleIcons, searchIcons, type IconChoice } from '../../lib/simpleIcons.ts'
import adminStyles from './Admin.module.css'
import { SessionExpiredAlert, UnsavedChangesDialog } from './EditorParts.tsx'
import editorStyles from './Editor.module.css'
import styles from './SkillEditorPage.module.css'
import { useUnsavedChanges } from './useUnsavedChanges.ts'

const FIELD_ERRORS: Record<SkillField, TranslationKey> = {
  name: 'admin.skills.invalidName',
  category: 'admin.skills.invalidCategory',
  icon: 'admin.skills.invalidIcon',
}

const EMPTY_FORM: SkillBody = { name: '', category: 'languages', icon: null }

type SaveState = 'idle' | 'saving' | 'saved' | 'expired' | 'error'

export function SkillEditorPage() {
  const { t, lang } = useTranslation()
  const { id: editedId } = useParams()
  const creating = editedId === undefined
  const navigate = useNavigate()
  const [saved, setSaved] = useState<SkillBody | null>(creating ? EMPTY_FORM : null)
  const [form, setForm] = useState<SkillBody | null>(creating ? EMPTY_FORM : null)
  const [skillId, setSkillId] = useState<number | null>(null)
  const [loadState, setLoadState] = useState<'ok' | 'notFound' | 'error'>('ok')
  const [icons, setIcons] = useState<IconChoice[] | null>(null)
  const [iconsFailed, setIconsFailed] = useState(false)
  // The logo search follows the name until the admin types a search of their own.
  const [search, setSearch] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [invalid, setInvalid] = useState<SkillField[]>([])
  const [nameTaken, setNameTaken] = useState(false)
  const [deleteState, setDeleteState] = useState<'idle' | 'confirm' | 'deleting' | 'error'>('idle')
  // Set right before navigating away after a save or a delete: nothing is left to lose.
  const leaving = useRef(false)

  useEffect(() => {
    loadSimpleIcons()
      .then(setIcons)
      .catch(() => setIconsFailed(true))
  }, [])

  useEffect(() => {
    if (editedId === undefined) return
    fetchAdminSkill(editedId)
      .then((skill) => {
        if (skill === null) {
          setLoadState('notFound')
          return
        }
        const { id, ...body } = skill
        setSkillId(id)
        setSaved(body)
        setForm(body)
      })
      .catch(() => setLoadState('error'))
  }, [editedId])

  const dirty = form !== null && JSON.stringify(form) !== JSON.stringify(saved)

  const blocker = useUnsavedChanges(dirty, leaving)

  const listPath = `/${lang}/admin/skills`
  const backToList = <Link to={listPath}>{t('admin.skills.back')}</Link>

  if (loadState !== 'ok') {
    return (
      <section className={editorStyles.editor}>
        {backToList}
        <p className={adminStyles.error} role="alert">
          {t(loadState === 'notFound' ? 'admin.skills.notFound' : 'admin.error')}
        </p>
      </section>
    )
  }
  if (form === null) return <p role="status">{t('admin.loading')}</p>

  const query = search ?? form.name
  const results = icons ? searchIcons(icons, query) : []

  function update(changes: Partial<SkillBody>) {
    setForm((current) => current && { ...current, ...changes })
    setSaveState('idle')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form) return
    setSaveState('saving')
    const result = await saveSkill(form, skillId)
    setNameTaken(result.status === 'taken')
    if (result.status === 'saved') {
      const { id, ...body } = result.skill
      setInvalid([])
      setSaved(body)
      setForm(body)
      if (creating) {
        leaving.current = true
        navigate(listPath)
        return
      }
      setSkillId(id)
      setSaveState('saved')
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
    if (skillId === null) return
    setDeleteState('deleting')
    const result = await deleteSkill(skillId)
    if (result !== 'ok') {
      setDeleteState('error')
      if (result === 'expired') setSaveState('expired')
      return
    }
    leaving.current = true
    navigate(listPath)
  }

  const hasError = (field: SkillField) => invalid.includes(field) || (field === 'name' && nameTaken)
  // Hints and errors sit next to the label, not in it, so the field's name stays just its label.
  const fieldError = (field: SkillField) =>
    hasError(field) && (
      <span id={`${field}-error`} className={adminStyles.error}>
        {t(field === 'name' && nameTaken ? 'admin.skills.nameTaken' : FIELD_ERRORS[field])}
      </span>
    )
  const describedBy = (field: SkillField) => (hasError(field) ? `${field}-error` : undefined)
  const heading = creating ? t('admin.skills.new') : t('admin.skills.edit')

  return (
    <section className={editorStyles.editor}>
      <title>{`${heading} · ${t('admin.title')}`}</title>
      {backToList}
      <h1 className={adminStyles.title}>{heading}</h1>

      <UnsavedChangesDialog blocker={blocker} />

      <form className={editorStyles.form} onSubmit={handleSubmit} noValidate>
        <div className={adminStyles.field}>
          <label htmlFor="skill-name">{t('admin.skills.name')}</label>
          <input
            id="skill-name"
            value={form.name}
            onChange={(event) => update({ name: event.target.value })}
            maxLength={60}
            required
            aria-invalid={hasError('name')}
            aria-describedby={describedBy('name')}
          />
          {fieldError('name')}
        </div>

        <div className={adminStyles.field}>
          <label htmlFor="skill-category">{t('admin.skills.category')}</label>
          <select
            id="skill-category"
            value={form.category}
            onChange={(event) => update({ category: event.target.value as SkillCategory })}
            aria-invalid={hasError('category')}
            aria-describedby={describedBy('category')}
          >
            {SKILL_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {t(`skills.category.${category}`)}
              </option>
            ))}
          </select>
          {fieldError('category')}
        </div>

        <fieldset className={editorStyles.panel}>
          <legend>{t('admin.skills.logo')}</legend>
          <div className={styles.chosen}>
            {form.icon ? (
              <>
                <SkillIcon icon={form.icon} />
                <span>
                  {t('admin.skills.logoChosen')} <strong>{form.icon.slug}</strong>
                </span>
                <button
                  type="button"
                  className={editorStyles.secondary}
                  onClick={() => update({ icon: null })}
                >
                  {t('admin.skills.removeLogo')}
                </button>
              </>
            ) : (
              t('admin.skills.noLogo')
            )}
          </div>
          {fieldError('icon')}

          <div className={adminStyles.field}>
            <label htmlFor="skill-logo-search">{t('admin.skills.logoSearch')}</label>
            <input
              id="skill-logo-search"
              type="search"
              value={query}
              onChange={(event) => setSearch(event.target.value)}
              aria-describedby="logo-search-hint"
            />
            <span id="logo-search-hint" className={editorStyles.hint}>
              {t('admin.skills.logoSearchHint')}
            </span>
          </div>

          {iconsFailed && (
            <p className={adminStyles.error} role="alert">
              {t('admin.skills.logosFailed')}
            </p>
          )}
          {!icons && !iconsFailed && <p role="status">{t('admin.skills.logosLoading')}</p>}
          {icons && query.trim() !== '' && results.length === 0 && (
            <p className={editorStyles.hint}>{t('admin.skills.noLogoFound')}</p>
          )}
          {results.length > 0 && (
            <ul className={styles.results} aria-label={t('admin.skills.logoResults')}>
              {results.map((icon) => (
                <li key={icon.slug}>
                  <button
                    type="button"
                    className={styles.result}
                    aria-pressed={form.icon?.slug === icon.slug}
                    onClick={() =>
                      update({ icon: { slug: icon.slug, hex: icon.hex, path: icon.path } })
                    }
                  >
                    <SkillIcon icon={icon} />
                    {icon.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
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
              {t('admin.skills.delete')}
            </button>
          )}
        </div>

        {deleteState === 'confirm' && (
          <div className={editorStyles.confirm} role="alertdialog" aria-labelledby="delete-message">
            <p id="delete-message">
              {t('admin.skills.confirmDelete')} <strong>{saved?.name}</strong>
            </p>
            <Button onClick={() => void handleDelete()}>{t('admin.skills.delete')}</Button>
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
