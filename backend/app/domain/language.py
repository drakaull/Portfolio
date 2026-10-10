from collections.abc import Mapping
from typing import Literal

# Supported languages. Adding one (e.g. "nl") here is enough for the backend: no migration needed.
Lang = Literal["en", "fr"]
DEFAULT_LANG: Lang = "en"

# Translated text as stored in JSON columns: {"en": "...", "fr": "..."}.
Translated = Mapping[str, str]


def localize(value: Translated, lang: Lang) -> str:
    """Text in the requested language, or in English when that translation is missing or empty."""
    return value.get(lang) or value[DEFAULT_LANG]
