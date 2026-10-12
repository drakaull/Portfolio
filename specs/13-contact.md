# Spec: Feature 13 — Contact

Status: **APPROVED**

## Objective

Visitors send Léonard a message from the **Contact** page. The message is **saved** (admin inbox) and **emailed** to him. A **privacy page** explains what happens to the data (GDPR), linked from the form and the footer.

## Decisions already taken

- Fields: **name, email, message** (data minimisation; no consent checkbox, as decided at the start).
- Anti-spam without third parties: a **hidden trap field** (filled only by robots: the message is dropped silently, the robot sees "sent") + **5 messages per hour per IP address** (in memory, like the login limiter; the IP is never stored).
- Messages: **admin inbox** (list, read / unread, delete), **deleted automatically after 12 months**.
- No email to the sender: a confirmation **on the page** only (an automatic email to any typed address could be abused to send spam).
- Destination address: Léonard's Gmail, **configured in `.env`** (`CONTACT_EMAIL`), never written in the code, and **never shown on the site** (spam robots harvest visible addresses): the contact form is the way to reach Léonard and to exercise one's rights.
- Privacy page: drafted in French (simple, honest, adapted to the site), translated to EN/NL, **reviewed by Léonard** before it goes in. Not legal advice.
- Email sending with Python's standard `smtplib` (no new dependency); Mailpit (already in `docker-compose.yml`) catches every email locally.

## Public page

```
~/portfolio/contact
Contact

Nom      [                    ]
E-mail   [                    ]
Message  [                    ]
         [                    ]
[Envoyer]
Vos données servent uniquement à vous répondre — vie privée →

✓ Merci, votre message est bien envoyé. Je vous réponds au plus vite.
```

- Errors shown next to their field; a clear message when the limit is reached ("try again in an hour") or the server fails (the text typed is kept).
- The trap field is hidden from people and screen readers (`aria-hidden`, out of the tab order, `autocomplete="off"`).

## Privacy page `/:lang/privacy`

Sections: who is responsible (Léonard Fontaine, reachable through the contact form) · what is collected (name, email, message; nothing else: no cookies, no analytics, no tracker — the theme and language choices stay in the browser) · why and on which basis (to answer — legitimate interest / steps before a possible contract) · how long (12 months, then deleted; earlier on request) · who can see it (Léonard only; hosting and email providers as processors, named at deployment) · rights (access, correction, deletion, objection), exercised through the contact form · complaint to the Belgian **Autorité de protection des données**.

Linked from under the form and from the footer on every page.

## Admin

```
/:lang/admin                    dashboard: "Messages (2 unread)"
/:lang/admin/messages           newest first: ● unread, name, email, date, first line
                                open → full message, "Reply" (mailto: link), mark unread, delete
```

## Validation (server)

| Field | Rule |
|---|---|
| name | required, 1–100 characters, no line break |
| email | required, ≤ 254 characters, `something@domain.tld` shape, no line break |
| message | required, 10–5,000 characters |
| website (trap) | must be empty; otherwise the message is dropped (answer still 204) |

## Backend

- Table `contact_messages`: id, name, email, message, language of the page, created_at, read (Alembic migration). No IP address stored.
- `POST /api/contact` → 204; 422 invalid; 429 over the limit. The message is saved first; the email is then sent (in a thread, 10 s timeout). **If the email fails, the message is still saved** (logged warning; the admin inbox has it).
- Email: `From` = the site's sending address (`SMTP_FROM`), `Reply-To` = the visitor, subject "Portfolio — message from {name}"; plain text; line breaks refused in name and email (no header injection).
- Admin routes (session required): list, get (marks as read), mark unread, delete.
- Messages older than 12 months are deleted whenever a message is received or the inbox is listed (no scheduler needed).
- Settings: `CONTACT_EMAIL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_STARTTLS`; defaults point at Mailpit (`localhost:1025`). Deployment items added to `docs/deployment-checklist.md`.

## Testing Strategy

- **Backend:** saving + email sent (fake SMTP); email failure still saves; trap field drops silently; limit → 429 after 5; validation (including line breaks); admin routes need a session; reading marks as read; 12-month purge; no IP stored.
- **Frontend:** form validation messages, success message, limit and server errors keep the text, trap field invisible to people; privacy page in 3 languages and footer link; admin inbox (unread first mark, open, mark unread, delete with confirmation).
- **Manual:** a real message caught by Mailpit (http://localhost:8025).
- **Visual:** contact, privacy and inbox pages in both themes, desktop and ~390 px.

## Boundaries

- **Always:** branch `feature/contact`; no new dependency; no third-party service in the page.
- **Ask first:** the privacy text (review before integration); any SMTP provider choice (deployment).
- **Never:** store IP addresses; send email to the visitor; write the destination address in the code.

## Success Criteria

1. A message sent from `/fr/contact` appears in Mailpit and in the admin inbox.
2. A robot filling the trap field gets "sent" but nothing is saved or emailed; a sixth message within an hour is refused politely.
3. The privacy page exists in FR/EN/NL, reviewed by Léonard, linked from the form and the footer.
4. Messages older than 12 months disappear.
5. All checks pass; screenshots in both themes, desktop and 390 px.

## Decisions (round 2)

- The destination address is never shown on the site; rights are exercised through the contact form.
- Message 10–5,000 characters; 5 messages per hour per IP.
