# Implementation Plan: Feature 12 — Projects (GitHub sync)

Spec: [12-projects.md](../specs/12-projects.md) · Task list: [todo.md](todo.md) · Branch: `feature/projects`

## Overview

A "Sync with GitHub" admin button imports Léonard's public repositories (forks and archived ignored) with their "About" translated by DeepL; the admin orders them, sets title / context / team size and visibility. The public page is designed with Léonard once the real data is in.

## Architecture Decisions

- **Table `projects`** (Alembic): GitHub fields (`github_id` unique, name, url, homepage, about, about language, languages as JSON `{name: share}`, topics, created / pushed dates, stars), translated summary (jsonb `{fr,en,nl}` like the other texts), admin fields (title, context, team size, visible, position), `missing` flag.
- **`GitHubClient`** in `infra` (httpx, 10 s timeout, injectable transport, like `Translator`): one call for the repositories, one per kept repository for its languages; errors and rate limit → `GitHubUnavailable`.
- **`Translator` gains source detection**: translating without `source_lang` returns the text and the language DeepL detected. The existing French-source path is unchanged.
- **`sync_projects(repository, github, translator)`** in `infra` next to `fill_missing`: fetches first, then writes everything in one transaction (GitHub failure → nothing written); translates an "About" only when it changed.
- **Ordering** like the skills: `position`, new projects appended, `move` swaps neighbours.
- **Admin first, public later**: the public route and page come after Léonard has seen his data (Checkpoint B), so the card design fits the real content.

## Task List

### Phase 1: Backend
- [x] Task 1: Model, migration, domain and repository (list, get, update admin fields, move, delete)
- [x] Task 2: `GitHubClient`, DeepL source detection, `sync_projects`
- [ ] Task 3: Admin routes (list, get, update, move, delete, sync) + public route

### Checkpoint A: after Tasks 1–3
- [ ] ruff + pytest green; migration up/down; every admin route refused without a session
- [ ] Optional live test against the real GitHub API passes

### Phase 2: Admin
- [ ] Task 4: Admin project list (sync button + report, visibility toggle, arrows, not-found mark, delete) + dashboard link
- [ ] Task 5: Admin project form (title, context, team size, visible; GitHub data and translated "About" read-only)

### Checkpoint B: after Tasks 4–5
- [ ] Screenshots (both themes, desktop and 390 px)
- [ ] Human: sync the real repositories, fill them in; **decide the public card design together**

### Phase 3: Public
- [ ] Task 6: Public Projects page (design decided at Checkpoint B)

### Checkpoint C: complete
- [ ] Code review (`/review`)
- [ ] Merge into `develop` after approval

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| GitHub rate limit (60 calls/hour without a token) | Low | 1 + N calls per sync; clear message; nothing written on failure |
| Sync overwrites admin edits | High | GitHub fields and admin fields are separate columns; tests prove a second sync keeps admin fields |
| DeepL detects the wrong language for a short "About" | Low | Detected language shown in the admin; the original is always kept |
| Repository renamed on GitHub | Low | Matched by GitHub id, not by name |

## Open Questions

None.
