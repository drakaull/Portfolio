# Tasks: Feature 5 — Edit the home page from the admin

Each task: implement → checks green (backend: `uv run ruff check . && uv run ruff format --check . && uv run pytest`; frontend: `npm run lint && npm run format:check && npm test && npm run build`) → one commit.

## Task 1: GET / PUT /api/admin/home

**Description:** Domain length limits, `HomeContentRepository.save()`, admin schemas and the two protected routes.

**Acceptance criteria:**
- [ ] `GET` returns both languages, URLs and `has_cv`
- [ ] `PUT` saves and returns the content; `/api/home` reflects it
- [ ] 422 for: empty English, too long, `http://` or `javascript:` URL, unknown language key, extra field
- [ ] 401 without session (existing route-walking test now covers these routes)

**Verification:** API tests
**Dependencies:** None
**Files:** `app/domain/home.py`, `app/infra/repositories/home.py`, `app/api/admin_home.py`, `app/main.py`, `tests/test_admin_home_api.py`
**Scope:** M

## Task 2: PUT / DELETE /api/admin/cv

**Description:** Multipart upload with 5 MB cap, PDF type and signature checks, atomic write; removal.

**Acceptance criteria:**
- [ ] Valid PDF → 204, served by `/api/cv`
- [ ] Wrong type or fake PDF → 415; over 5 MB → 413; in both cases the previous CV is kept and no temp file remains
- [ ] `DELETE` → 204, `/api/cv` → 404

**Verification:** API tests with a temporary storage folder
**Dependencies:** Task 1
**Files:** `app/infra/storage.py`, `app/api/admin_home.py`, `tests/test_admin_cv_api.py`
**Scope:** S

## Checkpoint A
- [ ] Backend checks green · human check through `/docs`

## Task 3: Switch to the data router (refactor)

**Description:** `createBrowserRouter` with the existing routes; tests use a shared `renderApp(path)` built on `createMemoryRouter`.

**Acceptance criteria:**
- [ ] No behaviour change; all existing frontend tests pass unchanged in intent
- [ ] Route list defined once, used by production and tests

**Verification:** full frontend test suite + build
**Dependencies:** None (can start after Checkpoint A)
**Files:** `src/main.tsx`, `src/App.tsx` → `src/routes.tsx`, `src/test/renderApp.tsx`, `src/App.test.tsx`, `src/pages/HomePage.test.tsx`, `src/pages/admin/AdminPages.test.tsx`
**Scope:** M

## Task 4: Guarded admin layout and dashboard

**Description:** Session check moved into `AdminLayout` (login page excluded); dashboard lists editable sections with sign-out.

**Acceptance criteria:**
- [ ] Any admin page except login redirects to login without a session
- [ ] Dashboard shows the user, sign-out and a "Home page" link to `/:lang/admin/home`

**Verification:** tests
**Dependencies:** Task 3
**Files:** `src/components/AdminLayout/AdminLayout.tsx`, `src/pages/admin/AdminHomePage.tsx` (dashboard), `src/pages/admin/AdminPages.test.tsx`, `src/i18n/*.ts`
**Scope:** S

## Task 5: Home editor (texts, links, preview, save, unsaved changes)

**Description:** `/:lang/admin/home` form with FR/EN tabs, Markdown preview, URL fields, save with server errors, 401 handling, `useBlocker` + `beforeunload`.

**Acceptance criteria:**
- [ ] Loads current content; preview updates while typing and escapes HTML
- [ ] Save sends the full JSON, shows "Saved"; 422 errors shown next to fields; 401 keeps the text and explains how to sign in
- [ ] Leaving with unsaved changes asks for confirmation; no prompt after saving

**Verification:** tests with mocked `fetch`
**Dependencies:** Task 4
**Files:** `src/api/adminHome.ts`, `src/pages/admin/HomeEditorPage.tsx`, `src/pages/admin/HomeEditorPage.module.css`, `src/pages/admin/HomeEditorPage.test.tsx`, `src/components/MarkdownText/MarkdownText.tsx`, `src/pages/HomePage.tsx`, `src/i18n/*.ts`, `src/routes.tsx`
**Scope:** M (largest task)

## Task 6: CV upload and removal in the editor

**Description:** CV block: current state with link, upload/replace (PDF only), remove with confirmation.

**Acceptance criteria:**
- [ ] Upload sends multipart to `PUT /api/admin/cv`; 413/415 shown as translated messages
- [ ] Remove asks for confirmation, then calls `DELETE /api/admin/cv`

**Verification:** tests
**Dependencies:** Task 5
**Files:** `src/api/adminHome.ts`, `src/pages/admin/CvField.tsx`, `src/pages/admin/HomeEditorPage.test.tsx`, `src/i18n/*.ts`
**Scope:** S

## Checkpoint B
- [ ] Human browser check · security-auditor review · `/review` · merge into `develop` after approval
