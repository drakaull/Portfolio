# Spec: Feature 3 — Home page

Status: **DRAFT — awaiting final approval**

## Objective

First complete slice from database to screen. A visitor landing on `/en` or `/fr` sees who Léonard is: name, headline, a short introduction, and links to LinkedIn, GitHub and the CV.

The content lives in PostgreSQL so the admin (features 4–5) can edit it later. Editing is **out of scope** here.

## Assumptions

1. Home content is a **single row** (one home page), enforced by the database.
2. The public API returns content **already in the requested language**: `GET /api/home?lang=fr`. The admin API (feature 5) will return both languages.
3. The introduction is **Markdown**, rendered in the browser. Raw HTML in the Markdown is **not** rendered (protection against script injection).
4. External links open in a new tab with `rel="noopener noreferrer"`.
5. The CV is one English PDF, opened in the browser (not forced download).
6. Translated content is stored as JSON (`{"en": …, "fr": …}`). **A missing translation falls back to English**, so a new language (e.g. Dutch) can be added progressively.
7. While content loads, the page shows the name immediately (it is a UI string) and a discreet loading state for the rest; on API failure, a short translated error message.

## Data model

Table `home_content` (one row, `id = 1` enforced by a check constraint):

| Column | Type | Note |
|---|---|---|
| `id` | int, PK | always 1 |
| `headline` | jsonb | `{"en": "Fullstack developer", "fr": "Développeur fullstack"}` |
| `intro` | jsonb | same shape, Markdown values |
| `linkedin_url`, `github_url` | varchar(255) | |
| `updated_at` | timestamptz | set by the database on change |

**Convention for every table with translated text:** one `jsonb` column per translated field, keyed by language code. Check constraints require the `en` and `fr` keys (`headline ? 'en' AND headline ? 'fr'`); other languages are optional and fall back to English. The list of supported languages lives in one place in the backend (`domain/language.py`) and one place in the frontend (`i18n/`). Adding Dutch later = add `"nl"` to both lists + `nl.ts`, **no migration**.

## API

| Method & path | Response |
|---|---|
| `GET /api/home?lang=en\|fr` | `200 {"headline", "intro", "linkedin_url", "github_url", "cv_url"}` (`cv_url` is `null` when no CV file is present) |
| | `422` if `lang` is missing or not `en`/`fr` |
| | `404` if the row does not exist |
| `GET /api/cv` | the PDF (`Content-Type: application/pdf`, `inline`, file name `Leonard_Fontaine_CV.pdf`), or `404` |

## Flow through the layers

```
api/home.py      GET /api/home → HomeContentOut (Pydantic), picks the language
   │
   ▼
infra/repositories/home.py   HomeContentRepository.get() → domain.HomeContent | None
   │                          (converts the ORM row to the domain entity)
   ▼
infra/models.py  HomeContentModel (SQLAlchemy)  ──>  table home_content

domain/language.py  Lang ("en" | "fr"), DEFAULT_LANG, localize(translated, lang) with English fallback
domain/home.py      @dataclass HomeContent (all languages)
```

## Frontend

- `HomePage` fetches `/api/home?lang=<lang>` on load and when the language changes (plain `fetch` in a small `useHomeContent` hook, no data library).
- Renders: `<h1>` name, headline, introduction (Markdown via `react-markdown`, see Open Question 5), then three links: LinkedIn, GitHub, "View my CV" / "Voir mon CV" (hidden when `cv_url` is null).
- Styling uses existing tokens only; accent on the links/buttons.

## Commands

Backend (from `backend/`): `uv run alembic upgrade head`, `uv run pytest`, `uv run ruff check .`
Frontend (from `frontend/`): `npm test`, `npm run lint`, `npm run build`

## Project Structure (new files)

```
backend/app/domain/language.py
backend/app/domain/home.py
backend/app/infra/models.py
backend/app/infra/repositories/home.py
backend/app/api/home.py          (+ /api/cv)
backend/migrations/versions/<date>-create_home_content.py
backend/storage/                 CV file, git-ignored (see Open Question 4)
backend/tests/test_home.py, test_isolation.py
frontend/src/pages/HomePage.tsx (+ .module.css, .test.tsx)
frontend/src/api/useHomeContent.ts
```

## Code Style

```python
Lang = Literal["en", "fr"]
DEFAULT_LANG: Lang = "en"
Translated = Mapping[str, str]  # {"en": "...", "fr": "..."}; other keys optional


def localize(value: Translated, lang: Lang) -> str:
    return value.get(lang) or value[DEFAULT_LANG]


@dataclass(frozen=True)
class HomeContent:
    headline: Translated
    intro: Translated
    linkedin_url: str
    github_url: str
```

```python
@router.get("/home")
async def get_home(
    lang: Lang, repository: Annotated[HomeContentRepository, Depends(get_home_repository)]
) -> HomeContentOut:
    content = await repository.get()
    if content is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    return HomeContentOut.from_domain(content, lang, cv_url=cv_url_if_present())
```

## Testing Strategy

- **Backend:** endpoint returns each language; missing translation falls back to English; the database rejects a row without `en` or `fr`; 422 on bad `lang`; 404 without a row; `cv_url` null/non-null depending on the file; `/api/cv` serves the PDF or 404. Repository converts ORM → domain correctly.
- **Isolation test** (carried over from feature 2 review): a row written in one test is not visible in the next.
- **Migration** round-trip already covered.
- **Frontend:** renders fetched content in both languages (mocked `fetch`); loading and error states; HTML inside Markdown is shown as text, not executed; CV link hidden when `cv_url` is null; external links have `rel="noopener noreferrer"`.

## Boundaries

- **Always:** branch `feature/home-page`; checks green before each commit; ORM and domain classes separate; Markdown rendered without raw HTML.
- **Ask first:** any dependency other than `react-markdown`; changes to `docker-compose.yml`.
- **Never:** commit the CV or any personal file; render user content with `dangerouslySetInnerHTML`; expose file system paths in API responses.

## Success Criteria

1. `/en` and `/fr` show the headline and introduction from the database in the right language.
2. Switching language updates the content without a full reload.
3. LinkedIn and GitHub links open in a new tab; the CV link opens the PDF, and is absent when no file is present.
4. `<script>` written in the introduction appears as text, never runs.
5. Stopping the backend shows the translated error message instead of a blank page.
6. A translation missing in the database is replaced by the English text.
7. All backend and frontend checks pass; migration upgrade/downgrade works.

## Decisions

- Translations: one `jsonb` column per translated field, English fallback (chosen with a future Dutch version in mind).
- Profile photo: later, with image uploads in the admin.
- Initial content: the migration inserts one row with placeholder text; real text is entered through the admin (feature 5).
- CV storage: git-ignored `backend/storage/` folder, served by `GET /api/cv`.
- `react-markdown` approved.
