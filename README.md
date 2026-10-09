# Portfolio

Personal portfolio of Léonard Fontaine, fullstack developer.

- **Frontend**: React + TypeScript (Vite), CSS Modules
- **Backend**: FastAPI, layered as `api` / `domain` / `infra`
- **Database**: PostgreSQL

## Project structure

```
backend/    FastAPI app (app/api, app/domain, app/infra) and tests
frontend/   React app (Vite)
docker-compose.yml   local PostgreSQL + Mailpit
```

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
   cp .env.example .env
   uv sync
   uv run fastapi dev app/main.py
   ```

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

## Git workflow

- `main`: stable, deployed version
- `develop`: integration branch
- `feature/<name>`: one branch per feature, merged into `develop`
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)
