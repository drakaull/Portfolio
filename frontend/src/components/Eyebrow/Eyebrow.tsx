import type { ReactNode } from 'react'
import styles from './Eyebrow.module.css'

/** Small monospace line above a title, e.g. "~/portfolio/competences". */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className={styles.eyebrow}>{children}</p>
}
