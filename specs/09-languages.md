# Spec: Feature 9 — Language switcher and Dutch

Status: **APPROVED**

## Objective

1. The language control shows the **language in use** (flag + code) and opens a menu listing every language.
2. The site gets a **third language, Dutch** (`/nl`), for the interface, the content and the admin.

## Decisions already taken

- Flags drawn as inline SVG (Windows does not render flag emoji), split by a **diagonal**:
  - **French**: France / Belgium;
  - **Dutch**: Netherlands / Belgium;
  - **English**: United Kingdom.
- The switcher shows the current language; the menu lists all languages, each written in its own language (Français, English, Nederlands).
- This is feature 9; the experience editor moves to feature 10.

## Flags

```
 ┌──────────┐   upper-left triangle: France (FR) or Netherlands (NL)
 │ FR  ╱ BE │   lower-right triangle: Belgium
 │   ╱      │   one diagonal from the top-right to the bottom-left corner
 └──────────┘
```

- Proportions 3:2, ~20 × 14 px in the button, rounded corners, thin border so white areas stay visible on the cream background.
- Decorative for screen readers (`aria-hidden`): the accessible name is the language name.

## Switcher behaviour

```
[▤ FR ▾]          button: flag + current code; label "Language: Français"
  ┌───────────────┐
  │ ▤ Français  ✓ │  each item is a link to the same page in that language
  │ ▤ English     │  (/fr/skills → /en/skills), with lang and hreflang
  │ ▤ Nederlands  │
  └───────────────┘
```

- Button with `aria-expanded`; the menu is a list of links (no fake menu roles needed).
- Opens with click, Enter or Space; closes on Escape (focus back to the button), on outside click and after choosing a language.
- Same component in the public navbar (desktop and mobile) and in the admin header.

## Dutch

**Interface:** `nl.ts` with every key of `en.ts` (typed, so a missing key fails the build). Texts are produced with DeepL from English and shown to Léonard for review in the plan's checkpoint.

**Routes:** `/nl/...` like the other languages (same English slugs: `/nl/experience`); `/` redirects to `/nl` for Dutch browsers (`nl*`); eyebrows localized (`~/portfolio — België`, `~/portfolio/ervaring`, …).

**Content and backend:**
- `Lang` becomes `"en" | "fr" | "nl"` in the backend (DeepL target `NL`); French stays the required source, English and Dutch optional with French fallback.
- Admin schemas accept an optional `nl` field; the home editor gets an **NL** tab with its own "Translate from French" button; empty Dutch fields are filled on save like English.
- No migration: existing rows simply have no `nl` value and fall back to French until translated.
- A one-off command fills every missing translation of the existing content:
  `uv run python -m app.cli translate-missing` (home + experiences, all non-source languages, only empty fields).

## Testing Strategy

- **Flags:** each language renders its flag; the French and Dutch flags contain the Belgian colours.
- **Switcher:** shows the current language; lists 3 languages with correct links (current page kept); keyboard (Enter, Escape returns focus), outside click; works in the admin header.
- **Dutch UI:** routes `/nl/...` render Dutch texts; `/` redirects Dutch browsers to `/nl`; build fails if `nl.ts` lacks a key (type check).
- **Backend:** `lang=nl` accepted with French fallback; save fills empty `nl` and `en`; translate endpoint accepts `target=nl`; CLI `translate-missing` fills only empty fields, never overwrites, reports what it did, and works without DeepL errors breaking it (clear message).
- **Visual:** Playwright screenshots of the switcher (closed/open) in both themes and at 390 px, and of `/nl`.

## Boundaries

- **Always:** branch `feature/languages`; one list of languages per side (backend `Lang`, frontend dictionaries); no new dependency.
- **Ask first:** flag designs if they look wrong once drawn.
- **Never:** emoji flags; overwrite existing translations with the CLI.

## Success Criteria

1. The button shows the current language's flag and code; the menu offers Français, English and Nederlands with the right flags.
2. Choosing a language keeps the current page; keyboard and screen readers can use the menu.
3. `/nl` shows the whole interface in Dutch; content falls back to French until translated.
4. After `translate-missing`, the home page and the 7 experiences have Dutch and English texts.
5. All checks pass; screenshots show the flags crisp in both themes and the menu usable at 390 px.

## Decisions (round 2)

- Dutch interface texts: translated with DeepL from English, then reviewed by Léonard.
- Switcher on mobile: stays in the bar next to the theme button.
- Dutch eyebrows: `~/portfolio — België`, `~/portfolio/ervaring`, `~/portfolio/vaardigheden`, `~/portfolio/projecten`, `~/portfolio/contact`.
