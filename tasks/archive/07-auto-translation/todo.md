# Tasks: Feature 7 — Automatic translation

Each task: implement → checks green (backend: `uv run ruff check . && uv run ruff format --check . && uv run pytest`; frontend: `npm run lint && npm run format:check && npm test && npm run build`, plus Playwright screenshots) → one commit.

## Task 1: French as source language

**Description:** `SOURCE_LANG = "fr"` in the domain; `localize()` falls back to French; admin save requires French and accepts empty English.

**Acceptance criteria:**
- [ ] Empty or missing English → public `/api/home?lang=en` shows French
- [ ] `PUT /api/admin/home`: empty French → 422; empty English accepted

**Verification:** updated domain and API tests
**Dependencies:** None
**Files:** `app/domain/language.py`, `app/api/admin_home.py`, `tests/test_language.py`, `tests/test_home_api.py`, `tests/test_admin_home_api.py`
**Scope:** S

## Task 2: Translation service

**Description:** `infra/translation.py`: Markdown ↔ HTML conversion and DeepL client (EN-GB, `tag_handling=html`, 10 s timeout); `DEEPL_API_KEY` optional setting. Adds `markdown-it-py` and `markdownify`.

**Acceptance criteria:**
- [ ] Round trip without translation returns the original Markdown (paragraphs, bold, italic, links, lists, headings, inline code)
- [ ] Request shape: `Authorization: DeepL-Auth-Key …`, `source_lang=FR`, `target_lang=EN-GB`, `tag_handling=html`, free endpoint for `:fx` keys
- [ ] No key, 403, 456, 5xx, timeout → `TranslationUnavailable`

**Verification:** unit tests with `httpx.MockTransport`
**Dependencies:** Task 1
**Files:** `pyproject.toml`, `uv.lock`, `app/infra/config.py`, `app/infra/translation.py`, `.env.example`, `tests/test_translation.py`
**Scope:** M

## Task 3: Translate endpoint and auto-fill on save

**Description:** `POST /api/admin/translate`; `PUT /api/admin/home` fills empty English fields and returns `auto_translated` / `translation_failed`.

**Acceptance criteria:**
- [ ] Translate: 200 with translations; 503 when unavailable; 422 over limits; 401 without session
- [ ] Save: empty English filled; written English untouched; DeepL failure → saved with `translation_failed: true`
- [ ] Deployment checklist: `DEEPL_API_KEY` in the server environment

**Verification:** API tests with the translation service replaced by a fake
**Dependencies:** Task 2
**Files:** `app/api/admin_translate.py`, `app/api/admin_home.py`, `app/api/dependencies.py`, `app/main.py`, `tests/test_admin_translate_api.py`, `tests/test_admin_home_api.py`, `docs/deployment-checklist.md`
**Scope:** M

## Checkpoint A
- [ ] Backend green · human: DeepL key + `/docs` checks

## Task 4: Editor — French first, translate button, notices

**Description:** FR tab first and default; "Translate from French" button in the EN tab with confirmation when English exists; review notice; save notices (auto-translated / failed); new English hint.

**Acceptance criteria:**
- [ ] Button fills English headline and intro; confirmation before replacing existing English
- [ ] Notices after save match `auto_translated` / `translation_failed`
- [ ] 503 on the button shows "translation unavailable"

**Verification:** tests with mocked `fetch`; screenshots
**Dependencies:** Task 3
**Files:** `src/api/adminHome.ts`, `src/pages/admin/HomeEditorPage.tsx`, `src/pages/admin/HomeEditorPage.test.tsx`, `src/i18n/*.ts`
**Scope:** M

## Checkpoint B
- [ ] Human browser check · `/review` · merge into `develop` after approval
