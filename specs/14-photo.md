# Spec: Feature 14 — Home photo

Status: **APPROVED**

## Objective

Léonard's photo on the home page, uploaded, replaced or removed from the admin (home editor). Organisation logos and project screenshots are not part of this feature.

## Decisions already taken

- **Photo only** for now.
- Processed with **Pillow** (new Python dependency, approved): the upload is checked to be a real image, turned the right way up (phone orientation), **stripped of all metadata** (phones often store the GPS position of where the photo was taken), resized and saved as **WebP**.
- Its place on the home page is chosen by Léonard **from screenshots of 2–3 variants** with a test photo, before the public part is built.

## Admin

A **Photo** block in the home editor, next to the CV block and working the same way:

```
Photo
  [preview]   No photo online.
  Upload a photo (JPEG, PNG or WebP, 5 MB max)   [Choose a file]
  [Remove the photo]   (with confirmation)
```

The upload is saved at once (like the CV), independently of the texts' Save button.

## Processing (server)

| Step | Rule |
|---|---|
| Accepted input | JPEG, PNG, WebP — recognised by their content, not by the declared type or name; up to 5 MB (the request size limit stays 6 MB for every route); up to 40 megapixels (a "decompression bomb" is refused) |
| Orientation | applied from the EXIF data, then all metadata dropped |
| Size | longest side 1,200 px max (never enlarged) |
| Output | WebP, quality ~82, RGB (transparency kept for a PNG that has some), no metadata; replaces the previous photo atomically |
| Errors | not an image / unsupported format → 415; too large → 413 |

Stored as `storage/photo.webp` (fixed name, never from the request), next to the CV.

## Public

- `GET /api/photo` serves the photo (`image/webp`, `nosniff`); 404 without one.
- The home content says whether a photo exists, with a version number so a new photo is not hidden by the browser cache.
- `<img>` with a translated alternative text ("Photo of Léonard Fontaine"), fixed width and height (no layout shift), `loading="eager"` (it is at the top of the page). No photo → the home page looks exactly as today.

## Testing Strategy

- **Backend:** a JPEG with GPS EXIF comes out as WebP **without any metadata**; a rotated phone photo comes out upright; a large photo is resized; a PNG with transparency is accepted; a renamed text file, a too-large file, an oversized pixel count are refused; the admin routes need a session; replacing is atomic; the public route serves the right type.
- **Frontend:** upload / replace / remove in the editor with errors; the home page shows the photo with its alt text when there is one, and nothing otherwise.
- **Visual:** 2–3 placement variants for Léonard to choose from, then the chosen one in both themes, desktop and 390 px.

## Boundaries

- **Always:** branch `feature/images`; storage path fixed; uploads processed before being kept.
- **Ask first:** the placement (screenshots), any other new dependency.
- **Never:** keep the original upload or its metadata; serve a file whose name comes from the request.

## Success Criteria

1. Léonard uploads a phone photo in the admin; the home page shows it, upright, light, without GPS data.
2. Replacing or removing it updates the home page at once.
3. Invalid uploads are refused with a clear message.
4. All checks pass; screenshots of the chosen placement in both themes, desktop and 390 px.

## Decisions (round 2)

- Upload limit **5 MB**; the 6 MB request limit is unchanged (a heavier photo is exported smaller first).

## Decisions (round 3, Checkpoint B)

- Placement **B**: a 168 px rounded square above the "~/portfolio" eyebrow, in the left column.
- **Hover wipe**: a code panel slides over the photo from the right and shows the real HTML of the image (its address, alt text and size), in JetBrains Mono with a light colouring from the palette. Touch screens: a tap toggles photo / code. Reduced motion: a fade instead of the slide. The code is decorative (`aria-hidden`); screen readers get the alt text only.

## Decisions (round 4)

- The wipe goes **from left to right**.
- The code panel is a **layer above the photo**, as wide as the code needs (no line cut), invisible until hover / tap; the photo keeps its size.
- In the code shown, `alt` reads `homepage_portfolio.webp` (sounds like code); the image's real `alt` stays "Photo of Léonard Fontaine" (translated) for screen readers.
