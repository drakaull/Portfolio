# Implementation Plan: Feature 2 — Backend foundation

Spec: [02-backend-foundation.md](../specs/02-backend-foundation.md) · Task list: [todo.md](todo.md) · Branch: `feature/backend-foundation`

## Overview

Connect FastAPI to PostgreSQL asynchronously, add Alembic migrations and a test setup on a real test database. The only visible change is a health check that reports the database state.

## Architecture Decisions

- **Async SQLAlchemy + asyncpg**, one `AsyncSession` per request through a `get_session` FastAPI dependency. `asyncpg` because async psycopg does not run on Windows' default event loop.
- **Engine created once at import from settings**; tests swap it by overriding `get_session`, so no global state is patched.
- **Alembic async template**: `migrations/env.py` reads `settings.database_url` (never `alembic.ini`), so the URL lives in `.env` only.
- **Test isolation by rollback**: each test runs inside a connection-level transaction; the session joins it with savepoints, and everything is rolled back after the test.
- **Naming conventions on `Base.metadata`** (pk/fk/ix/uq/ck) so constraint names are stable and migrations can drop them reliably.

## Task List

### Phase 1: Database connection
- [x] Task 1: Async database session and health check

### Phase 2: Migrations
- [x] Task 2: Alembic setup and migration round-trip test

### Checkpoint A: after Tasks 1–2
- [x] ruff + pytest green
- [x] Human check: health is 200 with Docker up, 503 with the database stopped

### Phase 3: Documentation
- [x] Task 3: README — environment, migrations and layering rules

### Checkpoint B: complete
- [ ] All 5 spec success criteria verified
- [ ] Code review (`/review`), then merge into `develop` after approval

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Tests accidentally run against the dev database | High | Test URL derived from settings with the database name forced to `portfolio_test`; a guard asserts the name before any test runs |
| Event-loop mismatch between pytest and the async engine | Med | AnyIO plugin + `httpx.AsyncClient`/`ASGITransport` (no sync `TestClient`); engine created inside the test event loop |
| Windows event loop incompatibility | Med | `asyncpg` driver (works with ProactorEventLoop) |
| Health check leaks connection details | Low | Fixed response body; exception never serialized; test asserts the body |

## Open Questions

None.
