# Spec: Feature 10 — Experience editor

Status: **APPROVED**

## Objective

Léonard manages the timeline ("Parcours") from the admin: **list, create, edit and delete** experiences, writing in French once and getting English and Dutch from DeepL, like the home editor.

## Decisions already taken

- Scope: create, edit, delete (permanent, after a confirmation). No draft/published state.
- Address (slug): proposed from the French title + organisation when creating, editable until the first save, then **fixed** (shared links never break).
- Technologies: one text field, comma-separated (`Python, Docker, Amazon S3`).
- Order on the site: automatic by years, as today (most recent first).
- Translation: same behaviour as the home editor — tabs **FR · EN · NL**, a "Translate from French" button per translated tab (confirmation before replacing text), empty translations filled on save, warning if DeepL fails (the site then shows French).
- Unsaved-changes guard as in the home editor.

## Pages

```
/:lang/admin                     dashboard: new link "Parcours / Experience"
/:lang/admin/experiences         list
/:lang/admin/experiences/new     creation form
/:lang/admin/experiences/:slug   edit form (+ delete)
```

**List**

```
Parcours                                   [+ New experience]
┌──────────────────────────────────────────────────────────┐
│ 2026 – …   R&D engineer · I-care Group   Student job  Edit │
│ 2026       R&D engineer · I-care Group   Internship   Edit │
│ 2024       Fast AI training · Ateliers…  Education    Edit │
└──────────────────────────────────────────────────────────┘
```

Same order as the public timeline; title shown in the admin's interface language (French fallback).

**Form**

```
Kind            [Job ▾]                 (job, student job, internship, education)
Organisation    [I-care Group      ]    (not translated)
Years           [2026] – [    ] (empty end year = ongoing)
Address         /experience/[ingenieur-rd-i-care-group]   (fixed after creation)
Technologies    [Amazon S3, Python, NoSQL, Docker]

Texts  [FR] [EN] [NL]                  (Translate from French on EN / NL)
  Title         [...]
  Summary       [...]                  (short sentence shown on the card)
  Description   [... Markdown ...]  │ Preview

[Save]                                 [Delete] (edit only, with confirmation)
```

## Validation (server is the authority; the form mirrors it)

| Field | Rule |
|---|---|
| kind | one of job, student_job, internship, education |
| organisation | required, 1–120 characters |
| start year | 1950–2100 |
| end year | empty (ongoing) or ≥ start year, ≤ 2100 |
| slug | creation only; `a-z0-9-`, 1–80 characters, unique (409 if taken) |
| technologies | 0–15 items, each 1–40 characters, duplicates removed |
| title | French required, 1–120 characters per language |
| summary | French required, 1–220 characters per language |
| description | optional (Markdown), up to 5,000 characters per language |

English and Dutch are optional everywhere: empty ones are translated on save.

## Backend

- New admin routes (session required, as every `/api/admin` route):
  - `GET /api/admin/experiences` — list, every language;
  - `GET /api/admin/experiences/{slug}`;
  - `POST /api/admin/experiences` — create (201; 409 if the slug exists);
  - `PUT /api/admin/experiences/{slug}` — replace everything except the slug;
  - `DELETE /api/admin/experiences/{slug}` — 204.
- Save responses report the auto-translated languages and DeepL failures (same shape as the home save).
- The translated experience fields (title plain, summary plain, description Markdown) are declared once in the domain and shared with `translate-missing`.
- No migration: the table already has every column.

## Frontend

- The home editor's translation block (tabs, translate button, confirmation, messages) becomes a shared component used by both editors.
- New interface texts in `en.ts`, `fr.ts` and `nl.ts`.

## Testing Strategy

- **Backend:** each route requires a session; create/edit/delete reach the public API; validation errors (table above) return 422 with the field; duplicate slug → 409; unknown slug → 404; slug cannot change on edit; empty translations filled, written ones never replaced; DeepL failure still saves.
- **Frontend:** list in public order; create with proposed slug; edit keeps the slug read-only; delete asks first; translation per tab; unsaved-changes guard; validation messages.
- **Visual:** list and form in both themes, desktop and ~390 px.

## Boundaries

- **Always:** branch `feature/experience-editor`; reuse the home editor's patterns; no new dependency.
- **Ask first:** any change to the public timeline's look.
- **Never:** change a slug after creation; overwrite written translations automatically.

## Success Criteria

1. From the admin, Léonard creates an experience; it appears at the right place on `/fr/experience`, `/en/experience` and `/nl/experience` (translated).
2. Editing any field updates the public site immediately; the address does not change.
3. Deleting asks for confirmation, then the entry disappears from the timeline and from the home "recent path".
4. Invalid input is refused with a clear message next to the field.
5. All checks pass; screenshots of the list and form in both themes and at 390 px.

## Decisions (round 2)

- The description is optional: only the French title and summary are required.
- Limits: 15 technologies × 40 characters; title 120 characters.
- A deleted entry's old address returns the not-found page.
