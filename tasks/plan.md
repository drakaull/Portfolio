# Implementation Plan: Feature 1 — Site shell

Spec: [SPEC.md](../SPEC.md) · Task list: [todo.md](todo.md) · Branch: `feature/site-shell`

## Overview

Turn the empty React app into the portfolio's frame: one URL per section with the language in the path, a fixed navbar, a FR/EN switch and a light/dark theme. Pages stay empty (translated title only); content comes in later features.

## Architecture Decisions

- **Language lives in the URL only** (`/:lang/...`). No React context or global store: `useTranslation()` reads `lang` from the route params, so a shared link always opens in the right language.
- **`en.ts` is the source of truth for translation keys**; `fr.ts` is typed against it, so a missing French string fails the TypeScript build.
- **Theme is applied before React loads** by a few lines of inline script in `index.html` that set `<html data-theme>`. This avoids the flash of the wrong theme on reload (success criterion 5). React then only toggles the attribute and `localStorage`.
- **All colors are CSS variables in `styles/global.css`**; components never hard-code colors, which keeps a later redesign to one file.
- **Font bundled from npm** (`@fontsource-variable/google-sans`), served from the site's own origin.

## Task List

### Phase 1: Foundation
- [x] Task 1: Design tokens, self-hosted font and theme bootstrap
- [x] Task 2: Localized routing with home and 404 pages
- [x] Task 3: Empty section pages

### Checkpoint A: after Tasks 1–3
- [x] Lint, format check, tests and build pass
- [x] Every route from the spec renders its translated title
- [x] Human check in the browser

### Phase 2: Navigation
- [x] Task 4: Fixed navbar with active link
- [x] Task 5: Language switch
- [ ] Task 6: Theme toggle

### Checkpoint B: after Tasks 4–6
- [ ] All checks pass
- [ ] Human check: switch language and theme on several pages, reload

### Phase 3: Mobile
- [ ] Task 7: Mobile menu below 768 px

### Checkpoint C: complete
- [ ] All 8 success criteria of the spec verified
- [ ] Code review (`/review`), then merge `feature/site-shell` into `develop` and push, after approval

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Flash of wrong theme on reload | Med | Inline script in `index.html` runs before the first paint (Task 1) |
| French dictionary drifts from English | Low | `fr.ts` typed as `typeof en`; build fails on a missing key |
| Fixed navbar hides the top of the page or anchor targets | Low | `<main>` gets top padding equal to the navbar height token |
| Font package changes or disappears | Low | Version pinned in `package-lock.json`; system fallback stack declared |

## Open Questions

None.
