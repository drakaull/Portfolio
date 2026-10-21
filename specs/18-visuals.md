# Spec: Feature 18 — More visual pages (v1.1)

Status: **APPROVED**

## Objective

Make the Experience, Projects and Contact pages more visual, after a UI/UX professional's review:
recruiters skim, and an image catches the eye where a block of text does not. Release **v1.1.0**.

## Decisions already taken

| Page | Image | Display |
|---|---|---|
| Experience | **An image of the organisation** (logo or banner), optional, one per experience | Revised after a first try (a small logo was unreadable): **2:1** area on the right side of the timeline card, the image shown **whole** and as large as fits (images have any shape, so no cropping and no framing tool); on top of the card on narrow screens; large under the title on the detail page; not on the home page's compact cards. The kind badge moves to the left, above the title |
| Projects | **A screenshot**, optional, one per project | Fixed **16:10** frame under the summary, cropped with the **framing tool** (as the home photo) |
| Projects | **Languages at the top** | Under the title, **on one line**: dot, name, percentage; the ring is dropped (chosen after comparing both variants) |
| Contact | **One image**, optional, chosen in the admin | Right column next to the form, its top and bottom lined up with the fields (so an **8:11** portrait frame, first planned 4:5), framing tool; under the form on narrow screens |

Every image is optional: without one, a card or page looks as today.

## Admin

- **Experience editor**: an "Organisation image" block (upload / replace / remove), previewed whole.
- **Project editor**: a "Screenshot" block with the framing tool.
- **Home editor** (or a "Contact" block in it): the contact image with the framing tool.
- Uploads apply at once, as for the photo; the framing is saved with the form (Save button).
- An existing project keeps its screenshot across GitHub syncs; a project that disappears keeps it
  too (it is only hidden, as today).

## Processing and storage (server)

Same pipeline as the home photo, generalised: JPEG / PNG / WebP recognised by content, ≤ 5 MB,
≤ 40 Mpx, turned upright, **all metadata stripped**, saved as WebP (transparency kept for logos),
longest side ≤ 1,200 px. Files live under `storage/images/` with names built from
ids (never from the upload). Public URLs are versioned (`?v=`), so a replaced image is never hidden
by a cache. Deleting an experience or project deletes its image.

Database: the framing point (x, y in %) of each project screenshot and of the contact image; whether
an image exists is read from the file, as for the photo and the CV.

## Public pages

- Images have **width and height** set (no layout jump) and are **lazy-loaded** below the fold.
- **Alt text** built from the content: "Screenshot of <project>"; the experience image (its
  organisation is written next to it) and the contact image are decorative (`alt=""`).
- Light and dark themes; 390 px mobile layout; skeletons get the image areas.

## Out of scope

Several images per item (galleries), image captions, logos fetched automatically, a lightbox.

## Tests

Backend: upload / replace / delete for each kind (415, 413, metadata stripped, resized), framing
saved, image removed with its item, URL versioning, sync keeps screenshots.
Frontend: blocks in the three editors, framing saved, images and alt texts on the public pages,
absent images change nothing.
Visual: Chrome and Firefox, light and dark, desktop and 390 px; the two Projects variants shown
side by side for the choice.
