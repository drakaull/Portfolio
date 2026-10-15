import pytest

from app.infra.rate_limit import LoginRateLimiter, client_key


@pytest.mark.parametrize(
    ("address", "key"),
    [
        ("81.247.154.2", "81.247.154.2"),
        ("2a02:a03f:ca31:bf01:84b3:6466:d872:cc47", "2a02:a03f:ca31:bf01::/64"),
        ("2a02:a03f:ca31:bf01::1", "2a02:a03f:ca31:bf01::/64"),
        ("::ffff:81.247.154.2", "81.247.154.2"),  # an IPv4 client seen through IPv6
        ("unknown", "unknown"),
    ],
)
def test_limits_count_ipv4_addresses_and_ipv6_blocks(address: str, key: str) -> None:
    assert client_key(address) == key


def test_changing_address_within_an_ipv6_block_does_not_escape_the_limit() -> None:
    limiter = LoginRateLimiter(max_failures=3, window_seconds=60)
    for suffix in ("1", "2", "3"):
        limiter.record_failure(f"2a02:a03f:ca31:bf01::{suffix}", now=0)

    assert limiter.is_blocked("2a02:a03f:ca31:bf01:ffff::9", now=1)
    assert not limiter.is_blocked("2a02:a03f:ca31:bf02::1", now=1)  # another subscriber
