from dataclasses import dataclass

from app.domain.language import Translated


@dataclass(frozen=True)
class HomeContent:
    """Content of the home page, in every language."""

    headline: Translated
    intro: Translated  # Markdown
    linkedin_url: str
    github_url: str
