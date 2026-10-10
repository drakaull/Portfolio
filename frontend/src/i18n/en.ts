// Source of truth for translation keys: fr.ts must define every key below.
export const en = {
  'site.name': 'Léonard Fontaine',
  'nav.label': 'Main',
  'nav.skip': 'Skip to content',
  'nav.menu': 'Menu',
  'theme.dark': 'Dark mode',
  'home.loading': 'Loading…',
  'home.error': 'This content could not be loaded. Please try again later.',
  'home.cv': 'View my CV',
  'home.newTab': 'opens in a new tab',
  'experience.title': 'Experience',
  'skills.title': 'Skills',
  'projects.title': 'Projects',
  'contact.title': 'Contact',
  'notFound.title': 'Page not found',
  'notFound.back': 'Back to home',
}

export type TranslationKey = keyof typeof en
