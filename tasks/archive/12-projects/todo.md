# Todo: Feature 12 — Projects (GitHub sync)

Plan: [plan.md](plan.md)

## Task 1: Model, migration, domain, repository

**Acceptance criteria:**
- [ ] Migration creates `projects` (dropped on downgrade); unique `github_id`; context values checked
- [ ] Repository: list by position, get, update admin fields, move up/down, delete
- [ ] Tests on the real test database

**Files:** `backend/app/domain/project.py`, `backend/app/infra/models.py`, migration, `backend/app/infra/repositories/project.py`, tests
**Scope:** M

## Task 2: GitHub client, DeepL detection, sync

**Acceptance criteria:**
- [ ] `GitHubClient.public_repositories()` → kept repositories (not fork, not archived) with their languages; errors / rate limit → `GitHubUnavailable`
- [ ] `Translator` can translate with the source language detected, returning it
- [ ] `sync_projects`: new (hidden, last), updated (admin fields kept), gone (hidden + missing), back (missing cleared, still hidden); "About" translated only when changed; DeepL failure keeps the original; GitHub failure writes nothing; returns a report
- [ ] Optional live GitHub test (skipped by default)

**Files:** `backend/app/infra/github.py`, `backend/app/infra/translation.py`, `backend/app/infra/project_sync.py`, tests
**Scope:** M

## Task 3: API routes

**Acceptance criteria:**
- [ ] Admin: list, get, `PUT` (title, context, team size, visible), move, delete, `POST /sync` (report; 503 when GitHub is unavailable)
- [ ] Public `GET /api/projects?lang=` → visible projects in order, localized "About"
- [ ] Validation 422, 404 unknown id

**Files:** `backend/app/api/admin_projects.py`, `backend/app/api/projects.py`, `backend/app/main.py`, `backend/app/api/dependencies.py`, tests
**Scope:** M

## Checkpoint A
- [ ] ruff + pytest green

## Task 4: Admin list

**Acceptance criteria:**
- [ ] `/:lang/admin/projects`: sync button with report and errors, visibility checkbox saved at once, ▲ ▼ arrows, "not found on GitHub" mark, delete with confirmation
- [ ] Dashboard link; texts in en/fr/nl

**Files:** `frontend/src/api/adminProjects.ts`, `frontend/src/pages/admin/ProjectListPage.*`, routes, dashboard, i18n, tests
**Scope:** M

## Task 5: Admin form

**Acceptance criteria:**
- [ ] Title, context, team size, visible; GitHub data, "About" and its translations read-only with a link to the repository
- [ ] Unsaved-changes guard; validation messages

**Files:** `frontend/src/pages/admin/ProjectEditorPage.*`, i18n, tests
**Scope:** S

## Checkpoint B
- [ ] Screenshots · human sync of the real repositories · public design decided

## Task 6: Public page
(Defined at Checkpoint B.)

## Checkpoint C
- [ ] `/review` · merge approval
