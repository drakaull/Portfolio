import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import {
  fetchAdminHome,
  saveAdminHome,
  type AdminHomeContent,
  type AdminHomeSaved,
  type HomeContentForm,
  type HomeField,
} from '../../api/adminHome.ts'
import { PHOTO_FOCUS_CENTRE } from '../../api/useHomeContent.ts'
import { Button } from '../../components/Button/Button.tsx'
import { MarkdownText } from '../../components/MarkdownText/MarkdownText.tsx'
import type { TranslationKey } from '../../i18n/en.ts'
import { useTranslation, type Lang } from '../../i18n/useTranslation.ts'
import adminStyles from './Admin.module.css'
import { SessionExpiredAlert, UnsavedChangesDialog } from './EditorParts.tsx'
import { CvField, ImageField, PhotoField } from './FileField.tsx'
import styles from './Editor.module.css'
import { PhotoFraming } from './PhotoFraming.tsx'
import { TranslationTabs } from './TranslationTabs.tsx'
import { useUnsavedChanges } from './useUnsavedChanges.ts'

const FIELD_ERRORS: Record<HomeField, TranslationKey> = {
  headline: 'admin.home.invalidHeadline',
  intro: 'admin.home.invalidIntro',
  linkedin_url: 'admin.home.invalidUrl',
  github_url: 'admin.home.invalidUrl',
}

type SaveState = 'idle' | 'saving' | 'saved' | 'expired' | 'error'
type SaveNotice = Pick<AdminHomeSaved, 'auto_translated' | 'translation_failed'>

function toForm({
  headline,
  intro,
  linkedin_url,
  github_url,
  photo_focus,
  contact_focus,
}: AdminHomeContent): HomeContentForm {
  return { headline, intro, linkedin_url, github_url, photo_focus, contact_focus }
}

export function HomeEditorPage() {
  const { t, lang } = useTranslation()
  const [saved, setSaved] = useState<HomeContentForm | null>(null)
  const [form, setForm] = useState<HomeContentForm | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [textLang, setTextLang] = useState<Lang>('fr')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [invalid, setInvalid] = useState<HomeField[]>([])
  const [hasCv, setHasCv] = useState(false)
  const [hasPhoto, setHasPhoto] = useState(false)
  // Bumped on each upload, so the framing tool never shows a cached older photo.
  const [photoVersion, setPhotoVersion] = useState(0)
  const [hasContactImage, setHasContactImage] = useState(false)
  const [contactVersion, setContactVersion] = useState(0)
  // Bumped on each save: remounts the translation tabs, which clears their messages.
  const [saves, setSaves] = useState(0)
  const [saveNotice, setSaveNotice] = useState<SaveNotice | null>(null)

  useEffect(() => {
    fetchAdminHome()
      .then((content) => {
        setSaved(toForm(content))
        setForm(toForm(content))
        setHasCv(content.has_cv)
        setHasPhoto(content.photo_url !== null)
        setHasContactImage(content.contact_image_url !== null)
      })
      .catch(() => setLoadFailed(true))
  }, [])

  const dirty = form !== null && JSON.stringify(form) !== JSON.stringify(saved)

  const blocker = useUnsavedChanges(dirty)

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
      // The server trims spaces and fills empty translations: show exactly what was stored.
      setSaved(toForm(result.content))
      setForm(toForm(result.content))
      setInvalid([])
      setSaveState('saved')
      setSaves((count) => count + 1)
      setSaveNotice(result.content)
    } else if (result.status === 'invalid') {
      setInvalid(result.fields)
      setSaveState('idle')
    } else {
      setSaveState(result.status)
    }
  }

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

      <UnsavedChangesDialog blocker={blocker} />

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <fieldset className={styles.panel}>
          <legend>{t('admin.home.texts')}</legend>
          <TranslationTabs
            key={saves}
            textLang={textLang}
            onSelect={setTextLang}
            fields={[
              { value: form.headline, format: 'plain' },
              { value: form.intro, format: 'markdown' },
            ]}
            onTranslated={(target, [headline, intro]) => {
              setForm(
                (current) =>
                  current && {
                    ...current,
                    headline: { ...current.headline, [target]: headline },
                    intro: { ...current.intro, [target]: intro },
                  },
              )
              setSaveState('idle')
            }}
          />

          <div className={adminStyles.field}>
            <label htmlFor="home-headline">{t('admin.home.headline')}</label>
            <input
              id="home-headline"
              value={form.headline[textLang]}
              onChange={(event) => updateText('headline', event.target.value)}
              maxLength={120}
              required={textLang === 'fr'}
              aria-invalid={invalid.includes('headline')}
              aria-describedby={describedBy('headline')}
            />
            {fieldError('headline')}
          </div>

          <div className={styles.introRow}>
            <div className={adminStyles.field}>
              <label htmlFor="home-intro">{t('admin.home.intro')}</label>
              <textarea
                id="home-intro"
                value={form.intro[textLang]}
                onChange={(event) => updateText('intro', event.target.value)}
                maxLength={5000}
                rows={12}
                required={textLang === 'fr'}
                aria-invalid={invalid.includes('intro')}
                aria-describedby={describedBy('intro')}
              />
              {fieldError('intro')}
            </div>
            <div className={styles.preview} aria-label={t('admin.home.preview')} role="region">
              <span className={styles.previewLabel}>{t('admin.home.preview')}</span>
              <MarkdownText>{form.intro[textLang] || form.intro.fr}</MarkdownText>
            </div>
          </div>
        </fieldset>

        <div className={adminStyles.field}>
          <label htmlFor="home-linkedin">{t('admin.home.linkedin')}</label>
          <input
            id="home-linkedin"
            type="url"
            value={form.linkedin_url}
            onChange={(event) => update({ linkedin_url: event.target.value })}
            maxLength={255}
            aria-invalid={invalid.includes('linkedin_url')}
            aria-describedby={describedBy('linkedin_url')}
          />
          {fieldError('linkedin_url')}
        </div>
        <div className={adminStyles.field}>
          <label htmlFor="home-github">{t('admin.home.github')}</label>
          <input
            id="home-github"
            type="url"
            value={form.github_url}
            onChange={(event) => update({ github_url: event.target.value })}
            maxLength={255}
            aria-invalid={invalid.includes('github_url')}
            aria-describedby={describedBy('github_url')}
          />
          {fieldError('github_url')}
        </div>

        <PhotoField
          present={hasPhoto}
          onChange={(present) => {
            setHasPhoto(present)
            if (!present) return
            setPhotoVersion((count) => count + 1)
            // The server frames a new photo from the centre: follow it, without making it a change.
            const centred = (current: HomeContentForm | null) =>
              current && { ...current, photo_focus: PHOTO_FOCUS_CENTRE }
            setSaved(centred)
            setForm(centred)
          }}
        >
          <PhotoFraming
            src={`/api/photo?preview=${photoVersion}`}
            focus={form.photo_focus}
            onChange={(photo_focus) => update({ photo_focus })}
          />
        </PhotoField>
        <ImageField
          id="contact-image"
          url="/api/admin/contact-image"
          legend="admin.contactImage.legend"
          present={hasContactImage}
          onChange={(present) => {
            setHasContactImage(present)
            if (!present) return
            setContactVersion((count) => count + 1)
            // Framed from the centre by the server, like the photo.
            const centred = (current: HomeContentForm | null) =>
              current && { ...current, contact_focus: PHOTO_FOCUS_CENTRE }
            setSaved(centred)
            setForm(centred)
          }}
        >
          <PhotoFraming
            src={`/api/images/contact/page?preview=${contactVersion}`}
            focus={form.contact_focus}
            onChange={(contact_focus) => update({ contact_focus })}
            width={240}
            height={300}
            texts={{
              label: 'admin.framing.label',
              preview: 'admin.image.preview',
              result: 'admin.contactImage.framingResult',
              hint: 'admin.framing.hint',
              notNeeded: 'admin.framing.notNeeded',
            }}
          />
        </ImageField>
        <CvField present={hasCv} onChange={setHasCv} />

        <div className={styles.actions}>
          <Button type="submit" disabled={!dirty || saveState === 'saving'}>
            {saveState === 'saving' ? t('admin.home.saving') : t('admin.home.save')}
          </Button>
          <span role="status">{saveState === 'saved' && t('admin.home.saved')}</span>
        </div>
        {/* Both can show: one language may be generated while the other fails. */}
        {saveState === 'saved' && saveNotice && saveNotice.auto_translated.length > 0 && (
          <p className={styles.hint} role="status">
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
