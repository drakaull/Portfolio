# Tasks: Feature 9 — Language switcher and Dutch

Each task: implement → checks green (backend: `uv run ruff check . && uv run ruff format --check . && uv run pytest`; frontend: `npm run lint && npm run format:check && npm test && npm run build`, plus Playwright screenshots) → one commit.

## Task 1: Dutch in the backend

**Acceptance criteria:**
- [ ] `Lang = "en" | "fr" | "nl"`; `lang=nl` accepted with French fallback
- [ ] DeepL target `NL`; translate endpoint accepts `target=nl`
- [ ] Admin home schemas accept an optional `nl`; save fills empty `en` and `nl`

**Verification:** updated API tests
**Files:** `app/domain/language.py`, `app/infra/translation.py`, `app/api/admin_home.py`, tests
**Scope:** S

## Task 2: translate-missing command

**Acceptance criteria:**
- [ ] `uv run python -m app.cli translate-missing` fills empty non-French fields of the home content and every experience
- [ ] Never overwrites existing text; prints a summary; exits with a clear message when DeepL is unavailable

**Verification:** tests with the fake translator
**Files:** `app/cli.py`, `app/infra/repositories/experience.py` (save), `tests/test_cli.py`
**Scope:** M

## Checkpoint A
- [ ] Backend green · human runs the command and checks `lang=nl`

## Task 3: Dutch interface

**Acceptance criteria:**
- [ ] `nl.ts` with every key (DeepL from English), eyebrows as decided
- [ ] `/nl/...` routes; `/` redirects Dutch browsers to `/nl`
- [ ] Existing tests still pass; Dutch route tests added

**Files:** `src/i18n/nl.ts`, `src/i18n/useTranslation.ts`, `src/components/Routing/Routing.tsx`, tests
**Scope:** M

## Task 4: Flags and language switcher

**Acceptance criteria:**
- [ ] Inline SVG flags: UK; France/Belgium and Netherlands/Belgium split by a diagonal
- [ ] Button shows current flag + code; list of 3 languages linking to the same page; Escape/outside click close; focus returns to the button
- [ ] Used in the public navbar and the admin header

**Files:** `src/components/Flag/*`, `src/components/LanguageSwitch/*`, tests
**Scope:** M

## Checkpoint B
- [ ] Screenshots reviewed · human approves flags and Dutch texts

## Task 5: NL tab in the home editor

**Acceptance criteria:**
- [ ] Tabs FR · EN · NL; each non-French tab has its own "Translate from French" (with confirmation before replacing)
- [ ] Save notices cover both generated languages

**Files:** `src/api/adminHome.ts`, `src/pages/admin/HomeEditorPage.tsx`, tests, `src/i18n/*.ts`
**Scope:** M

## Checkpoint C
- [ ] Human browser check · `/review` · merge into `develop` after approval
