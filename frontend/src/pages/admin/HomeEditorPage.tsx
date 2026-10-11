import { useEffect, useState, type FormEvent } from 'react'
import { Link, useBlocker } from 'react-router'
import {
  fetchAdminHome,
  saveAdminHome,
  translateFromFrench,
  type AdminHomeContent,
  type HomeContentForm,
  type HomeField,
} from '../../api/adminHome.ts'
import { Button } from '../../components/Button/Button.tsx'
import { MarkdownText } from '../../components/MarkdownText/MarkdownText.tsx'
import type { TranslationKey } from '../../i18n/en.ts'
import { useTranslation, type Lang } from '../../i18n/useTranslation.ts'
import adminStyles from './Admin.module.css'
import { CvField } from './CvField.tsx'
import styles from './HomeEditorPage.module.css'

// French is the writing language: first tab, selected by default.
const LANGS: Lang[] = ['fr', 'en']

const FIELD_ERRORS: Record<HomeField, TranslationKey> = {
  headline: 'admin.home.invalidHeadline',
  intro: 'admin.home.invalidIntro',
  linkedin_url: 'admin.home.invalidUrl',
  github_url: 'admin.home.invalidUrl',
}

type SaveState = 'idle' | 'saving' | 'saved' | 'expired' | 'error'
type TranslateState =
  'idle' | 'confirm' | 'translating' | 'done' | 'unavailable' | 'expired' | 'error'
type SaveNotice = 'autoTranslated' | 'translationFailed' | null

const TRANSLATE_MESSAGES: Partial<Record<TranslateState, TranslationKey>> = {
  done: 'admin.home.reviewTranslation',
  unavailable: 'admin.home.translateUnavailable',
  expired: 'admin.home.expired',
  error: 'admin.error',
}

function toForm({ headline, intro, linkedin_url, github_url }: AdminHomeContent): HomeContentForm {
  return { headline, intro, linkedin_url, github_url }
}

// "/fr/admin/home" and "/en/admin/home" are the same page: switching the UI language keeps the form.
const withoutLang = (pathname: string) => pathname.replace(/^\/[^/]+/, '')

export function HomeEditorPage() {
  const { t, lang } = useTranslation()
  const [saved, setSaved] = useState<HomeContentForm | null>(null)
  const [form, setForm] = useState<HomeContentForm | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [textLang, setTextLang] = useState<Lang>('fr')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [invalid, setInvalid] = useState<HomeField[]>([])
  const [hasCv, setHasCv] = useState(false)
  const [translateState, setTranslateState] = useState<TranslateState>('idle')
  const [saveNotice, setSaveNotice] = useState<SaveNotice>(null)

  useEffect(() => {
    fetchAdminHome()
      .then((content) => {
        setSaved(toForm(content))
        setForm(toForm(content))
        setHasCv(content.has_cv)
      })
      .catch(() => setLoadFailed(true))
  }, [])

  const dirty = form !== null && JSON.stringify(form) !== JSON.stringify(saved)

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && withoutLang(currentLocation.pathname) !== withoutLang(nextLocation.pathname),
  )

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  if (loadFailed) {
    return (
      <p className={adminStyles.error} role="alert">
        {t('admin.error')}
      </p>
    )
  }
  if (form === null) return <p role="status">{t('admin.loading')}</p>

  function update(changes: Partial<HomeContentForm>) {
    setForm((current) => current && { ...current, ...changes })
    setSaveState('idle')
  }

  function updateText(field: 'headline' | 'intro', value: string) {
    setForm(
      (current) => current && { ...current, [field]: { ...current[field], [textLang]: value } },
    )
    setSaveState('idle')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form) return
    setSaveState('saving')
    const result = await saveAdminHome(form)
    if (result.status === 'saved') {
      // The server trims spaces and fills empty English fields: show exactly what was stored.
      setSaved(toForm(result.content))
      setForm(toForm(result.content))
      setInvalid([])
      setSaveState('saved')
      setTranslateState('idle')
      setSaveNotice(
        result.content.translation_failed
          ? 'translationFailed'
          : result.content.auto_translated.length > 0
            ? 'autoTranslated'
            : null,
      )
    } else if (result.status === 'invalid') {
      setInvalid(result.fields)
      setSaveState('idle')
    } else {
      setSaveState(result.status)
    }
  }

  function requestTranslation() {
    if (!form) return
    // Replacing English the admin may have written needs an explicit confirmation.
    const hasEnglish = form.headline.en.trim() !== '' || form.intro.en.trim() !== ''
    if (hasEnglish && translateState !== 'confirm') {
      setTranslateState('confirm')
      return
    }
    void runTranslation()
  }

  async function runTranslation() {
    if (!form) return
    setTranslateState('translating')
    const result = await translateFromFrench(
      [
        { text: form.headline.fr, format: 'plain' },
        { text: form.intro.fr, format: 'markdown' },
      ],
      'en',
    )
    if (result.status !== 'ok') {
      setTranslateState(result.status)
      return
    }
    const [headline, intro] = result.translations
    setForm(
      (current) =>
        current && {
          ...current,
          headline: { ...current.headline, en: headline },
          intro: { ...current.intro, en: intro },
        },
    )
    setSaveState('idle')
    setTranslateState('done')
  }

  const translateMessage = TRANSLATE_MESSAGES[translateState]

  const fieldError = (field: HomeField) =>
    invalid.includes(field) && (
      <span id={`${field}-error`} className={adminStyles.error}>
        {t(FIELD_ERRORS[field])}
      </span>
    )
  const describedBy = (field: HomeField) => (invalid.includes(field) ? `${field}-error` : undefined)

  return (
    <section className={styles.editor}>
      <title>{`${t('admin.home.title')} · ${t('admin.title')}`}</title>
      <Link to={`/${lang}/admin`}>{t('admin.home.backToDashboard')}</Link>
      <h1 className={adminStyles.title}>{t('admin.home.title')}</h1>

      {blocker.state === 'blocked' && (
        <div className={styles.confirm} role="alertdialog" aria-labelledby="unsaved-message">
          <p id="unsaved-message">{t('admin.home.unsaved')}</p>
          <Button onClick={() => blocker.reset()}>{t('admin.home.stay')}</Button>
          <button type="button" className={styles.secondary} onClick={() => blocker.proceed()}>
            {t('admin.home.leave')}
          </button>
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <fieldset className={styles.panel}>
          <legend>{t('admin.home.texts')}</legend>
          <div role="tablist" aria-label={t('admin.home.textLanguage')} className={styles.tabs}>
            {LANGS.map((code) => (
              <button
                key={code}
                type="button"
                role="tab"
                aria-selected={textLang === code}
                className={styles.tab}
                onClick={() => setTextLang(code)}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
          {textLang === 'en' && (
            <div className={styles.translate}>
              <p className={styles.hint}>{t('admin.home.enHint')}</p>
              <button
                type="button"
                className={styles.secondary}
                onClick={requestTranslation}
                disabled={translateState === 'translating' || form.headline.fr.trim() === ''}
              >
                {translateState === 'translating'
                  ? t('admin.home.translating')
                  : t('admin.home.translate')}
              </button>
              {translateState === 'confirm' && (
                <div
                  className={styles.confirm}
                  role="alertdialog"
                  aria-labelledby="replace-english-message"
                >
                  <p id="replace-english-message">{t('admin.home.confirmReplace')}</p>
                  <Button onClick={() => void runTranslation()}>{t('admin.home.replace')}</Button>
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={() => setTranslateState('idle')}
                  >
                    {t('admin.cv.cancel')}
                  </button>
                </div>
              )}
              {translateMessage && (
                <p
                  role={translateState === 'done' ? 'status' : 'alert'}
                  className={translateState === 'done' ? styles.hint : adminStyles.error}
                >
                  {t(translateMessage)}
                </p>
              )}
            </div>
          )}

          <label className={adminStyles.field}>
            {t('admin.home.headline')}
            <input
              value={form.headline[textLang]}
              onChange={(event) => updateText('headline', event.target.value)}
              maxLength={120}
              required={textLang === 'fr'}
              aria-invalid={invalid.includes('headline')}
              aria-describedby={describedBy('headline')}
            />
            {fieldError('headline')}
          </label>

          <div className={styles.introRow}>
            <label className={adminStyles.field}>
              {t('admin.home.intro')}
              <textarea
                value={form.intro[textLang]}
                onChange={(event) => updateText('intro', event.target.value)}
                maxLength={5000}
                rows={12}
                required={textLang === 'fr'}
                aria-invalid={invalid.includes('intro')}
                aria-describedby={describedBy('intro')}
              />
              {fieldError('intro')}
            </label>
            <div className={styles.preview} aria-label={t('admin.home.preview')} role="region">
              <span className={styles.previewLabel}>{t('admin.home.preview')}</span>
              <MarkdownText>{form.intro[textLang] || form.intro.fr}</MarkdownText>
            </div>
          </div>
        </fieldset>

        <label className={adminStyles.field}>
          {t('admin.home.linkedin')}
          <input
            type="url"
            value={form.linkedin_url}
            onChange={(event) => update({ linkedin_url: event.target.value })}
            maxLength={255}
            aria-invalid={invalid.includes('linkedin_url')}
            aria-describedby={describedBy('linkedin_url')}
          />
          {fieldError('linkedin_url')}
        </label>
        <label className={adminStyles.field}>
          {t('admin.home.github')}
          <input
            type="url"
            value={form.github_url}
            onChange={(event) => update({ github_url: event.target.value })}
            maxLength={255}
            aria-invalid={invalid.includes('github_url')}
            aria-describedby={describedBy('github_url')}
          />
          {fieldError('github_url')}
        </label>

        <CvField hasCv={hasCv} onChange={setHasCv} />

        <div className={styles.actions}>
          <Button type="submit" disabled={!dirty || saveState === 'saving'}>
            {saveState === 'saving' ? t('admin.home.saving') : t('admin.home.save')}
          </Button>
          <span role="status">{saveState === 'saved' && t('admin.home.saved')}</span>
        </div>
        {saveState === 'saved' && saveNotice === 'autoTranslated' && (
          <p className={styles.hint} role="status">
            {t('admin.home.autoTranslated')}
          </p>
        )}
        {saveState === 'saved' && saveNotice === 'translationFailed' && (
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
