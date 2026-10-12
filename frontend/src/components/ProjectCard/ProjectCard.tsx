import type { Project } from '../../api/projects.ts'
import { useTranslation } from '../../i18n/useTranslation.ts'
import { TextLink } from '../TextLink/TextLink.tsx'
import styles from './ProjectCard.module.css'

const SHOWN_LANGUAGES = 3

/** One public project: context and year, title, translated "About", main languages, team. */
export function ProjectCard({ project }: { project: Project }) {
  const { t } = useTranslation()
  const year = new Date(project.created_at).getFullYear()
  const meta = [project.context && t(`projects.context.${project.context}`), year]
    .filter(Boolean)
    .join(' · ')
  // Several cards each have a "GitHub" link: the hidden title tells them apart.
  const forThis = <span className="visually-hidden"> — {project.title}</span>

  return (
    <article className={styles.card}>
      <div className={styles.top}>
        <span className={styles.meta}>{meta}</span>
        <span className={styles.links}>
          {project.homepage && (
            <TextLink to={project.homepage} external>
              {t('projects.site')} ↗{forThis}
            </TextLink>
          )}
          <TextLink to={project.url} external>
            GitHub ↗{forThis}
          </TextLink>
        </span>
      </div>
      <h2 className={styles.title}>{project.title}</h2>
      {project.summary && <p className={styles.summary}>{project.summary}</p>}
      {project.languages.length > 0 && (
        <p className={styles.languages}>
          {project.languages
            .slice(0, SHOWN_LANGUAGES)
            .map((language) => language.name)
            .join(' · ')}
        </p>
      )}
      {project.team_size !== null && (
        <p className={styles.team}>
          {project.team_size === 1
            ? t('projects.solo')
            : `${t('projects.team')} ${project.team_size}`}
        </p>
      )}
    </article>
  )
}
