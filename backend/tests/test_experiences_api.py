import pytest
from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.infra.models import ExperienceModel

pytestmark = pytest.mark.anyio


async def test_list_is_localized_and_most_recent_first(client: AsyncClient) -> None:
    french = (await client.get("/api/experiences", params={"lang": "fr"})).json()
    english = (await client.get("/api/experiences", params={"lang": "en"})).json()

    assert [entry["slug"] for entry in french][:3] == [
        "icare-student-job-2026",
        "icare-internship-2026",
        "fastai-training-2024",
    ]
    assert french[0] == {
        "slug": "icare-student-job-2026",
        "kind": "student_job",
        "title": "Ingénieur R&D",
        "organization": "I-care Group",
        "start_year": 2026,
        "end_year": 2026,
        "summary": "Conception et mise en place d'une solution de stockage hybride chaud/froid "
        "pour des données IoT industrielles.",
        "technologies": ["Amazon S3", "Python", "NoSQL", "Docker", "FastAPI"],
        "logo_url": None,
    }
    assert english[0]["title"] == "R&D Engineer"
    assert "description" not in french[0]  # detail only


async def test_missing_english_falls_back_to_french(
    client: AsyncClient, session: AsyncSession
) -> None:
    await session.execute(
        update(ExperienceModel)
        .where(ExperienceModel.slug == "epicura-internship-2023")
        .values(title={"fr": "Stage d'observation", "en": ""})
    )

    english = (await client.get("/api/experiences", params={"lang": "en"})).json()

    epicura = next(entry for entry in english if entry["slug"] == "epicura-internship-2023")
    assert epicura["title"] == "Stage d'observation"


async def test_detail_includes_the_description(client: AsyncClient) -> None:
    response = await client.get("/api/experiences/helha-computer-science", params={"lang": "en"})

    assert response.status_code == 200
    detail = response.json()
    assert detail["kind"] == "education"
    assert (detail["start_year"], detail["end_year"]) == (2023, 2026)
    assert detail["description"] == "Computer science studies focused on application development."


@pytest.mark.parametrize(
    ("path", "params", "status"),
    [
        ("/api/experiences/unknown-entry", {"lang": "fr"}, 404),
        ("/api/experiences/Bad%20Slug", {"lang": "fr"}, 422),
        ("/api/experiences", {"lang": "de"}, 422),
        ("/api/experiences", {}, 422),
    ],
)
async def test_errors(client: AsyncClient, path: str, params: dict, status: int) -> None:
    assert (await client.get(path, params=params)).status_code == status


async def test_dutch_falls_back_to_french_until_translated(client: AsyncClient) -> None:
    dutch = (await client.get("/api/experiences", params={"lang": "nl"})).json()

    assert dutch[0]["title"] == "Ingénieur R&D"  # no Dutch text yet in the seed
