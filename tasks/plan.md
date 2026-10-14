# Plan: Feature 17 — Deployment, step 1 (prepare in the repository)

Spec: [specs/17-deployment.md](../specs/17-deployment.md) · Branch: `feature/deployment`

Nothing is ordered during this step: everything is built and tested on Léonard's PC.

## Tasks

1. **Backend image** — `backend/Dockerfile` (Python + uv, locked dependencies, non-root user), `.dockerignore`; uvicorn in one process, trusting forwarded client IPs from the Docker network only.
2. **Web image** — `frontend/Dockerfile` (Node builds the site, then Caddy serves it) and `deploy/Caddyfile`: `/api` proxy, SPA fallback, `.be` / `www` / `http` redirects, security headers with a CSP (inline theme script by hash), 6 MB body limit, long cache for hashed files. `noindex` on the not-found page.
3. **Production stack** — `deploy/compose.yaml` (Caddy, backend, PostgreSQL; volumes; health checks; only Caddy publishes ports) and `deploy/.env.example` (every setting explained, no secret).
   - **Checkpoint A**: the production stack runs on `localhost`; the site, admin, contact (Mailpit), uploads work; headers present; no CSP violation in Chrome and Firefox.
4. **Backups** — `deploy/backup.sh` (nightly dump + storage, keep 14) and `deploy/pull-backups.ps1` (download, keep 8, log); restore procedure tested against the local stack.
5. **Runbook** — `docs/deployment.md`: first install step by step, deploy an update, backups and restore, troubleshooting; deployment checklist updated.
   - **Checkpoint B**: review · merge approval.

## Dependencies to approve

Docker base images, each pinned to an exact version published at least two weeks ago:
`python` (slim), `node` (build only), `caddy`, `postgres:17` (already used locally). No new library in the app.
