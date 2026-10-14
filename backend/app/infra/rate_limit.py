import ipaddress
import time
from collections import defaultdict, deque


def client_key(address: str) -> str:
    """What the limits count by: an IPv4 address, or the /64 block of an IPv6 address.

    An IPv6 subscriber gets a whole /64 and can pick a new address in it at will (privacy
    extensions do it on their own): counting single addresses would let anyone dodge the limits.
    """
    try:
        ip = ipaddress.ip_address(address)
    except ValueError:
        return address  # e.g. "unknown" when there is no client address
    if ip.version == 6:
        if ip.ipv4_mapped:  # ::ffff:1.2.3.4 is an IPv4 client
            return str(ip.ipv4_mapped)
        return str(ipaddress.ip_network(f"{ip}/64", strict=False))
    return str(ip)


class LoginRateLimiter:
    """Counts failed logins per client (see client_key) over a sliding window.

    shortcut: counters live in this process's memory, so they reset on restart and are not shared
    between processes; move them to the database if the backend ever runs several workers.
    """

    def __init__(self, max_failures: int = 10, window_seconds: float = 15 * 60) -> None:
        self.max_failures = max_failures
        self.window_seconds = window_seconds
        self._failures: dict[str, deque[float]] = defaultdict(deque)

    def _recent(self, key: str, now: float) -> deque[float]:
        failures = self._failures[key]
        while failures and failures[0] <= now - self.window_seconds:
            failures.popleft()
        if not failures:
            del self._failures[key]  # keep memory bounded to clients with recent failures
            return deque()
        return failures

    def is_blocked(self, address: str, now: float | None = None) -> bool:
        key = client_key(address)
        return len(self._recent(key, time.monotonic() if now is None else now)) >= self.max_failures

    def record_failure(self, address: str, now: float | None = None) -> None:
        self._failures[client_key(address)].append(time.monotonic() if now is None else now)

    def forgive(self, address: str) -> None:
        """Cancel the most recent recorded attempt (it turned out to be a successful login)."""
        key = client_key(address)
        if self._failures.get(key):
            self._failures[key].pop()

    def reset(self) -> None:
        self._failures.clear()


login_limiter = LoginRateLimiter()
# Same sliding window for the contact form: every accepted message counts, 5 per hour per IP.
contact_limiter = LoginRateLimiter(max_failures=5, window_seconds=60 * 60)
