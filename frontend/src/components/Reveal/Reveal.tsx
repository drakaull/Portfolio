import type { ReactNode } from 'react'
import styles from './Reveal.module.css'

/**
 * Its direct children fade and rise in one after another. No wrapper is added around them, so the
 * container's own layout (grid, flex) is untouched; pass that layout through `className`.
 */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={[styles.reveal, className].filter(Boolean).join(' ')}>{children}</div>
}
