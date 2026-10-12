from dataclasses import dataclass
from datetime import datetime, timedelta

from app.domain.language import Lang

NAME_MAX_LENGTH = 100
EMAIL_MAX_LENGTH = 254  # RFC 5321 limit
MESSAGE_MIN_LENGTH = 10
MESSAGE_MAX_LENGTH = 5000
# Announced on the privacy page: messages are deleted after a year.
RETENTION = timedelta(days=365)


@dataclass(frozen=True)
class ContactMessage:
    """A message sent from the contact form. The sender's IP address is never kept."""

    id: int | None  # None until stored
    name: str
    email: str
    message: str
    lang: Lang  # language of the page it was sent from
    created_at: datetime | None  # set by the database
    read: bool
