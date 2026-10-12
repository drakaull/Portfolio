# Spec: Feature 12 — Projects (GitHub sync)

Status: **APPROVED**

## Objective

Projects come from Léonard's **public GitHub repositories** instead of being typed by hand: a **"Sync with GitHub"** button in the admin imports or refreshes them in one go, **summary included (the repository's "About")**; Léonard then completes each project, orders them and chooses which ones visitors see. The public page layout is decided **after** seeing the real data (a later step of this feature).

## Decisions already taken

- Source: `GET https://api.github.com/users/drakaull/repos` (public repositories only, **no token**). GitHub is called **only when the button is pressed**; the public site reads the database only.
- **Forks and archived repositories are ignored.**
- A newly imported project is **hidden** until Léonard makes it visible.
- What Léonard edits in the admin is **never overwritten** by a sync; a sync only refreshes what comes from GitHub.
- Public display (carousel kept in commit `f834e2f` or something else): decided once the real data is visible.

## Data

| Field | From | Editable in the admin |
|---|---|---|
| GitHub id, name, link, homepage, description, languages (with share), topics, created / last pushed dates, stars | GitHub, refreshed on every sync | no |
| Title | starts as the repository name, cleaned (`Projet_TTMC` → "Projet TTMC") | yes |
| Summary FR / EN / NL | the repository's **"About"** (GitHub `description`), kept in its own language; DeepL detects that language and translates to the two others | no — edited on GitHub |
| Context | school / personal / professional | yes |
| Team size | number, empty if unknown | yes |
| Visible on the site | hidden by default | yes |
| Position | new projects go last | yes (arrows, like the skills) |
| "Not found on GitHub" | set by the sync | no |

## Sync rules

- New public repository (not fork, not archived) → new project, **hidden**.
- Known repository → GitHub fields refreshed; admin fields untouched. The summary is translated again **only when the "About" changed** (no DeepL characters spent otherwise).
- DeepL unavailable during a sync → the "About" is still saved; the missing languages fall back to the original text and are translated at the next sync.
- Repository gone from the public list (deleted, made private, archived) → project **kept, hidden automatically, marked "not found on GitHub"** in the admin; Léonard can delete it for good. If it comes back, the mark is removed but it stays hidden until Léonard shows it again.
- A sync reports what it did: "2 new, 3 updated, 1 not found".
- GitHub unreachable or rate limit reached (60 calls/hour without a token; one sync uses 1 call + 1 per repository for its languages): nothing changes, a clear message is shown.

## Admin

```
/:lang/admin/projects
  [Sync with GitHub]   Last sync: 12/10/2026 15:42 — 2 new, 3 updated
  ┌──────────────────────────────────────────────────────────────┐
  │ ☐ Projet TTMC        Java · 2024 · School      Edit           │
  │ ☑ Portfolio          TypeScript · 2026 · Personal   Edit      │
  │ ☐ OTEAL ceremony     TypeScript · 2025 · —  Edit              │
  │ ⚠ Old repo (not found on GitHub)              Edit  Delete   │
  └──────────────────────────────────────────────────────────────┘
/:lang/admin/projects/:id    title, summary FR·EN·NL (translation tabs), context, team size,
                             visible; GitHub data shown read-only
```

- The visibility checkbox in the list saves at once (no form to open).
- Projects keep a **manual order** (▲ ▼ arrows, like the skills); new ones are added last.
- The "About" and its translations are shown read-only, with a link to edit it on GitHub.

## Backend

- Table `projects` (Alembic migration) with the fields above; unique GitHub id.
- `GitHubClient` in `infra` (httpx, 10 s timeout, injectable transport for tests, like `Translator`).
- Admin routes (session required): list, get, update, delete, `POST /api/admin/projects/sync`.
- Public route `GET /api/projects?lang=` → visible projects only, localized summary (French fallback). Shape finalised with the public page.

## Testing Strategy

- Sync with a fake GitHub and a fake translator: new, updated, gone, back again, forks/archived ignored, admin fields kept, "About" translated only when it changed, GitHub errors / rate limit leave the database unchanged.
- Admin routes require a session; update (title, context, team size, visibility), move up/down, delete.
- Public route returns only visible projects, localized.
- Frontend: list with order arrows, sync button and its report, visibility toggle, edit form (About and translations read-only), not-found mark.
- One optional live test against the real GitHub API (skipped by default, like DeepL's).

## Boundaries

- **Always:** branch `feature/projects`; no new dependency (httpx already installed); no GitHub token.
- **Ask first:** the public page design (after the data is in).
- **Never:** call GitHub from the public site or on a schedule; overwrite admin-edited fields during a sync.

## Success Criteria

1. One click imports the 4 current public repositories, hidden.
2. Léonard sets the context, orders the projects and makes one visible; it appears on the public API in FR/EN/NL with its translated "About".
3. A second sync changes nothing he wrote; a deleted test repository ends up hidden and marked.
4. All checks pass; admin screenshots in both themes, desktop and 390 px.

## Decisions (round 2)

- Public repositories only (no token).
- A repository that disappears is kept, **hidden automatically** and marked "not found on GitHub".
- The summary is the repository's **"About"**, synced from GitHub and translated by DeepL (source language detected); it is not edited in the admin.
- **Manual order** with arrows.

## Decisions (round 3)

- A project without "About" can still be made visible (card without summary); Léonard fills the "About" on GitHub himself.
- The title stays editable in the admin, starting from the cleaned repository name.

## Decisions (round 4, Checkpoint B)

- Public page: a **grid of cards** (layout details in Task 6).
- The "About" of OTEAL_ceremony, AemtHackatonBackend and Projet_TTMC were written from an analysis of each repository and set on GitHub with Léonard's approval.
