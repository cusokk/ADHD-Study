import { useEffect, useRef, useState } from "react";
import { api, type BookDetail } from "../api/client";
import { TypingArea } from "../components/TypingArea";

interface Props {
  book: BookDetail;
  onBack: () => void;
}

export function ReaderPage({ book, onBack }: Props) {
  const [initialOffset, setInitialOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getProgress(book.id)
      .then((p) => {
        if (!cancelled) setInitialOffset(p.char_offset);
      })
      .catch(() => {
        if (!cancelled) setInitialOffset(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [book.id]);

  const onProgress = (offset: number) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      api.setProgress(book.id, offset).catch(() => {});
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="container reader">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack}>Back</button>
        <h2 style={{ margin: 0 }}>{book.title}</h2>
      </div>
      {loading ? (
        <p style={{ color: "var(--dim)" }}>Loading...</p>
      ) : (
        <TypingArea
          text={book.content}
          initialOffset={initialOffset}
          onProgress={onProgress}
        />
      )}
    </div>
  );
}
