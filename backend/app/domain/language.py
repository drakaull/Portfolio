from collections.abc import Mapping
from typing import Literal, get_args

# Supported languages. Adding one needs no migration, but also its DeepL code
# (infra/translation.py) and a field in the admin input models (api/admin_home.py).
Lang = Literal["en", "fr", "nl"]
# Language the admin writes in; other languages are translations of it.
SOURCE_LANG: Lang = "fr"

# How a translated text is written: Markdown or plain text.
TextFormat = Literal["markdown", "plain"]

# Translated text as stored in JSON columns: {"fr": "...", "en": "...", "nl": "..."}.
Translated = Mapping[str, str]


def localize(value: Translated, lang: Lang) -> str:
    """Text in the requested language, or in French (the source) when it is missing or empty."""
    return value.get(lang) or value[SOURCE_LANG]


def with_every_lang(value: Translated) -> dict[str, str]:
    """Every supported language as a key; rows saved before a language existed get "" for it."""
    return {lang: value.get(lang, "") for lang in get_args(Lang)}
