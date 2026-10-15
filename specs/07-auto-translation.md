# Spec: Feature 7 — Automatic translation

Status: **APPROVED**

## Objective

Léonard writes his texts **once, in French**. English versions are produced by DeepL, either on demand in the editor (to review before saving) or automatically when an English field is left empty on save. Dutch can be added later by adding a target language.

Applies to the home page now (headline, introduction) and to every later translated content (experiences, projects).

## Decisions already taken

- Both modes: a **"Translate from French" button** in the editor (fills the English fields for review) **and** automatic translation of **empty** English fields on save.
- **French is the writing language**: French is required, English is optional (generated when empty).
- **DeepL API Free** (500,000 characters/month free; EU company).
- Markdown is protected by a round trip: Markdown → HTML → DeepL (`tag_handling=html`) → HTML → Markdown.

## Assumptions

1. Public fallback changes accordingly: a missing or empty translation shows the **French** text (the source), instead of English today.
2. Without a configured DeepL key, the site still works: the button reports "translation not configured" and saving keeps English empty (French shown as fallback).
3. Only Léonard's own public texts are sent to DeepL; no visitor data.
4. The DeepL key lives only in the backend environment (`DEEPL_API_KEY`), never in the browser or in git.

## Markdown round trip

```
"Je suis **développeur** — voir [GitHub](https://github.com/x)"
 → <p>Je suis <strong>développeur</strong> — voir <a href="https://github.com/x">GitHub</a></p>
 → DeepL (tag_handling=html): text translated, tags and href untouched
 → <p>I am a <strong>developer</strong> — see <a href="https://github.com/x">GitHub</a></p>
 → "I am a **developer** — see [GitHub](https://github.com/x)"
```

A test proves that Markdown → HTML → Markdown **without translation** gives back the original text for everything the editor allows: paragraphs, bold, italic, links, bullet and numbered lists, headings, inline code.

## API (admin only, on `admin_router()`)

| Method & path | Body | Responses |
|---|---|---|
| `POST /api/admin/translate` | `{"target": "en", "items": [{"text": "...", "format": "markdown" \| "plain"}]}` | `200 {"translations": ["..."]}`; `503` not configured or DeepL unavailable; `422` invalid body (max 10 items, each ≤ 5,000 characters) |
| `PUT /api/admin/home` (changed) | French required, English optional | `200` + `"auto_translated": ["headline", …]` and `"translation_failed": bool` |

## Layers

```
domain/language.py          SOURCE_LANG = "fr"; localize() falls back to the source language
infra/translation.py        DeepL client (httpx), Markdown <-> HTML conversion, errors -> TranslationUnavailable
api/admin_translate.py      POST /admin/translate
api/admin_home.py           fills empty English fields through infra/translation before saving
```

## Frontend (home editor)

- Tabs ordered **FR, EN**; French tab first and selected by default.
- English tab: **"Translate from French"** button. If an English field already has text, a confirmation is asked before replacing it. Filled fields show a notice "Automatic translation — please review".
- English hint: "Leave empty: the translation is generated when you save."
- After saving, if fields were auto-translated: "English generated automatically — review it in the EN tab". If DeepL failed: warning "English could not be generated; the French text is shown instead for now."

## New dependencies

| Package | Why | License |
|---|---|---|
| `markdown-it-py` (backend) | Markdown → HTML, CommonMark-compliant | MIT |
| `markdownify` (backend) | HTML → Markdown | MIT |

DeepL is called with `httpx` (already installed). No frontend dependency.

## Testing Strategy

- Markdown round trip without translation (all supported syntax).
- DeepL client with a fake HTTP transport: request shape (auth header, `source_lang=FR`, target, `tag_handling=html`), Markdown preserved through a fake translation, errors (403 bad key, 456 quota, timeout) → `TranslationUnavailable`.
- `/api/admin/translate`: 401 without session (route-walking test), 503 without key, limits (422).
- `PUT /api/admin/home`: French required; empty English auto-filled; DeepL failure → saved with French only and `translation_failed: true`; existing English never overwritten on save.
- Public fallback: empty English shows French.
- Frontend: button fills English fields and shows the review notice; confirmation before overwriting; save notices; error messages.
- Optional live test against DeepL, skipped when no key is set.

## Boundaries

- **Always:** branch `feature/auto-translation`; key from environment only; save never fails because of DeepL.
- **Ask first:** any other dependency; sending anything other than admin-written texts to DeepL.
- **Never:** call DeepL from the browser; log the key or full texts; overwrite an English text the admin wrote, on save.

## Success Criteria

1. With a key set, "Translate from French" fills the English headline and introduction, Markdown intact, ready to review.
2. Saving with English empty publishes a generated English version; saving with English written keeps it untouched.
3. Without a key or with DeepL down, saving still works and the English site shows the French text.
4. Links, bold, italic and lists survive translation.
5. All checks pass; the key never appears in git, logs or responses.

## Decisions (round 2)

- English variant: **EN-GB** (DeepL `target_lang=EN-GB`).
- Translation failure on save: **save French anyway** and show a warning.
- Button with existing English text: **ask for confirmation** before replacing it.
- `markdown-it-py` and `markdownify` approved.
