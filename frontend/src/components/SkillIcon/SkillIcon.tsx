import type { CSSProperties } from 'react'
import type { SkillIconData } from '../../api/skills.ts'
import { readableOn } from '../../lib/contrast.ts'
import styles from './SkillIcon.module.css'

// Page backgrounds of both themes (--color-bg in global.css): keep in sync.
const LIGHT_BACKGROUND = 'f7f4ec'
const DARK_BACKGROUND = '1b1a17'
// WCAG minimum for graphics.
const MIN_CONTRAST = 3

/**
 * A stored Simple Icons logo, in the text colour; its brand colour shows while the parent is
 * hovered, darkened or lightened where it would be too pale on the theme's background.
 * Decorative: the name is the text.
 */
export function SkillIcon({ icon }: { icon: SkillIconData }) {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={
        {
          '--brand-light': `#${readableOn(icon.hex, LIGHT_BACKGROUND, MIN_CONTRAST)}`,
          '--brand-dark': `#${readableOn(icon.hex, DARK_BACKGROUND, MIN_CONTRAST)}`,
        } as CSSProperties
      }
    >
      {/* Only ever an attribute value: React escapes it, and the server checks its characters. */}
      <path d={icon.path} />
    </svg>
  )
}
