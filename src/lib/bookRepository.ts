import { collection, doc, getDocs, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { getEpisode, listChapters, listParagraphs } from "./firestore";
import { buildEpisodePack } from "./packs";
import type { BookPack, EotBook, EpisodePack } from "../types";

const LOCAL_BOOKS_KEY = "eot.localStudio.books";
const LOCAL_BOOK_PACKS_KEY = "eot.localStudio.bookPacks";

export type BookInput = Omit<EotBook, "id" | "createdAt" | "updatedAt"> & { id?: string };

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function withId<T>(snapshot: { id: string; data: () => unknown }) {
  return { id: snapshot.id, ...(snapshot.data() as object) } as T;
}

function normalizeSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function sha256(value: string) {
  if (!crypto.subtle) return "frontend-placeholder-checksum";
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function bookInputFromForm(formData: FormData): BookInput {
  const title = String(formData.get("title") ?? "").trim();
  const slug = normalizeSlug(String(formData.get("slug") ?? "") || title);
  return {
    id: String(formData.get("id") ?? "").trim() || undefined,
    slug,
    title,
    subtitle: String(formData.get("subtitle") ?? "").trim(),
    author: String(formData.get("author") ?? "").trim(),
    synopsis: String(formData.get("synopsis") ?? "").trim(),
    language: String(formData.get("language") ?? "en").trim() || "en",
    coverImageUrl: String(formData.get("coverImageUrl") ?? "").trim(),
    requiredLicencePlan: String(formData.get("requiredLicencePlan") ?? "reader").trim() || "reader",
    status: String(formData.get("status") ?? "draft") as EotBook["status"],
    episodeIds: String(formData.get("episodeIds") ?? "").split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean),
    sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
  };
}

export function validateBookInput(input: BookInput) {
  const errors: string[] = [];
  if (!input.title) errors.push("Book title is required.");
  if (!input.slug) errors.push("Book slug is required.");
  if (!input.author) errors.push("Book author is required.");
  if (input.episodeIds.length === 0) errors.push("Add at least one episode ID.");
  return errors;
}

export async function listBooks() {
  if (!isFirebaseConfigured) {
    return read<EotBook[]>(LOCAL_BOOKS_KEY, []).sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
  }
  try {
    const snapshots = await getDocs(query(collection(db, "eotBooks"), orderBy("sortOrder"), orderBy("title")));
    return snapshots.docs.map((snapshot) => withId<EotBook>(snapshot));
  } catch {
    return read<EotBook[]>(LOCAL_BOOKS_KEY, []);
  }
}

export async function upsertBook(input: BookInput) {
  const bookId = input.id || input.slug || id("book");
  if (!isFirebaseConfigured) {
    const books = read<EotBook[]>(LOCAL_BOOKS_KEY, []);
    const existing = books.find((book) => book.id === bookId);
    const book: EotBook = {
      ...input,
      id: bookId,
      createdAt: existing?.createdAt ?? now(),
      updatedAt: now(),
    };
    write(LOCAL_BOOKS_KEY, [...books.filter((item) => item.id !== bookId), book]);
    return bookId;
  }
  await setDoc(doc(db, "eotBooks", bookId), { ...input, updatedAt: serverTimestamp(), createdAt: serverTimestamp() }, { merge: true });
  return bookId;
}

export async function buildBookPack(book: EotBook, version = "1.0.0"): Promise<BookPack> {
  const episodePacks: EpisodePack[] = [];
  for (const episodeId of book.episodeIds) {
    const episode = await getEpisode(episodeId);
    if (!episode) throw new Error(`Episode not found: ${episodeId}`);
    const [chapters, paragraphs] = await Promise.all([listChapters(episodeId), listParagraphs(episodeId)]);
    episodePacks.push(await buildEpisodePack(episode, chapters, paragraphs, { version }));
  }

  const content: BookPack["content"] = {
    book: {
      id: book.id,
      slug: book.slug,
      title: book.title,
      subtitle: book.subtitle,
      author: book.author,
      synopsis: book.synopsis,
      language: book.language,
      coverImageUrl: book.coverImageUrl,
      requiredLicencePlan: book.requiredLicencePlan,
      status: book.status,
      episodeIds: book.episodeIds,
      sortOrder: book.sortOrder,
    },
    episodes: episodePacks.map((pack) => pack.content.episode),
  };
  const checksum = await sha256(JSON.stringify(content));
  return {
    manifest: {
      packId: `EOT-BOOK-${book.slug}`,
      packType: "book",
      version,
      title: book.title,
      slug: book.slug,
      author: book.author,
      language: book.language,
      requiredLicencePlan: book.requiredLicencePlan,
      episodeCount: content.episodes.length,
      createdAt: now(),
      checksumAlgorithm: "SHA-256",
      checksum,
      signature: "frontend-placeholder-signature",
    },
    content,
  };
}

export async function saveBookPackMetadata(pack: BookPack) {
  if (!isFirebaseConfigured) {
    const rows = read<Array<Record<string, unknown>>>(LOCAL_BOOK_PACKS_KEY, []);
    const key = `${pack.manifest.packId}_${pack.manifest.version}`;
    write(LOCAL_BOOK_PACKS_KEY, [...rows.filter((row) => row.id !== key), { id: key, ...pack.manifest }]);
    return key;
  }
  const key = `${pack.manifest.packId}_${pack.manifest.version}`;
  await setDoc(doc(db, "eotBookPacks", key), { ...pack.manifest, updatedAt: serverTimestamp() }, { merge: true });
  return key;
}

export function downloadBookPack(pack: BookPack) {
  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${pack.manifest.packId}-v${pack.manifest.version}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
