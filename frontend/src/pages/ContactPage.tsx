import { PageHeader } from '../components/PageHeader/PageHeader.tsx'
import { useTranslation } from '../i18n/useTranslation.ts'

export function ContactPage() {
  const { t } = useTranslation()

  return <PageHeader eyebrow={t('eyebrow.contact')} title={t('contact.title')} />
}
