# Implementation Plan: Feature 8 — Experience (public)

Spec: [08-experience-public.md](../specs/08-experience-public.md) · Task list: [todo.md](todo.md) · Branch: `feature/experience-public`

## Overview

`experiences` table seeded with the 7 entries from the CV, public list/detail API, timeline carousel page, detail page and a "Recent path" column on the home page.

## Architecture Decisions

- **Same layering as the home content**: domain `Experience` dataclass, ORM model, repository converting between them, public routes localizing with `localize()`.
- **Ordering in SQL** (`start_year desc, end_year desc nulls first, id desc`), so every consumer (timeline, home, later admin) gets the same order.
- **Carousel = CSS scroll snap on a scrollable list**: native touch/trackpad/keyboard behaviour; the previous/next buttons call `scrollBy` by one card width; their visibility follows the scroll position. No wheel interception.
- **One fetch hook per resource** (`useExperiences(lang)`, `useExperience(slug, lang)`), following `useHomeContent` (abort on language change, stale-result guard).
- **Home column reuses the list endpoint** (first 3 items) — no extra endpoint.
- **Year formatting in one helper** (`formatYears(start, end, t)`) shared by cards, detail page and home.

## Task List

### Phase 1: Backend
- [x] Task 1: Experience entity, table, seed migration and repository
- [x] Task 2: Public list and detail endpoints

### Checkpoint A: after Tasks 1–2
- [x] ruff + pytest green; migration round trip green
- [ ] Human: `/api/experiences?lang=fr` lists the 7 entries in the right order; a detail URL works

### Phase 2: Frontend
- [x] Task 3: Timeline page with carousel
- [x] Task 4: Experience detail page
- [x] Task 5: "Recent path" column on the home page

### Checkpoint B: complete
- [ ] Human browser check of the 5 spec success criteria
- [ ] Code review (`/review`)
- [ ] Merge into `develop` after approval

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Carousel unusable with keyboard or on mobile | High | Native scrolling + focusable card links (`scrollIntoView` via focus), buttons with labels; screenshots at 390 px |
| Buttons' visibility out of sync after resize | Low | Recompute on `scroll` and `resize` |
| Same-year entries in a random order | Low | `id desc` as final tie-breaker; tested |
| Seed text needs edits before feature 9 | Low | Léonard can still edit through the API in `/docs` meanwhile; editor comes next |

## Open Questions

None.
