from dataclasses import dataclass

from app.domain.language import Translated

HEADLINE_MAX_LENGTH = 120
INTRO_MAX_LENGTH = 5000
URL_MAX_LENGTH = 255


@dataclass(frozen=True)
class HomeContent:
    """Content of the home page, in every language."""

    headline: Translated
    intro: Translated  # Markdown
    linkedin_url: str
    github_url: str
