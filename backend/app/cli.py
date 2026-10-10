"""Administration commands, run on the server by the site owner.

Usage: uv run python -m app.cli create-admin --username leonard
"""

import argparse
import asyncio
import getpass
import sys

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.auth import (
    AdminAlreadyExistsError,
    AdminUser,
    WeakPasswordError,
    check_password_policy,
)
from app.infra.database import SessionFactory, engine
from app.infra.repositories.admin import AdminRepository
from app.infra.security import hash_password


async def create_admin(session: AsyncSession, username: str, password: str) -> AdminUser:
    """Create the admin, or change their password (which revokes all their sessions)."""
    repository = AdminRepository(session)
    existing = await repository.first_username()
    if existing is not None and existing != username:
        raise AdminAlreadyExistsError(existing)
    user = await repository.save_user(username, hash_password(password))
    await session.commit()
    return user


async def _save(username: str, password: str) -> None:
    async with SessionFactory() as session:
        await create_admin(session, username, password)
    await engine.dispose()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    commands = parser.add_subparsers(dest="command", required=True)
    create = commands.add_parser("create-admin", help="create the admin or change its password")
    create.add_argument("--username", required=True)
    args = parser.parse_args(argv)

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
