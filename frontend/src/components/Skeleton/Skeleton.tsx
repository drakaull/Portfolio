import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import styles from './Skeleton.module.css'

/** Under this, loading is too short to show anything: a skeleton would only flash. */
const SHOW_AFTER_MS = 300

/**
 * While a page loads: a status for screen readers at once, and the shape of the content (the
 * skeleton, `children`) once loading lasts more than SHOW_AFTER_MS. Mount it only while loading.
 */
export function Loading({
  label,
  className,
  children,
}: {
  label?: string // omitted when another Loading on the page already announces it
  className?: string // the page's own layout (grid, gaps), so the shape matches the content
  children: ReactNode
}) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setShown(true), SHOW_AFTER_MS)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      {label && (
        <p role="status" className="visually-hidden">
          {label}
        </p>
      )}
      {shown && (
        <div className={[styles.skeleton, className].filter(Boolean).join(' ')} aria-hidden="true">
          {children}
        </div>
      )}
    </>
  )
}

/** One placeholder block: a line of text by default. */
export function Bone({
  width = '100%',
  height = '1em',
  round = false,
  radius,
}: {
  width?: string
  height?: string
  round?: boolean
  radius?: string // to match the corners of what it stands for
}) {
  const style: CSSProperties = { width, height, borderRadius: radius }
  return <span className={round ? `${styles.bone} ${styles.round}` : styles.bone} style={style} />
}

/** A card-shaped frame for bones, like the site's cards. */
export function BoneCard({ children }: { children: ReactNode }) {
  return <div className={styles.card}>{children}</div>
}

/** Bones side by side, vertically centred (e.g. an icon and its label). */
export function BoneRow({ children }: { children: ReactNode }) {
  return <span className={styles.row}>{children}</span>
}
