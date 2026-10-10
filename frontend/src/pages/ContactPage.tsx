import { useTranslation } from '../i18n/useTranslation.ts'

export function ContactPage() {
  const { t } = useTranslation()

  return (
    <>
      <title>{`${t('contact.title')} · ${t('site.name')}`}</title>
      <h1>{t('contact.title')}</h1>
    </>
  )
}
