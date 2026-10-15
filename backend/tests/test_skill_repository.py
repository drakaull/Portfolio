from dataclasses import replace

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.skill import Skill, SkillIcon, SkillNameTakenError
from app.infra.models import SkillModel
from app.infra.repositories.skill import SkillRepository

pytestmark = pytest.mark.anyio

ICON = SkillIcon(slug="python", hex="3776AB", path="M14.25.18l.9.2.73.26z")


def skill(name: str, category: str = "languages", icon: SkillIcon | None = None) -> Skill:
    return Skill(id=None, name=name, category=category, icon=icon)


async def names(repository: SkillRepository) -> list[tuple[str, str]]:
    return [(entry.category, entry.name) for entry in await repository.list()]


async def test_create_appends_and_list_follows_the_category_order(session: AsyncSession) -> None:
    repository = SkillRepository(session)

    await repository.create(skill("Git", "tools"))
    python = await repository.create(skill("Python", icon=ICON))
    await repository.create(skill("React", "frontend"))
    await repository.create(skill("Java"))

    assert python.id is not None
    assert await repository.get(python.id) == python
    assert await names(repository) == [
        ("languages", "Python"),
        ("languages", "Java"),
        ("frontend", "React"),
        ("tools", "Git"),
    ]


async def test_names_are_unique_per_category_ignoring_case(session: AsyncSession) -> None:
    repository = SkillRepository(session)
    await repository.create(skill("Python"))

    with pytest.raises(SkillNameTakenError):
        await repository.create(skill("python"))
    await repository.create(skill("Python", "tools"))  # another category is fine


async def test_update_replaces_fields_and_moves_to_the_end_of_a_new_category(
    session: AsyncSession,
) -> None:
    repository = SkillRepository(session)
    docker = await repository.create(skill("Docker"))
    await repository.create(skill("Git", "tools"))

    await repository.update(replace(docker, category="tools", icon=ICON))

    assert await names(repository) == [("tools", "Git"), ("tools", "Docker")]
    assert (await repository.get(docker.id)).icon == ICON


async def test_update_keeps_its_own_name_but_refuses_a_taken_one(session: AsyncSession) -> None:
    repository = SkillRepository(session)
    python = await repository.create(skill("Python"))
    await repository.create(skill("Java"))

    await repository.update(replace(python, name="python"))  # its own name, other case
    with pytest.raises(SkillNameTakenError):
        await repository.update(replace(python, name="JAVA"))
    with pytest.raises(LookupError):
        await repository.update(replace(python, id=999_999))


async def test_move_swaps_neighbours_within_the_category(session: AsyncSession) -> None:
    repository = SkillRepository(session)
    python = await repository.create(skill("Python"))
    java = await repository.create(skill("Java"))
    await repository.create(skill("Git", "tools"))

    assert await repository.move(java.id, "up") is True
    assert await names(repository) == [
        ("languages", "Java"),
        ("languages", "Python"),
        ("tools", "Git"),
    ]

    await repository.move(java.id, "up")  # already first: nothing changes
    await repository.move(python.id, "down")  # already last of its category
    assert await names(repository) == [
        ("languages", "Java"),
        ("languages", "Python"),
        ("tools", "Git"),
    ]
    assert await repository.move(999_999, "up") is False


async def test_delete(session: AsyncSession) -> None:
    repository = SkillRepository(session)
    python = await repository.create(skill("Python"))

    assert await repository.delete(python.id) is True
    assert await repository.get(python.id) is None
    assert await repository.delete(python.id) is False


@pytest.mark.parametrize(
    "changes",
    [
        {"category": "databases"},
        {"icon_slug": "python"},  # logo without colour and path
        {"icon_slug": "x", "icon_hex": "blue!", "icon_path": "M0 0"},
    ],
    ids=["category", "partial-icon", "hex-format"],
)
async def test_database_rejects_invalid_rows(session: AsyncSession, changes: dict) -> None:
    session.add(SkillModel(**({"name": "X", "category": "tools", "position": 0} | changes)))

    with pytest.raises(IntegrityError):
        await session.flush()
