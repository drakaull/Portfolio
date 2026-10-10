import threading
import time

import anyio
import pytest

from app.domain.auth import WeakPasswordError, check_password_policy
from app.infra import security
from app.infra.security import hash_password, hash_token, new_session_token, verify_password


def test_password_policy_rejects_short_passwords() -> None:
    with pytest.raises(WeakPasswordError):
        check_password_policy("11-chars-xx")
    check_password_policy("12-chars-xxx")


def test_password_policy_rejects_passwords_the_login_form_would_refuse() -> None:
    check_password_policy("x" * 128)
    with pytest.raises(WeakPasswordError):
        check_password_policy("x" * 129)


def test_password_hash_round_trip() -> None:
    password_hash = hash_password("correct horse battery")

    assert password_hash != "correct horse battery"
    assert password_hash.startswith("$argon2id$")
    assert verify_password(password_hash, "correct horse battery")
    assert not verify_password(password_hash, "wrong password")


def test_verify_password_rejects_a_malformed_hash() -> None:
    assert not verify_password("not-a-hash", "anything")


def test_session_token_and_hash() -> None:
    token, token_hash = new_session_token()

    assert len(token) >= 43  # 32 random bytes, base64url
    assert token_hash == hash_token(token) != token
    assert new_session_token()[0] != token


@pytest.mark.anyio
async def test_at_most_two_password_checks_run_at_once(monkeypatch: pytest.MonkeyPatch) -> None:
    running = peak = 0
    lock = threading.Lock()

    def slow_verify(password_hash: str, password: str) -> bool:
        nonlocal running, peak
        with lock:
            running += 1
            peak = max(peak, running)
        time.sleep(0.05)
        with lock:
            running -= 1
        return False

    monkeypatch.setattr(security, "verify_password", slow_verify)
    async with anyio.create_task_group() as group:
        for _ in range(6):
            group.start_soon(security.verify_password_in_thread, "hash", "password")

    assert peak == 2
