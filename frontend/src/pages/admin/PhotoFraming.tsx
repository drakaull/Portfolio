import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { PhotoFocus } from '../../api/useHomeContent.ts'
import { useTranslation } from '../../i18n/useTranslation.ts'
import { HERO_PHOTO_HEIGHT, HERO_PHOTO_WIDTH } from '../../lib/heroPhoto.ts'
import styles from './PhotoFraming.module.css'

const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)))

/**
 * Chooses which part of the photo the home page frame keeps (CSS object-position). The frame is
 * what object-fit: cover keeps of the photo, so it only moves along the axis where the photo is
 * larger: it is a one-axis slider for the keyboard and screen readers.
 */
export function PhotoFraming({
  src,
  focus,
  onChange,
}: {
  src: string
  focus: PhotoFocus
  onChange: (focus: PhotoFocus) => void
}) {
  const { t } = useTranslation()
  // Width / height of the photo, known once it has loaded.
  const [ratio, setRatio] = useState<number | null>(null)

  const frameRatio = HERO_PHOTO_WIDTH / HERO_PHOTO_HEIGHT
  // The frame's size, as a share (0–1) of the photo's width and height.
  const frameWidth = ratio === null ? 1 : Math.min(1, frameRatio / ratio)
  const frameHeight = ratio === null ? 1 : Math.min(1, ratio / frameRatio)
  const axis = frameWidth < 1 ? 'x' : frameHeight < 1 ? 'y' : null

  // Same rule as object-position: at p %, the frame's start is at p % of the free space.
  const left = (focus.x / 100) * (1 - frameWidth) * 100
  const top = (focus.y / 100) * (1 - frameHeight) * 100

  function move(value: number) {
    if (axis) onChange({ ...focus, [axis]: clamp(value) })
  }

  // The frame follows the pointer, centred on it, from the first press.
  function follow(event: PointerEvent<HTMLDivElement>) {
    if (!axis) return
    const box = event.currentTarget.getBoundingClientRect()
    const [position, length, size] =
      axis === 'x'
        ? [(event.clientX - box.left) / box.width, box.width, frameWidth]
        : [(event.clientY - box.top) / box.height, box.height, frameHeight]
    if (length === 0) return
    move(((position - size / 2) / (1 - size)) * 100)
  }

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    const current = axis === 'x' ? focus.x : focus.y
    const step = event.shiftKey ? 10 : 1
    const next: Record<string, number> = {
      ArrowLeft: current - step,
      ArrowUp: current - step,
      ArrowRight: current + step,
      ArrowDown: current + step,
      Home: 0,
      End: 100,
    }
    if (!(event.key in next)) return
    event.preventDefault() // arrows must not scroll the page
    move(next[event.key])
  }

  return (
    <div className={styles.framing}>
      <div
        className={styles.stage}
        data-axis={axis ?? undefined}
        onPointerDown={(event) => {
          if (event.button !== 0) return // a right or middle click must not move the frame
          event.currentTarget.setPointerCapture(event.pointerId)
          follow(event)
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) follow(event)
        }}
      >
        <img
          src={src}
          alt={t('admin.photo.preview')}
          draggable={false}
          onLoad={(event) => {
            const image = event.currentTarget
            if (image.naturalHeight > 0) setRatio(image.naturalWidth / image.naturalHeight)
          }}
        />
        {ratio !== null && (
          <div
            className={styles.frame}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${frameWidth * 100}%`,
              height: `${frameHeight * 100}%`,
            }}
            {...(axis && {
              role: 'slider',
              tabIndex: 0,
              'aria-label': t('admin.photo.framing'),
              'aria-orientation': axis === 'x' ? 'horizontal' : 'vertical',
              'aria-valuemin': 0,
              'aria-valuemax': 100,
              'aria-valuenow': focus[axis],
              'aria-valuetext': `${focus[axis]} %`,
              'aria-describedby': 'photo-framing-hint',
              onKeyDown: handleKey,
            })}
          />
        )}
      </div>
      <div className={styles.result}>
        <span className={styles.label}>{t('admin.photo.framingResult')}</span>
        <img
          src={src}
          alt=""
          width={HERO_PHOTO_WIDTH}
          height={HERO_PHOTO_HEIGHT}
          style={{ objectPosition: `${focus.x}% ${focus.y}%` }}
        />
      </div>
      <p id="photo-framing-hint" className={styles.hint}>
        {ratio !== null &&
          (axis ? t('admin.photo.framingHint') : t('admin.photo.framingNotNeeded'))}
      </p>
    </div>
  )
}
