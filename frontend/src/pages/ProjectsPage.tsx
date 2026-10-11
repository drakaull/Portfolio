import { PageHeader } from '../components/PageHeader/PageHeader.tsx'
import { useTranslation } from '../i18n/useTranslation.ts'

export function ProjectsPage() {
  const { t } = useTranslation()

  return <PageHeader eyebrow={t('eyebrow.projects')} title={t('projects.title')} />
}
