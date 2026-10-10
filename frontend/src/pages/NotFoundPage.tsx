import { Link } from 'react-router'
import { useTranslation } from '../i18n/useTranslation.ts'

export function NotFoundPage() {
  const { t, lang } = useTranslation()

  return (
    <>
      <title>{`${t('notFound.title')} · ${t('site.name')}`}</title>
      <h1>{t('notFound.title')}</h1>
      <Link to={`/${lang}`}>{t('notFound.back')}</Link>
    </>
  )
}
