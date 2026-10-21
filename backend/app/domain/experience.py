from collections.abc import Mapping
from dataclasses import dataclass
from typing import Literal

from app.domain.language import TextFormat, Translated

ExperienceKind = Literal["job", "student_job", "internship", "education"]

SLUG_PATTERN = r"^[a-z0-9-]+$"
# /admin/experiences/new is the creation page, so no entry may use that address.
RESERVED_SLUGS = frozenset({"new"})
SLUG_MAX_LENGTH = 80
ORGANIZATION_MAX_LENGTH = 120
TITLE_MAX_LENGTH = 120
SUMMARY_MAX_LENGTH = 220
DESCRIPTION_MAX_LENGTH = 5000
TECHNOLOGIES_MAX_COUNT = 15
TECHNOLOGY_MAX_LENGTH = 40
YEAR_MIN = 1950
YEAR_MAX = 2100

# Translated fields of Experience and their format.
TRANSLATED_FIELDS: Mapping[str, TextFormat] = {
    "title": "plain",
    "summary": "plain",
    "description": "markdown",
}


class ExperienceSlugTakenError(Exception):
    """Another experience already uses this address."""

    def __init__(self, slug: str) -> None:
        super().__init__(f"An experience already uses the address {slug!r}")
        self.slug = slug


@dataclass(frozen=True)
class Experience:
    """A job, student job, internship or education entry of the timeline, in every language."""

    slug: str
    kind: ExperienceKind
    title: Translated
    organization: str
    start_year: int
    end_year: int | None  # None while ongoing
    summary: Translated
    description: Translated  # Markdown
    technologies: tuple[str, ...]
    logo_focus_x: int = 50  # framing of the organisation's image, in %
    logo_focus_y: int = 50
