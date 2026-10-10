# Implementation Plan: Feature 5 — Edit the home page from the admin

Spec: [05-admin-home-editor.md](../specs/05-admin-home-editor.md) · Task list: [todo.md](todo.md) · Branch: `feature/admin-home-editor`

## Overview

Protected API to read/save the home content and upload/remove the CV, then an admin dashboard and a home editor (FR/EN tabs, Markdown live preview, server-side validation errors, unsaved-changes protection). The app moves to React Router's data router to make in-app navigation blocking possible.

## Architecture Decisions

- **Admin schemas mirror the domain**: `TranslatedIn` has exactly `en` (required, non-empty) and `fr` (may be empty) with `extra="forbid"`, so adding Dutch later means adding one field.
- **Length limits live in the domain** (`domain/home.py`) and are read by the Pydantic schemas and exposed to the frontend through `maxLength` only as a convenience.
- **CV writes are atomic**: chunks go to a temporary file in `storage_dir`, size and `%PDF-` signature are checked, then `os.replace` swaps it in. A failed upload never removes the current CV.
- **Data router migration is a pure refactor first** (its own task, all existing tests green), before any feature uses `useBlocker`. Tests share one `renderApp(path)` helper built on `createMemoryRouter` with the same route list as production.
- **Session guard in `AdminLayout`**: one `/api/admin/me` check for every admin page except login; pages receive the username from the layout.
- **One `MarkdownPreview` usage**: the editor renders the intro with the same `react-markdown` call as the public page, so preview and site cannot drift.

## Task List

### Phase 1: Backend
- [x] Task 1: GET / PUT /api/admin/home
- [x] Task 2: PUT / DELETE /api/admin/cv

### Checkpoint A: after Tasks 1–2
- [x] ruff + pytest green
- [ ] Human check through `/docs`: edit the headline, see it on `/api/home`; upload a PDF, try a renamed non-PDF

### Phase 2: Frontend
- [x] Task 3: Switch to the data router (refactor, no behaviour change)
- [x] Task 4: Guarded admin layout and dashboard
- [x] Task 5: Home editor (texts, links, preview, save, unsaved changes)
- [ ] Task 6: CV upload and removal in the editor

### Checkpoint B: complete
- [ ] Human browser check of the 6 spec success criteria
- [ ] Security review (security-auditor) + code review (`/review`)
- [ ] Merge into `develop` after approval

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Upload bypasses type check with a renamed file | High | Magic-byte check on the content, not only the declared type; test with a fake PDF |
| Partial write corrupts the live CV | Med | Temp file + atomic `os.replace`; test that a rejected upload keeps the previous CV |
| Data router migration breaks existing pages | Med | Dedicated refactor task; all 46 frontend tests must stay green before moving on |
| `useBlocker` fires after a successful save | Low | Blocker condition is "form differs from last saved state"; test navigation right after saving |
| Session expires mid-edit and text is lost | Med | Form state kept on 401; message with sign-in link opening in a new tab |

## Open Questions

None.
