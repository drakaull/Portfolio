import type { Project } from '../../api/projects.ts'
import { useTranslation } from '../../i18n/useTranslation.ts'
import { LanguageDonut, LanguageList } from '../LanguageList/LanguageList.tsx'
import { Bone, BoneRow } from '../Skeleton/Skeleton.tsx'
import { TextLink } from '../TextLink/TextLink.tsx'
import styles from './ProjectCard.module.css'

// The screenshot's frame: 16:10, the shape framed in the admin.
const SCREENSHOT_WIDTH = 320
const SCREENSHOT_HEIGHT = 200

/** One public project: context and year, title, languages, translated "About", screenshot, team.
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
            <span className={styles.above}>
              <TextLink to={project.homepage} external>
                {t('projects.site')} ↗{forThis}
              </TextLink>
            </span>
          )}
          {/* Stretched over the whole card: one link for the keyboard, the card for the mouse. */}
          <span className={styles.stretched}>
            <TextLink to={project.url} external>
              GitHub ↗{forThis}
            </TextLink>
          </span>
        </span>
      </div>
      <h2 className={styles.title}>{project.title}</h2>
      {/* With a screenshot, the languages go under the title; without, the ring keeps them below. */}
      {project.image_url && project.languages.length > 0 && (
        <LanguageList languages={project.languages} coloured={coloured} />
      )}
      {project.summary && <p className={styles.summary}>{project.summary}</p>}
      {/* Pinned to the bottom with the team line, so the visuals of a row line up. */}
      {project.image_url ? (
        <img
          className={`${styles.visual} ${styles.image}`}
          src={project.image_url}
          alt={`${t('projects.screenshot')} ${project.title}`}
          width={SCREENSHOT_WIDTH}
          height={SCREENSHOT_HEIGHT}
          loading="lazy"
          style={{ objectPosition: `${project.image_focus.x}% ${project.image_focus.y}%` }}
        />
      ) : (
        project.languages.length > 0 && (
          <div className={styles.visual}>
            <LanguageDonut languages={project.languages} coloured={coloured} />
          </div>
        )
      )}
      {/* Always there, so the visuals of a row line up; shown only for a team. */}
      <p className={styles.team}>
        {project.team_size !== null &&
          project.team_size > 1 &&
          `${t('projects.team')} ${project.team_size}`}
      </p>
    </article>
  )
}

/** The shape of a card while projects load (see Loading). */
export function ProjectCardSkeleton() {
  return (
    <div className={styles.card}>
      <Bone width="35%" height="0.75rem" />
      <Bone width="55%" height="1.5rem" />
      <BoneRow>
        <Bone width="6rem" height="0.75rem" />
        <Bone width="4.5rem" height="0.75rem" />
        <Bone width="5rem" height="0.75rem" />
      </BoneRow>
      <Bone />
      <Bone />
      <Bone width="70%" />
      <span className={styles.team}>
        <Bone width="5rem" height="0.875rem" />
      </span>
    </div>
  )
}
