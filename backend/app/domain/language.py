from collections.abc import Mapping
from typing import Literal

# Supported languages. Adding one (e.g. "nl") here is enough for the backend: no migration needed.
Lang = Literal["en", "fr"]
# Language the admin writes in; other languages are translations of it.
SOURCE_LANG: Lang = "fr"

# Translated text as stored in JSON columns: {"en": "...", "fr": "..."}.
Translated = Mapping[str, str]


def localize(value: Translated, lang: Lang) -> str:
    """Text in the requested language, or in French (the source) when it is missing or empty."""
    return value.get(lang) or value[SOURCE_LANG]
