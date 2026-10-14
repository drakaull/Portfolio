# Spec: Feature 16 — Loading skeletons and interface polish

Status: **APPROVED**

## Objective

1. While a public page waits for the API, show the shape of its content (a skeleton) instead of a "Loading…" line.
2. Apply the seven points of the interface audit (apple-design skill) that Léonard approved.

No new dependency.

## 1. Loading skeletons

| Page | Skeleton |
|---|---|
| Home | photo frame (240 × 156), headline line, three intro lines, button and two links; three "recent path" cards |
| Projects | four cards: meta line, title, three summary lines, ring + legend |
| Experience | four timeline rows (years, title, organisation) |
| Skills | three groups: category label + four chips |
| Experience detail | meta line, four text lines |

Not in the admin (internal tool) nor on Contact / Privacy (nothing to load).

| Rule | Detail |
|---|---|
| No flash | The skeleton appears only when loading lasts more than **300 ms**; before that the page shows nothing in its place. |
| Same shape | Skeleton blocks use the real layout (same grid, gaps, sizes) so nothing jumps when the content arrives. |
| Motion | A slow opacity pulse; **none** with reduced motion. No sweeping shimmer. |
| Accessibility | Skeleton blocks are `aria-hidden`; a visually hidden `role="status"` keeps saying "Loading…" (existing translated texts). |
| Colours | `--color-surface` / `--color-border` tokens, so both themes work. |

## 2. Interface audit

| # | Change |
|---|---|
| 1 | **Reduced motion keeps gentle feedback.** Drop the global rule that stops every animation and transition. Instead: entrance animations (Reveal) only fade, without rising; smooth scrolling off; the photo code panel already fades. Small colour and underline transitions stay. |
| 2 | **Theme change cross-fades** (~250 ms) instead of jumping in brightness, with the browser's View Transitions; browsers without it switch at once, as today. |
| 3 | **Photo framing keeps the grab point.** Pressing *on* the frame and dragging keeps the pointer's offset inside the frame (no jump); pressing elsewhere on the photo still centres the frame there. |
| 4 | **Press feedback on every control**: theme, language and mobile-menu buttons, and the project cards, react on press (small scale), like the main button already does. |
| 5 | **High-contrast mode** (`prefers-contrast: more`): borders become clearly visible (field borders ≥ 3:1). The normal look does not change. |
| 6 | **Shorter entrance cascade**: total under ~0.6 s (smaller delays and duration). |
| 7 | **Typography**: page titles (28 px) get a slight negative tracking (−0.01em). |

## Out of scope

Spring animations / Motion library, rubber-banding, translucent header, skeletons in the admin.

## Tests

- A skeleton is absent before 300 ms and present after (fake timers); it disappears when data arrives; the status text stays for screen readers.
- Photo framing: dragging the frame from one of its edges does not move it at press time.
- Visual: every skeleton next to its loaded page (light/dark, desktop/390 px), audit points checked in the browser (reduced motion and high contrast emulated).
