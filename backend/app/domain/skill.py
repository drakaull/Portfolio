from dataclasses import dataclass
from typing import Literal, get_args

# Fixed categories, in display order.
SkillCategory = Literal["languages", "frontend", "backend", "tools", "ides"]
CATEGORIES: tuple[SkillCategory, ...] = get_args(SkillCategory)

NAME_MAX_LENGTH = 60
ICON_SLUG_MAX_LENGTH = 60
# Longest Simple Icons path: ~54,000 characters (Elsevier); PostCSS and Composer exceed 20,000.
ICON_PATH_MAX_LENGTH = 60_000


@dataclass(frozen=True)
class SkillIcon:
    """A Simple Icons logo, stored so the public site needs no icon library."""

    slug: str
    hex: str  # brand colour, 6 hex digits without "#"
    path: str  # SVG path data of a 24x24 icon


@dataclass(frozen=True)
class Skill:
    """A skill of one category; its place in the category is kept by the repository."""

    id: int | None  # None until stored
    name: str  # not translated: product and language names
    category: SkillCategory
    icon: SkillIcon | None


class SkillNameTakenError(Exception):
    """The category already has a skill with this name (case-insensitive)."""

    def __init__(self, name: str) -> None:
        super().__init__(f"This category already has a skill named {name!r}")
