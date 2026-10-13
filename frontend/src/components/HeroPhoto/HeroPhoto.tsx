import { useState } from 'react'
import styles from './HeroPhoto.module.css'

const SIZE = 168

/**
 * The home photo. Hovering it (or tapping, on touch screens) wipes in the real HTML of the image
 * from the right. The code is decorative: screen readers only get the alt text.
 */
export function HeroPhoto({ src, alt }: { src: string; alt: string }) {
  const [showCode, setShowCode] = useState(false)
  // The version in the address is noise for a reader: shown shortened.
  const shownSrc = src.replace(/\?v=.*$/, '?v=…')

  return (
    // A tap toggles the code where there is no hover; with a mouse, hovering is enough.
    <figure
      className={styles.photo}
      data-code={showCode || undefined}
      onClick={() => setShowCode((shown) => !shown)}
    >
      <img src={src} alt={alt} width={SIZE} height={SIZE} />
      <pre className={styles.code} aria-hidden="true">
        <code>
          <span className={styles.tag}>{'<img'}</span>
          {'\n  '}
          <span className={styles.attribute}>src</span>=
          <span className={styles.value}>"{shownSrc}"</span>
          {'\n  '}
          <span className={styles.attribute}>alt</span>=
          <span className={styles.value}>"{alt}"</span>
          {'\n  '}
          <span className={styles.attribute}>width</span>=
          <span className={styles.value}>"{SIZE}"</span>
          {'\n  '}
          <span className={styles.attribute}>height</span>=
          <span className={styles.value}>"{SIZE}"</span>
          {'\n'}
          <span className={styles.tag}>{'/>'}</span>
        </code>
      </pre>
    </figure>
  )
}
