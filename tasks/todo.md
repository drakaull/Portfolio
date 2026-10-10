# Tasks: Feature 2 — Backend foundation

Each task: implement → `uv run ruff check . && uv run ruff format --check . && uv run pytest` (from `backend/`) → one commit.

## Task 1: Async database session and health check

**Description:** Add SQLAlchemy (asyncio) and asyncpg, a `database_url` setting, the async engine/session factory and declarative `Base`, a `get_session` dependency, and make `/api/health` check the database. Add the test setup that creates and targets `portfolio_test`.

**Acceptance criteria:**
- [ ] `GET /api/health` → 200 `{"status": "ok", "database": "ok"}` when PostgreSQL answers
- [ ] → 503 `{"status": "degraded", "database": "unreachable"}` when it does not, with no error detail
- [ ] Tests run against `portfolio_test` only (guarded)

**Verification:**
- [ ] Tests: health up (real test DB), health down (session dependency overridden to fail)
- [ ] Manual: `curl localhost:8000/api/health` with Docker up

**Dependencies:** None
**Files:** `pyproject.toml`, `uv.lock`, `.env.example`, `app/infra/config.py`, `app/infra/database.py`, `app/api/dependencies.py`, `app/api/health.py`, `tests/conftest.py`, `tests/test_health.py`
**Scope:** M (several small files)

## Task 2: Alembic setup and migration round-trip test

**Description:** Initialise Alembic with the async template in `backend/migrations`, wire `env.py` to the settings URL and `Base.metadata`, run migrations at the start of the test session, and add a round-trip test.

**Acceptance criteria:**
- [ ] `uv run alembic upgrade head` and `uv run alembic downgrade base` succeed on the dev database
- [ ] Test session applies `upgrade head` to `portfolio_test` before tests
- [ ] Round-trip test (`upgrade head` → `downgrade base` → `upgrade head`) passes

**Verification:**
- [ ] Tests pass; manual run of the two Alembic commands

**Dependencies:** Task 1
**Files:** `alembic.ini`, `migrations/env.py`, `migrations/script.py.mako`, `tests/conftest.py`, `tests/test_migrations.py`
**Scope:** S

## Checkpoint A
- [ ] ruff + pytest green · human check of health with the database up and stopped

## Task 3: README — environment, migrations and layering rules

**Description:** Document `.env` setup, migration commands, and the api/domain/infra import rules.

**Acceptance criteria:**
- [ ] A new developer can go from clone to a working health check by following the README
- [ ] Layering rules match the spec

**Verification:**
- [ ] Manual read-through

**Dependencies:** Task 2
**Files:** `README.md`
**Scope:** XS

## Checkpoint B
- [ ] All 5 spec success criteria verified · `/review` · merge into `develop` after approval
