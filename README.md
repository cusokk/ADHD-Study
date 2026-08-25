# ADHD-Study
Typing text while read it original version and optionaly translation

### Problem
Just read books in english on PC - it's too boring and my fingers whants to do 
something during this dael.

So I imagine the result (logical **and** between all points)
1) Web Interface;
2) It's possible upload txt file (fb2, epub, copypaste, urls);
3) User see a whords from the text and type them
4) After typeing he can click to any word or group of words and get translate
5) System memorize place where user has stoped last time


## Stack
- Backend: FastAPI + SQLAlchemy (async) + SQLite
- Frontend: React + Vite + TypeScript (nginx serves static + proxies `/api`)
- Translation: deep-translator (Google Translate, EN → RU, cached in SQLite)

## Run locally

```bash
docker compose up --build
```

Open http://localhost:8080

### Local dev (without Docker)
```bash
# backend
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# frontend (in another terminal)
cd frontend && npm install && npm run dev
# Vite dev server proxies /api -> http://localhost:8000
```

## API
- `POST /api/books` — upload `.txt` file (multipart)
- `POST /api/books/text` — create book from pasted text `{title, content}`
- `GET  /api/books` — list books
- `GET  /api/books/{id}` — book content
- `DELETE /api/books/{id}` — delete book
- `GET/PUT /api/books/{id}/progress` — load/save reading position
- `GET /api/translate?text=...&source=en&target=ru` — translate (cached)

