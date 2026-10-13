/** WCAG relative luminance of a "RRGGBB" colour. */
function luminance(hex: string): number {
  const [r, g, b] = [0, 2, 4].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio between two "RRGGBB" colours, from 1 to 21. */
export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

/** `hex`, darkened (light background) or lightened (dark one) just enough to reach `minimum`. */
export function readableOn(hex: string, background: string, minimum: number): string {
  const towards = luminance(background) > 0.5 ? 0 : 255
  for (let step = 0; step <= 20; step++) {
    const mixed = [0, 2, 4]
      .map((start) => {
        const channel = parseInt(hex.slice(start, start + 2), 16)
        return Math.round(channel + ((towards - channel) * step) / 20)
          .toString(16)
          .padStart(2, '0')
      })
      .join('')
    if (contrast(mixed, background) >= minimum) return mixed
  }
  return towards === 0 ? '000000' : 'ffffff'
}
