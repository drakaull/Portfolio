import { useState, type ChangeEvent, type ReactNode } from 'react'
import { deleteFile, uploadFile, type FileResult } from '../../api/adminHome.ts'
import { Button } from '../../components/Button/Button.tsx'
import type { TranslationKey } from '../../i18n/en.ts'
import { useTranslation } from '../../i18n/useTranslation.ts'
import adminStyles from './Admin.module.css'
import styles from './Editor.module.css'

/** The texts of one file field, so the CV and the photo share the same behaviour. */
export type FileTexts = {
  legend: TranslationKey
  online: TranslationKey
  none: TranslationKey
  upload: TranslationKey
  replace: TranslationKey
  uploaded: TranslationKey
  removed: TranslationKey
  tooLarge: TranslationKey
  wrongType: TranslationKey
  remove: TranslationKey
  confirmRemove: TranslationKey
}

type Feedback = { kind: 'status' | 'alert'; message: TranslationKey } | null

/** Upload / removal of a stored file. Changes apply immediately, independently of "Save". */
export function FileField({
  id,
  url,
  accept,
  texts,
  present,
  onChange,
  preview,
}: {
  id: string
  url: string // admin endpoint: PUT uploads, DELETE removes
  accept: string
  texts: FileTexts
  present: boolean
  onChange: (present: boolean) => void
  preview?: ReactNode // shown while a file is online
}) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [confirmingRemoval, setConfirmingRemoval] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const errors: Record<Exclude<FileResult, 'ok'>, TranslationKey> = {
    tooLarge: texts.tooLarge,
    wrongType: texts.wrongType,
    expired: 'admin.file.expired',
    error: 'admin.error',
  }

  function report(result: FileResult, success: TranslationKey) {
    setFeedback(
      result === 'ok'
        ? { kind: 'status', message: success }
        : { kind: 'alert', message: errors[result] },
    )
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // allow choosing the same file again after an error
    if (!file) return
    setBusy(true)
    const result = await uploadFile(url, file)
    setBusy(false)
    if (result === 'ok') onChange(true)
    report(result, texts.uploaded)
  }

  async function handleRemove() {
    setConfirmingRemoval(false)
    setBusy(true)
    const result = await deleteFile(url)
    setBusy(false)
    if (result === 'ok') onChange(false)
    report(result, texts.removed)
  }

  return (
    <fieldset className={styles.panel}>
      <legend>{t(texts.legend)}</legend>
      <p className={styles.hint}>
        {present ? t(texts.online) : t(texts.none)} {present && preview}
      </p>
      <label className={adminStyles.field}>
        {present ? t(texts.replace) : t(texts.upload)}
        <input type="file" accept={accept} onChange={handleFile} disabled={busy} />
      </label>
      {present && !confirmingRemoval && (
        <button
          type="button"
          className={styles.secondary}
          onClick={() => setConfirmingRemoval(true)}
          disabled={busy}
        >
          {t(texts.remove)}
        </button>
      )}
      {confirmingRemoval && (
        <div className={styles.confirm} role="alertdialog" aria-labelledby={`${id}-remove-message`}>
          <p id={`${id}-remove-message`}>{t(texts.confirmRemove)}</p>
          <Button onClick={handleRemove}>{t('admin.file.confirmRemove')}</Button>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => setConfirmingRemoval(false)}
          >
            {t('admin.cancel')}
          </button>
        </div>
      )}
      {busy && <p role="status">{t('admin.file.sending')}</p>}
      {feedback && (
        <p
          role={feedback.kind}
          className={feedback.kind === 'alert' ? adminStyles.error : undefined}
        >
          {t(feedback.message)}
        </p>
      )}
    </fieldset>
  )
}

const CV_TEXTS: FileTexts = {
  legend: 'admin.cv.legend',
  online: 'admin.cv.online',
  none: 'admin.cv.none',
  upload: 'admin.cv.upload',
  replace: 'admin.cv.replace',
  uploaded: 'admin.cv.uploaded',
  removed: 'admin.cv.removed',
  tooLarge: 'admin.cv.tooLarge',
  wrongType: 'admin.cv.notPdf',
  remove: 'admin.cv.remove',
  confirmRemove: 'admin.cv.confirmRemove',
}

const PHOTO_TEXTS: FileTexts = {
  legend: 'admin.photo.legend',
  online: 'admin.photo.online',
  none: 'admin.photo.none',
  upload: 'admin.photo.upload',
  replace: 'admin.photo.replace',
  uploaded: 'admin.photo.uploaded',
  removed: 'admin.photo.removed',
  tooLarge: 'admin.photo.tooLarge',
  wrongType: 'admin.photo.notImage',
  remove: 'admin.photo.remove',
  confirmRemove: 'admin.photo.confirmRemove',
}

export function CvField(props: { present: boolean; onChange: (present: boolean) => void }) {
  const { t } = useTranslation()
  return (
    <FileField
      id="cv"
      url="/api/admin/cv"
      accept="application/pdf"
      texts={CV_TEXTS}
      preview={
        <a href="/api/cv" target="_blank" rel="noopener noreferrer">
          {t('admin.cv.view')}
        </a>
      }
      {...props}
    />
  )
}

/** `version` changes on every upload, so the preview never shows a cached older photo. */
export function PhotoField(props: { present: boolean; onChange: (present: boolean) => void }) {
  const { t } = useTranslation()
  const [version, setVersion] = useState(0)
  return (
    <FileField
      id="photo"
      url="/api/admin/photo"
      accept="image/jpeg,image/png,image/webp"
      texts={PHOTO_TEXTS}
      preview={
        <img
          className={styles.photoPreview}
          src={`/api/photo?preview=${version}`}
          alt={t('admin.photo.preview')}
          width={96}
          height={96}
        />
      }
      present={props.present}
      onChange={(present) => {
        setVersion((count) => count + 1)
        props.onChange(present)
      }}
    />
  )
}
