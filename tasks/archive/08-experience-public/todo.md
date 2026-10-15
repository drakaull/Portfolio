# Tasks: Feature 8 — Experience (public)

Each task: implement → checks green (backend: `uv run ruff check . && uv run ruff format --check . && uv run pytest`; frontend: `npm run lint && npm run format:check && npm test && npm run build`, plus Playwright screenshots) → one commit.

## Task 1: Experience entity, table, seed migration and repository

**Acceptance criteria:**
- [ ] Constraints: unique slug, slug format `^[a-z0-9-]+$`, kind values, years 1950–2100, end ≥ start
- [ ] Migration inserts the 7 seed entries from the spec; downgrade removes the table
- [ ] Repository: `list()` most recent first (same-year tie by insertion order), `get(slug)` or `None`, returns domain entities

**Verification:** repository and constraint tests; migration round trip
**Files:** `app/domain/experience.py`, `app/infra/models.py`, `app/infra/repositories/experience.py`, `migrations/versions/<date>-create_experiences.py`, `tests/test_experience_repository.py`
**Scope:** M

## Task 2: Public list and detail endpoints

**Acceptance criteria:**
- [ ] `GET /api/experiences?lang=` returns localized items (French fallback), most recent first
- [ ] `GET /api/experiences/{slug}?lang=` returns the detail with description; 404 unknown slug; 422 bad lang

**Verification:** API tests
**Files:** `app/api/experiences.py`, `app/api/dependencies.py`, `app/main.py`, `tests/test_experiences_api.py`
**Scope:** S

## Checkpoint A
- [ ] Backend green · human check in `/docs` or the browser

## Task 3: Timeline page with carousel

**Acceptance criteria:**
- [ ] Cards in order with badge, years, title, organization, summary, technologies; card links to `/:lang/experience/<slug>`
- [ ] Horizontal scroll snap; previous/next buttons scroll one card and hide at the ends
- [ ] Loading, error and empty states

**Verification:** tests (mocked fetch; scroll behaviour through `scrollBy` spy and scroll events) + screenshots
**Files:** `src/api/useExperiences.ts`, `src/components/ExperienceCard/*`, `src/components/Timeline/*`, `src/pages/ExperiencePage.tsx`, `src/i18n/*.ts`, `src/lib/years.ts`
**Scope:** M

## Task 4: Experience detail page

**Acceptance criteria:**
- [ ] Eyebrow `~/portfolio/parcours/<slug>`, title, badge, organization, years, Markdown description, technologies, back link
- [ ] Unknown slug → 404 page

**Verification:** tests + screenshots
**Files:** `src/api/useExperience.ts`, `src/pages/ExperienceDetailPage.tsx` (+ CSS, test), `src/routes.tsx`, `src/i18n/*.ts`
**Scope:** S

## Task 5: "Recent path" column on the home page

**Acceptance criteria:**
- [ ] Latest 3 entries as compact cards linking to their detail pages; hidden when empty or on error
- [ ] Layout matches the visual direction preview; stacks under the intro at 390 px

**Verification:** tests + screenshots
**Files:** `src/pages/HomePage.tsx`, `src/pages/HomePage.module.css`, `src/pages/HomePage.test.tsx`, `src/i18n/*.ts`
**Scope:** S

## Checkpoint B
- [ ] Human browser check · `/review` · merge into `develop` after approval
