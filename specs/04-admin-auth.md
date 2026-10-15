# Spec: Feature 4 — Admin authentication

Status: **APPROVED**

## Objective

Let Léonard (the only administrator) sign in to a private `/admin` area and sign out. This feature delivers **only authentication** and an empty, protected admin area; content editing starts in feature 5.

There is no public sign-up. The admin account is created from the command line.

## Threat model

**Assets:** the admin account; the integrity of the site content (once editing exists).

**Trust boundaries:** `POST /api/admin/login` (anyone on the internet), every `/api/admin/*` endpoint, the session cookie sent by the browser, the CLI (trusted: run by the owner on the server).

| Threat | Abuse case | Mitigation |
|---|---|---|
| Spoofing | Guess or brute-force the password | argon2 hashing, minimum 12 characters, 10 failed attempts per 15 min per IP, generic error |
| Spoofing | Steal the session cookie | `HttpOnly` (no JavaScript access), `Secure`, `SameSite=Strict`, 8 h expiry, random 256-bit token |
| Tampering | Another site makes the browser send admin requests (CSRF) | `SameSite=Strict` cookie; write endpoints accept JSON only |
| Repudiation | "I never logged in" | Log every login success/failure with IP and time (never the password) |
| Information disclosure | Learn whether a username exists (by message or response time) | Same message and same hashing work whether the username exists or not |
| Information disclosure | Database leak reveals passwords or live sessions | Only argon2 hashes and SHA-256 hashes of session tokens are stored |
| Denial of service | Flood the login endpoint (argon2 is CPU-heavy) | Same rate limit; request body size capped by validation (field lengths) |
| Elevation of privilege | Reach an admin endpoint without a session | One `require_admin` dependency on every admin route; test that each returns 401 without a session |

## Assumptions

1. **One** admin account; login with a **username** (not an email: less personal data).
2. Sessions are stored **server-side** in PostgreSQL, so logout really ends the session. *(confirmed)*
3. The session cookie is always `Secure`. Chrome, Edge and Firefox accept secure cookies on `http://localhost`, so local development still works.
4. Rate limiting is kept **in memory**, which is correct while the backend runs as a single process. `shortcut:` comment in the code; to be moved to the database if the site ever runs on several processes.
5. Admin pages are not linked from the public site and carry `<meta name="robots" content="noindex">`.
6. Security headers (CSP, HSTS…) are configured at deployment, not in this feature.

## Data model

| Table | Columns |
|---|---|
| `admin_users` | `id`, `username` (unique, 3–50 chars), `password_hash`, `created_at` |
| `admin_sessions` | `id`, `token_hash` (unique, SHA-256 of the cookie value), `admin_user_id` (FK, cascade delete), `created_at`, `expires_at` |

Expired sessions are deleted at each successful login.

## API

| Method & path | Body | Responses |
|---|---|---|
| `POST /api/admin/login` | `{"username", "password"}` (JSON) | `204` + `Set-Cookie`; `401 {"detail": "Invalid credentials"}`; `429` when rate-limited; `422` malformed body |
| `POST /api/admin/logout` | — | `204`, session deleted, cookie cleared (also `204` without a session) |
| `GET /api/admin/me` | — | `200 {"username"}`; `401` without a valid session |

Cookie: `admin_session=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=28800`.

## Command line

```
uv run python -m app.cli create-admin --username leonard
# prompts for the password twice (hidden input), enforces 12+ characters.
# Run again with the same username to change the password; all its sessions are revoked.
```

## Layers

```
domain/auth.py        AdminUser entity, password policy (min length), session lifetime
infra/security.py     argon2 hashing/verification, token generation and SHA-256
infra/repositories/admin.py   users and sessions (returns domain entities)
infra/rate_limit.py   in-memory login limiter
api/admin_auth.py     login / logout / me routes
api/dependencies.py   require_admin dependency (reused by every future admin route)
app/cli.py            create-admin command
```

## Frontend

Admin pages are **bilingual** *(confirmed)* and live under the language prefix, reusing the public i18n: `/:lang/admin/login` and `/:lang/admin`. `/admin` redirects to `/<browser language>/admin`.

| Route | Behaviour |
|---|---|
| `/:lang/admin/login` | Username + password form. Error message on failure (wrong credentials / too many attempts). Redirects to `/:lang/admin` on success. |
| `/:lang/admin` | Calls `/api/admin/me`; redirects to `/:lang/admin/login` on 401. Shows "Connected as …" and a logout button. Content editing comes in feature 5. |

- Separate minimal admin layout (no public section links), with the language switch and theme toggle; same design tokens.
- The password field uses `autocomplete="current-password"` so password managers work.

## New dependencies

| Package | Why |
|---|---|
| `argon2-cffi` (backend) | Reference argon2 implementation for Python, MIT |

No new frontend dependency.

## Testing Strategy

Abuse cases first:
- Wrong password, unknown username → same 401 body; password never appears in logs.
- 11th failed attempt within 15 minutes → 429; a successful login does not count as a failure.
- `/api/admin/me` and `/api/admin/logout`-protected flows: no cookie, forged cookie, expired session, logged-out session → 401.
- Login sets a cookie with `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/admin`; the database holds only the token hash.
- Changing the password with the CLI revokes existing sessions.
- Password policy: under 12 characters rejected by the CLI.
- Frontend: login form submits JSON and redirects; error messages; `/admin` redirects to login on 401; logout returns to login.

## Boundaries

- **Always:** branch `feature/admin-auth`; every admin route depends on `require_admin`; generic auth errors; security review (security-auditor persona) before merge.
- **Ask first:** any dependency other than `argon2-cffi`; changing cookie flags, session lifetime or rate limits after approval.
- **Never:** log passwords, tokens or hashes; store the token itself; put auth state in `localStorage`; return stack traces.

## Success Criteria

1. After `create-admin`, Léonard can sign in at `/fr/admin/login` (or `/en/…`) and sees the admin area in that language.
2. Wrong credentials show a generic error; the 11th failure in 15 minutes is refused.
3. Without a valid session, `/admin` redirects to the login page and `/api/admin/me` returns 401.
4. Logout ends the session server-side: replaying the old cookie returns 401.
5. The cookie is not readable from JavaScript (`document.cookie` does not show it).
6. All backend and frontend checks pass; migration round-trip passes; security review has no unresolved critical/important finding.

## Decisions

- Sessions stored server-side in PostgreSQL.
- Session lifetime: 8 hours.
- Admin UI bilingual (FR/EN), under `/:lang/admin`.
- Username: `leonard`.
