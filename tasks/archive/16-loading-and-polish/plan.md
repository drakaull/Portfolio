# Plan: Feature 16 — Loading skeletons and interface polish

Spec: [specs/16-loading-and-polish.md](../specs/16-loading-and-polish.md) · Branch: `feature/loading-polish`

## Tasks

1. **Skeleton base** — `Skeleton` component (blocks, pulse, reduced motion), `useDelayed(300)` hook, status text kept. Projects, Skills, Experience and Experience detail use it. Tests.
2. **Home skeleton** — photo frame, text lines, actions, three recent-path cards. Tests.
3. **Audit CSS** — points 1 (reduced motion), 4 (press feedback), 5 (high contrast), 6 (shorter cascade), 7 (title tracking).
4. **Theme cross-fade** (point 2) and **photo framing grab offset** (point 3). Tests.

## Checkpoints

- **A** (after 2): skeletons screenshotted next to the loaded pages (slow API simulated), light/dark, desktop/390 px.
- **B** (after 4): audit points checked in the browser (reduced motion, high contrast emulated) · review · merge approval.
