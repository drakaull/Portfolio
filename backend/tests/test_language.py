import pytest

from app.domain.language import localize


def test_localize_returns_requested_language() -> None:
    assert localize({"en": "Hello", "fr": "Bonjour"}, "fr") == "Bonjour"


@pytest.mark.parametrize("translated", [{"en": "Hello"}, {"en": "Hello", "fr": ""}])
def test_localize_falls_back_to_english(translated: dict[str, str]) -> None:
    assert localize(translated, "fr") == "Hello"
