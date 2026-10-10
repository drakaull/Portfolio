# Implementation Plan: Feature 3 — Home page

Spec: [03-home-page.md](../specs/03-home-page.md) · Task list: [todo.md](todo.md) · Branch: `feature/home-page`

## Overview

First slice from database to screen: a single `home_content` row with translated JSON fields, a public `GET /api/home?lang=` endpoint, a `GET /api/cv` file endpoint, and the home page rendering the content (Markdown intro, LinkedIn / GitHub / CV links).

## Architecture Decisions

- **Languages defined once in `domain/language.py`** (`Lang`, `DEFAULT_LANG`, `localize()`), used by the API for `?lang=` validation, so adding Dutch touches one backend file.
- **ORM model ↔ domain entity conversion lives in the repository**, the only place that knows both.
- **Repository injected through a FastAPI dependency** (`get_home_repository`), built on `get_session`; tests keep overriding only `get_session`.
- **Placeholder row inserted by the migration**, so a fresh database already serves a valid home page; real text comes from the admin (feature 5).
- **CV file path from a `storage_dir` setting** (default `backend/storage`), never exposed in responses; `cv_url` is computed from file existence.
- **Frontend fetch with a small hook** (`useHomeContent`), aborting the previous request when the language changes so a slow answer cannot overwrite a newer one.

## Task List

### Phase 1: Backend
- [x] Task 1: Language helpers and HomeContent entity
- [x] Task 2: home_content table, migration and repository
- [x] Task 3: GET /api/home endpoint
- [x] Task 4: CV storage and GET /api/cv

### Checkpoint A: after Tasks 1–4
- [x] ruff + pytest green, migration round-trip green
- [ ] Human check: `/api/home?lang=fr`, `/api/home?lang=xx` (422), `/api/cv` with and without a PDF

### Phase 2: Frontend
- [x] Task 5: Home page fetching and rendering the content

### Checkpoint B: complete
- [ ] Human check in the browser: both languages, links, CV, backend stopped → error message
- [ ] All 7 spec success criteria verified
- [ ] Code review (`/review`), then merge into `develop` after approval

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Markdown renders injected HTML/script | High | `react-markdown` without `rehype-raw`; test with a `<script>` in the intro |
| Path traversal or file path leak via the CV endpoint | Med | Fixed file name, no user input in the path; responses never contain paths |
| Out-of-order responses when switching language fast | Low | `AbortController` in the hook |
| JSON rows missing a language | Low | Check constraints in the database + English fallback in `localize()` |
| CV accidentally committed | Med | `backend/storage/` in `.gitignore` before the first file is placed |

## Open Questions

None.
