import { useEffect, useState } from "react";
import { api, type BookDetail, type BookMeta } from "../api/client";

interface Props {
  onOpen: (book: BookDetail) => void;
}

export function LibraryPage({ onOpen }: Props) {
  const [books, setBooks] = useState<BookMeta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteContent, setPasteContent] = useState("");

  async function refresh() {
    try {
      setBooks(await api.listBooks());
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onFileChange(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await api.uploadFile(file);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onPaste() {
    if (!pasteContent.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.createFromText(pasteTitle || "Pasted text", pasteContent);
      setPasteContent("");
      setPasteTitle("");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: number) {
    if (!confirm("Delete this book?")) return;
    try {
      await api.deleteBook(id);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="container">
      <h1>ADHD-Study</h1>

      <section>
        <h2>Add text</h2>
        <div style={{ marginBottom: 12 }}>
          <label>
            Upload .txt file{" "}
            <input
              type="file"
              accept=".txt,text/plain"
              disabled={busy}
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <div>
          <input
            placeholder="Title (optional)"
            value={pasteTitle}
            onChange={(e) => setPasteTitle(e.target.value)}
            style={{ width: "100%", marginBottom: 8 }}
          />
          <textarea
            placeholder="Paste text here..."
            value={pasteContent}
            onChange={(e) => setPasteContent(e.target.value)}
            rows={6}
            style={{ width: "100%", marginBottom: 8 }}
          />
          <button onClick={onPaste} disabled={busy || !pasteContent.trim()}>
            Add text
          </button>
        </div>
      </section>

      {error && <p style={{ color: "var(--wrong)" }}>{error}</p>}

      <section>
        <h2>Books</h2>
        {books.length === 0 ? (
          <p style={{ color: "var(--dim)" }}>No books yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {books.map((b) => (
              <li
                key={b.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <button
                  style={{ border: "none", background: "none", textAlign: "left", flex: 1 }}
                  onClick={async () => {
                    try {
                      onOpen(await api.getBook(b.id));
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  {b.title}
                </button>
                <button onClick={() => onDelete(b.id)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
