# Tasks: Feature 1 — Site shell

Each task: implement → `npm run lint && npm run format:check && npm test && npm run build` (from `frontend/`) → one commit.

## Task 1: Design tokens, self-hosted font and theme bootstrap

**Description:** Add the global stylesheet with light/dark color tokens and the Google Sans font, and apply the stored or OS theme before React renders.

**Acceptance criteria:**
- [ ] `global.css` defines the spec tokens for light (default) and dark (`[data-theme="dark"]`), and the body uses them
- [ ] Inline script in `index.html` sets `data-theme` from `localStorage`, else from `prefers-color-scheme`
- [ ] Google Sans loads from the site's own origin

**Verification:**
- [ ] Build passes; built CSS references a bundled `.woff2`, no Google URL
- [ ] Manual: page background is cream in light OS mode, warm black in dark OS mode

**Dependencies:** None
**Files:** `package.json`, `src/styles/global.css`, `index.html`, `src/main.tsx`
**Scope:** S

## Task 2: Localized routing with home and 404 pages

**Description:** Install `react-router`, add the translation dictionaries and `useTranslation`, and wire the route table: `/` redirect, `/:lang` home, 404 fallback. Keep `<html lang>` in sync with the URL.

**Acceptance criteria:**
- [ ] `/` redirects to `/fr` when the browser language starts with `fr`, else to `/en`
- [ ] `/en` and `/fr` show the home title in the right language; `<html lang>` matches
- [ ] Unknown language or path shows the 404 page

**Verification:**
- [ ] Tests: redirect (fr and other), home in both languages, 404 for `/de` and `/en/nope`
- [ ] Build passes (also proves `fr.ts` has every key)

**Dependencies:** Task 1
**Files:** `package.json`, `src/App.tsx`, `src/App.test.tsx`, `src/main.tsx`, `src/i18n/en.ts`, `src/i18n/fr.ts`, `src/i18n/useTranslation.ts`, `src/pages/HomePage.tsx`, `src/pages/NotFoundPage.tsx`
**Scope:** M (several files are a few lines each)

## Task 3: Empty section pages

**Description:** Add Experience, Skills, Projects and Contact pages, each rendering only its translated title, and register their routes.

**Acceptance criteria:**
- [ ] `/:lang/experience`, `/skills`, `/projects`, `/contact` render their translated `<h1>`
- [ ] Each page sets a translated `document.title`

**Verification:**
- [ ] Tests: each route in both languages renders the expected heading

**Dependencies:** Task 2
**Files:** `src/pages/*Page.tsx` (4), `src/App.tsx`, `src/App.test.tsx`, `src/i18n/*.ts`
**Scope:** S

## Checkpoint A
- [ ] All checks pass · every spec route renders · human browser check

## Task 4: Fixed navbar with active link

**Description:** Add a `Layout` (navbar + `<main>`) used by all localized routes, with the name linking home and the four section links.

**Acceptance criteria:**
- [ ] Navbar stays at the top while scrolling; content is not hidden under it
- [ ] Current section link has `aria-current="page"` and the accent style
- [ ] A "Skip to content" link is the first focusable element

**Verification:**
- [ ] Tests: links point to `/:lang/<section>`; active link has `aria-current`
- [ ] Manual: scroll a tall page, navbar remains visible

**Dependencies:** Task 3
**Files:** `src/components/Layout/*`, `src/components/Navbar/*`, `src/App.tsx`, `src/i18n/*.ts`
**Scope:** M

## Task 5: Language switch

**Description:** Add a FR/EN control in the navbar that navigates to the same page in the other language.

**Acceptance criteria:**
- [ ] `/fr/skills` → `/en/skills` and back; all UI text changes
- [ ] Control is a link with an accessible label (e.g. "Lire en français")

**Verification:**
- [ ] Tests: switching from a section page keeps the section

**Dependencies:** Task 4
**Files:** `src/components/LanguageSwitch/*`, `src/components/Navbar/Navbar.tsx`, `src/i18n/*.ts`
**Scope:** S

## Task 6: Theme toggle

**Description:** Add `useTheme` and a toggle button in the navbar that switches light/dark and stores the choice.

**Acceptance criteria:**
- [ ] Clicking toggles `<html data-theme>` and writes `localStorage`
- [ ] Button has an accessible name describing the action and reflects state (`aria-pressed`)
- [ ] Reload keeps the choice with no flash (uses Task 1 bootstrap)

**Verification:**
- [ ] Tests: toggle updates attribute and storage; initial state reads stored value
- [ ] Manual: reload in each theme

**Dependencies:** Task 4
**Files:** `src/theme/useTheme.ts`, `src/theme/useTheme.test.ts`, `src/components/ThemeToggle/*`, `src/components/Navbar/Navbar.tsx`, `src/i18n/*.ts`
**Scope:** M

## Checkpoint B
- [ ] All checks pass · human check of language + theme across pages and reloads

## Task 7: Mobile menu below 768 px

**Description:** Collapse section links into a menu button on narrow screens.

**Acceptance criteria:**
- [ ] Below 768 px, links are hidden behind a button with `aria-expanded` / `aria-controls`
- [ ] Menu opens/closes with keyboard, closes on Escape and after choosing a link

**Verification:**
- [ ] Tests: button toggles `aria-expanded`; Escape and link click close it
- [ ] Manual: browser devtools at 375 px width

**Dependencies:** Task 4
**Files:** `src/components/Navbar/*`, `src/i18n/*.ts`
**Scope:** S

## Checkpoint C
- [ ] All 8 spec success criteria verified · `/review` · merge into `develop` after approval
