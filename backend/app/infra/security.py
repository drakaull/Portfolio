import hashlib
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

# argon2id with the library defaults (RFC 9106 recommended profile).
_hasher = PasswordHasher()

# Verified when the username does not exist, so both cases take the same time (no user enumeration).
_DUMMY_HASH = _hasher.hash("dummy password for constant-time login")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def burn_password_check(password: str) -> None:
    """Spend the same work as a real verification, for unknown usernames."""
    verify_password(_DUMMY_HASH, password)


def hash_token(token: str) -> str:
    """Session tokens are stored as SHA-256: a database leak gives no usable cookie."""
    return hashlib.sha256(token.encode()).hexdigest()


def new_session_token() -> tuple[str, str]:
    """Random 256-bit token for the cookie, and its hash for the database."""
    token = secrets.token_urlsafe(32)
    return token, hash_token(token)
