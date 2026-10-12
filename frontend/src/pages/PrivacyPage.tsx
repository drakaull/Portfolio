import { PageHeader } from '../components/PageHeader/PageHeader.tsx'
import { MarkdownText } from '../components/MarkdownText/MarkdownText.tsx'
import { privacyEn } from '../content/privacy/en.ts'
import { privacyFr } from '../content/privacy/fr.ts'
import { privacyNl } from '../content/privacy/nl.ts'
import { useTranslation, type Lang } from '../i18n/useTranslation.ts'
import styles from './PrivacyPage.module.css'

const TEXTS: Record<Lang, string> = { en: privacyEn, fr: privacyFr, nl: privacyNl }

export function PrivacyPage() {
  const { t, lang } = useTranslation()

  return (
    <>
      <PageHeader eyebrow={t('eyebrow.privacy')} title={t('privacy.title')} />
      <div className={styles.text}>
        <MarkdownText>{TEXTS[lang]}</MarkdownText>
      </div>
    </>
  )
}
