import { useState } from "react";
import type { BookDetail } from "./api/client";
import { LibraryPage } from "./pages/LibraryPage";
import { ReaderPage } from "./pages/ReaderPage";

export default function App() {
  const [book, setBook] = useState<BookDetail | null>(null);

  if (book) {
    return <ReaderPage book={book} onBack={() => setBook(null)} />;
  }
  return <LibraryPage onOpen={setBook} />;
}
