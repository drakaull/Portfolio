import { PageHeader } from '../components/PageHeader/PageHeader.tsx'
import { TextLink } from '../components/TextLink/TextLink.tsx'
import { useTranslation } from '../i18n/useTranslation.ts'

export function NotFoundPage() {
  const { t, lang } = useTranslation()

  return (
    <PageHeader eyebrow="~/portfolio/404" title={t('notFound.title')}>
      {/* The server answers 200 for every page of the app: keep unknown URLs out of search engines. */}
      <meta name="robots" content="noindex" />
      <p>
        <TextLink to={`/${lang}`}>{t('notFound.back')}</TextLink>
      </p>
    </PageHeader>
  )
}
