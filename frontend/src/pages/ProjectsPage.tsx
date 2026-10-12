import { useProjects } from '../api/projects.ts'
import { PageHeader } from '../components/PageHeader/PageHeader.tsx'
import { ProjectCard } from '../components/ProjectCard/ProjectCard.tsx'
import { useTranslation } from '../i18n/useTranslation.ts'
import styles from './ProjectsPage.module.css'

export function ProjectsPage() {
  const { t, lang } = useTranslation()
  const state = useProjects(lang)

  return (
    <>
      <PageHeader eyebrow={t('eyebrow.projects')} title={t('projects.title')} />
      {state.status === 'loading' && <p role="status">{t('projects.loading')}</p>}
      {(state.status === 'error' || state.status === 'notFound') && (
        <p role="alert">{t('projects.error')}</p>
      )}
      {state.status === 'ready' && state.data.length === 0 && <p>{t('projects.empty')}</p>}
      {state.status === 'ready' && state.data.length > 0 && (
        <ul className={styles.grid}>
          {state.data.map((project) => (
            <li key={project.url}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
