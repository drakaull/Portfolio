# Plan: Feature 15 — Photo framing

Spec: [specs/15-photo-framing.md](../specs/15-photo-framing.md) · Branch: `feature/photo-size` (after the 240 × 156 size)

## Tasks

1. **Backend** — `photo_focus_x/y` columns (0–100, default 50, check constraint, migration); domain + repository; `PUT /api/admin/home` takes `photo_focus`, admin and public reads return it; a new photo upload resets it to 50 / 50. Tests.
2. **Public** — the home photo gets `object-position` from `photo_focus`. Tests.
3. **Admin framing tool** — `PhotoFraming` in the Photo block: whole photo + draggable frame (pointer), arrows / Shift + arrows, screen-reader position and hint, live 240 × 156 preview; part of the home editor form (dirty, Save sends `photo_focus`). i18n FR/EN/NL. Tests.

## Checkpoints

- **A** (after 1): ruff + pytest green, migration up/down.
- **B** (after 3): real photo dragged in the admin, result on the home page, light/dark, desktop and 390 px · review · merge approval (with `feature/user-feedback` first).

## Risks

- Drag on touch screens: pointer events + `touch-action: none` on the frame only, so the page still scrolls elsewhere.
- The frame's size depends on the photo's natural size: read once the image has loaded.
