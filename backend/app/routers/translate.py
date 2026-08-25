from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import SOURCE_LANG, TARGET_LANG
from app.db import get_db
from app.models import TranslationCache
from app.schemas import TranslationOut
from app.services.translator import translate_phrase

router = APIRouter(prefix="/api", tags=["translate"])


@router.get("/translate", response_model=TranslationOut)
async def translate(
    text: str = Query(..., min_length=1, max_length=2000),
    source: str = SOURCE_LANG,
    target: str = TARGET_LANG,
    db: AsyncSession = Depends(get_db),
):
    phrase = text.strip()
    if not phrase:
        raise HTTPException(status_code=400, detail="Empty text")

    result = await db.execute(
        select(TranslationCache).where(
            TranslationCache.phrase == phrase,
            TranslationCache.source_lang == source,
            TranslationCache.target_lang == target,
        )
    )
    cached = result.scalar_one_or_none()
    if cached:
        return TranslationOut(phrase=phrase, translation=cached.translation, cached=True)

    try:
        translation = await translate_phrase(phrase, source, target)
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail="Translation service unavailable"
        ) from exc

    db.add(
        TranslationCache(
            phrase=phrase,
            source_lang=source,
            target_lang=target,
            translation=translation,
        )
    )
    await db.commit()
    return TranslationOut(phrase=phrase, translation=translation, cached=False)
