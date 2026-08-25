import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./data/adhd_study.db")
SOURCE_LANG = os.getenv("SOURCE_LANG", "en")
TARGET_LANG = os.getenv("TARGET_LANG", "ru")
