import { useProjects } from '../api/projects.ts'
import { PageHeader } from '../components/PageHeader/PageHeader.tsx'
import { ProjectCard, ProjectCardSkeleton } from '../components/ProjectCard/ProjectCard.tsx'
import { Loading } from '../components/Skeleton/Skeleton.tsx'
import { useTranslation } from '../i18n/useTranslation.ts'
import { colouredLanguages } from '../lib/languages.ts'
import styles from './ProjectsPage.module.css'

export function ProjectsPage() {
  const { t, lang } = useTranslation()
  const state = useProjects(lang)
  const coloured = state.status === 'ready' ? colouredLanguages(state.data) : []

  return (
    <>
      <PageHeader eyebrow={t('eyebrow.projects')} title={t('projects.title')} />
      {state.status === 'loading' && (
        <Loading label={t('projects.loading')} className={styles.grid}>
          {[1, 2, 3, 4].map((key) => (
            <ProjectCardSkeleton key={key} />
          ))}
        </Loading>
      )}
      {(state.status === 'error' || state.status === 'notFound') && (
        <p role="alert">{t('projects.error')}</p>
      )}
      {state.status === 'ready' && state.data.length === 0 && <p>{t('projects.empty')}</p>}
      {state.status === 'ready' && state.data.length > 0 && (
        <ul className={styles.grid}>
          {state.data.map((project) => (
            <li key={project.url}>
              <ProjectCard project={project} coloured={coloured} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
