/** "2026", "2023 – 2026", or "2024 – Present" while ongoing. */
export function formatYears(start: number, end: number | null, presentLabel: string): string {
  if (end === null) return `${start} – ${presentLabel}`
  return start === end ? `${start}` : `${start} – ${end}`
}
