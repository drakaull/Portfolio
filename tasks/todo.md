# Todo: Feature 13 — Contact

Plan: [plan.md](plan.md)

## Task 1: Model, repository, mailer

**Acceptance criteria:**
- [ ] Migration creates `contact_messages` (dropped on downgrade); no IP column
- [ ] Repository: add, list (newest first), get, set read, delete, purge older than 12 months
- [ ] `Mailer.send(message)` builds a plain-text email (From = `SMTP_FROM`, To = `CONTACT_EMAIL`, Reply-To = visitor) and sends it through SMTP in a thread; errors → `MailUnavailable`
- [ ] Settings with Mailpit defaults; `.env.example` updated

**Files:** `backend/app/domain/contact.py`, `backend/app/infra/models.py`, migration, `backend/app/infra/repositories/contact.py`, `backend/app/infra/mail.py`, `backend/app/infra/config.py`, tests
**Scope:** M

## Task 2: API routes

**Acceptance criteria:**
- [ ] `POST /api/contact` → 204; 422 (fields, line breaks); trap field → 204, nothing saved or sent; 6th message within an hour from one IP → 429
- [ ] Email failure → still 204, message saved, warning logged
- [ ] Admin: list (purges first), get (marks read), mark unread, delete; unread count in the list response

**Files:** `backend/app/api/contact.py`, `backend/app/api/admin_contact.py`, `backend/app/api/dependencies.py`, `backend/app/main.py`, tests
**Scope:** M

## Checkpoint A
- [ ] ruff + pytest green · message caught by Mailpit

## Task 3: Contact page

**Acceptance criteria:**
- [ ] Name, email, message with labels and server errors next to fields; trap field hidden from people and screen readers
- [ ] Success message; limit and server errors keep the text; link to the privacy page
- [ ] Texts in en/fr/nl

**Files:** `frontend/src/api/contact.ts`, `frontend/src/pages/ContactPage.*`, i18n, tests
**Scope:** M

## Task 4: Privacy page

**Acceptance criteria:**
- [ ] French text drafted and approved by Léonard, then EN/NL
- [ ] `/:lang/privacy` route; links from the footer and under the form

**Files:** `frontend/src/content/privacy.*.md`, `frontend/src/pages/PrivacyPage.tsx`, routes, footer, i18n, tests
**Scope:** S

## Task 5: Admin inbox

**Acceptance criteria:**
- [ ] `/:lang/admin/messages`: list (unread marked), open, reply (mailto), mark unread, delete with confirmation
- [ ] Dashboard link with the unread count

**Files:** `frontend/src/api/adminContact.ts`, `frontend/src/pages/admin/MessageListPage.*`, `MessagePage.*`, routes, dashboard, i18n, tests
**Scope:** M

## Checkpoint B
- [ ] Screenshots · privacy text approved · real message end to end

## Checkpoint C
- [ ] Review · merge approval
