# Implementation Plan: Feature 14 — Home photo

Spec: [14-photo.md](../specs/14-photo.md) · Task list: [todo.md](todo.md) · Branch: `feature/images`

## Overview

A photo uploaded from the home editor, cleaned and resized by Pillow, stored as `storage/photo.webp` and shown on the home page at a place Léonard picks from screenshots.

## Architecture Decisions

- **Pillow 12.3.0** (released 2026-07-01, ≥ 2 weeks old), pinned in `pyproject.toml`.
- **Processing in `infra/storage.py`** next to the CV: read the upload with the same chunked size check, open with Pillow (formats limited to JPEG / PNG / WebP, pixel count capped), `ImageOps.exif_transpose`, `thumbnail(1200)`, save WebP without `exif` / `icc` / `xmp`, then atomic `os.replace` — same pattern as `save_cv`. CPU work runs in a worker thread.
- **Cache busting**: the home content exposes `photo_version` (the file's modification time, or `null`); the page requests `/api/photo?v=<version>`.
- **Public route** mirrors `GET /api/cv` (`FileResponse`, `nosniff`).
- **Placement first, public code second**: variants are shown as screenshots with a test photo; only the chosen one is built.

## Task List

### Phase 1: Backend
- [x] Task 1: Pillow, `save_photo` / `photo_file` / `delete_photo`, admin `PUT` / `DELETE /api/admin/photo`, public `GET /api/photo`, `photo_version` in the home content

### Checkpoint A
- [x] ruff + pytest green (metadata stripped, orientation, resize, refusals, session)

### Phase 2: Admin and placement
- [x] Task 2: Photo block in the home editor (upload / replace / remove, preview)
- [x] Task 3: 2–3 placement variants as screenshots with a test photo

### Checkpoint B
- [x] Human: placement chosen (B, with a hover wipe showing the image HTML)

### Phase 3: Public
- [x] Task 4: Photo on the home page at the chosen place (alt text, fixed size, both themes, 390 px)

### Checkpoint C: complete
- [ ] Human: a real phone photo uploaded and checked
- [ ] Code review
- [ ] Merge into `develop` after approval

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| GPS / personal metadata published | High | Pillow saves without EXIF / ICC / XMP; a test checks the output has no metadata |
| Malicious image (decompression bomb, fake extension) | High | Format allow-list from content, pixel cap, size cap, processing errors → 415 |
| Upload blocks the server | Med | Pillow work in a worker thread |
| Old photo shown after replacing | Low | Versioned URL from the file's modification time |
| Photo over 5 MB | Low | Clear message; export it smaller first |

## Open Questions

None.
