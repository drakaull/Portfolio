import { useTranslation } from '../i18n/useTranslation.ts'

export function ExperiencePage() {
  const { t } = useTranslation()

  return (
    <>
      <title>{`${t('experience.title')} · ${t('site.name')}`}</title>
      <h1>{t('experience.title')}</h1>
    </>
  )
}
