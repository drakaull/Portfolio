import re
from dataclasses import dataclass
from datetime import datetime
from typing import Literal

from app.domain.language import Translated

ProjectContext = Literal["school", "personal", "professional"]

TITLE_MAX_LENGTH = 120
TEAM_SIZE_MAX = 100


@dataclass(frozen=True)
class GitHubRepository:
    """What GitHub says about a public repository; refreshed by every sync."""

    github_id: int  # stable across renames
    name: str
    url: str
    homepage: str | None
    about: str | None  # the "About" text (GitHub's description)
    languages: dict[str, int]  # bytes of code per language, as GitHub counts them
    topics: tuple[str, ...]
    created_at: datetime
    pushed_at: datetime
    stars: int


@dataclass(frozen=True)
class Project:
    """A repository shown (or not) on the site, with what the admin adds to it."""

    id: int | None  # None until stored
    repository: GitHubRepository
    about_lang: str | None  # language DeepL detected in the "About"
    summary: Translated  # the "About" in every language; empty without one
    title: str
    context: ProjectContext | None
    team_size: int | None
    visible: bool
    missing: bool  # gone from the public repositories at the last sync


def title_from_name(name: str) -> str:
    """Readable starting title: "Projet_TTMC" -> "Projet TTMC", "AemtHackatonBackend" -> "Aemt
    Hackaton Backend"."""
    spaced = re.sub(r"[_\-.]+", " ", name)
    spaced = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", spaced)
    return " ".join(spaced.split())[:TITLE_MAX_LENGTH]
