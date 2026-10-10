from dataclasses import dataclass
from datetime import timedelta

MIN_PASSWORD_LENGTH = 12
# Same limit as the login form, so any password the CLI accepts can be used to sign in.
MAX_PASSWORD_LENGTH = 128
SESSION_LIFETIME = timedelta(hours=8)


@dataclass(frozen=True)
class AdminUser:
    id: int
    username: str


class WeakPasswordError(ValueError):
    pass


class AdminAlreadyExistsError(Exception):
    """The site has a single admin: a different username is most likely a typo."""

    def __init__(self, existing_username: str) -> None:
        super().__init__(
            f"An admin already exists ('{existing_username}'). "
            "Use that username to change its password."
        )


def check_password_policy(password: str) -> None:
    if len(password) < MIN_PASSWORD_LENGTH:
        raise WeakPasswordError(
            f"The password must have at least {MIN_PASSWORD_LENGTH} characters."
        )
    if len(password) > MAX_PASSWORD_LENGTH:
        raise WeakPasswordError(f"The password must have at most {MAX_PASSWORD_LENGTH} characters.")
