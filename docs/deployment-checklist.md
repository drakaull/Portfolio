# Deployment checklist

Items collected during code and security reviews. **Required** items must be done before the site goes live.

Ticked items are built into the production stack (`deploy/`, the Dockerfiles). How to do the others on the server: the step-by-step runbook [deployment.md](deployment.md) (in French).

## Required

All required items were done and verified on the live server on 2026-10-15, before the v1.0.0 release (dependency audit: `npm audit` and `pip-audit` 2.10.1, no known vulnerability). Migrations and the steps of each later deploy are in the runbook, section 11.

- [x] **Real client IP behind the reverse proxy** (security audit L1). Run uvicorn with `--proxy-headers --forwarded-allow-ips=<proxy IP>` and make the proxy set `X-Forwarded-For`. Otherwise every visitor shares one IP: ten failed logins by anyone block the admin too, and the contact form's limit (5 messages per hour per IP) becomes 5 per hour for the whole site. Key IPv6 clients on their `/64` prefix in `app/infra/rate_limit.py`.
- [x] **Single backend process**, or move the login rate limiter to the database (`shortcut:` in `app/infra/rate_limit.py`).
- [x] **HTTPS everywhere**; the admin cookie is `Secure` and is refused over plain HTTP outside `localhost`.
- [x] **Security headers** on every response: `Content-Security-Policy` (allow the inline theme script in `frontend/index.html` by hash; restrict `img-src` so Markdown images in admin texts cannot load third-party trackers), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`), `Referrer-Policy`.
- [x] **Request body size limit at the reverse proxy** (e.g. nginx `client_max_body_size 6m`, at least on `/api/`). FastAPI reads a request body before checking the admin session, so **anonymous** clients can send large bodies. The app's `BodySizeLimitMiddleware` already cuts bodies at 6 MB; the proxy limit stops them before they reach the app at all.
- [x] **Persistent volume for `backend/storage/`** (CV, later images); it is git-ignored and would be lost on redeploy.
- [x] **`DEBUG=false`** (default) and a production `DATABASE_URL` in the server environment, never in git.
- [x] **`DEEPL_API_KEY`** in the server environment (never in git) for automatic translation; without it, saving still works and the English site shows the French text.
- [x] **Contact email**: `CONTACT_EMAIL` (where messages go; never shown on the site) and a real SMTP sender — `SMTP_HOST`, `SMTP_PORT` (587), `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_STARTTLS=true`, `SMTP_FROM` on the site's domain (with SPF/DKIM so Gmail does not file it as spam). Send a test message from the live site. Name the hosting and email providers on the privacy page (`frontend/src/content/privacy/*.ts`). Replace the Gmail address by an address on the site's domain created with the host, and update the privacy page (it mentions Gmail).
- [x] **Run `alembic upgrade head`** on each deploy, before starting the new backend.
- [x] **Create the admin** on the server: `uv run python -m app.cli create-admin --username leonard`.
- [x] **Fill missing translations** once the content is in the database (and after adding a language): `uv run python -m app.cli translate-missing` (needs `DEEPL_API_KEY`; never overwrites written text). Until then the Dutch and English sites show French for untranslated content.
- [x] **Dependency audit**: `npm audit` (frontend) and a Python audit (e.g. `uvx pip-audit`) with no unresolved critical/high finding.
- [x] **Unknown URLs return HTTP 404** from the server for the SPA's not-found page (or `noindex`), so search engines do not index soft 404s.
- [x] **Icons at the site root**: `/favicon.svg`, `/favicon.ico`, `/apple-touch-icon.png`, `/icon-192.png`, `/icon-512.png`, `/maskable-512.png` and `/site.webmanifest` (served as `application/manifest+json`) all answer 200 on the live site, and the CSP (`img-src`, `manifest-src`) allows them from `'self'`.

## Recommended

- [ ] Web performance audit (`/webperf`), including whether `react-markdown` (~51 kB gzipped) should be lazy-loaded.
- [ ] Logging configuration so `INFO` login audit lines are kept (only `WARNING`+ reach stderr by default).
- [ ] Rehash admin passwords when argon2 parameters change (`PasswordHasher.check_needs_rehash`, security audit I2) — only needed if the parameters are ever changed.
