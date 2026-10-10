import { useTranslation } from '../i18n/useTranslation.ts'

export function SkillsPage() {
  const { t } = useTranslation()

  return (
    <>
      <title>{`${t('skills.title')} · ${t('site.name')}`}</title>
      <h1>{t('skills.title')}</h1>
    </>
  )
}
