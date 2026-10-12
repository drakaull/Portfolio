import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import assert_committed

pytestmark = pytest.mark.anyio

URL = "/api/admin/skills"
ICON = {"slug": "python", "hex": "3776AB", "path": "M14.25.18l.9.2.73.26.59.3z"}
PYTHON = {"name": "Python", "category": "languages", "icon": ICON}


async def create(client: AsyncClient, body: dict) -> dict:
    response = await client.post(URL, json=body)
    assert response.status_code == 201, response.text
    return response.json()


async def public(client: AsyncClient) -> list[dict]:
    return (await client.get("/api/skills")).json()


async def test_public_list_is_grouped_in_category_order(admin_client: AsyncClient) -> None:
    assert await public(admin_client) == []  # starts empty
    await create(admin_client, {"name": "Git", "category": "tools"})
    await create(admin_client, PYTHON)
    await create(admin_client, {"name": "NoSQL", "category": "backend"})

    assert await public(admin_client) == [
        {"category": "languages", "skills": [{"name": "Python", "icon": ICON}]},
        {"category": "backend", "skills": [{"name": "NoSQL", "icon": None}]},
        {"category": "tools", "skills": [{"name": "Git", "icon": None}]},
    ]


async def test_create_get_update(admin_client: AsyncClient, session: AsyncSession) -> None:
    created = await create(admin_client, PYTHON)
    assert_committed(session)
    assert created == {"id": created["id"], **PYTHON}
    url = f"{URL}/{created['id']}"

    response = await admin_client.put(url, json={"name": " Python 3 ", "category": "languages"})
    assert_committed(session)

    assert response.status_code == 200
    assert (await admin_client.get(url)).json() == {
        "id": created["id"],
        "name": "Python 3",
        "category": "languages",
        "icon": None,  # logo removed
    }


async def test_duplicate_names_in_a_category_are_refused(admin_client: AsyncClient) -> None:
    await create(admin_client, PYTHON)
    java = await create(admin_client, {"name": "Java", "category": "languages"})

    assert (await admin_client.post(URL, json={**PYTHON, "name": "PYTHON"})).status_code == 409
    renamed = {"name": "python", "category": "languages"}
    assert (await admin_client.put(f"{URL}/{java['id']}", json=renamed)).status_code == 409


async def test_move_reorders_the_public_list(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    await create(admin_client, PYTHON)
    java = await create(admin_client, {"name": "Java", "category": "languages"})

    response = await admin_client.post(f"{URL}/{java['id']}/move", json={"direction": "up"})
    assert_committed(session)

    assert response.status_code == 204
    skills = (await public(admin_client))[0]["skills"]
    assert [skill["name"] for skill in skills] == ["Java", "Python"]


async def test_delete(admin_client: AsyncClient, session: AsyncSession) -> None:
    created = await create(admin_client, PYTHON)

    response = await admin_client.delete(f"{URL}/{created['id']}")
    assert_committed(session)

    assert response.status_code == 204
    assert await public(admin_client) == []


@pytest.mark.parametrize(
    ("method", "path", "body"),
    [
        ("GET", "/999999", None),
        ("PUT", "/999999", PYTHON),
        ("DELETE", "/999999", None),
        ("POST", "/999999/move", {"direction": "up"}),
    ],
)
async def test_unknown_skill_is_404(
    admin_client: AsyncClient, method: str, path: str, body: dict | None
) -> None:
    response = await admin_client.request(method, URL + path, json=body)
    assert response.status_code == 404


@pytest.mark.parametrize(
    ("changes", "field"),
    [
        ({"name": "  "}, "name"),
        ({"name": "x" * 61}, "name"),
        ({"category": "databases"}, "category"),
        ({"icon": {**ICON, "slug": "Py thon"}}, "slug"),
        ({"icon": {**ICON, "hex": "#3776AB"}}, "hex"),
        ({"icon": {**ICON, "path": "M0 0<script>"}}, "path"),
        ({"icon": {**ICON, "path": 'M0 0" onload="x'}}, "path"),
        ({"icon": {**ICON, "path": "M" + "0" * 60_000}}, "path"),
        ({"icon": {"slug": "python"}}, "hex"),
        ({"unknown": 1}, "unknown"),
    ],
)
async def test_invalid_skills_are_refused(
    admin_client: AsyncClient, changes: dict, field: str
) -> None:
    response = await admin_client.post(URL, json={**PYTHON, **changes})

    assert response.status_code == 422
    assert any(error["loc"][-1] == field for error in response.json()["detail"])
    assert await public(admin_client) == []


async def test_move_needs_a_known_direction(admin_client: AsyncClient) -> None:
    created = await create(admin_client, PYTHON)
    response = await admin_client.post(f"{URL}/{created['id']}/move", json={"direction": "left"})
    assert response.status_code == 422
