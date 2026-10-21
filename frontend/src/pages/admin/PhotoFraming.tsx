import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { PhotoFocus } from '../../api/useHomeContent.ts'
import type { TranslationKey } from '../../i18n/en.ts'
import { useTranslation } from '../../i18n/useTranslation.ts'
import { HERO_PHOTO_HEIGHT, HERO_PHOTO_WIDTH } from '../../lib/heroPhoto.ts'
import styles from './PhotoFraming.module.css'

const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)))

/** The texts of one framing tool. */
export type FramingTexts = {
  label: TranslationKey // the frame, for screen readers
  preview: TranslationKey // alt text of the whole image
  result: TranslationKey // above the preview of the site
  hint: TranslationKey
  notNeeded: TranslationKey
}

const PHOTO_TEXTS: FramingTexts = {
  label: 'admin.photo.framing',
  preview: 'admin.photo.preview',
  result: 'admin.photo.framingResult',
  hint: 'admin.photo.framingHint',
  notNeeded: 'admin.photo.framingNotNeeded',
}

/**
 * Chooses which part of the photo the home page frame keeps (CSS object-position). The frame is
 * what object-fit: cover keeps of the photo, so it only moves along the axis where the photo is
 * larger: it is a one-axis slider for the keyboard and screen readers.
 */
export function PhotoFraming({
  src,
  focus,
  onChange,
  width = HERO_PHOTO_WIDTH,
  height = HERO_PHOTO_HEIGHT,
  texts = PHOTO_TEXTS,
}: {
  src: string
  focus: PhotoFocus
  onChange: (focus: PhotoFocus) => void
  width?: number // the frame on the site, in px: its shape, and the size of the preview
  height?: number
  texts?: FramingTexts
}) {
  const { t } = useTranslation()
  const hintId = useId()
  // Width / height of the photo, known once it has loaded.
  const [ratio, setRatio] = useState<number | null>(null)

  const frameRatio = width / height
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

  // Where the frame was grabbed, as a share of the photo from the frame's start.
  const grab = useRef(0)

  /** The pointer along the moving axis, as a share (0–1) of the photo; null if unmeasurable. */
  function pointerAt(event: PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect()
    const [offset, length] =
      axis === 'x' ? [event.clientX - box.left, box.width] : [event.clientY - box.top, box.height]
    return length > 0 ? offset / length : null
  }

  // Pressed on the frame, it keeps that point under the pointer (no jump); pressed elsewhere on
  // the photo, it comes there, centred.
  function press(event: PointerEvent<HTMLDivElement>) {
    const position = pointerAt(event)
    if (!axis || position === null) return
    const [start, size] = axis === 'x' ? [left / 100, frameWidth] : [top / 100, frameHeight]
    grab.current = position >= start && position <= start + size ? position - start : size / 2
    follow(event)
  }

  function follow(event: PointerEvent<HTMLDivElement>) {
    const position = pointerAt(event)
    if (!axis || position === null) return
    const size = axis === 'x' ? frameWidth : frameHeight
    move(((position - grab.current) / (1 - size)) * 100)
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
          press(event)
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) follow(event)
        }}
      >
        <img
          src={src}
          alt={t(texts.preview)}
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
              'aria-label': t(texts.label),
              'aria-orientation': axis === 'x' ? 'horizontal' : 'vertical',
              'aria-valuemin': 0,
              'aria-valuemax': 100,
              'aria-valuenow': focus[axis],
              'aria-valuetext': `${focus[axis]} %`,
              'aria-describedby': hintId,
              onKeyDown: handleKey,
            })}
          />
        )}
      </div>
      <div className={styles.result}>
        <span className={styles.label}>{t(texts.result)}</span>
        <img
          src={src}
          alt=""
          width={width}
          height={height}
          // The frame's shape: height: auto would follow the image's own.
          style={{ aspectRatio: `${width} / ${height}`, objectPosition: `${focus.x}% ${focus.y}%` }}
        />
      </div>
      <p id={hintId} className={styles.hint}>
        {ratio !== null && t(axis ? texts.hint : texts.notNeeded)}
      </p>
    </div>
  )
}
