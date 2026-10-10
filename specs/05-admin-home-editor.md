# Spec: Feature 5 — Edit the home page from the admin

Status: **APPROVED**

## Objective

Léonard edits everything shown on the home page without touching the database or the server: headline and introduction in French and English (Markdown with a live preview), LinkedIn and GitHub URLs, and the CV PDF (upload, replace, remove).

This is the first admin editor; its patterns (form, validation, save feedback, unsaved-changes protection, guarded admin routes) will be reused for experiences, skills and projects.

## Threat model (additions to feature 4)

| Threat | Abuse case | Mitigation |
|---|---|---|
| Elevation of privilege | Call the edit endpoints without a session | All routes on `protected_router` (automatic 401), covered by the existing route-walking test |
| Tampering | Submit unexpected fields or languages, huge texts | Strict Pydantic schemas (`extra="forbid"`), length limits, only `en`/`fr` keys |
| Tampering / XSS | Store a `javascript:` URL in a link | URLs must be `https://`; Markdown keeps raw HTML escaped (feature 3) |
| Tampering | Upload a non-PDF (HTML, executable) named `.pdf` | Check content type **and** the `%PDF-` magic bytes; fixed file name; served with `Content-Type: application/pdf` |
| Denial of service | Upload a huge file | 5 MB cap, read in chunks and abort past the cap |
| Data loss | Crash while writing the CV leaves a broken file | Write to a temporary file in the same folder, then atomic rename |
| CSRF | Another site posts a file upload (multipart is a "simple" request) | `SameSite=Strict` cookie: the browser never sends it on cross-site requests |

## Assumptions

1. **French is not mandatory**: an empty French field falls back to English on the public site (feature 3 convention). English is required.
2. Limits: headline ≤ 120 characters, introduction ≤ 5,000 characters, URLs ≤ 255 characters and `https://` only.
3. No concurrent-edit detection (single admin); the last save wins.
4. Saving replaces the whole home content (`PUT`), not individual fields.
5. If the session expires while editing, the typed text stays in the form; a message explains how to sign in again and save.

## API (all under `protected_router`)

| Method & path | Body | Responses |
|---|---|---|
| `GET /api/admin/home` | — | `200 {"headline": {"en", "fr"}, "intro": {"en", "fr"}, "linkedin_url", "github_url", "has_cv"}` |
| `PUT /api/admin/home` | same shape without `has_cv` (JSON) | `200` with the saved content; `422` with per-field errors |
| `PUT /api/admin/cv` | `multipart/form-data`, field `file` | `204`; `413` over 5 MB; `415` not a PDF |
| `DELETE /api/admin/cv` | — | `204` (also when there was no CV) |

The public `GET /api/home` and `GET /api/cv` are unchanged and reflect edits immediately.

## Layers

```
domain/home.py                  + validation rules shared by API (limits)
infra/repositories/home.py      + save(HomeContent)
infra/storage.py                + save_cv(chunks) (atomic), delete_cv()
api/admin_home.py               GET/PUT /admin/home, PUT/DELETE /admin/cv
```

## Frontend

| Route | Content |
|---|---|
| `/:lang/admin` | Dashboard: signed-in user, sign-out, list of editable sections (only "Home page" for now) |
| `/:lang/admin/home` | Editor |

**Editor layout:**
- One section per field; headline and introduction have **FR / EN tabs**.
- Introduction: textarea on the left, **live Markdown preview** on the right (stacked on narrow screens), rendered with the same component as the public page.
- LinkedIn / GitHub URL fields with browser and server validation.
- CV block: current state ("CV online" with a link to view it, or "No CV"), upload/replace button (PDF only), remove button with confirmation.
- "Save" button, disabled while saving or when nothing changed; "Saved" confirmation; server errors shown next to the right field.
- **Unsaved changes:** in-app navigation away from a modified form asks for confirmation (React Router data router `useBlocker`), and the browser warns on reload/close (`beforeunload`).

**Guarded admin routes:** the session check moves from the dashboard into the admin layout, so every admin page (except login) redirects to login without a session.

## Testing Strategy

- **Backend:** 401 without session (route-walking test picks up the new routes automatically); `PUT` validation: missing English, too long, `http://` or `javascript:` URL, unknown language key, extra field → 422; successful save visible on `GET /api/home`. CV: wrong type → 415, fake PDF (right type, wrong bytes) → 415, over the cap → 413, success → served by `/api/cv`, delete → 404 on `/api/cv`; no temp file left behind.
- **Frontend:** editor loads current content; preview renders Markdown and escapes HTML; save sends the right JSON and shows "Saved"; 422 errors appear next to fields; 401 shows the session message and keeps the text; unsaved-changes warning when dirty; CV upload and removal; non-admin access redirects to login.

## Boundaries

- **Always:** branch `feature/admin-home-editor`; every new admin route on `protected_router`; validation on the server (browser checks are a convenience only); security review before merge.
- **Ask first:** any new dependency; storing other file types.
- **Never:** trust the file name or browser-declared type alone; write uploads outside `storage_dir`; render Markdown with raw HTML.

## Success Criteria

1. Léonard changes the headline and introduction in both languages and sees them on `/fr` and `/en` right after saving.
2. The preview matches the public rendering while typing.
3. An `http://` URL, an empty English headline or a too-long text are refused with a clear message next to the field.
4. Uploading a PDF makes "View my CV" appear on the home page; removing it hides the button; a renamed non-PDF is refused.
5. Leaving the editor with unsaved changes asks for confirmation.
6. All checks pass; security review has no unresolved critical/important finding.

## Decisions

- Markdown editing: plain textarea with live preview using the existing `react-markdown` (no new dependency).
- Unsaved changes: switch to React Router's data router (`createBrowserRouter`) to block in-app navigation, plus `beforeunload`.
- CV size limit: 5 MB.
- Admin structure: dashboard listing editable sections, one editor page per section.
