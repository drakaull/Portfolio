# Tasks: Feature 4 — Admin authentication

Each task: implement → checks green (backend: `uv run ruff check . && uv run ruff format --check . && uv run pytest`; frontend: `npm run lint && npm run format:check && npm test && npm run build`) → one commit.

## Task 1: Auth domain rules and security helpers

**Description:** `AdminUser` entity, password policy and session lifetime in the domain; argon2 hashing/verification and token generation/hashing in infra. Adds `argon2-cffi`.

**Acceptance criteria:**
- [ ] Passwords under 12 characters rejected by the policy
- [ ] `hash_password` / `verify_password` round-trip; wrong password → False; hash never equals the password
- [ ] `new_session_token()` returns a token and its SHA-256; same token → same hash

**Verification:** unit tests
**Dependencies:** None
**Files:** `pyproject.toml`, `uv.lock`, `app/domain/auth.py`, `app/infra/security.py`, `tests/test_security.py`
**Scope:** S

## Task 2: Admin users and sessions tables, migration and repository

**Description:** ORM models, migration, and `AdminRepository`: find user by username, create or update a user (revoking its sessions on password change), create session, find the user of a valid (non-expired) session, delete one session, delete expired sessions.

**Acceptance criteria:**
- [ ] Username unique; session cascade-deleted with its user
- [ ] Expired session → no user; deleted session → no user
- [ ] Password change revokes all sessions of that user

**Verification:** repository tests; migration round-trip
**Dependencies:** Task 1
**Files:** `app/infra/models.py`, `app/infra/repositories/admin.py`, `migrations/versions/<date>-create_admin_tables.py`, `tests/test_admin_repository.py`
**Scope:** M

## Task 3: create-admin command

**Description:** `uv run python -m app.cli create-admin --username leonard`, password asked twice with hidden input.

**Acceptance criteria:**
- [ ] Creates the user, or updates the password of an existing one (revoking sessions)
- [ ] Refuses mismatched passwords and passwords under 12 characters, with a clear message and non-zero exit code

**Verification:** tests calling the command with a patched password prompt
**Dependencies:** Task 2
**Files:** `app/cli.py`, `tests/test_cli.py`
**Scope:** S

## Task 4: Login, logout, me endpoints with rate limiting

**Description:** `POST /api/admin/login`, `POST /api/admin/logout`, `GET /api/admin/me`, `require_admin` dependency, in-memory limiter, login audit logs.

**Acceptance criteria:**
- [ ] Login success → 204 + cookie with `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/admin`, `Max-Age=28800`
- [ ] Wrong password and unknown user → identical 401 body; 11th failure in 15 min → 429
- [ ] `me` → 200 with a valid session; 401 without cookie, with forged, expired or logged-out session
- [ ] Logs contain username, IP and outcome, never the password or token
- [ ] Every `/api/admin/*` route except login/logout requires a session (route-listing test)

**Verification:** API tests (abuse cases first)
**Dependencies:** Task 3
**Files:** `app/api/admin_auth.py`, `app/api/dependencies.py`, `app/infra/rate_limit.py`, `app/main.py`, `tests/test_admin_auth_api.py`
**Scope:** M

## Checkpoint A
- [ ] Backend checks green · human check with the CLI and `/docs`

## Task 5: Bilingual admin login page and protected admin area

**Description:** `/:lang/admin/login` form, `/:lang/admin` protected page (connected user + logout), `/admin` redirect, admin layout with language switch and theme toggle, `noindex`.

**Acceptance criteria:**
- [ ] Successful login redirects to `/:lang/admin`; errors shown for 401 and 429
- [ ] `/:lang/admin` redirects to the login page when `/api/admin/me` returns 401
- [ ] Logout calls the API and returns to the login page
- [ ] Texts translated FR/EN; password field `autocomplete="current-password"`

**Verification:** tests with mocked `fetch`; build
**Dependencies:** Task 4
**Files:** `src/App.tsx`, `src/api/admin.ts`, `src/components/AdminLayout/*`, `src/pages/admin/AdminLoginPage.tsx`, `src/pages/admin/AdminHomePage.tsx`, `src/pages/admin/*.test.tsx`, `src/i18n/*.ts`
**Scope:** M

## Checkpoint B
- [ ] Human browser check · security-auditor review · `/review` · merge into `develop` after approval
