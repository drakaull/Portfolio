export const SLUG_MAX_LENGTH = 80

// Combining accents left by NFD normalisation ("é" -> "e" + U+0301).
const ACCENTS = new RegExp('[\\u0300-\\u036f]', 'g')

/** "Ingénieur R&D", "I-care Group" -> "ingenieur-r-d-i-care-group" (the server's a-z0-9- format). */
export function slugify(...parts: string[]): string {
  return parts
    .join(' ')
    .normalize('NFD')
    .replace(ACCENTS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/^-+|-+$/g, '')
}
