# Spec: Feature 6 — Visual direction

Status: **APPROVED**

## Objective

Give the whole site a sober, personal look before the remaining sections are built, so that Experience, Skills, Projects and Contact are born in the right style.

Chosen direction (preview "Directions du portfolio", option A with changes):
- **Papier quadrillé**: warm paper background with a very faint graph-paper grid, terracotta accent, Google Sans for text.
- **Bricolage Grotesque for the name only** ("Léonard Fontaine").
- **JetBrains Mono for small labels and dates** — the developer touch.
- The eyebrow line **`~/portfolio — Belgique`** above the name.
- Smooth, discreet motion; nothing flashy.

No new content and no new section in this feature: it restyles what exists and creates the building blocks the next features will use.

## Assumptions

1. The navbar brand is also the name, so it uses Bricolage Grotesque too (same "title" role). No other text uses it.
2. Animations are pure CSS (no animation library), always disabled when the system asks for reduced motion.
3. The theme toggle keeps its sun/moon icon (the skills call it a cliché, but it is clear and already tested).
4. Colors stay close to today's tokens; values are re-tuned only where contrast or harmony needs it (WCAG AA kept).

## Design tokens (`styles/global.css`)

| Group | Tokens |
|---|---|
| Color | existing palette, plus `--color-grid` (graph-paper line) for light and dark |
| Type | `--font-sans` (Google Sans), `--font-display` (Bricolage Grotesque, name only), `--font-mono` (JetBrains Mono, labels/dates); a fixed type scale `--text-xs` … `--text-display` |
| Space | spacing scale `--space-1` … `--space-8` |
| Shape | `--radius-sm` (inner elements), `--radius-md` (cards, buttons) |
| Motion | `--ease-out: cubic-bezier(.2,.7,.2,1)`, `--duration-fast` (180 ms), `--duration-base` (260 ms), `--duration-slow` (640 ms) |

## Building blocks (reused by later features)

| Block | Use |
|---|---|
| `Eyebrow` | Mono label above titles (`~/portfolio — Belgique`, section paths) |
| `Button` | Primary action (filled, lifts on hover, presses on click) |
| `TextLink` | Secondary links with an accent underline that slides in on hover |
| `Badge` | Small mono label with accent border (e.g. "Stage", "Formation") |
| `Reveal` | Wrapper giving children a staggered fade-and-rise entrance (CSS only) |

## Restyle of existing pages

- **Background:** graph-paper grid on the page, faint in both themes.
- **Navbar:** brand in Bricolage; section links get the sliding accent underline (active link keeps it); refined spacing; same behaviour and tests.
- **Home:** eyebrow (`~/portfolio — Belgique` / `~/portfolio — Belgium`), name in Bricolage, role in accent, intro at ~46 characters wide; CV as `Button`, LinkedIn/GitHub as `TextLink`; staggered entrance. The right-hand column stays empty until the Experience feature fills it with the latest 2–3 entries.
- **Section pages:** eyebrow with the page as a path above the title: `~/portfolio/parcours`, `~/portfolio/competences`, `~/portfolio/projets`, `~/portfolio/contact` in French; `~/portfolio/experience`, `~/portfolio/skills`, `~/portfolio/projects`, `~/portfolio/contact` in English.
- **Favicon:** "LF" monogram in Bricolage Grotesque (SVG), accent color.
- **Footer:** minimal — © year and name, LinkedIn and GitHub links (legal links added with the Contact feature).
- **404 and admin:** same tokens and blocks; admin header border fixed to full width like the public header.
- **Motion:** route content fades in on navigation; `scroll-behavior: smooth`.

## New dependencies

| Package | Why | License |
|---|---|---|
| `@fontsource-variable/bricolage-grotesque` | Name typography, self-hosted | OFL-1.1 |
| `@fontsource-variable/jetbrains-mono` | Labels and dates, self-hosted | OFL-1.1 |

## Testing Strategy

- Existing frontend tests stay green (behaviour does not change).
- Component tests: `Eyebrow`, `Button`, `TextLink`, `Badge` render the right elements and forward props; `TextLink` external variant keeps `rel="noopener noreferrer"`.
- Reduced motion: a test asserts the global reduced-motion rule exists in the built CSS (animations and transitions off).
- **Visual check with Playwright** at each task: home, a section page, admin login, 404 — light and dark, 1280 px and 390 px; screenshots reviewed before handing over.
- Build check: fonts bundled locally, still no request to Google.

## Boundaries

- **Always:** branch `feature/visual-direction`; CSS Modules and tokens only; WCAG AA contrast; reduced-motion support; Playwright check before each checkpoint.
- **Ask first:** any dependency beyond the two fonts; changing layout structure beyond this spec.
- **Never:** animation libraries without approval; colors hard-coded in components; animations on `top/left/width/height` (transform and opacity only).

## Success Criteria

1. The name uses Bricolage Grotesque; labels and dates use JetBrains Mono; everything else Google Sans — all served from the site.
2. Home shows `~/portfolio — Belgique` (or its translation), the graph-paper background, and the new buttons/links in both themes.
3. Hovering links, buttons and cards gives smooth feedback; content enters with a short stagger; with reduced motion enabled, nothing moves.
4. Every page (public, admin, 404) uses the same tokens; no visual regression at 390 px.
5. All checks pass and Playwright screenshots show no overflow or contrast issue.

## Decisions

- Eyebrow: `~/portfolio — Belgique` (FR) / `~/portfolio — Belgium` (EN).
- Section pages get a path eyebrow (`~/portfolio/<section>`, localized).
- Home right-hand column left empty until the Experience feature.
- Favicon (LF monogram) and minimal footer included.
- Two font packages approved.
