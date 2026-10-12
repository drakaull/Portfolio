import html
import logging
from collections.abc import Mapping, Sequence
from typing import get_args

import httpx
from markdown_it import MarkdownIt
from markdownify import markdownify

from app.domain.language import SOURCE_LANG, Lang, TextFormat

logger = logging.getLogger(__name__)

# DeepL language codes; British English for a European audience.
_DEEPL_LANGS: dict[Lang, str] = {"fr": "FR", "en": "EN-GB", "nl": "NL"}
_TIMEOUT_SECONDS = 10
# Raw HTML typed in Markdown is escaped, never passed through (same rule as the public renderer).
_markdown = MarkdownIt("commonmark", {"html": False})


class TranslationUnavailable(Exception):
    """DeepL could not translate: no key, rejected key, quota reached, timeout or network error."""


def markdown_to_html(text: str) -> str:
    return _markdown.render(text)


def html_to_markdown(text: str) -> str:
    # Options chosen so Markdown -> HTML -> Markdown gives back the editor's syntax unchanged.
    return markdownify(
        text, heading_style="ATX", bullets="-", escape_underscores=False, escape_asterisks=False
    ).strip()


def _to_html(text: str, text_format: TextFormat) -> str:
    return markdown_to_html(text) if text_format == "markdown" else html.escape(text)


def _from_html(text: str, text_format: TextFormat) -> str:
    return html_to_markdown(text) if text_format == "markdown" else html.unescape(text)


class Translator:
    """Translates admin texts from the source language with DeepL.

    DeepL mangles Markdown but handles HTML well (`tag_handling=html` keeps tags and link targets),
    so every text travels as HTML and comes back in its original format.
    """

    def __init__(self, api_key: str | None, transport: httpx.AsyncBaseTransport | None = None):
        self._api_key = api_key
        self._transport = transport  # tests inject a fake; production uses the network

    async def translate(self, items: Sequence[tuple[str, TextFormat]], target: Lang) -> list[str]:
        """Translate admin texts from French (the writing language)."""
        to_send = [(index, text, fmt) for index, (text, fmt) in enumerate(items) if text.strip()]
        results = [""] * len(items)
        if not to_send:
            self._check_configured()
            return results
        translations = await self._request(
            [_to_html(text, fmt) for _, text, fmt in to_send], target, SOURCE_LANG
        )
        try:
            for (index, _, fmt), translation in zip(to_send, translations, strict=True):
                results[index] = _from_html(translation["text"], fmt)
        except (ValueError, KeyError, TypeError) as error:  # not DeepL's shape
            raise TranslationUnavailable("DeepL sent an unexpected answer") from error
        return results

    async def translate_detecting(self, text: str, target: Lang) -> tuple[str, str]:
        """Translate a plain text written in any language; returns the translation and the
        source language DeepL detected (lowercase, e.g. "en")."""
        [translation] = await self._request([html.escape(text)], target, None)
        try:
            return html.unescape(translation["text"]), translation[
                "detected_source_language"
            ].lower()
        except (KeyError, TypeError, AttributeError) as error:  # not DeepL's shape
            raise TranslationUnavailable("DeepL sent an unexpected answer") from error

    def _check_configured(self) -> str:
        if not self._api_key:
            raise TranslationUnavailable("DeepL is not configured")
        return self._api_key

    async def _request(self, texts: list[str], target: Lang, source: Lang | None) -> list:
        """POST HTML texts to DeepL; `source` None lets DeepL detect it."""
        api_key = self._check_configured()
        # Free-plan keys end with ":fx" and use a separate host.
        host = "api-free.deepl.com" if api_key.endswith(":fx") else "api.deepl.com"
        payload = {"text": texts, "target_lang": _DEEPL_LANGS[target], "tag_handling": "html"}
        if source is not None:
            payload["source_lang"] = _DEEPL_LANGS[source]
        try:
            async with httpx.AsyncClient(
                timeout=_TIMEOUT_SECONDS, transport=self._transport
            ) as client:
                response = await client.post(
                    f"https://{host}/v2/translate",
                    json=payload,
                    headers={"Authorization": f"DeepL-Auth-Key {api_key}"},
                )
        except httpx.HTTPError as error:
            raise TranslationUnavailable(f"DeepL request failed: {type(error).__name__}") from error
        # 403: bad key, 456: monthly quota reached, 429/5xx: DeepL busy or down.
        if response.status_code != 200:
            raise TranslationUnavailable(f"DeepL answered HTTP {response.status_code}")
        try:
            translations = response.json()["translations"]
        except (ValueError, KeyError, TypeError) as error:  # not JSON, or not DeepL's shape
            raise TranslationUnavailable("DeepL sent an unexpected answer") from error
        if not isinstance(translations, list) or len(translations) != len(texts):
            raise TranslationUnavailable("DeepL sent an unexpected answer")
        return translations


async def fill_missing(
    texts: dict[str, dict[str, str]],
    formats: Mapping[str, TextFormat],
    translator: Translator,
    unavailable: set[Lang] | None = None,
) -> tuple[dict[Lang, list[str]], bool]:
    """Translate, in place, every empty non-source text of `texts` from the source language.

    `texts` maps a field name to its translations; text already written in a language is never
    replaced. Returns, per language, the fields that received a translation, and whether any
    language failed (the caller keeps the source text meanwhile: the public site falls back to it).
    Languages in `unavailable` are skipped as failed, and new failures are added to it, so a caller
    filling many items stops asking DeepL for a language once it failed.
    """
    if unavailable is None:
        unavailable = set()
    filled: dict[Lang, list[str]] = {}
    failed = False
    for target in (lang for lang in get_args(Lang) if lang != SOURCE_LANG):
        if target in unavailable:
            failed = True
            continue
        # A field without source text has nothing to translate: it would stay empty anyway.
        empty = [
            field
            for field in formats
            if texts[field].get(SOURCE_LANG, "").strip() and not texts[field].get(target)
        ]
        if not empty:
            continue
        items = [(texts[field][SOURCE_LANG], formats[field]) for field in empty]
        try:
            translations = await translator.translate(items, target)
        except TranslationUnavailable as error:
            logger.warning("Automatic translation to %s failed: %s", target, error)
            unavailable.add(target)
            failed = True
            continue
        for field, translation in zip(empty, translations, strict=True):
            texts[field][target] = translation
        filled[target] = empty
    return filled, failed
