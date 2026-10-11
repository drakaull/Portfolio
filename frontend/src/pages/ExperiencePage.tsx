import { PageHeader } from '../components/PageHeader/PageHeader.tsx'
import { useTranslation } from '../i18n/useTranslation.ts'

export function ExperiencePage() {
  const { t } = useTranslation()

  return <PageHeader eyebrow={t('eyebrow.experience')} title={t('experience.title')} />
}
