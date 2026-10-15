# Tasks: Feature 6 — Visual direction

Each task: implement → `npm run lint && npm run format:check && npm test && npm run build` (from `frontend/`) → Playwright screenshots (light/dark, 1280/390 px) reviewed → one commit.

## Task 1: Tokens, fonts, graph-paper background, global motion rules

**Description:** Add the two font packages, the token groups from the spec, the graph-paper background, `scroll-behavior: smooth` and the global reduced-motion rule.

**Acceptance criteria:**
- [ ] `--font-display`, `--font-mono`, type/space/radius/motion scales and `--color-grid` defined for both themes
- [ ] Background shows a faint grid in both themes; text contrast unchanged (AA)
- [ ] Reduced motion disables all animations and transitions

**Verification:** test asserting the reduced-motion rule; build (fonts bundled, no Google URL); screenshots
**Dependencies:** None
**Files:** `frontend/package.json`, `src/main.tsx`, `src/styles/global.css`, `src/styles/global.test.ts`
**Scope:** S

## Task 2: Building blocks

**Description:** `Eyebrow`, `Button`, `TextLink` (internal and external), `Badge`, `Reveal` with CSS Modules and tests.

**Acceptance criteria:**
- [ ] Each block renders semantic HTML and forwards its props (`href`, `onClick`, `type`, `disabled`…)
- [ ] External `TextLink` opens in a new tab with `rel="noopener noreferrer"` and a hidden "opens in a new tab" text
- [ ] `Reveal` staggers its children and leaves them visible at rest

**Verification:** component tests
**Dependencies:** Task 1
**Files:** `src/components/{Eyebrow,Button,TextLink,Badge,Reveal}/*`
**Scope:** M

## Task 3: Navbar, footer and favicon

**Description:** Brand in Bricolage, sliding underline on section links, minimal footer (© year + name, LinkedIn, GitHub), SVG favicon "LF".

**Acceptance criteria:**
- [ ] Existing navbar behaviour and tests unchanged (active link, mobile menu, language and theme switches)
- [ ] Footer on every public page, links from the home content API (fallback: hidden if not loaded)
- [ ] Favicon shown in the browser tab

**Verification:** tests + screenshots
**Dependencies:** Task 2
**Files:** `src/components/Navbar/*`, `src/components/Footer/*`, `src/components/Layout/*`, `public/favicon.svg`, `index.html`, `src/i18n/*.ts`
**Scope:** M

## Checkpoint A
- [ ] Checks green · screenshots reviewed · human browser check

## Task 4: Home, section pages and 404

**Description:** Home hero with eyebrow, Bricolage name, `Button` + `TextLink`s and `Reveal`; path eyebrows on section pages; 404 restyled.

**Acceptance criteria:**
- [ ] Home matches the spec in both languages and themes; right column empty
- [ ] Each section page shows its localized path eyebrow
- [ ] Existing home tests (content, errors, stale responses, links) still pass

**Verification:** tests + screenshots
**Dependencies:** Task 3
**Files:** `src/pages/HomePage.tsx`, `src/pages/HomePage.module.css`, `src/pages/*Page.tsx`, `src/pages/NotFoundPage.tsx`, `src/i18n/*.ts`, `src/App.test.tsx`
**Scope:** M

## Task 5: Admin restyle and route transition

**Description:** Admin uses the new blocks and tokens; header border full width; public page content fades in on navigation.

**Acceptance criteria:**
- [ ] Admin pages consistent with the public site; all admin tests unchanged
- [ ] Route change fades the content in (not the navbar); nothing moves with reduced motion

**Verification:** tests + screenshots of login, dashboard and editor
**Dependencies:** Task 4
**Files:** `src/components/AdminLayout/*`, `src/pages/admin/*.module.css`, `src/pages/admin/*.tsx` (buttons), `src/components/Layout/*`
**Scope:** M

## Checkpoint B
- [ ] Human browser check · `/review` · merge into `develop` after approval
