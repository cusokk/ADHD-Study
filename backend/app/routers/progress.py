from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import ReadingProgress
from app.schemas import ProgressIn, ProgressOut

router = APIRouter(prefix="/api/books/{book_id}/progress", tags=["progress"])


@router.get("", response_model=ProgressOut)
async def get_progress(book_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ReadingProgress).where(ReadingProgress.book_id == book_id)
    )
    progress = result.scalar_one_or_none()
    if progress is None:
        return ProgressOut(book_id=book_id, char_offset=0)
    return progress


@router.put("", response_model=ProgressOut)
async def set_progress(
    book_id: int, payload: ProgressIn, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ReadingProgress).where(ReadingProgress.book_id == book_id)
    )
    progress = result.scalar_one_or_none()
    if progress is None:
        progress = ReadingProgress(book_id=book_id, char_offset=payload.char_offset)
        db.add(progress)
    else:
        progress.char_offset = payload.char_offset
    await db.commit()
    await db.refresh(progress)
    return progress
