import html
import logging
from collections.abc import Mapping, Sequence
from typing import Literal, get_args

import httpx
from markdown_it import MarkdownIt
from markdownify import markdownify

from app.domain.language import SOURCE_LANG, Lang

logger = logging.getLogger(__name__)

TextFormat = Literal["markdown", "plain"]

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
        if not self._api_key:
            raise TranslationUnavailable("DeepL is not configured")
        to_send = [(index, text, fmt) for index, (text, fmt) in enumerate(items) if text.strip()]
        results = [""] * len(items)
        if not to_send:
            return results

        # Free-plan keys end with ":fx" and use a separate host.
        host = "api-free.deepl.com" if self._api_key.endswith(":fx") else "api.deepl.com"
        payload = {
            "text": [_to_html(text, fmt) for _, text, fmt in to_send],
            "source_lang": _DEEPL_LANGS[SOURCE_LANG],
            "target_lang": _DEEPL_LANGS[target],
            "tag_handling": "html",
        }
        try:
            async with httpx.AsyncClient(
                timeout=_TIMEOUT_SECONDS, transport=self._transport
            ) as client:
                response = await client.post(
                    f"https://{host}/v2/translate",
                    json=payload,
                    headers={"Authorization": f"DeepL-Auth-Key {self._api_key}"},
                )
        except httpx.HTTPError as error:
            raise TranslationUnavailable(f"DeepL request failed: {type(error).__name__}") from error
        # 403: bad key, 456: monthly quota reached, 429/5xx: DeepL busy or down.
        if response.status_code != 200:
            raise TranslationUnavailable(f"DeepL answered HTTP {response.status_code}")

        translations = response.json()["translations"]
        for (index, _, fmt), translation in zip(to_send, translations, strict=True):
            results[index] = _from_html(translation["text"], fmt)
        return results


async def fill_missing(
    texts: dict[str, dict[str, str]], formats: Mapping[str, TextFormat], translator: Translator
) -> tuple[set[str], bool]:
    """Translate, in place, every empty non-source text of `texts` from the source language.

    `texts` maps a field name to its translations; text already written in a language is never
    replaced. Returns the fields that received a translation and whether any language failed
    (the caller keeps the source text meanwhile: the public site falls back to it).
    """
    filled: set[str] = set()
    failed = False
    for target in (lang for lang in get_args(Lang) if lang != SOURCE_LANG):
        empty = [field for field in formats if not texts[field].get(target)]
        if not empty:
            continue
        items = [(texts[field][SOURCE_LANG], formats[field]) for field in empty]
        try:
            translations = await translator.translate(items, target)
        except TranslationUnavailable as error:
            logger.warning("Automatic translation to %s failed: %s", target, error)
            failed = True
            continue
        for field, translation in zip(empty, translations, strict=True):
            texts[field][target] = translation
            filled.add(field)
    return filled, failed
