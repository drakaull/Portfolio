# Todo: Feature 10 — Experience editor

Plan: [plan.md](plan.md)

## Task 1: Domain + repository

**Acceptance criteria:**
- [ ] `TRANSLATED_FIELDS` for experiences in the domain, used by `translate-missing`
- [ ] Repository `create`, `update` (slug unchanged), `delete`; duplicate slug raises a domain error
- [ ] Tests on the real test database

**Files:** `backend/app/domain/experience.py`, `backend/app/infra/repositories/experience.py`, `backend/app/cli.py`, tests
**Scope:** S

## Task 2: Admin API routes

**Acceptance criteria:**
- [ ] `GET/POST /api/admin/experiences`, `GET/PUT/DELETE /api/admin/experiences/{slug}`
- [ ] Validation per the spec table (422 with the field), 409 duplicate slug, 404 unknown slug
- [ ] Empty translations filled on save; written ones kept; DeepL failure still saves; response reports languages
- [ ] Public API reflects changes immediately

**Files:** `backend/app/api/admin_experiences.py`, `backend/app/main.py`, tests
**Scope:** M

## Checkpoint A
- [ ] ruff + pytest green

## Task 3: Shared translation block

**Acceptance criteria:**
- [ ] Translation tabs + translate button + confirmation + messages in one component
- [ ] Home editor uses it; its tests pass unchanged

**Files:** `frontend/src/components/TranslatedTexts/*` (name to confirm in code), `frontend/src/pages/admin/HomeEditorPage.tsx`
**Scope:** M

## Task 4: Experience list page

**Acceptance criteria:**
- [ ] `/:lang/admin/experiences` lists entries in public order (years, title, organisation, kind, Edit link)
- [ ] "New experience" button; dashboard link
- [ ] Interface texts in en/fr/nl

**Files:** `frontend/src/api/adminExperiences.ts`, `frontend/src/pages/admin/ExperienceListPage.tsx`, `frontend/src/routes.tsx`, dashboard, i18n, tests
**Scope:** S

## Task 5: Experience form

**Acceptance criteria:**
- [ ] Create (`/new`) with slug proposed from French title + organisation, editable until saved
- [ ] Edit (`/:slug`) with read-only slug; delete with confirmation, then back to the list
- [ ] Fields and validation messages per the spec; technologies comma-separated
- [ ] Translation tabs via the shared block; unsaved-changes guard

**Files:** `frontend/src/pages/admin/ExperienceEditorPage.tsx`, CSS, i18n, tests
**Scope:** M

## Checkpoint B
- [ ] Screenshots reviewed · human checks create / edit / delete

## Checkpoint C
- [ ] `/review` · merge approval
