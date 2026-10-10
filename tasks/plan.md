# Implementation Plan: Feature 6 — Visual direction

Spec: [06-visual-direction.md](../specs/06-visual-direction.md) · Task list: [todo.md](todo.md) · Branch: `feature/visual-direction`

## Overview

Direction A ("Papier quadrillé") applied site-wide: refined tokens, graph-paper background, Bricolage Grotesque for the name, JetBrains Mono for labels and dates, reusable blocks (Eyebrow, Button, TextLink, Badge, Reveal), CSS-only motion, favicon and footer, then a restyle of every existing page.

## Architecture Decisions

- **Tokens first, components second**: every visual value lives in `global.css` custom properties; blocks only reference tokens, so a later redesign stays a token change.
- **Motion in CSS only** (transitions + keyframes on `transform`/`opacity`), one global `prefers-reduced-motion` rule that disables animations and transitions everywhere.
- **`Reveal`** sets a `--reveal-index` per child via inline style; the stagger delay is computed in CSS. Content is visible at rest (animation `both` from a visible end state), never stuck hidden.
- **Route fade-in** keyed on the pathname in the public `Layout` so only the page content animates, not the navbar.
- **Path eyebrows come from the dictionaries** (`eyebrow.home`, `eyebrow.experience`…), so translations stay in one place.
- **Visual verification is part of each task**: Playwright screenshots (light/dark, 1280/390 px) reviewed before committing.

## Task List

### Phase 1: Foundation
- [x] Task 1: Tokens, fonts, graph-paper background, global motion rules
- [x] Task 2: Building blocks (Eyebrow, Button, TextLink, Badge, Reveal)
- [ ] Task 3: Navbar, footer and favicon

### Checkpoint A: after Tasks 1–3
- [ ] All frontend checks green; Playwright screenshots reviewed
- [ ] Human check in the browser: background, navbar, footer, favicon, both themes

### Phase 2: Pages
- [ ] Task 4: Home, section pages and 404
- [ ] Task 5: Admin restyle and route transition

### Checkpoint B: complete
- [ ] Human browser check of the 5 spec success criteria
- [ ] Code review (`/review`) — no security-sensitive change, so no security audit
- [ ] Merge into `develop` after approval

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Graph-paper texture hurts readability | Med | Very low contrast lines (`--color-grid`), checked in both themes on screenshots |
| Entrance animations hide content if JS/CSS fails | Med | Keyframes end at the visible state; no element starts hidden outside the animation |
| Three font families slow the first paint | Low | Variable fonts, Latin subsets only by `unicode-range`; Bricolage used for one element; measured in build output |
| Restyle breaks existing tests (text/role queries) | Low | Behaviour and accessible names unchanged; full suite after each task |
| Contrast regressions in dark mode | Med | Re-check AA ratios for any changed color; screenshots in dark mode |

## Open Questions

None.
