import type { Project } from '../../api/projects.ts'
import { useTranslation } from '../../i18n/useTranslation.ts'
import { LanguageDonut } from '../LanguageDonut/LanguageDonut.tsx'
import { TextLink } from '../TextLink/TextLink.tsx'
import styles from './ProjectCard.module.css'

/** One public project: context and year, title, translated "About", languages, team.
 * `coloured`: the languages coloured on the page (see lib/languages.ts). */
export function ProjectCard({ project, coloured }: { project: Project; coloured: string[] }) {
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
      {/* Pinned to the bottom, so the rings of a row line up whatever the summary length. */}
      <div className={styles.footer}>
        {project.languages.length > 0 && (
          <LanguageDonut languages={project.languages} coloured={coloured} />
        )}
        {/* Always there (empty when unknown): its height must not shift the ring. */}
        <p className={styles.team}>
          {project.team_size === 1 && t('projects.solo')}
          {project.team_size !== null &&
            project.team_size > 1 &&
            `${t('projects.team')} ${project.team_size}`}
        </p>
      </div>
    </article>
  )
}
