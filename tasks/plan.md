# Implementation Plan: Feature 4 — Admin authentication

Spec: [04-admin-auth.md](../specs/04-admin-auth.md) · Task list: [todo.md](todo.md) · Branch: `feature/admin-auth`

## Overview

Single-admin authentication: account created by CLI, argon2 password, server-side sessions in PostgreSQL behind an `HttpOnly; Secure; SameSite=Strict` cookie, rate-limited login, and a bilingual protected `/:lang/admin` area with login and logout.

## Architecture Decisions

- **Token never stored**: the cookie holds a random 256-bit token; the database stores its SHA-256. A database leak gives no usable session.
- **Constant-work login**: an unknown username still runs one argon2 verification against a dummy hash, so response time does not reveal which usernames exist.
- **`require_admin` dependency** returns the domain `AdminUser`; every future admin route declares it, and a test lists admin routes to prove none is missing it.
- **Cookie scoped to `Path=/api/admin`**: the browser sends it only to admin API calls, never to public endpoints.
- **In-memory rate limiter keyed by client IP** (single process). In production behind a reverse proxy, the client IP must come from the proxy header (uvicorn `--proxy-headers` with a trusted proxy list); noted for the deployment feature.
- **Admin routes reuse the `/:lang` prefix**, so the language switch and dictionaries work unchanged.

## Task List

### Phase 1: Backend
- [x] Task 1: Auth domain rules and security helpers
- [x] Task 2: Admin users and sessions tables, migration and repository
- [ ] Task 3: `create-admin` command
- [ ] Task 4: Login, logout, me endpoints with rate limiting

### Checkpoint A: after Tasks 1–4
- [ ] ruff + pytest green, migration round-trip green
- [ ] Human check: create the account with the CLI, sign in through `/docs`, `/api/admin/me` → 200, logout → 401

### Phase 2: Frontend
- [ ] Task 5: Bilingual admin login page and protected admin area

### Checkpoint B: complete
- [ ] Human browser check of the 6 spec success criteria
- [ ] Security review (security-auditor persona) + code review (`/review`)
- [ ] Merge into `develop` after approval

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| A future admin route forgets `require_admin` | High | Test iterating over every `/api/admin/*` route except login/logout, asserting 401 without a cookie |
| Brute force from many IPs | Med | 12+ character password policy and argon2 cost make online guessing impractical; limiter slows each IP |
| Wrong client IP behind a proxy makes the limiter global or bypassable | Med | Documented for deployment (trusted proxy headers) |
| Secure cookie refused on local HTTP | Low | Chromium and Firefox accept it on `localhost`; verified at Checkpoint A |
| Password or token in logs | High | Log only username, IP and outcome; test asserts the password is absent from captured logs |

## Open Questions

None.
