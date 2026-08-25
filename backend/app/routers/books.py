from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import defer

from app.db import get_db
from app.models import Book
from app.schemas import BookDetailOut, BookOut, TextIn

router = APIRouter(prefix="/api/books", tags=["books"])


@router.get("", response_model=list[BookOut])
async def list_books(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Book).options(defer(Book.content)).order_by(Book.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=BookDetailOut, status_code=201)
async def upload_book(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    raw = await file.read()
    text = _decode(raw)
    book = Book(title=file.filename or "Untitled", content=text)
    db.add(book)
    await db.commit()
    await db.refresh(book)
    return book


@router.post("/text", response_model=BookDetailOut, status_code=201)
async def create_from_text(payload: TextIn, db: AsyncSession = Depends(get_db)):
    if not payload.content.strip():
        raise HTTPException(status_code=400, detail="Content is empty")
    book = Book(title=payload.title.strip() or "Untitled", content=payload.content)
    db.add(book)
    await db.commit()
    await db.refresh(book)
    return book


@router.get("/{book_id}", response_model=BookDetailOut)
async def get_book(book_id: int, db: AsyncSession = Depends(get_db)):
    book = await db.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


@router.delete("/{book_id}", status_code=204)
async def delete_book(book_id: int, db: AsyncSession = Depends(get_db)):
    book = await db.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    await db.delete(book)
    await db.commit()


def _decode(raw: bytes) -> str:
    for encoding in ("utf-8", "utf-8-sig", "cp1251", "latin-1"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise HTTPException(status_code=400, detail="Unsupported file encoding")
