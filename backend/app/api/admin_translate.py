from typing import Annotated

from fastapi import Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from app.api.dependencies import admin_router, get_translator
from app.domain.home import INTRO_MAX_LENGTH
from app.domain.language import SOURCE_LANG, Lang
from app.infra.translation import TextFormat, TranslationUnavailable, Translator

router = admin_router()


class TranslateItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = Field(max_length=INTRO_MAX_LENGTH)
    format: TextFormat


class TranslateIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target: Lang
    # Capped: one call can never send more than 10 x 5,000 characters to DeepL.
    items: list[TranslateItem] = Field(min_length=1, max_length=10)


class TranslateOut(BaseModel):
    translations: list[str]


@router.post("/translate")
async def translate(
    body: TranslateIn, translator: Annotated[Translator, Depends(get_translator)]
) -> TranslateOut:
    if body.target == SOURCE_LANG:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Texts are already in this language"
        )
    try:
        texts = await translator.translate([(i.text, i.format) for i in body.items], body.target)
    except TranslationUnavailable as error:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, detail="Translation unavailable"
        ) from error
    return TranslateOut(translations=texts)
