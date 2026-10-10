from collections.abc import Iterator

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app import cli
from app.infra.repositories.admin import AdminRepository
from app.infra.security import verify_password


def answer_prompts(monkeypatch: pytest.MonkeyPatch, *answers: str) -> None:
    replies: Iterator[str] = iter(answers)
    monkeypatch.setattr(cli.getpass, "getpass", lambda prompt="": next(replies))


@pytest.mark.parametrize(
    ("argv", "answers", "message"),
    [
        (["create-admin", "--username", "le"], [], "between 3 and 50"),
        (["create-admin", "--username", "leonard"], ["too-short"], "at least 12"),
        (["create-admin", "--username", "leonard"], ["long-enough-pw", "different-pw!"], "match"),
    ],
)
def test_create_admin_refuses_invalid_input(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    argv: list[str],
    answers: list[str],
    message: str,
) -> None:
    answer_prompts(monkeypatch, *answers)
    # Fails the test if the command reaches the database despite the invalid input.
    monkeypatch.setattr(cli, "_save", lambda *args: pytest.fail("must not save"))

    assert cli.main(argv) == 1
    assert message in capsys.readouterr().err


@pytest.mark.anyio
async def test_create_admin_stores_an_argon2_hash(session: AsyncSession) -> None:
    await cli.create_admin(session, "leonard", "long-enough-pw")

    user, password_hash = await AdminRepository(session).get_credentials("leonard")
    assert password_hash != "long-enough-pw"
    assert verify_password(password_hash, "long-enough-pw")
