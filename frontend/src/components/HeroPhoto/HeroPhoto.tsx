import { useState } from 'react'
import styles from './HeroPhoto.module.css'

// Same size as the code panel, so the wipe swaps one for the other.
const WIDTH = 240
const HEIGHT = 156
// Shown in the code instead of the alt text, to read like code; the real alt stays descriptive.
const SHOWN_ALT = 'homepage_portfolio.webp'

/**
 * The home photo. Hovering it (or tapping, on touch screens) wipes in the real HTML of the image
 * from the left, over the photo. The code is decorative: screen readers only get the real alt
 * text, never the file-like one shown in the code.
 */
export function HeroPhoto({ src, alt }: { src: string; alt: string }) {
  const [showCode, setShowCode] = useState(false)
  // The version in the address is noise for a reader: shown shortened.
  const shownSrc = src.replace(/\?v=.*$/, '?v=…')

  return (
    // A tap toggles the code where nothing can hover (touch screens). With a mouse, a click must
    // not pin it: hovering alone shows it, and it hides when the pointer leaves.
    <figure
      className={styles.photo}
      data-code={showCode || undefined}
      onClick={() => {
        if (!window.matchMedia?.('(hover: hover)').matches) setShowCode((shown) => !shown)
      }}
    >
      <img src={src} alt={alt} width={WIDTH} height={HEIGHT} />
      <pre className={styles.code} aria-hidden="true">
        <code>
          <span className={styles.tag}>{'<img'}</span>
          {'\n  '}
          <span className={styles.attribute}>src</span>=
          <span className={styles.value}>"{shownSrc}"</span>
          {'\n  '}
          <span className={styles.attribute}>alt</span>=
          <span className={styles.value}>"{SHOWN_ALT}"</span>
          {'\n  '}
          <span className={styles.attribute}>width</span>=
          <span className={styles.value}>"{WIDTH}"</span>
          {'\n  '}
          <span className={styles.attribute}>height</span>=
          <span className={styles.value}>"{HEIGHT}"</span>
          {'\n'}
          <span className={styles.tag}>{'/>'}</span>
        </code>
      </pre>
    </figure>
  )
}
