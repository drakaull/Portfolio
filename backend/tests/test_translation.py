import json
import os
from typing import get_args

import httpx
import pytest

from app.domain.language import Lang
from app.infra.translation import (
    _DEEPL_LANGS,
    TranslationUnavailable,
    Translator,
    fill_missing,
    html_to_markdown,
    markdown_to_html,
)
from tests.conftest import FakeTranslator

pytestmark = pytest.mark.anyio

EDITOR_MARKDOWN = """Bonjour, je suis **Léonard**, développeur *fullstack* — voir [GitHub](https://github.com/x).

## Ce que je fais

- React et `TypeScript`
- FastAPI et PostgreSQL

1. Premier point
2. Deuxième point

Nom_de_fichier et 5 * 3."""


def test_markdown_survives_the_html_round_trip() -> None:
    assert html_to_markdown(markdown_to_html(EDITOR_MARKDOWN)) == EDITOR_MARKDOWN


def test_raw_html_in_markdown_is_escaped() -> None:
    assert "<script>" not in markdown_to_html("Hi <script>alert(1)</script>")


def fake_deepl(replace: dict[str, str] | None = None, status: int = 200):
    """Fake DeepL: records requests and 'translates' by replacing words, keeping the HTML tags."""
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if status != 200:
            return httpx.Response(status)
        texts = json.loads(request.content)["text"]
        for source, target in (replace or {}).items():
            texts = [text.replace(source, target) for text in texts]
        return httpx.Response(200, json={"translations": [{"text": text} for text in texts]})

    return httpx.MockTransport(handler), requests


async def test_request_follows_the_deepl_api() -> None:
    transport, requests = fake_deepl()

    await Translator("secret-key:fx", transport).translate([("Bonjour", "plain")], "en")

    request = requests[0]
    assert str(request.url) == "https://api-free.deepl.com/v2/translate"
    assert request.headers["authorization"] == "DeepL-Auth-Key secret-key:fx"
    body = json.loads(request.content)
    assert body["source_lang"] == "FR"
    assert body["target_lang"] == "EN-GB"
    assert body["tag_handling"] == "html"


async def test_paid_keys_use_the_main_host() -> None:
    transport, requests = fake_deepl()

    await Translator("paid-key", transport).translate([("Bonjour", "plain")], "en")

    assert requests[0].url.host == "api.deepl.com"


async def test_markdown_formatting_and_links_survive_translation() -> None:
    transport, _ = fake_deepl({"Je suis": "I am", "développeur": "developer", "voir": "see"})
    text = "Je suis **développeur** — voir [GitHub](https://github.com/x)"

    [result] = await Translator("key:fx", transport).translate([(text, "markdown")], "en")

    assert result == "I am **developer** — see [GitHub](https://github.com/x)"


async def test_plain_text_keeps_special_characters() -> None:
    transport, requests = fake_deepl()

    [result] = await Translator("key:fx", transport).translate([("R&D <web>", "plain")], "en")

    assert json.loads(requests[0].content)["text"] == ["R&amp;D &lt;web&gt;"]
    assert result == "R&D <web>"


async def test_empty_texts_are_not_sent() -> None:
    transport, requests = fake_deepl()

    results = await Translator("key:fx", transport).translate(
        [("", "plain"), ("  ", "markdown")], "en"
    )

    assert results == ["", ""]
    assert requests == []


async def test_missing_key_is_reported_without_calling_deepl() -> None:
    transport, requests = fake_deepl()

    with pytest.raises(TranslationUnavailable):
        await Translator(None, transport).translate([("Bonjour", "plain")], "en")
    assert requests == []


@pytest.mark.parametrize("status", [403, 429, 456, 500, 503])
async def test_deepl_errors_become_translation_unavailable(status: int) -> None:
    transport, _ = fake_deepl(status=status)

    with pytest.raises(TranslationUnavailable) as error:
        await Translator("key:fx", transport).translate([("Bonjour", "plain")], "en")
    assert "key:fx" not in str(error.value)  # the key never appears in errors


async def test_network_errors_become_translation_unavailable() -> None:
    def timeout(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("too slow", request=request)

    with pytest.raises(TranslationUnavailable):
        await Translator("key:fx", httpx.MockTransport(timeout)).translate(
            [("Bonjour", "plain")], "en"
        )


@pytest.mark.skipif(
    not os.environ.get("DEEPL_LIVE_TEST"), reason="set DEEPL_LIVE_TEST=1 to call DeepL"
)
async def test_live_deepl_translation() -> None:
    from app.infra.config import settings

    [result] = await Translator(settings.deepl_api_key).translate(
        [("Je suis **développeur**.", "markdown")], "en"
    )
    assert "**" in result and "developer" in result.lower()


async def test_dutch_target_uses_the_deepl_code_nl() -> None:
    transport, requests = fake_deepl()

    await Translator("key:fx", transport).translate([("Bonjour", "plain")], "nl")

    assert json.loads(requests[0].content)["target_lang"] == "NL"


async def test_fill_missing_skips_fields_without_source_text() -> None:
    translator = FakeTranslator()
    texts = {"title": {"fr": "Stage"}, "summary": {"fr": "  "}}

    filled, failed = await fill_missing(texts, {"title": "plain", "summary": "plain"}, translator)

    assert filled == {"en": ["title"], "nl": ["title"]}
    assert not failed
    assert texts["summary"] == {"fr": "  "}
    assert all(items == [("Stage", "plain")] for items, _ in translator.calls)


@pytest.mark.parametrize(
    "answer",
    [
        httpx.Response(200, text="<html>proxy error</html>"),
        httpx.Response(200, json={"unexpected": []}),
        httpx.Response(200, json={"translations": []}),  # fewer texts than sent
    ],
)
async def test_unexpected_deepl_answers_become_translation_unavailable(
    answer: httpx.Response,
) -> None:
    transport = httpx.MockTransport(lambda request: answer)

    with pytest.raises(TranslationUnavailable):
        await Translator("key:fx", transport).translate([("Bonjour", "plain")], "en")


def test_every_language_has_a_deepl_code() -> None:
    assert set(_DEEPL_LANGS) == set(get_args(Lang))
