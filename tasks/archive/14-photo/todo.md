# Todo: Feature 14 — Home photo

Plan: [plan.md](plan.md)

## Task 1: Backend

**Acceptance criteria:**
- [ ] `pillow==12.3.0` added
- [ ] `save_photo`: ≤ 5 MB, JPEG / PNG / WebP only (by content), ≤ 40 Mpx, upright, ≤ 1,200 px, WebP without metadata, atomic replace; worker thread
- [ ] `PUT /api/admin/photo` (413 / 415), `DELETE /api/admin/photo`, `GET /api/photo` (webp, nosniff, 404)
- [ ] Home content: `photo_version` (public and admin)

**Files:** `backend/pyproject.toml`, `backend/app/infra/storage.py`, `backend/app/api/admin_home.py`, `backend/app/api/home.py`, tests
**Scope:** M

## Checkpoint A
- [ ] ruff + pytest green

## Task 2: Admin photo block

**Acceptance criteria:**
- [ ] In the home editor, next to the CV: preview, upload / replace, remove with confirmation, clear errors (too large, not an image, session expired)

**Files:** `frontend/src/api/adminHome.ts`, `frontend/src/pages/admin/PhotoField.tsx`, `HomeEditorPage.tsx`, i18n, tests
**Scope:** S

## Task 3: Placement variants
- [ ] 2–3 variants screenshotted with a test photo, both themes, desktop and 390 px; nothing committed but the chosen one

## Checkpoint B
- [ ] Placement chosen

## Task 4: Public photo

**Acceptance criteria:**
- [ ] Photo at the chosen place with translated alt text, fixed size, versioned URL; nothing changes without a photo

**Files:** `frontend/src/api/homeContent*`, `frontend/src/pages/HomePage.*`, i18n, tests
**Scope:** S

## Checkpoint C
- [ ] Real photo checked · review · merge approval
