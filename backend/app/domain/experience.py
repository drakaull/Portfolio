from dataclasses import dataclass
from typing import Literal

from app.domain.language import Translated

ExperienceKind = Literal["job", "student_job", "internship", "education"]

SLUG_PATTERN = r"^[a-z0-9-]+$"
SLUG_MAX_LENGTH = 80
ORGANIZATION_MAX_LENGTH = 120
SUMMARY_MAX_LENGTH = 220
DESCRIPTION_MAX_LENGTH = 5000


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
