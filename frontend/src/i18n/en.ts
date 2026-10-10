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
  'admin.title': 'Administration',
  'admin.backToSite': 'Back to the site',
  'admin.loading': 'Loading…',
  'admin.error': 'Something went wrong. Please try again.',
  'admin.login.title': 'Sign in',
  'admin.login.username': 'Username',
  'admin.login.password': 'Password',
  'admin.login.submit': 'Sign in',
  'admin.login.invalid': 'Wrong username or password.',
  'admin.login.blocked': 'Too many attempts. Try again in 15 minutes.',
  'admin.connectedAs': 'Signed in as',
  'admin.logout': 'Sign out',
  'admin.logoutError':
    'Sign-out failed: you are still signed in. Check your connection and try again.',
  'notFound.title': 'Page not found',
  'notFound.back': 'Back to home',
}

export type TranslationKey = keyof typeof en
