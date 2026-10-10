import { useTranslation } from '../i18n/useTranslation.ts'

export function HomePage() {
  const { t } = useTranslation()

  return (
    <>
      <title>{t('site.name')}</title>
      <h1>{t('home.title')}</h1>
    </>
  )
}
