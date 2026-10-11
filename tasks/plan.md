# Implementation Plan: Feature 10 — Experience editor

Spec: [10-experience-editor.md](../specs/10-experience-editor.md) · Task list: [todo.md](todo.md) · Branch: `feature/experience-editor`

## Overview

Admin pages to list, create, edit and delete timeline entries, with the home editor's translation behaviour (FR · EN · NL tabs, DeepL per tab, fill on save).

## Architecture Decisions

- **Backend `api/admin_experiences.py`** on `admin_router()` (session required); Pydantic input models mirror the spec's validation table; the domain declares the translated experience fields once (shared with `translate-missing`).
- **Repository** gains `create`, `update` (everything but the slug) and `delete`; the unique slug is checked in the repository and reported as a domain error → 409.
- **Shared frontend component** extracted from `HomeEditorPage`: the translation block (tabs, translate button, confirmation, messages). The home editor is refactored onto it first, with its tests unchanged — proof the extraction is safe.
- **Slug proposal** computed in the frontend from the French title + organisation (accents removed, lowercase, `-`); the server only validates it.
- **Technologies** kept as the comma-separated text in the form, converted to a list when sending.

## Task List

### Phase 1: Backend
- [x] Task 1: Domain + repository (translated fields in the domain, create / update / delete, duplicate-slug error)
- [x] Task 2: Admin API routes (list, get, create, update, delete; validation; auto-translation on save)

### Checkpoint A: after Tasks 1–2
- [x] ruff + pytest green; every new route refused without a session (route-walking test)

### Phase 2: Frontend
- [ ] Task 3: Extract the translation block from the home editor (no visible change, existing tests green)
- [ ] Task 4: Experience list page + dashboard link
- [ ] Task 5: Experience form (create / edit / delete, slug proposal, technologies, translation)

### Checkpoint B: after Tasks 3–5
- [ ] Frontend green; screenshots of list and form (both themes, desktop and 390 px)
- [ ] Human: create, edit and delete an entry in the browser; texts reviewed

### Checkpoint C: complete
- [ ] Code review (`/review`)
- [ ] Merge into `develop` after approval

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Extracting the translation block breaks the home editor | Med | Separate task, existing home editor tests must stay green unchanged |
| Two slugs proposed identical (same title + organisation) | Low | Server answers 409; the form shows "address already used" next to the field |
| Deleting the wrong entry | Med | Confirmation naming the entry; delete only on the edit page |
| Form grows large on mobile | Low | Same single-column layout as the home editor (overflow fix already in place) |

## Open Questions

None.
