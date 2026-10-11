"""Administration commands, run on the server by the site owner.

Usage:
    uv run python -m app.cli create-admin --username leonard
    uv run python -m app.cli translate-missing
"""

import argparse
import asyncio
import getpass
import sys
from dataclasses import replace

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.auth import (
    AdminAlreadyExistsError,
    AdminUser,
    WeakPasswordError,
    check_password_policy,
)
from app.infra.config import settings
from app.infra.database import SessionFactory, engine
from app.infra.repositories.admin import AdminRepository
from app.infra.repositories.experience import ExperienceRepository
from app.infra.repositories.home import HomeContentRepository
from app.infra.security import hash_password
from app.infra.translation import TextFormat, Translator, fill_missing


async def create_admin(session: AsyncSession, username: str, password: str) -> AdminUser:
    """Create the admin, or change their password (which revokes all their sessions)."""
    repository = AdminRepository(session)
    existing = await repository.first_username()
    if existing is not None and existing != username:
        raise AdminAlreadyExistsError(existing)
    user = await repository.save_user(username, hash_password(password))
    await session.commit()
    return user


_HOME_FIELDS: dict[str, TextFormat] = {"headline": "plain", "intro": "markdown"}
_EXPERIENCE_FIELDS: dict[str, TextFormat] = {
    "title": "plain",
    "summary": "plain",
    "description": "markdown",
}


def _describe(filled: dict[str, list[str]]) -> str:
    """E.g. "en (intro); nl (headline, intro)"."""
    return "; ".join(f"{lang} ({', '.join(fields)})" for lang, fields in filled.items())


async def translate_missing(
    session: AsyncSession, translator: Translator
) -> tuple[list[str], bool]:
    """Fill every empty translation of the site's content from French; never overwrite text.

    Returns one report line per item that received translations, and whether DeepL failed.
    """
    report: list[str] = []
    failed = False

    home_repository = HomeContentRepository(session)
    home = await home_repository.get()
    if home is not None:
        texts = {"headline": dict(home.headline), "intro": dict(home.intro)}
        filled, home_failed = await fill_missing(texts, _HOME_FIELDS, translator)
        failed |= home_failed
        if filled:
            await home_repository.save(
                replace(home, headline=texts["headline"], intro=texts["intro"])
            )
            report.append(f"home: {_describe(filled)}")

    experience_repository = ExperienceRepository(session)
    for entry in await experience_repository.list():
        texts = {field: dict(getattr(entry, field)) for field in _EXPERIENCE_FIELDS}
        filled, entry_failed = await fill_missing(texts, _EXPERIENCE_FIELDS, translator)
        failed |= entry_failed
        if filled:
            await experience_repository.save_texts(replace(entry, **texts))
            report.append(f"experience {entry.slug}: {_describe(filled)}")

    await session.commit()
    return report, failed


async def _translate_missing() -> int:
    try:
        async with SessionFactory() as session:
            report, failed = await translate_missing(session, Translator(settings.deepl_api_key))
    except (SQLAlchemyError, OSError) as error:
        # Everything is committed at the end, in one transaction: a failure saves nothing.
        print(f"Translation stopped, nothing was saved: {error}", file=sys.stderr)
        return 1
    finally:
        await engine.dispose()
    for line in report or ["Nothing to translate."]:
        print(line)
    if failed:
        print(
            "Some translations failed: is DEEPL_API_KEY set and DeepL reachable?", file=sys.stderr
        )
        return 1
    return 0


async def _save(username: str, password: str) -> None:
    async with SessionFactory() as session:
        await create_admin(session, username, password)
    await engine.dispose()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    commands = parser.add_subparsers(dest="command", required=True)
    create = commands.add_parser("create-admin", help="create the admin or change its password")
    create.add_argument("--username", required=True)
    commands.add_parser("translate-missing", help="translate empty texts from French with DeepL")
    args = parser.parse_args(argv)

    if args.command == "translate-missing":
        return asyncio.run(_translate_missing())

    if not 3 <= len(args.username) <= 50:
        print("The username must have between 3 and 50 characters.", file=sys.stderr)
        return 1

    password = getpass.getpass("Password: ")
    try:
        check_password_policy(password)
    except WeakPasswordError as error:
        print(error, file=sys.stderr)
        return 1
    if getpass.getpass("Repeat the password: ") != password:
        print("The passwords do not match.", file=sys.stderr)
        return 1

    try:
        asyncio.run(_save(args.username, password))
    except AdminAlreadyExistsError as error:
        print(error, file=sys.stderr)
        return 1
    print(f"Admin '{args.username}' saved. Existing sessions of this account were signed out.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
