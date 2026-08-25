export interface BookMeta {
  id: number;
  title: string;
  created_at: string;
}

export interface BookDetail {
  id: number;
  title: string;
  content: string;
}

export interface Progress {
  book_id: number;
  char_offset: number;
}

export interface Translation {
  phrase: string;
  translation: string;
  cached: boolean;
}

const BASE = "/api";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, options);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export const api = {
  listBooks: () => request<BookMeta[]>("/books"),

  getBook: (id: number) => request<BookDetail>(`/books/${id}`),

  deleteBook: (id: number) => request<void>(`/books/${id}`, { method: "DELETE" }),

  uploadFile: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<BookDetail>("/books", { method: "POST", body: form });
  },

  createFromText: (title: string, content: string) =>
    request<BookDetail>("/books/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    }),

  getProgress: (id: number) => request<Progress>(`/books/${id}/progress`),

  setProgress: (id: number, char_offset: number) =>
    request<Progress>(`/books/${id}/progress`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ char_offset }),
    }),

  translate: (text: string) =>
    request<Translation>(`/translate?text=${encodeURIComponent(text)}`),
};
