# Spec: Feature 1 — Site shell

Status: **APPROVED**

## Objective

Build the frame every page of the portfolio lives in, before any real content exists.

Visitors (mainly recruiters) must be able to:
- reach each section on its own page and share a direct link to it;
- read the site in French or English, the language being part of the URL;
- switch between a light (cream) and a dark theme, the choice being remembered;
- always see the navigation bar, even when scrolling.

Out of scope (later features): section content, experience detail page, admin, contact form, legal page, SEO meta tags, favicon.

## Assumptions

1. Routes use English slugs in both languages: `/fr/experience` and `/en/experience` (not `/fr/experiences-professionnelles`).
2. `/` redirects to `/fr` or `/en` based on the browser language (`fr*` → `fr`, anything else → `en`). English is the default. *(confirmed)*
3. An unknown language (`/de/skills`) or path shows the 404 page.
4. Theme defaults to the OS setting (`prefers-color-scheme`); an explicit choice is stored in `localStorage`. This is a user-requested preference, so no consent banner is needed.
5. Below 768 px wide, the nav links collapse into a menu button.
6. The navbar shows the full name "Léonard Fontaine" on the left *(confirmed, may change later)* (link to home), section links, then the language and theme switches.
7. The font is self-hosted (bundled from npm), never loaded from Google servers (GDPR).

## Tech Stack

| Concern | Choice | Status |
|---|---|---|
| Routing | `react-router` v8 (declarative mode) | new dependency |
| Font | `@fontsource-variable/google-sans` (OFL-1.1) | new dependency |
| UI translations | typed dictionaries + `useTranslation` hook, no library | no dependency |
| Theme | CSS custom properties on `<html data-theme>` | no dependency |
| Styling | CSS Modules + one global stylesheet for tokens | existing |
| Tests | Vitest + Testing Library | existing |

## Routes

| Path | Page |
|---|---|
| `/` | redirect to `/fr` or `/en` |
| `/:lang` | Home |
| `/:lang/experience` | Experience |
| `/:lang/skills` | Skills |
| `/:lang/projects` | Projects |
| `/:lang/contact` | Contact |
| anything else | 404 (in the URL language when valid, else English) |

`lang` ∈ `fr`, `en`. Switching language keeps the current page (`/fr/skills` → `/en/skills`).

## Commands

Run from `frontend/`:

```
Dev:          npm run dev
Test:         npm test
Lint:         npm run lint
Format:       npm run format
Format check: npm run format:check
Build:        npm run build
```

## Project Structure

```
frontend/src/
├── main.tsx                 entry: router + global styles
├── App.tsx                  route table
├── styles/global.css        design tokens (colors, font, spacing), light + dark
├── i18n/
│   ├── en.ts                UI strings (source of truth for keys)
│   ├── fr.ts                same keys, typed against en.ts
│   └── useTranslation.ts    reads lang from the URL, returns t()
├── theme/useTheme.ts        current theme, toggle, persistence
├── components/
│   ├── Layout/              navbar + <main> outlet
│   ├── Navbar/              links, mobile menu button
│   ├── LanguageSwitch/
│   └── ThemeToggle/
└── pages/                   HomePage, ExperiencePage, SkillsPage, ProjectsPage, ContactPage, NotFoundPage
```

Each component folder holds `Component.tsx`, `Component.module.css` and `Component.test.tsx` when it has logic.

## Code Style

```tsx
import { NavLink } from 'react-router'
import { useTranslation } from '../../i18n/useTranslation.ts'
import styles from './Navbar.module.css'

const SECTIONS = ['experience', 'skills', 'projects', 'contact'] as const

export function Navbar() {
  const { t, lang } = useTranslation()

  return (
    <nav className={styles.nav} aria-label={t('nav.label')}>
      {SECTIONS.map((section) => (
        <NavLink key={section} to={`/${lang}/${section}`} className={styles.link}>
          {t(`nav.${section}`)}
        </NavLink>
      ))}
    </nav>
  )
}
```

- English everywhere in code; comments only for non-obvious "why".
- Named exports for components, one component per folder, PascalCase.
- Prettier config of the repo (no semicolons, single quotes, width 100).
- No hard-coded colors in components: only CSS variables from `global.css`.

## Design Tokens (proposal)

| Token | Light | Dark |
|---|---|---|
| `--color-bg` | `#FAF6EE` (cream) | `#1A1917` (warm black) |
| `--color-surface` | `#F2ECDF` | `#24221F` |
| `--color-text` | `#1F1D1A` | `#EDE8DF` |
| `--color-text-muted` | `#5E5850` | `#A39C91` |
| `--color-accent` | `#A4462A` (terracotta) | `#E8A084` |
| `--color-on-accent` | `#FAF6EE` | `#1A1917` |

Text/background pairs must meet WCAG AA contrast (≥ 4.5:1).

## Testing Strategy

Vitest + Testing Library, tests next to the code. Routing tests render the real route table inside a `MemoryRouter`.

Covered behaviours:
- `/` redirects according to browser language; unknown lang or path → 404.
- Each section route renders its page title in the right language.
- Language switch keeps the current section.
- Theme toggle flips `data-theme` and persists to `localStorage`; stored value wins over OS setting.
- Active nav link is marked with `aria-current="page"`.

No coverage threshold; every behaviour above has a test.

## Boundaries

- **Always:** work on a `feature/site-shell` branch; run lint, format check, tests and build before each commit; Conventional Commits; keep all UI strings in the dictionaries; keyboard-accessible and screen-reader-labelled controls.
- **Ask first:** any dependency not listed above; changing routes or design tokens after approval; anything outside `frontend/`.
- **Never:** load fonts or scripts from third-party servers; commit secrets; merge into `main`; disable lint rules or skip tests to get green.

## Success Criteria

1. Visiting `/` lands on `/fr` or `/en` according to the browser language.
2. All five section pages and the 404 page are reachable, each with its translated title.
3. The navbar stays visible at the top while scrolling a page taller than the screen.
4. Language switch changes all UI text and the `<html lang>` attribute, keeping the current page.
5. Theme toggle switches light/dark; reloading the page keeps the choice with no flash of the wrong theme.
6. Below 768 px, links are reachable through the menu button, which works with the keyboard.
7. Google Sans is served from the site's own origin (no request to `fonts.googleapis.com` / `fonts.gstatic.com`).
8. `npm run lint`, `npm run format:check`, `npm test` and `npm run build` all pass.

## Decisions

- Translations: typed dictionaries, no library.
- Default language: English.
- Navbar brand: full name, may change later.
- Accent: terracotta for now; a redesign is likely later, so colors stay in tokens only.
