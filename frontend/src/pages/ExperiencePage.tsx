import { useExperiences } from '../api/experiences.ts'
import { PageHeader } from '../components/PageHeader/PageHeader.tsx'
import { Loading } from '../components/Skeleton/Skeleton.tsx'
import { Timeline, TimelineSkeleton } from '../components/Timeline/Timeline.tsx'
import { useTranslation } from '../i18n/useTranslation.ts'

export function ExperiencePage() {
  const { t, lang } = useTranslation()
  const state = useExperiences(lang)

  return (
    <>
      <PageHeader eyebrow={t('eyebrow.experience')} title={t('experience.title')} />
      {state.status === 'loading' && (
        <Loading label={t('experience.loading')}>
          <TimelineSkeleton />
        </Loading>
      )}
      {(state.status === 'error' || state.status === 'notFound') && (
        <p role="alert">{t('experience.error')}</p>
      )}
      {state.status === 'ready' &&
        (state.data.length > 0 ? (
          <Timeline entries={state.data} />
        ) : (
          <p>{t('experience.empty')}</p>
        ))}
    </>
  )
}
