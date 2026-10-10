# Spec: Feature 2 — Backend foundation

Status: **APPROVED**

## Objective

Connect the FastAPI backend to PostgreSQL and set the conventions every later feature will follow: where entities, database code and routes live, how the schema evolves, and how it is tested.

No visible page changes. The observable result: the backend reports whether the database is reachable, and the migration tooling is ready for the first real table (home content, feature 3).

## Assumptions

1. Database access is **asynchronous**: SQLAlchemy 2 asyncio extension with the `asyncpg` driver. *(confirmed)* `asyncpg` rather than async `psycopg`, because async psycopg cannot run on Windows' default event loop (ProactorEventLoop), which `uvicorn` uses on this dev machine.
2. Schema changes go only through **Alembic** migrations, never `create_all()`.
3. The database URL comes from the `DATABASE_URL` environment variable; `.env.example` holds the local Docker value. No password is committed except the local-only Docker one already in `docker-compose.yml`.
4. Tests run against a real PostgreSQL database `portfolio_test` on the same Docker container, not SQLite. *(confirmed)*
5. No business table in this feature; the first migration is created in feature 3 together with its entity.

## Tech Stack

| Concern | Choice | Status |
|---|---|---|
| ORM | SQLAlchemy 2 (`sqlalchemy[asyncio]`) | new dependency |
| Driver | asyncpg | new dependency |
| Migrations | Alembic | new dependency |
| Settings | pydantic-settings | existing |
| Tests | pytest + AnyIO plugin + httpx `AsyncClient` (all already installed with FastAPI) | existing |

## Layering rules

```
api/     → HTTP: routes, request/response schemas (Pydantic). Calls domain + infra through dependencies.
domain/  → Entities and business rules. Plain Python. Imports nothing from api/ or infra/, nor FastAPI/SQLAlchemy.
infra/   → Technical details: settings, database engine/session, ORM models, repositories, email.
```

Allowed imports: `api → domain`, `api → infra`, `infra → domain`. Never `domain → *`.

Domain entities and ORM models are **separate classes** *(confirmed)*: plain dataclasses in `domain/`, SQLAlchemy models in `infra/`, and the repository converts between them. How a feature (e.g. home content) will flow:

```
GET /api/home ──> api/home.py ──> repository (infra) ──> PostgreSQL
                       │                 │
                       └── returns domain entity, serialized by a Pydantic schema
```

## Behaviour

| Endpoint | Database up | Database down |
|---|---|---|
| `GET /api/health` | `200 {"status": "ok", "database": "ok"}` | `503 {"status": "degraded", "database": "unreachable"}` |

The health check runs `SELECT 1` and never exposes connection details or error messages.

## Commands

From `backend/`:

```
Run dev server:     uv run fastapi dev app/main.py
New migration:      uv run alembic revision --autogenerate -m "create home_content table"
Apply migrations:   uv run alembic upgrade head
Roll back one:      uv run alembic downgrade -1
Tests:              uv run pytest
Lint / format:      uv run ruff check . && uv run ruff format --check .
```

## Project Structure

```
backend/
├── alembic.ini
├── migrations/              Alembic env.py + versions/
├── app/
│   ├── main.py
│   ├── api/
│   │   ├── dependencies.py  get_session() FastAPI dependency
│   │   └── health.py
│   ├── domain/              (entities arrive in feature 3)
│   └── infra/
│       ├── config.py        + database_url
│       └── database.py      async engine, session factory, declarative Base with naming conventions
└── tests/
    ├── conftest.py          test database setup, migrations, per-test transaction rollback
    └── test_health.py
```

## Code Style

```python
@router.get("/health")
async def health(
    session: Annotated[AsyncSession, Depends(get_session)], response: Response
) -> HealthStatus:
    try:
        await session.execute(text("SELECT 1"))
    except SQLAlchemyError:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return HealthStatus(status="degraded", database="unreachable")
    return HealthStatus(status="ok", database="ok")
```

- Type hints everywhere, `Annotated` dependencies, Pydantic models for every response.
- ruff rules already configured (`E, F, I, UP, B`), line length 100.
- One session per request, opened and closed by the `get_session` dependency.

## Testing Strategy

- `conftest.py` creates `portfolio_test` if missing, runs `alembic upgrade head` once per test session, and wraps each test in a transaction rolled back at the end (tests never see each other's data).
- Async tests use `@pytest.mark.anyio` and call the app through `httpx.AsyncClient` + `ASGITransport` (the sync `TestClient` runs its own event loop, which conflicts with the async engine).
- Health: one test with the database up, one with the session dependency overridden to raise (database down → 503).
- A migration round-trip test (`upgrade head` → `downgrade base` → `upgrade head`) so every future migration is reversible.

## Boundaries

- **Always:** work on `feature/backend-foundation`; ruff + pytest green before each commit; schema changes only via Alembic.
- **Ask first:** any dependency beyond the three above; any change to `docker-compose.yml`; anything in `frontend/`.
- **Never:** commit `.env` or real credentials; use `create_all()` outside tests; return database errors to the client.

## Success Criteria

1. With Docker running, `GET /api/health` returns 200 with `"database": "ok"`.
2. With the database stopped, it returns 503 without leaking error details.
3. `uv run alembic upgrade head` and `downgrade base` succeed on an empty database.
4. `uv run pytest` passes and uses `portfolio_test`, never the development database.
5. README documents the migration commands and the `.env` setup.

## Decisions

- Async database access (SQLAlchemy asyncio + asyncpg).
- Separate domain dataclasses and ORM models, converted in repositories.
- Tests on a real PostgreSQL test database.
- One spec per feature in `specs/` (feature 1 spec moved to `specs/01-site-shell.md`).
