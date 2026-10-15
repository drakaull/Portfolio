import type { ReactNode } from 'react'
import styles from './Badge.module.css'

/** Small monospace label, e.g. "Stage" or "Formation". */
export function Badge({ children }: { children: ReactNode }) {
  return <span className={styles.badge}>{children}</span>
}
