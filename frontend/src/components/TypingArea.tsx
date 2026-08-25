import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";
import {
  nextNonWhitespace,
  prevNonWhitespace,
  snapToWordStart,
  tokenize,
  type Word,
} from "../lib/tokenize";

const WINDOW = 150;

interface PopupState {
  text: string;
  translation: string;
  loading: boolean;
  x: number;
  y: number;
}

interface Props {
  text: string;
  initialOffset: number;
  onProgress: (offset: number) => void;
}

export function TypingArea({ text, initialOffset, onProgress }: Props) {
  const { words } = useMemo(() => tokenize(text), [text]);

  const [charIndex, _setCharIndex] = useState(() =>
    snapToWordStart(text, initialOffset)
  );
  const [wrong, _setWrong] = useState<Set<number>>(() => new Set());
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(
    null
  );
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [errorCount, setErrorCount] = useState(0);

  const charIndexRef = useRef(charIndex);
  const wrongRef = useRef(wrong);
  const draggingRef = useRef(false);
  const wordRefs = useRef(new Map<number, HTMLSpanElement>());

  const setCharIndex = useCallback((v: number | ((c: number) => number)) => {
    const next = typeof v === "function" ? v(charIndexRef.current) : v;
    charIndexRef.current = next;
    _setCharIndex(next);
  }, []);

  const setWrong = useCallback((v: Set<number>) => {
    wrongRef.current = v;
    _setWrong(v);
  }, []);

  const activeIndex = useMemo(() => {
    const i = words.findIndex((w) => w.end > charIndex);
    return i;
  }, [words, charIndex]);

  const [windowStart, setWindowStart] = useState(() => {
    const i = words.findIndex((w) => w.end > snapToWordStart(text, initialOffset));
    return Math.max(0, i === -1 ? 0 : i - 10);
  });

  useEffect(() => {
    onProgress(charIndex);
  }, [charIndex, onProgress]);

  useEffect(() => {
    if (activeIndex === -1) return;
    if (activeIndex >= windowStart + WINDOW - 40) {
      setWindowStart(Math.max(0, activeIndex - 20));
    } else if (activeIndex < windowStart) {
      setWindowStart(Math.max(0, activeIndex));
    }
  }, [activeIndex, windowStart]);

  const translateRange = useCallback(
    async (start: number, end: number) => {
      const from = Math.min(start, end);
      const to = Math.max(start, end);
      const slice = words.slice(from, to + 1);
      if (slice.length === 0) return;
      const phrase = slice.map((w) => w.text).join(" ");
      const anchor = wordRefs.current.get(from);
      const rect = anchor?.getBoundingClientRect();
      setPopup({
        text: phrase,
        translation: "",
        loading: true,
        x: rect ? rect.left : 100,
        y: rect ? rect.bottom + 8 : 120,
      });
      try {
        const res = await api.translate(phrase);
        setPopup((p) =>
          p && p.text === phrase
            ? { ...p, translation: res.translation, loading: false }
            : p
        );
      } catch (e) {
        setPopup((p) =>
          p && p.text === phrase
            ? { ...p, translation: (e as Error).message, loading: false }
            : p
        );
      }
    },
    [words]
  );

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "Escape") {
        setSelection(null);
        setPopup(null);
        return;
      }

      if (popup) return;

      if (e.key === "Backspace") {
        e.preventDefault();
        setCharIndex((c) => Math.max(0, prevNonWhitespace(text, c)));
        setWrong(new Set());
        return;
      }

      if (e.key === " ") {
        e.preventDefault();
        const c = charIndexRef.current;
        const inWord = words.some((w) => c >= w.start && c < w.end);
        if (inWord) {
          setWrong(new Set(wrongRef.current).add(c));
          setErrorCount((n) => n + 1);
        } else {
          setCharIndex(nextNonWhitespace(text, c));
        }
        return;
      }

      if (e.key.length === 1) {
        e.preventDefault();
        const c = charIndexRef.current;
        if (c >= text.length) return;
        if (text[c] === e.key) {
          const next = new Set(wrongRef.current);
          next.delete(c);
          setWrong(next);
          setCharIndex(c + 1);
        } else {
          setWrong(new Set(wrongRef.current).add(c));
          setErrorCount((n) => n + 1);
        }
      }
    },
    [text, words, popup, setCharIndex, setWrong]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  useEffect(() => {
    function onScroll() {
      setPopup(null);
    }
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, []);

  const onWordMouseDown = (i: number) => {
    draggingRef.current = true;
    setSelection({ start: i, end: i });
    setPopup(null);
  };

  const onWordMouseEnter = (i: number) => {
    if (!draggingRef.current) return;
    setSelection((s) => (s ? { start: s.start, end: i } : { start: i, end: i }));
  };

  const onWindowMouseUp = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setSelection((s) => {
      if (s) translateRange(s.start, s.end);
      return s;
    });
  }, [translateRange]);

  useEffect(() => {
    window.addEventListener("mouseup", onWindowMouseUp);
    return () => window.removeEventListener("mouseup", onWindowMouseUp);
  }, [onWindowMouseUp]);

  if (words.length === 0) {
    return <p style={{ color: "var(--dim)" }}>Empty text.</p>;
  }

  const visibleWords = words.slice(windowStart, windowStart + WINDOW);

  const renderWord = (w: Word, globalIndex: number) => {
    const status =
      w.end <= charIndex
        ? "done"
        : globalIndex === activeIndex
        ? "active"
        : "upcoming";

    const selected =
      selection &&
      globalIndex >= Math.min(selection.start, selection.end) &&
      globalIndex <= Math.max(selection.start, selection.end);

    const cls = ["word", status, selected ? "selected" : ""].filter(Boolean).join(" ");

    if (status === "active" && charIndex < w.end) {
      return (
        <span
          key={globalIndex}
          ref={(el) => {
            if (el) wordRefs.current.set(globalIndex, el);
            else wordRefs.current.delete(globalIndex);
          }}
          className={cls}
          onMouseDown={() => onWordMouseDown(globalIndex)}
          onMouseEnter={() => onWordMouseEnter(globalIndex)}
        >
          {Array.from(w.text).map((ch, offset) => {
            const pos = w.start + offset;
            const charCls = wrong.has(pos)
              ? "char wrong"
              : pos < charIndex
              ? "char typed"
              : pos === charIndex
              ? "char current"
              : "char untyped";
            return (
              <span key={offset} className={charCls}>
                {ch}
              </span>
            );
          })}
        </span>
      );
    }

    return (
      <span
        key={globalIndex}
        ref={(el) => {
          if (el) wordRefs.current.set(globalIndex, el);
          else wordRefs.current.delete(globalIndex);
        }}
        className={cls}
        onMouseDown={() => onWordMouseDown(globalIndex)}
        onMouseEnter={() => onWordMouseEnter(globalIndex)}
      >
        {w.text}
      </span>
    );
  };

  const progressPct =
    text.length > 0 ? Math.round((charIndex / text.length) * 100) : 0;

  return (
    <>
      <div className="words">
        {visibleWords.map((w, i) => (
          <span key={windowStart + i} style={{ display: "inline" }}>
            {renderWord(w, windowStart + i)}
            {windowStart + i < words.length - 1 ? " " : ""}
          </span>
        ))}
        {activeIndex === -1 && (
          <p style={{ color: "var(--done)" }}>Finished!</p>
        )}
      </div>

      <div className="stats">
        Progress: {progressPct}% · Errors: {errorCount}
      </div>

      {popup && (
        <div className="popup" style={{ left: popup.x, top: popup.y }}>
          <div className="source">{popup.text}</div>
          <div className="target">
            {popup.loading ? "Translating..." : popup.translation}
          </div>
        </div>
      )}
    </>
  );
}
