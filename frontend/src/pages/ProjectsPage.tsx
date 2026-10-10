import { useTranslation } from '../i18n/useTranslation.ts'

export function ProjectsPage() {
  const { t } = useTranslation()

  return (
    <>
      <title>{`${t('projects.title')} · ${t('site.name')}`}</title>
      <h1>{t('projects.title')}</h1>
    </>
  )
}
