# Implementation Plan: Feature 13 — Contact

Spec: [13-contact.md](../specs/13-contact.md) · Task list: [todo.md](todo.md) · Branch: `feature/contact`

## Overview

Contact form saved in the database and emailed to Léonard (Mailpit locally), protected by a hidden trap field and a per-IP limit; admin inbox with 12-month retention; privacy page in three languages.

## Architecture Decisions

- **Table `contact_messages`** (Alembic): name, email, message, language, created_at, read. No IP address.
- **`Mailer`** in `infra`: standard `smtplib` run in a worker thread (`anyio.to_thread`), 10 s timeout, STARTTLS and login optional; settings default to Mailpit (`localhost:1025`). Tests inject a fake mailer through a FastAPI dependency, like the translator.
- **Order of operations** on `POST /api/contact`: validate → trap field (drop silently) → rate limit → save + commit → email. An email failure is logged; the visitor still gets 204 because the message is safe in the inbox.
- **Rate limit** reuses the login limiter's pattern (in memory, per IP, sliding hour); the deployment checklist already covers the real client IP behind the proxy.
- **Retention**: `DELETE … WHERE created_at < now() - 12 months` run when a message arrives and when the inbox is listed.
- **Privacy text** as Markdown files per language (`frontend/src/content/privacy.{fr,en,nl}.md`), rendered by the existing `MarkdownText`; French drafted first and reviewed by Léonard, then translated.

## Task List

### Phase 1: Backend
- [x] Task 1: Model, migration, repository (add, list, get, mark read / unread, delete, purge), settings and `Mailer`
- [x] Task 2: `POST /api/contact` (validation, trap, limit, save, email) and admin routes

### Checkpoint A: after Tasks 1–2
- [x] ruff + pytest green; migration up/down; every admin route refused without a session
- [ ] Human: a message posted to the API shows up in Mailpit (http://localhost:8025)

### Phase 2: Frontend
- [ ] Task 3: Contact form page
- [ ] Task 4: Privacy page — French draft for review, then EN/NL, footer and form links
- [ ] Task 5: Admin inbox + unread count on the dashboard

### Checkpoint B: after Tasks 3–5
- [ ] Screenshots (both themes, desktop and 390 px)
- [ ] Human: privacy text approved; a real message sent from the site, read and deleted in the admin

### Checkpoint C: complete
- [ ] Code review
- [ ] Merge into `develop` after approval

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Header injection through name / email | High | Line breaks refused by validation; `email.message.EmailMessage` builds the headers |
| Email failure loses a message | High | Saved and committed before sending; failure only logged |
| Spam floods the inbox | Med | Trap field + 5 per hour per IP; real IP needed behind the proxy (checklist) |
| Legal wording of the privacy page | Med | Plain, honest text reviewed by Léonard; not legal advice |
| Gmail address leaks onto the site | Med | Only in `.env`; never sent to the frontend; test checks the API never returns it |

## Open Questions

None.
