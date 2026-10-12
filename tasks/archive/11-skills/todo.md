# Todo: Feature 11 — Skills

Plan: [plan.md](plan.md)

## Task 1: Model, migration, domain, repository

**Acceptance criteria:**
- [ ] Migration creates `skills` (and drops it on downgrade); unique name per category (case-insensitive)
- [ ] Repository: list in category + position order, get, create (last of its category), update (category change → last), delete, move up/down
- [ ] Tests on the real test database

**Files:** `backend/app/domain/skill.py`, `backend/app/infra/models.py`, `backend/alembic/versions/*`, `backend/app/infra/repositories/skill.py`, tests
**Scope:** M

## Task 2: API routes

**Acceptance criteria:**
- [ ] `GET /api/skills` grouped in the fixed category order, empty categories omitted
- [ ] Admin `GET` list / one, `POST`, `PUT`, `DELETE`, `POST /{id}/move`
- [ ] 422 per the spec table (path with `<` refused), 409 duplicate name in a category, 404 unknown id

**Files:** `backend/app/api/skills.py`, `backend/app/api/admin_skills.py`, `backend/app/main.py`, tests
**Scope:** M

## Checkpoint A
- [ ] ruff + pytest green

## Task 3: Public Skills page

**Acceptance criteria:**
- [ ] Sections per category with chips (logo + name, or name only); "coming soon" when empty
- [ ] `SkillIcon` renders a stored path; brand colour on hover when readable
- [ ] Category labels in en/fr/nl

**Files:** `frontend/src/api/skills.ts`, `frontend/src/components/SkillIcon/*`, `frontend/src/pages/SkillsPage.*`, i18n, tests
**Scope:** S

## Task 4: Admin list

**Acceptance criteria:**
- [ ] `/:lang/admin/skills` grouped by category, ▲ ▼ arrows (disabled at the edges), Edit link, New skill
- [ ] Dashboard link

**Files:** `frontend/src/api/adminSkills.ts`, `frontend/src/pages/admin/SkillListPage.*`, routes, dashboard, i18n, tests
**Scope:** S

## Task 5: Admin form

**Acceptance criteria:**
- [ ] `simple-icons@16.32.0` added; loaded with a dynamic import in the form only
- [ ] Name, category, logo search (≤ 12 results, preview), remove logo; delete with confirmation; unsaved-changes guard
- [ ] 409 / 422 messages next to the fields

**Files:** `frontend/package.json`, `frontend/src/pages/admin/SkillEditorPage.*`, i18n, tests
**Scope:** M

## Checkpoint B
- [ ] Bundle check · screenshots · human checks

## Checkpoint C
- [ ] `/review` · merge approval
