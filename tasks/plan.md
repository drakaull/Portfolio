# Implementation Plan: Feature 9 — Language switcher and Dutch

Spec: [09-languages.md](../specs/09-languages.md) · Task list: [todo.md](todo.md) · Branch: `feature/languages`

## Overview

Dutch (`nl`) added end to end — backend language list, DeepL target, admin schemas, CLI to translate existing content, interface dictionary, routes — and a new language switcher showing the current language with diagonal-split flags.

## Architecture Decisions

- **One language list per side**: backend `Lang` (domain) drives validation, fallback, auto-fill on save and the CLI; frontend dictionaries drive routes, the switcher and the editor tabs. Adding a language stays a two-place change.
- **`nl.ts` typed against `en.ts`**: a missing Dutch key fails the build.
- **Flags as inline SVG components** with a `clipPath` triangle for the diagonal split; no image files, no dependency, crisp at any size.
- **Switcher = disclosure button + list of links** (not an ARIA menu): simplest accessible pattern; each link keeps the current page and carries `lang`/`hreflang`.
- **CLI `translate-missing` reuses the save logic's rule** (fill only empty fields from French) through the existing `Translator`; it never overwrites.

## Task List

### Phase 1: Backend
- [ ] Task 1: Dutch in the backend (language list, DeepL target, admin schemas)
- [ ] Task 2: `translate-missing` command

### Checkpoint A: after Tasks 1–2
- [ ] ruff + pytest green
- [ ] Human: run `uv run python -m app.cli translate-missing`; `/api/home?lang=nl` and `/api/experiences?lang=nl` answer in Dutch

### Phase 2: Interface
- [ ] Task 3: Dutch interface (dictionary via DeepL, `/nl` routes, browser redirect, eyebrows)
- [ ] Task 4: Flags and language switcher

### Checkpoint B: after Tasks 3–4
- [ ] Frontend green; screenshots of the switcher (closed/open, both themes, 390 px) and `/nl`
- [ ] Human: flags look right; Dutch interface texts reviewed

### Phase 3: Editor
- [ ] Task 5: NL tab in the home editor

### Checkpoint C: complete
- [ ] Human browser check of the 5 spec success criteria
- [ ] Code review (`/review`)
- [ ] Merge into `develop` after approval

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Machine-translated Dutch UI sounds odd | Med | Léonard reviews at Checkpoint B; texts are short UI labels |
| Flags unrecognisable at 20 px | Med | Screenshots at real size, both themes; design tweak before merge |
| Admin save now calls DeepL twice (EN + NL) | Low | One request per target language; still well under the free quota |
| Existing tests assume two languages | Low | Update fixtures; type check catches missing keys |

## Open Questions

None.
