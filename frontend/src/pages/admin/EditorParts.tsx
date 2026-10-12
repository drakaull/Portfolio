import type { Blocker } from 'react-router'
import { Button } from '../../components/Button/Button.tsx'
import { useTranslation } from '../../i18n/useTranslation.ts'
import adminStyles from './Admin.module.css'
import styles from './Editor.module.css'

/** Shown while useUnsavedChanges holds a navigation: stay, or leave without saving. */
export function UnsavedChangesDialog({ blocker }: { blocker: Blocker }) {
  const { t } = useTranslation()
  if (blocker.state !== 'blocked') return null

  return (
    <div className={styles.confirm} role="alertdialog" aria-labelledby="unsaved-message">
      <p id="unsaved-message">{t('admin.home.unsaved')}</p>
      <Button onClick={() => blocker.reset()}>{t('admin.home.stay')}</Button>
      <button type="button" className={styles.secondary} onClick={() => blocker.proceed()}>
        {t('admin.home.leave')}
      </button>
    </div>
  )
}

/** The session ended while editing: sign in again in a new tab, so the form is kept. */
export function SessionExpiredAlert() {
  const { t, lang } = useTranslation()

  return (
    <p className={adminStyles.error} role="alert">
      {t('admin.home.expired')}{' '}
      <a href={`/${lang}/admin/login`} target="_blank" rel="noopener noreferrer">
        {t('admin.home.signInNewTab')}
      </a>
    </p>
  )
}
