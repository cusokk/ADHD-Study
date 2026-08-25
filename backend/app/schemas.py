from datetime import datetime

from pydantic import BaseModel, ConfigDict


class BookOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    created_at: datetime


class BookDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    content: str


class TextIn(BaseModel):
    title: str
    content: str


class ProgressOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    book_id: int
    char_offset: int


class ProgressIn(BaseModel):
    char_offset: int


class TranslationOut(BaseModel):
    phrase: str
    translation: str
    cached: bool
