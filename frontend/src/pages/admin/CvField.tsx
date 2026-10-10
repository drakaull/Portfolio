import { useState, type ChangeEvent } from 'react'
import { deleteCv, uploadCv, type CvResult } from '../../api/adminHome.ts'
import type { TranslationKey } from '../../i18n/en.ts'
import { useTranslation } from '../../i18n/useTranslation.ts'
import adminStyles from './Admin.module.css'
import styles from './HomeEditorPage.module.css'

const MESSAGES: Record<Exclude<CvResult, 'ok'>, TranslationKey> = {
  tooLarge: 'admin.cv.tooLarge',
  notPdf: 'admin.cv.notPdf',
  expired: 'admin.cv.expired',
  error: 'admin.error',
}

type Feedback = { kind: 'status' | 'alert'; message: TranslationKey } | null

/** CV upload / removal. Changes apply immediately, independently of the "Save" button. */
export function CvField({
  hasCv,
  onChange,
}: {
  hasCv: boolean
  onChange: (hasCv: boolean) => void
}) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [confirmingRemoval, setConfirmingRemoval] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  function report(result: CvResult, success: TranslationKey) {
    setFeedback(
      result === 'ok'
        ? { kind: 'status', message: success }
        : { kind: 'alert', message: MESSAGES[result] },
    )
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // allow choosing the same file again after an error
    if (!file) return
    setBusy(true)
    const result = await uploadCv(file)
    setBusy(false)
    if (result === 'ok') onChange(true)
    report(result, 'admin.cv.uploaded')
  }

  async function handleRemove() {
    setConfirmingRemoval(false)
    setBusy(true)
    const result = await deleteCv()
    setBusy(false)
    if (result === 'ok') onChange(false)
    report(result, 'admin.cv.removed')
  }

  return (
    <fieldset className={styles.texts}>
      <legend>{t('admin.cv.legend')}</legend>
      <p className={styles.hint}>
        {hasCv ? t('admin.cv.online') : t('admin.cv.none')}{' '}
        {hasCv && (
          <a href="/api/cv" target="_blank" rel="noopener noreferrer">
            {t('admin.cv.view')}
          </a>
        )}
      </p>
      <label className={adminStyles.field}>
        {hasCv ? t('admin.cv.replace') : t('admin.cv.upload')}
        <input type="file" accept="application/pdf" onChange={handleFile} disabled={busy} />
      </label>
      {hasCv && !confirmingRemoval && (
        <button
          type="button"
          className={styles.secondary}
          onClick={() => setConfirmingRemoval(true)}
          disabled={busy}
        >
          {t('admin.cv.remove')}
        </button>
      )}
      {confirmingRemoval && (
        <div className={styles.unsaved} role="alertdialog" aria-labelledby="cv-remove-message">
          <p id="cv-remove-message">{t('admin.cv.confirmRemove')}</p>
          <button type="button" className={adminStyles.button} onClick={handleRemove}>
            {t('admin.cv.confirm')}
          </button>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => setConfirmingRemoval(false)}
          >
            {t('admin.cv.cancel')}
          </button>
        </div>
      )}
      {busy && <p role="status">{t('admin.cv.working')}</p>}
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
