import { useCallback, useEffect, useRef, useState } from 'react'
import type { Experience } from '../../api/experiences.ts'
import { useTranslation } from '../../i18n/useTranslation.ts'
import { ExperienceCard } from '../ExperienceCard/ExperienceCard.tsx'
import styles from './Timeline.module.css'

/**
 * Horizontal carousel built on native scrolling with scroll snap: touch, trackpad, Shift + wheel
 * and Tab (focusing a card scrolls it into view) work out of the box. The mouse wheel is left
 * alone so it keeps scrolling the page.
 */
export function Timeline({ entries }: { entries: Experience[] }) {
  const { t } = useTranslation()
  const track = useRef<HTMLOListElement>(null)
  const [canScroll, setCanScroll] = useState({ previous: false, next: false })

  const update = useCallback(() => {
    const element = track.current
    if (!element) return
    const end = element.scrollWidth - element.clientWidth
    // 1px tolerance: browsers report fractional scroll positions.
    setCanScroll({ previous: element.scrollLeft > 1, next: element.scrollLeft < end - 1 })
  }, [])

  useEffect(() => {
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [update, entries])

  function scroll(direction: 1 | -1) {
    const element = track.current
    if (!element) return
    const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    element.scrollBy({
      left: direction * element.clientWidth * 0.8,
      behavior: smooth ? 'smooth' : 'auto',
    })
  }

  return (
    <div className={styles.timeline}>
      <ol
        ref={track}
        className={styles.track}
        aria-label={t('experience.timeline')}
        onScroll={update}
      >
        {entries.map((entry) => (
          <li key={entry.slug} className={styles.item}>
            <span className={styles.dot} aria-hidden="true" />
            <ExperienceCard entry={entry} />
          </li>
        ))}
      </ol>
      <div className={styles.controls}>
        {canScroll.previous && (
          <button type="button" className={styles.control} onClick={() => scroll(-1)}>
            <span aria-hidden="true">←</span> {t('experience.previous')}
          </button>
        )}
        {canScroll.next && (
          <button type="button" className={styles.control} onClick={() => scroll(1)}>
            {t('experience.next')} <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
    </div>
  )
}
