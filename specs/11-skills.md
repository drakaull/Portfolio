# Spec: Feature 11 — Skills

Status: **APPROVED**

## Objective

The public **Skills** page shows Léonard's skills grouped by category, each as a logo + name; the admin adds, edits, deletes and orders them.

## Decisions already taken

- Five fixed categories, in this order: **Languages** (programming), **Front-end**, **Back-end**, **Tools**, **IDEs**. Category titles are interface texts (FR/EN/NL); skill names are **not** translated (no DeepL here).
- Logos from **Simple Icons** (new dependency `simple-icons`, CC0 — approval requested with this spec). The package is loaded **only in the admin**, to search a logo by name; on save the logo's SVG path, its brand colour and its Simple Icons id are **stored in the database**. The public site loads no icon library.
- A skill may have **no logo** (e.g. "NoSQL"): shown with its name only.
- Logos are **monochrome** (text colour); the **brand colour appears on hover**, except when it would be unreadable on the current theme (too dark in dark mode, too light in light mode).
- **Manual order** inside a category (up / down arrows in the admin).
- Starts **empty**: Léonard fills it from the admin.
- Public layout: one section per category (title, then the skills as chips that wrap); categories without skills are not shown.

## Public page

```
~/portfolio/competences
Compétences

LANGAGES
[▣ Python] [▣ TypeScript] [▣ Java]

FRONT-END
[▣ React] [▣ CSS] [NoSQL]          ← no logo: name only

OUTILS
[▣ Git] [▣ Docker]
```

- Section titles in JetBrains Mono (like the eyebrows), chips like the existing badges' family but larger (logo ~18 px + name).
- No skill at all yet: a short "Skills coming soon." message.
- Logos are decorative (`aria-hidden`); the name is the text. Each category is a list (`<ul>`) under its heading.

## Admin

```
/:lang/admin                 dashboard: new link "Skills"
/:lang/admin/skills          all categories, skills in order:  ▲ ▼  Edit
/:lang/admin/skills/new      form
/:lang/admin/skills/:id      form + Delete (with confirmation)
```

**Form**

```
Name       [Python          ]
Category   [Languages ▾]
Logo       [search: pyth    ]   → [▣ Python] [▣ PyTorch] [▣ PyPI] …   (click to pick)
           Chosen: ▣ Python  (Remove logo)
[Save]                                   [Delete]
```

- The logo search proposes matches as you type the name (and can be searched separately); up to 12 results with their preview.
- Changing the category moves the skill to the end of the new category.

## Validation (server)

| Field | Rule |
|---|---|
| name | required, 1–60 characters, unique within its category (case-insensitive) → 409 otherwise |
| category | one of `languages`, `frontend`, `backend`, `tools`, `ides` |
| icon | optional; if given: `slug` (a-z0-9, ≤ 60), `hex` (6 hex digits), `path` (SVG path commands and numbers only, ≤ 20,000 characters) |

The stored path is only ever rendered as the `d` attribute of an `<svg><path>` (never as HTML), and its characters are checked server-side.

## Backend

- Table `skills`: id, name, category, position, icon_slug, icon_hex, icon_path (Alembic migration).
- Public: `GET /api/skills` → categories in the fixed order, each with its skills in order (`name`, `icon` or null).
- Admin (session required): `GET /api/admin/skills`, `GET /api/admin/skills/{id}`, `POST /api/admin/skills`, `PUT /api/admin/skills/{id}`, `DELETE /api/admin/skills/{id}`, `POST /api/admin/skills/{id}/move` (`up` / `down`, swaps with the neighbour; no-op at the edge).

## Testing Strategy

- **Backend:** migration up/down; public grouping and order; every admin route requires a session; create/edit/delete/move; duplicates (409), validation (422, including a path with `<` or letters outside SVG commands); category change puts the skill last.
- **Frontend:** public page groups and hides empty categories; no-logo chip; admin list order and arrows; form with logo search (Simple Icons mocked in tests), remove logo, delete confirmation, unsaved-changes guard.
- **Visual:** public page and admin in both themes, desktop and ~390 px; hover colour readable in both themes.

## Boundaries

- **Always:** branch `feature/skills`; Simple Icons never in the public bundle (checked with the build output); no other new dependency.
- **Ask first:** visual changes beyond this spec.
- **Never:** render admin-provided SVG as HTML.

## Success Criteria

1. From the admin, Léonard adds "Python" in Languages with its logo; it appears on `/fr/skills`, `/en/skills`, `/nl/skills`.
2. The arrows reorder skills; the public order follows immediately.
3. A skill without logo shows its name only; deleting asks first.
4. The public JavaScript bundle does not contain Simple Icons.
5. All checks pass; screenshots in both themes, desktop and 390 px.

## Decisions (round 2)

- `simple-icons` approved as a dependency (admin only).
- Category labels: Langages · Front-end · Back-end · Outils · IDE (FR); Languages · Front-end · Back-end · Tools · IDEs (EN); Talen · Front-end · Back-end · Tools · IDE's (NL).
- Skill names: 60 characters max.
