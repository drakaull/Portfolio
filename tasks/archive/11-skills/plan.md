# Implementation Plan: Feature 11 — Skills

Spec: [11-skills.md](../specs/11-skills.md) · Task list: [todo.md](todo.md) · Branch: `feature/skills`

## Overview

Skills grouped in five fixed categories, each a name + optional Simple Icons logo (stored in the database), manually ordered; public page and admin editor.

## Architecture Decisions

- **Table `skills`** (Alembic migration): `id`, `name`, `category`, `position`, `icon_slug`, `icon_hex`, `icon_path`; unique `(category, lower(name))`. Positions are per category; `move` swaps two neighbours in one transaction.
- **Domain** `Skill` + `SkillIcon` dataclasses, `SkillCategory` literal with the fixed order; the SVG path check (`^[MmLlHhVvCcSsQqTtAaZz0-9.,\s+-eE]*$`, length) lives in the API input model.
- **Public API** returns categories already grouped and ordered, so the page only renders.
- **Simple Icons** pinned to `16.32.0` (released 2026-09-20, ≥ 2 weeks old), imported with a dynamic `import()` from the admin form only → its own chunk, never in the public bundle (checked on the build output).
- **Logo rendering** in one small `SkillIcon` component (`<svg><path d>`), shared by the public page and the admin; hover colour via a CSS variable, skipped when the brand colour's contrast on the current theme is too low (decided in code from the hex, both themes).

## Task List

### Phase 1: Backend
- [x] Task 1: Model, migration, domain and repository (list, get, create, update, delete, move)
- [x] Task 2: Public and admin API routes with validation

### Checkpoint A: after Tasks 1–2
- [x] ruff + pytest green; migration up/down; every admin route refused without a session

### Phase 2: Frontend
- [x] Task 3: Public Skills page + `SkillIcon` component
- [x] Task 4: Admin list with ordering arrows + dashboard link
- [x] Task 5: Admin form with Simple Icons search (dependency added here)

### Checkpoint B: after Tasks 3–5
- [x] Frontend green; Simple Icons absent from the public bundle; screenshots (both themes, desktop and 390 px, hover colours)
- [x] Human: add, edit, reorder and delete skills in the browser; texts reviewed

### Checkpoint C: complete
- [x] Code review (`/review`)
- [x] Merge into `develop` after approval

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Simple Icons leaks into the public bundle (several MB) | High | Dynamic import in the admin form only; build output checked at Checkpoint B |
| Admin-provided SVG path used for injection | Med | Rendered only as a `d` attribute (React escapes it); characters and length checked server-side |
| Brand colour unreadable on hover | Low | Contrast check per theme; fallback to the accent colour |
| Concurrent moves break positions | Low | Single admin; swap in one transaction |

## Open Questions

None.
