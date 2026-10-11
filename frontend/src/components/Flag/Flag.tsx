import { useId, type ReactNode } from 'react'
import type { Lang } from '../../i18n/useTranslation.ts'
import styles from './Flag.module.css'

// 3:2 canvas shared by every flag.
const W = 30
const H = 20

function Stripes({ colors, vertical }: { colors: string[]; vertical?: boolean }) {
  return colors.map((color, index) =>
    vertical ? (
      <rect key={color} x={(index * W) / 3} width={W / 3} height={H} fill={color} />
    ) : (
      <rect key={color} y={(index * H) / 3} width={W} height={H / 3} fill={color} />
    ),
  )
}

const BELGIUM = <Stripes colors={['#000000', '#FDDA24', '#EF3340']} vertical />
const FRANCE = <Stripes colors={['#002654', '#FFFFFF', '#CE1126']} vertical />
const NETHERLANDS = <Stripes colors={['#AE1C28', '#FFFFFF', '#21468B']} />

// shortcut: the red diagonals are centred, not counterchanged; invisible at ~20 px, redraw if flags grow.
const UNITED_KINGDOM = (
  <>
    <rect width={W} height={H} fill="#012169" />
    <path d={`M0 0L${W} ${H}M${W} 0L0 ${H}`} stroke="#FFFFFF" strokeWidth={4} />
    <path d={`M0 0L${W} ${H}M${W} 0L0 ${H}`} stroke="#C8102E" strokeWidth={1.4} />
    <path d={`M${W / 2} 0V${H}M0 ${H / 2}H${W}`} stroke="#FFFFFF" strokeWidth={6.6} />
    <path d={`M${W / 2} 0V${H}M0 ${H / 2}H${W}`} stroke="#C8102E" strokeWidth={4} />
  </>
)

/** Belgium in the lower-right triangle, the other country above the top-right → bottom-left diagonal. */
function SplitWithBelgium({ country }: { country: ReactNode }) {
  const clipId = useId()
  return (
    <>
      <clipPath id={clipId}>
        <polygon points={`0,0 ${W},0 0,${H}`} />
      </clipPath>
      {BELGIUM}
      <g clipPath={`url(#${clipId})`}>{country}</g>
    </>
  )
}

const FLAGS: Record<Lang, ReactNode> = {
  en: UNITED_KINGDOM,
  fr: <SplitWithBelgium country={FRANCE} />,
  nl: <SplitWithBelgium country={NETHERLANDS} />,
}

/** Decorative flag of a site language; the language name next to it carries the meaning. */
export function Flag({ lang }: { lang: Lang }) {
  return (
    <svg className={styles.flag} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" data-lang={lang}>
      {FLAGS[lang]}
    </svg>
  )
}
