# Deployment checklist

Items collected during code and security reviews. **Required** items must be done before the site goes live.

## Required

- [ ] **Real client IP behind the reverse proxy** (security audit L1). Run uvicorn with `--proxy-headers --forwarded-allow-ips=<proxy IP>` and make the proxy set `X-Forwarded-For`. Otherwise every visitor shares one IP and ten failed logins by anyone block the admin too. Key IPv6 clients on their `/64` prefix in `app/infra/rate_limit.py`.
- [ ] **Single backend process**, or move the login rate limiter to the database (`shortcut:` in `app/infra/rate_limit.py`).
- [ ] **HTTPS everywhere**; the admin cookie is `Secure` and is refused over plain HTTP outside `localhost`.
- [ ] **Security headers** on every response: `Content-Security-Policy` (allow the inline theme script in `frontend/index.html` by hash), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`), `Referrer-Policy`.
- [ ] **Request body size limit at the reverse proxy** (e.g. nginx `client_max_body_size 6m`, at least on `/api/`). FastAPI reads a request body before checking the admin session, so **anonymous** clients can send large bodies. The app's `BodySizeLimitMiddleware` already cuts bodies at 6 MB; the proxy limit stops them before they reach the app at all.
- [ ] **Persistent volume for `backend/storage/`** (CV, later images); it is git-ignored and would be lost on redeploy.
- [ ] **`DEBUG=false`** (default) and a production `DATABASE_URL` in the server environment, never in git.
- [ ] **Run `alembic upgrade head`** on each deploy, before starting the new backend.
- [ ] **Create the admin** on the server: `uv run python -m app.cli create-admin --username leonard`.
- [ ] **Dependency audit**: `npm audit` (frontend) and a Python audit (e.g. `uvx pip-audit`) with no unresolved critical/high finding.
- [ ] **Unknown URLs return HTTP 404** from the server for the SPA's not-found page (or `noindex`), so search engines do not index soft 404s.

## Recommended

- [ ] Web performance audit (`/webperf`), including whether `react-markdown` (~51 kB gzipped) should be lazy-loaded.
- [ ] Logging configuration so `INFO` login audit lines are kept (only `WARNING`+ reach stderr by default).
- [ ] Rehash admin passwords when argon2 parameters change (`PasswordHasher.check_needs_rehash`, security audit I2) — only needed if the parameters are ever changed.
