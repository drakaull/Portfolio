import { PageHeader } from '../components/PageHeader/PageHeader.tsx'
import { useTranslation } from '../i18n/useTranslation.ts'

export function SkillsPage() {
  const { t } = useTranslation()

  return <PageHeader eyebrow={t('eyebrow.skills')} title={t('skills.title')} />
}
