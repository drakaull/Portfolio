import { useState } from 'react'
import { translateFromFrench, type TargetLang, type Translated } from '../../api/adminHome.ts'
import { Button } from '../../components/Button/Button.tsx'
import type { TranslationKey } from '../../i18n/en.ts'
import { useTranslation, type Lang } from '../../i18n/useTranslation.ts'
import adminStyles from './Admin.module.css'
import styles from './HomeEditorPage.module.css'

// French is the writing language: first tab, selected by default.
const LANGS: Lang[] = ['fr', 'en', 'nl']

type TranslateState =
  'idle' | 'confirm' | 'translating' | 'done' | 'unavailable' | 'expired' | 'error'

const TRANSLATE_MESSAGES: Partial<Record<TranslateState, TranslationKey>> = {
  done: 'admin.home.reviewTranslation',
  unavailable: 'admin.home.translateUnavailable',
  expired: 'admin.home.expired',
  error: 'admin.error',
}

export type TranslatedField = { value: Translated; format: 'plain' | 'markdown' }

type Props = {
  textLang: Lang
  onSelect: (lang: Lang) => void
  /** The form's translated fields, in the order `onTranslated` receives them; the first one
   * is required in French (nothing to translate while it is empty). */
  fields: TranslatedField[]
  onTranslated: (target: TargetLang, translations: string[]) => void
}

/**
 * Language tabs of an editor's translated texts, with "Translate from French" on the other tabs.
 * Remount it (new `key`) after a save to clear its messages.
 */
export function TranslationTabs({ textLang, onSelect, fields, onTranslated }: Props) {
  const { t } = useTranslation()
  const [state, setState] = useState<TranslateState>('idle')

  function select(code: Lang) {
    onSelect(code)
    // A translation message or confirmation belongs to the tab it was asked from.
    setState('idle')
  }

  function request(target: TargetLang) {
    // Replacing text the admin may have written needs an explicit confirmation.
    const hasText = fields.some(({ value }) => value[target].trim() !== '')
    if (hasText && state !== 'confirm') {
      setState('confirm')
      return
    }
    void run(target)
  }

  async function run(target: TargetLang) {
    setState('translating')
    const result = await translateFromFrench(
      fields.map(({ value, format }) => ({ text: value.fr, format })),
      target,
    )
    if (result.status !== 'ok') {
      setState(result.status)
      return
    }
    onTranslated(target, result.translations)
    setState('done')
  }

  const message = TRANSLATE_MESSAGES[state]

  return (
    <>
      <div role="tablist" aria-label={t('admin.home.textLanguage')} className={styles.tabs}>
        {LANGS.map((code) => (
          <button
            key={code}
            type="button"
            role="tab"
            aria-selected={textLang === code}
            // The running translation writes into the tab it was asked from.
            disabled={state === 'translating'}
            className={styles.tab}
            onClick={() => select(code)}
          >
            {code.toUpperCase()}
          </button>
        ))}
      </div>
      {textLang !== 'fr' && (
        <div className={styles.translate}>
          <p className={styles.hint}>{t('admin.home.translateHint')}</p>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => request(textLang)}
            disabled={state === 'translating' || fields[0].value.fr.trim() === ''}
          >
            {state === 'translating' ? t('admin.home.translating') : t('admin.home.translate')}
          </button>
          {state === 'confirm' && (
            <div
              className={styles.confirm}
              role="alertdialog"
              aria-labelledby="replace-translation-message"
            >
              <p id="replace-translation-message">{t('admin.home.confirmReplace')}</p>
              <Button onClick={() => void run(textLang)}>{t('admin.home.replace')}</Button>
              <button type="button" className={styles.secondary} onClick={() => setState('idle')}>
                {t('admin.cv.cancel')}
              </button>
            </div>
          )}
          {message && (
            <p
              role={state === 'done' ? 'status' : 'alert'}
              className={state === 'done' ? styles.hint : adminStyles.error}
            >
              {t(message)}
            </p>
          )}
        </div>
      )}
    </>
  )
}
