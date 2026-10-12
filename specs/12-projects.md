# Spec: Feature 12 — Projects (GitHub sync)

Status: **DRAFT** (waiting for Léonard's approval)

## Objective

Projects come from Léonard's **public GitHub repositories** instead of being typed by hand: a **"Sync with GitHub"** button in the admin imports or refreshes them in one go; Léonard then completes each project and chooses which ones visitors see. The public page layout is decided **after** seeing the real data (a later step of this feature).

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
| Summary FR / EN / NL | written by Léonard (the GitHub description is shown as a hint); EN/NL translated by DeepL like the other editors | yes |
| Context | school / personal / professional | yes |
| Team size | number, empty if unknown | yes |
| Visible on the site | hidden by default | yes |
| "Not found on GitHub" | set by the sync | no |

## Sync rules

- New public repository (not fork, not archived) → new project, **hidden**.
- Known repository → GitHub fields refreshed; admin fields untouched.
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
- A project can be made **visible only once it has a French summary** (otherwise the public card would be empty).

## Backend

- Table `projects` (Alembic migration) with the fields above; unique GitHub id.
- `GitHubClient` in `infra` (httpx, 10 s timeout, injectable transport for tests, like `Translator`).
- Admin routes (session required): list, get, update, delete, `POST /api/admin/projects/sync`.
- Public route `GET /api/projects?lang=` → visible projects only, localized summary (French fallback). Shape finalised with the public page.

## Testing Strategy

- Sync with a fake GitHub: new, updated, gone, back again, forks/archived ignored, admin fields kept, GitHub errors / rate limit leave the database unchanged.
- Admin routes require a session; visibility refused without a French summary; delete.
- Public route returns only visible projects, localized.
- Frontend: list, sync button and its report, visibility toggle, edit form with translation tabs, not-found mark.
- One optional live test against the real GitHub API (skipped by default, like DeepL's).

## Boundaries

- **Always:** branch `feature/projects`; no new dependency (httpx already installed); no GitHub token.
- **Ask first:** the public page design (after the data is in).
- **Never:** call GitHub from the public site or on a schedule; overwrite admin-edited fields during a sync.

## Success Criteria

1. One click imports the 4 current public repositories, hidden.
2. Léonard writes a summary, sets the context, makes one visible; it appears on the public API in FR/EN/NL.
3. A second sync changes nothing he wrote; a deleted test repository ends up hidden and marked.
4. All checks pass; admin screenshots in both themes, desktop and 390 px.

## Open questions

1. Rule for a repository that disappears (keep, hide, mark) — confirmed?
2. "Visible only with a French summary" — OK?
3. Order of projects (admin and public): **most recently updated on GitHub first** — or manual order with arrows like the skills?
