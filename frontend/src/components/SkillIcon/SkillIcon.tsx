import type { CSSProperties } from 'react'
import type { SkillIconData } from '../../api/skills.ts'
import { contrast } from '../../lib/contrast.ts'
import styles from './SkillIcon.module.css'

// Page backgrounds of both themes (--color-bg in global.css): keep in sync.
const LIGHT_BACKGROUND = 'f7f4ec'
const DARK_BACKGROUND = '1b1a17'
// WCAG minimum for graphics.
const MIN_CONTRAST = 3

/**
 * A stored Simple Icons logo, in the text colour; its brand colour shows while the parent is
 * hovered, only on the themes where that colour stays readable. Decorative: the name is the text.
 */
export function SkillIcon({ icon }: { icon: SkillIconData }) {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ '--brand': `#${icon.hex}` } as CSSProperties}
      data-brand-light={contrast(icon.hex, LIGHT_BACKGROUND) >= MIN_CONTRAST || undefined}
      data-brand-dark={contrast(icon.hex, DARK_BACKGROUND) >= MIN_CONTRAST || undefined}
    >
      {/* Only ever an attribute value: React escapes it, and the server checks its characters. */}
      <path d={icon.path} />
    </svg>
  )
}
