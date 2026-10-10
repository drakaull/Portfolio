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


def check_password_policy(password: str) -> None:
    if len(password) < MIN_PASSWORD_LENGTH:
        raise WeakPasswordError(
            f"The password must have at least {MIN_PASSWORD_LENGTH} characters."
        )
    if len(password) > MAX_PASSWORD_LENGTH:
        raise WeakPasswordError(f"The password must have at most {MAX_PASSWORD_LENGTH} characters.")
