# Spec: Feature 17 — Deployment (v1.0.0)

Status: **APPROVED**

## Objective

Put the site online at **https://leonard-fontaine.com**, hosted in the EU (OVHcloud, France), safely, cheaply,
and in a way Léonard can understand and maintain. First release: `v1.0.0` on `main`.

## Decisions already taken

- **One provider, OVHcloud**: a VPS (VPS-1), the domains **leonard-fontaine.com** and **leonard-fontaine.be**,
  and an email address on the domain (offer checked at order time; Infomaniak Mail as fallback).
- **leonard-fontaine.com is the address**; `.be` (and `www.`) redirect to it permanently.
- Léonard creates the accounts and pays (his name, his card); he never pastes a password in the chat.
  Server access is given with an **SSH key**.

## Architecture

One Linux server (Ubuntu 24.04 LTS) running **Docker Compose** with three containers:

```
Internet ──443/80──▶ Caddy ──/api/*──▶ backend (FastAPI, uvicorn, 1 process)
                       │                    │
                       └─ serves the built   └──▶ PostgreSQL 17 (not reachable from outside)
                          frontend (static)
```

| Piece | Role |
|---|---|
| **Caddy** | Web server: gets and renews the HTTPS certificates automatically (Let's Encrypt), serves the built React site, forwards `/api/*` to the backend, adds the security headers, limits request size, redirects `.be` / `www` / `http` to `https://leonard-fontaine.com`. |
| **backend** | The FastAPI app as today, in a container, **one** uvicorn process (the rate limiters live in memory), trusting the client IP sent by Caddy only. |
| **db** | PostgreSQL 17 with its data on a Docker volume; only the backend can reach it. |
| **Volumes** | `db-data` (database), `storage` (CV, photo), `caddy-data` (certificates). They survive restarts and redeploys. |

The frontend is **built** (`npm run build`) into static files inside the Caddy image: no Node.js on the server
at run time.

## In the repository (done and tested locally before any order)

| File | Content |
|---|---|
| `backend/Dockerfile` | Python + uv, installs the locked dependencies, runs uvicorn with `--proxy-headers --forwarded-allow-ips` set to the Docker network only. |
| `frontend/Dockerfile` | Stage 1 builds the site with Node; stage 2 is Caddy with the built files and the `Caddyfile`. |
| `deploy/Caddyfile` | Domains, redirects, `/api` proxy, SPA fallback, security headers (CSP with the inline theme script's hash, HSTS, nosniff, frame-ancestors, Referrer-Policy, Permissions-Policy), 6 MB body limit, long cache for hashed assets. |
| `deploy/compose.yaml` | The three services, volumes, restart policy, health checks; nothing but Caddy publishes a port. |
| `deploy/.env.example` | Every production setting with an explanation, no secret. The real `.env` exists only on the server. |
| `deploy/backup.sh` | Nightly on the server: `pg_dump` + copy of `storage`, kept 14 days there; documented **restore**. |
| `deploy/pull-backups.ps1` | On Léonard's PC: downloads the latest server backups over SSH into a local folder, keeps the last 8, logs each run. Run by the **Windows Task Scheduler** daily and at log-on when a run was missed. |
| `docs/deployment.md` | Step-by-step runbook: first install, deploy an update, backup/restore, renew/troubleshoot. |
| Not-found pages | `<meta name="robots" content="noindex">` on the SPA's not-found page, so unknown URLs are not indexed. |

Local check: the production stack runs on Léonard's PC with `docker compose` (on `localhost`), the site works,
headers are present, the CSP blocks nothing.

## On the server (together, step by step)

1. **Order** (Léonard, guided): OVHcloud account, VPS-1 with Ubuntu 24.04 in France, the two domains, the email offer.
2. **SSH key** (Léonard, guided): create a key pair on his PC; the public half goes to OVH at order time.
3. **Secure the server**: non-root user with sudo, SSH by key only (no password, no root login), firewall
   allowing only 22 / 80 / 443, automatic security updates.
4. **Install Docker**, clone the repository (`main`), write `.env` on the server (database password generated
   there, DeepL key, SMTP settings).
5. **DNS**: point `leonard-fontaine.com`, `www`, and the `.be` names at the server; email records
   (MX, **SPF, DKIM, DMARC**) so the contact emails are not spam.
6. **Start**: `docker compose up -d --build`, `alembic upgrade head`, `create-admin`, then content: CV and photo
   uploads, `translate-missing`.
7. **Checks**: HTTPS valid on every name, redirects, headers (securityheaders.com, SSL Labs), icons and manifest
   answer 200, contact form email arrives, admin login works, rate limits see real visitor IPs.
8. **Backups**: nightly job active on the server; the Windows scheduled task on Léonard's PC pulls them; one **restore test** done.

## Release

- `develop` → `main` (merge `--no-ff`), tag **`v1.0.0`**, the server runs `main`.
- Later updates: merge into `main`, then on the server `git pull` + `docker compose up -d --build` (+ migrations).

## Content and legal updates at release

- `CONTACT_EMAIL` and `SMTP_FROM` on the domain; the privacy page (FR/EN/NL) names **OVHcloud** (hosting, email)
  and **DeepL** (translation of admin texts), and no longer mentions Gmail.
- The public CV is replaced (no phone number, no birth date) — Léonard's file.

## Out of scope

CI/CD (automatic deploy on push), monitoring/alerting services, a staging server, a CDN. Possible later.

## Decided

- **Off-server copy of the backups: Léonard's PC**, automatically (Windows Task Scheduler), no paid option.
- **Rotation, never piling up**: the server keeps the last 14 nightly backups, the PC the last 8 (a setting at the top of the script); each new one replaces the oldest. Expected size: under 10 MB each.

## Open question

- Email offer: what OVH includes with the domain (checked at order time; Infomaniak Mail as fallback).
