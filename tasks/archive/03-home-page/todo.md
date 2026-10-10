# Tasks: Feature 3 — Home page

Each task: implement → checks green (backend: `uv run ruff check . && uv run ruff format --check . && uv run pytest`; frontend: `npm run lint && npm run format:check && npm test && npm run build`) → one commit.

## Task 1: Language helpers and HomeContent entity

**Description:** Pure domain code: supported languages, English fallback, and the `HomeContent` dataclass.

**Acceptance criteria:**
- [ ] `localize({"en": "A", "fr": "B"}, "fr")` → `"B"`; missing or empty `fr` → `"A"`
- [ ] `domain/` imports nothing from FastAPI, SQLAlchemy, `api/` or `infra/`

**Verification:**
- [ ] Unit tests for `localize`

**Dependencies:** None
**Files:** `app/domain/language.py`, `app/domain/home.py`, `tests/test_language.py`
**Scope:** S

## Task 2: home_content table, migration and repository

**Description:** ORM model, Alembic migration (table, single-row and language check constraints, placeholder row), and `HomeContentRepository.get()` returning a domain entity.

**Acceptance criteria:**
- [ ] Fresh database after `upgrade head` contains the placeholder row
- [ ] Database rejects a second row and a row whose `headline`/`intro` lacks `en` or `fr`
- [ ] Repository returns a `HomeContent` (not the ORM object), or `None` without a row
- [ ] Isolation: data written in one test is gone in the next

**Verification:**
- [ ] Tests: repository read, constraints, isolation; migration round-trip still green

**Dependencies:** Task 1
**Files:** `app/infra/models.py`, `app/infra/repositories/home.py`, `migrations/env.py` (import models), `migrations/versions/<date>-create_home_content.py`, `tests/test_home_repository.py`
**Scope:** M

## Task 3: GET /api/home endpoint

**Description:** Public endpoint returning the localized home content.

**Acceptance criteria:**
- [ ] `?lang=en|fr` → 200 with `headline`, `intro`, `linkedin_url`, `github_url`, `cv_url`
- [ ] Missing/invalid `lang` → 422; no row → 404
- [ ] Missing translation falls back to English

**Verification:**
- [ ] Tests for each case above

**Dependencies:** Task 2
**Files:** `app/api/home.py`, `app/api/dependencies.py`, `app/main.py`, `tests/test_home_api.py`
**Scope:** S

## Task 4: CV storage and GET /api/cv

**Description:** `storage_dir` setting, git-ignored `backend/storage/`, `/api/cv` serving `cv.pdf` inline, and `cv_url` filled when the file exists.

**Acceptance criteria:**
- [ ] With `storage/cv.pdf`: `/api/cv` → 200 `application/pdf`, inline, file name `Leonard_Fontaine_CV.pdf`; `cv_url` = `/api/cv`
- [ ] Without it: `/api/cv` → 404; `cv_url` = `null`
- [ ] `backend/storage/` ignored by git

**Verification:**
- [ ] Tests with a temporary storage directory
- [ ] `git check-ignore backend/storage/cv.pdf`

**Dependencies:** Task 3
**Files:** `.gitignore`, `app/infra/config.py`, `app/api/home.py`, `backend/.env.example`, `tests/test_home_api.py`
**Scope:** S

## Checkpoint A
- [ ] Backend checks green · human check of `/api/home` and `/api/cv`

## Task 5: Home page fetching and rendering the content

**Description:** `useHomeContent(lang)` hook and `HomePage` rendering name, headline, Markdown intro and links, with loading and error states. Adds `react-markdown`.

**Acceptance criteria:**
- [ ] Content from the API shown in the URL language; switching language refetches
- [ ] `<script>` in the intro shown as text; external links have `target="_blank"` and `rel="noopener noreferrer"`
- [ ] CV link hidden when `cv_url` is null; translated error message when the API fails

**Verification:**
- [ ] Tests with mocked `fetch`: both languages, loading, error, script-as-text, links, CV hidden
- [ ] Build passes; note `react-markdown` bundle impact

**Dependencies:** Task 4 (API contract)
**Files:** `frontend/package.json`, `frontend/src/api/useHomeContent.ts`, `frontend/src/pages/HomePage.tsx`, `frontend/src/pages/HomePage.module.css`, `frontend/src/pages/HomePage.test.tsx`, `frontend/src/i18n/*.ts`, `frontend/src/App.test.tsx` (home title expectations)
**Scope:** M

## Checkpoint B
- [ ] Human browser check · 7 spec success criteria · `/review` · merge into `develop` after approval
