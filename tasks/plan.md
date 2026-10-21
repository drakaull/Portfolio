# Plan: Feature 18 — More visual pages (v1.1)

Spec: [specs/18-visuals.md](../specs/18-visuals.md) · Branch: `feature/visuals`

## Tasks

1. **Backend: images** — the photo pipeline generalised to three kinds (experience logo ≤ 256 px with
   transparency, project screenshot ≤ 1,200 px, contact image ≤ 1,200 px); upload / delete routes in
   the admin, public versioned URLs, image deleted with its experience or project, kept across GitHub
   syncs; framing (x, y) for screenshots and the contact image (migration). Tests.
   - **Checkpoint A**: ruff + pytest green, migration up / down.
2. **Admin** — "Logo" block in the experience editor; "Screenshot" block with framing in the project
   editor; "Contact image" block with framing in the home editor (the framing tool takes the frame's
   shape as a parameter). FR / EN / NL texts. Tests.
3. **Experience page** — logo next to the organisation on timeline cards and the detail page.
4. **Projects page** — languages under the title, screenshot under the summary; two variants (with
   and without the ring).
   - **Checkpoint B**: screenshots of both variants with real content → Léonard chooses.
5. **Contact page** — image in the right column (under the form on narrow screens).
   - **Checkpoint C**: Chrome and Firefox, light / dark, desktop / 390 px · review · merge approval ·
     release v1.1.0 (server update with the migration).
