# Portfolio

Personal portfolio of Léonard Fontaine, fullstack developer.

- **Frontend**: React + TypeScript (Vite), CSS Modules
- **Backend**: FastAPI, layered as `api` / `domain` / `infra`
- **Database**: PostgreSQL

## Project structure

```
backend/    FastAPI app (app/api, app/domain, app/infra), Alembic migrations and tests
frontend/   React app (Vite)
specs/      one specification per feature
tasks/      implementation plan of the feature in progress
docker-compose.yml   local PostgreSQL + Mailpit
```

### Backend layers

| Layer | Contains | May import |
|---|---|---|
| `app/api/` | Routes, request/response schemas (Pydantic), FastAPI dependencies | `domain`, `infra` |
| `app/domain/` | Entities (plain dataclasses) and business rules | nothing from the app, no FastAPI or SQLAlchemy |
| `app/infra/` | Settings, database engine, ORM models, repositories, email | `domain` |

ORM models and domain entities are separate classes; repositories convert between them.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [uv](https://docs.astral.sh/uv/) (Python 3.12 is installed automatically by uv)
- [Node.js](https://nodejs.org/) 22+

## Run locally

1. Start the database and the fake mail server:

   ```bash
   docker compose up -d
   ```

   Mailpit inbox: <http://localhost:8025>

2. Start the backend (<http://localhost:8000>, API docs at <http://localhost:8000/docs>):

   ```bash
   cd backend
   cp .env.example .env        # local settings, never committed
   uv sync
   uv run alembic upgrade head # create or update the database schema
   uv run fastapi dev app/main.py
   ```

   `GET /api/health` reports whether the database is reachable (200, or 503 when it is down).

3. Start the frontend (<http://localhost:5173>), in another terminal:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Quality checks

| | Backend (`backend/`) | Frontend (`frontend/`) |
|---|---|---|
| Lint | `uv run ruff check .` | `npm run lint` |
| Format | `uv run ruff format .` | `npm run format` |
| Tests | `uv run pytest` | `npm test` |

Backend tests need the Docker database running. They create and use a separate `portfolio_test` database; each test is rolled back, so the development data is never touched.

## Database migrations

Every schema change goes through an Alembic migration (from `backend/`):

```bash
uv run alembic revision --autogenerate -m "create home_content table"  # after changing ORM models
uv run alembic upgrade head    # apply all pending migrations
uv run alembic downgrade -1    # undo the last one
```

Review each generated file in `migrations/versions/` before committing it. A test checks that all migrations can be undone and re-applied.

## Git workflow

- `main`: stable, deployed version
- `develop`: integration branch
- `feature/<name>`: one branch per feature, merged into `develop`
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)
