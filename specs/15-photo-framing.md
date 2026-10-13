# Spec: Feature 15 — Photo framing

Status: **APPROVED**

## Objective

The home photo is shown in a 240 × 156 px frame (same size as its code panel), cut to fill it. Léonard chooses, in the admin, which part of the photo stays inside the frame, so a new photo never has its head cut off.

## Decisions already taken

- **Framing point only, no zoom.** The photo file is never changed: the site stores two percentages (horizontal, vertical) and shows the photo with them (CSS `object-position`).
- **Set by dragging** a frame over the whole photo in the admin, with a preview of the final result next to it.
- Saved with the home editor's **Save** button, like the texts.

## Admin

In the Photo block of the home editor, when a photo is online:

```
Photo
  [whole photo, frame drawn on top]   [preview 240 × 156]
  Drag the frame to choose what shows on the home page.
  [Choose a file]   [Remove the photo]
```

| Rule | Detail |
|---|---|
| Frame size | What `object-fit: cover` keeps of the photo in 240 × 156: full height for a wide photo, full width for a tall one. The frame moves only along the axis where the photo is larger. |
| Mouse / touch | Dragging the frame moves it; it never leaves the photo. |
| Keyboard | The frame is focusable; arrows move it by 1 %, Shift + arrows by 10 %. Screen readers hear its position ("horizontal 40 %, vertical 25 %") and a hint on how to move it. |
| Unsaved changes | Moving the frame makes the editor "dirty" (leave warning and Save button, as for the texts). |
| New photo | Uploading a photo resets the framing to the centre (50 %, 50 %). |

## Server

- Two columns on `home_content`: `photo_focus_x`, `photo_focus_y`, integers 0–100, default 50, with a check constraint (Alembic migration).
- `PUT /api/admin/home` accepts `photo_focus: {x, y}` (integers 0–100, required); the admin read returns it.
- `PUT /api/admin/photo` resets the framing to 50 / 50.
- `GET /api/home` returns `photo_focus` next to `photo_url`.

## Public

The photo uses `object-position: x% y%` from `photo_focus`. Nothing else changes.

## Out of scope

Zoom, rotation, cropping the stored file, framing anything other than the home photo.

## Tests

- Backend: values outside 0–100 refused (422); the framing is saved and read back; a new upload resets it to 50 / 50; the public route returns it.
- Frontend: the frame's size follows the photo's shape; arrows (and Shift) move it and stop at the edges; moving it makes the editor dirty and Save sends `photo_focus`; the public photo gets its `object-position`.
- Visual: real photo, light and dark, desktop and 390 px, plus dragging checked by hand.
