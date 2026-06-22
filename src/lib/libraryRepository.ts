import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, isFirebaseConfigured, storage } from "./firebase";
import { compareEpisodePackVersions, getOrCreateReaderIdentity, logActivity, readerDb, type LibraryReadingProgress } from "./offlineDb";
import type {
  LibraryBooklet,
  LibraryBookletExtras,
  LibraryBookletImage,
  LibraryBookletPack,
  LibraryBookletQuiz,
  LibraryCatalogueEntry,
  LibraryCategory,
  LibraryChapter,
  LibraryReadingSettings,
  LibrarySection,
  LibraryWhatsappPrompt,
} from "../types";

const LOCAL_BOOKLETS_KEY = "eot.localStudio.libraryBooklets";
const LOCAL_CHAPTERS_KEY = "eot.localStudio.libraryChapters";
const LOCAL_SECTIONS_KEY = "eot.localStudio.librarySections";
const LOCAL_PACKS_KEY = "eot.localStudio.libraryPacks";
const LOCAL_EXTRAS_KEY = "eot.localStudio.libraryExtras";

export const DEFAULT_LIBRARY_CATEGORIES = [
  "Business",
  "Inspiration",
  "Faith",
  "Children",
  "Education",
  "Community",
  "Short Stories",
  "Guides",
  "Promotions",
  "General",
];

type BookletInput = Omit<LibraryBooklet, "id" | "createdAt" | "updatedAt" | "isPartOfEotStory"> & { id?: string };
type ChapterInput = Omit<LibraryChapter, "id" | "createdAt" | "updatedAt"> & { id?: string };
type SectionInput = Omit<LibrarySection, "id" | "createdAt" | "updatedAt"> & { id?: string };
type ExtrasInput = Partial<Omit<LibraryBookletExtras, "updatedAt">> & { bookletId: string };

const now = () => new Date().toISOString();
const localId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function withId<T>(snapshot: { id: string; data: () => unknown }) {
  return { id: snapshot.id, ...(snapshot.data() as object) } as T;
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

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function parseJsonArray(value: string) {
  if (!value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value: string) {
  if (!value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, string> : {};
  } catch {
    return {};
  }
}

const DEFAULT_READING_SETTINGS: LibraryReadingSettings = {
  fontScale: "standard",
  estimatedMinutes: 10,
  allowOffline: true,
  showImages: true,
};

export function defaultLibraryBookletExtras(bookletId: string): LibraryBookletExtras {
  return {
    bookletId,
    manuscript: "",
    images: [],
    illustrations: [],
    quizzes: [],
    whatsappPrompts: [],
    readingSettings: DEFAULT_READING_SETTINGS,
    metadata: {},
    updatedAt: now(),
  };
}

async function sha256(value: string) {
  if (!crypto.subtle) return "frontend-placeholder-checksum";
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function bookletInputFromForm(formData: FormData): BookletInput {
  const title = String(formData.get("title") ?? "").trim();
  const bookletCode = normalizeCode(String(formData.get("bookletCode") ?? "") || title || "LIB-BOOKLET");
  return {
    id: String(formData.get("id") ?? "").trim() || undefined,
    bookletCode,
    title,
    subtitle: String(formData.get("subtitle") ?? "").trim(),
    author: String(formData.get("author") ?? "Empire of Trust Studio").trim(),
    category: String(formData.get("category") ?? "General").trim() || "General",
    description: String(formData.get("description") ?? "").trim(),
    coverImageUrl: String(formData.get("coverImageUrl") ?? "").trim(),
    language: String(formData.get("language") ?? "en").trim() || "en",
    ageRating: String(formData.get("ageRating") ?? "General").trim() || "General",
    status: String(formData.get("status") ?? "draft") as LibraryBooklet["status"],
    requiredLicencePlan: String(formData.get("requiredLicencePlan") ?? "free").trim() || "free",
  };
}

export function chapterInputFromForm(formData: FormData, bookletId: string): ChapterInput {
  return {
    id: String(formData.get("chapterId") ?? "").trim() || undefined,
    bookletId,
    chapterNumber: Number(formData.get("chapterNumber") ?? 1) || 1,
    title: String(formData.get("chapterTitle") ?? "").trim(),
    intro: String(formData.get("chapterIntro") ?? "").trim(),
  };
}

export function sectionInputFromForm(formData: FormData, bookletId: string): SectionInput {
  return {
    id: String(formData.get("sectionId") ?? "").trim() || undefined,
    bookletId,
    chapterId: String(formData.get("sectionChapterId") ?? "").trim(),
    sectionNumber: Number(formData.get("sectionNumber") ?? 1) || 1,
    heading: String(formData.get("sectionHeading") ?? "").trim(),
    body: String(formData.get("sectionBody") ?? "").trim(),
    imagePrompt: String(formData.get("imagePrompt") ?? "").trim(),
    imageUrl: String(formData.get("imageUrl") ?? "").trim(),
    interactiveLinksJson: String(formData.get("interactiveLinksJson") ?? "[]").trim() || "[]",
  };
}

export function extrasInputFromForm(formData: FormData, bookletId: string): ExtrasInput {
  const input: ExtrasInput = {
    bookletId,
  };
  if (formData.has("manuscript")) input.manuscript = String(formData.get("manuscript") ?? "");
  if (formData.has("imagesJson")) input.images = parseJsonArray(String(formData.get("imagesJson") ?? "[]")) as LibraryBookletImage[];
  if (formData.has("illustrationsJson")) input.illustrations = parseJsonArray(String(formData.get("illustrationsJson") ?? "[]")) as LibraryBookletImage[];
  if (formData.has("quizzesJson")) input.quizzes = parseJsonArray(String(formData.get("quizzesJson") ?? "[]")) as LibraryBookletQuiz[];
  if (formData.has("whatsappPromptsJson")) input.whatsappPrompts = parseJsonArray(String(formData.get("whatsappPromptsJson") ?? "[]")) as LibraryWhatsappPrompt[];
  if (formData.has("metadataJson")) input.metadata = parseJsonObject(String(formData.get("metadataJson") ?? "{}"));
  if (formData.has("fontScale") || formData.has("estimatedMinutes")) {
    input.readingSettings = {
      fontScale: String(formData.get("fontScale") ?? "standard") === "large" ? "large" : "standard",
      estimatedMinutes: Number(formData.get("estimatedMinutes") ?? 10) || 10,
      allowOffline: formData.has("allowOffline"),
      showImages: formData.has("showImages"),
    };
  }
  return input;
}

export function validateBookletInput(input: BookletInput) {
  const errors: string[] = [];
  if (!input.bookletCode) errors.push("Booklet code is required.");
  if (!input.title) errors.push("Title is required.");
  if (!input.author) errors.push("Author is required.");
  if (!input.category) errors.push("Category is required.");
  return errors;
}

export async function listLibraryBooklets() {
  if (!isFirebaseConfigured) return read<LibraryBooklet[]>(LOCAL_BOOKLETS_KEY, []).sort((a, b) => a.title.localeCompare(b.title));
  const snapshots = await getDocs(query(collection(db, "eotLibraryBooklets"), orderBy("title")));
  return snapshots.docs.map((snapshot) => withId<LibraryBooklet>(snapshot));
}

export async function getLibraryBooklet(bookletId: string) {
  if (!isFirebaseConfigured) return read<LibraryBooklet[]>(LOCAL_BOOKLETS_KEY, []).find((booklet) => booklet.id === bookletId) ?? null;
  const snapshot = await getDoc(doc(db, "eotLibraryBooklets", bookletId));
  return snapshot.exists() ? withId<LibraryBooklet>(snapshot) : null;
}

export async function upsertLibraryBooklet(input: BookletInput) {
  if (!isFirebaseConfigured) {
    const booklets = read<LibraryBooklet[]>(LOCAL_BOOKLETS_KEY, []);
    const id = input.id || input.bookletCode || localId("library");
    const existing = booklets.find((booklet) => booklet.id === id);
    const booklet: LibraryBooklet = { ...input, id, isPartOfEotStory: false, createdAt: existing?.createdAt ?? now(), updatedAt: now() };
    write(LOCAL_BOOKLETS_KEY, [...booklets.filter((item) => item.id !== id), booklet]);
    return id;
  }
  if (input.id) {
    const { id, ...rest } = input;
    await updateDoc(doc(db, "eotLibraryBooklets", id), { ...rest, isPartOfEotStory: false, updatedAt: serverTimestamp() });
    return id;
  }
  const snapshot = await addDoc(collection(db, "eotLibraryBooklets"), {
    ...input,
    isPartOfEotStory: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return snapshot.id;
}

export async function listLibraryChapters(bookletId: string) {
  if (!isFirebaseConfigured) {
    return read<LibraryChapter[]>(LOCAL_CHAPTERS_KEY, []).filter((chapter) => chapter.bookletId === bookletId).sort((a, b) => a.chapterNumber - b.chapterNumber);
  }
  const snapshots = await getDocs(query(collection(db, "eotLibraryChapters"), where("bookletId", "==", bookletId), orderBy("chapterNumber")));
  return snapshots.docs.map((snapshot) => withId<LibraryChapter>(snapshot));
}

export async function upsertLibraryChapter(input: ChapterInput) {
  if (!input.title) throw new Error("Chapter title is required.");
  if (!isFirebaseConfigured) {
    const chapters = read<LibraryChapter[]>(LOCAL_CHAPTERS_KEY, []);
    const id = input.id || localId("library_chapter");
    const existing = chapters.find((chapter) => chapter.id === id);
    const chapter: LibraryChapter = { ...input, id, createdAt: existing?.createdAt ?? now(), updatedAt: now() };
    write(LOCAL_CHAPTERS_KEY, [...chapters.filter((item) => item.id !== id), chapter]);
    return id;
  }
  if (input.id) {
    const { id, ...rest } = input;
    await updateDoc(doc(db, "eotLibraryChapters", id), { ...rest, updatedAt: serverTimestamp() });
    return id;
  }
  const snapshot = await addDoc(collection(db, "eotLibraryChapters"), { ...input, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return snapshot.id;
}

export async function listLibrarySections(bookletId: string) {
  if (!isFirebaseConfigured) {
    return read<LibrarySection[]>(LOCAL_SECTIONS_KEY, []).filter((section) => section.bookletId === bookletId).sort((a, b) => a.sectionNumber - b.sectionNumber);
  }
  const snapshots = await getDocs(query(collection(db, "eotLibrarySections"), where("bookletId", "==", bookletId), orderBy("sectionNumber")));
  return snapshots.docs.map((snapshot) => withId<LibrarySection>(snapshot));
}

export async function upsertLibrarySection(input: SectionInput) {
  if (!input.chapterId) throw new Error("Choose a chapter for this section.");
  if (!input.heading && !input.body) throw new Error("Section heading or body is required.");
  if (!isFirebaseConfigured) {
    const sections = read<LibrarySection[]>(LOCAL_SECTIONS_KEY, []);
    const id = input.id || localId("library_section");
    const existing = sections.find((section) => section.id === id);
    const section: LibrarySection = { ...input, id, createdAt: existing?.createdAt ?? now(), updatedAt: now() };
    write(LOCAL_SECTIONS_KEY, [...sections.filter((item) => item.id !== id), section]);
    return id;
  }
  if (input.id) {
    const { id, ...rest } = input;
    await updateDoc(doc(db, "eotLibrarySections", id), { ...rest, updatedAt: serverTimestamp() });
    return id;
  }
  const snapshot = await addDoc(collection(db, "eotLibrarySections"), { ...input, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return snapshot.id;
}

export async function getLibraryContent(bookletId: string) {
  const [booklet, chapters, sections, extras] = await Promise.all([getLibraryBooklet(bookletId), listLibraryChapters(bookletId), listLibrarySections(bookletId), getLibraryBookletExtras(bookletId)]);
  return { booklet, chapters, sections, extras };
}

export async function getLibraryBookletExtras(bookletId: string): Promise<LibraryBookletExtras> {
  if (!isFirebaseConfigured) {
    return read<LibraryBookletExtras[]>(LOCAL_EXTRAS_KEY, []).find((item) => item.bookletId === bookletId) ?? defaultLibraryBookletExtras(bookletId);
  }
  try {
    const snapshot = await getDoc(doc(db, "eotLibraryBookletExtras", bookletId));
    return snapshot.exists() ? { ...defaultLibraryBookletExtras(bookletId), ...(snapshot.data() as Partial<LibraryBookletExtras>), bookletId } : defaultLibraryBookletExtras(bookletId);
  } catch {
    return defaultLibraryBookletExtras(bookletId);
  }
}

export async function upsertLibraryBookletExtras(input: ExtrasInput) {
  const current = await getLibraryBookletExtras(input.bookletId);
  const extras: LibraryBookletExtras = {
    ...current,
    ...input,
    readingSettings: { ...DEFAULT_READING_SETTINGS, ...current.readingSettings, ...input.readingSettings },
    images: input.images ?? current.images,
    illustrations: input.illustrations ?? current.illustrations,
    quizzes: input.quizzes ?? current.quizzes,
    whatsappPrompts: input.whatsappPrompts ?? current.whatsappPrompts,
    metadata: input.metadata ?? current.metadata,
    updatedAt: now(),
  };
  if (!isFirebaseConfigured) {
    const rows = read<LibraryBookletExtras[]>(LOCAL_EXTRAS_KEY, []);
    write(LOCAL_EXTRAS_KEY, [...rows.filter((item) => item.bookletId !== input.bookletId), extras]);
    return extras;
  }
  await setDoc(doc(db, "eotLibraryBookletExtras", input.bookletId), { ...extras, updatedAt: serverTimestamp() }, { merge: true });
  return extras;
}

export async function uploadLibraryBookletMedia(bookletId: string, file: File, kind: "image" | "illustration" = "image") {
  if (!isFirebaseConfigured) throw new Error("Firebase Storage requires Firebase configuration.");
  const cleanName = file.name.replace(/[^a-z0-9._-]+/gi, "-").toLowerCase();
  const storagePath = `library/booklets/${bookletId}/${kind}s/${Date.now()}-${cleanName}`;
  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, file, { contentType: file.type });
  return { storagePath, url: await getDownloadURL(fileRef) };
}

export function splitBookletManuscript(manuscript: string) {
  const lines = manuscript.replace(/\r\n/g, "\n").split("\n");
  const chapters: Array<{ title: string; intro: string; sections: Array<{ heading: string; body: string }> }> = [];
  let currentChapter: { title: string; intro: string; sections: Array<{ heading: string; body: string }> } | null = null;
  let currentSection: { heading: string; body: string } | null = null;

  function ensureChapter(title = "Chapter 1") {
    if (!currentChapter) {
      currentChapter = { title, intro: "", sections: [] };
      chapters.push(currentChapter);
    }
    return currentChapter;
  }

  function pushSection() {
    if (currentSection && (currentSection.heading.trim() || currentSection.body.trim())) {
      ensureChapter().sections.push({ heading: currentSection.heading.trim(), body: currentSection.body.trim() });
    }
    currentSection = null;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const isChapter = /^(chapter|part)\s+\d+[:.\-\s]/i.test(line) || /^#{1,2}\s+/.test(line);
    const isHeader = /^#{3,6}\s+/.test(line) || (/^[A-Z0-9 ,:'\-&]+$/.test(line) && line.length > 3 && line.length < 80);
    if (isChapter) {
      pushSection();
      currentChapter = { title: line.replace(/^#{1,2}\s+/, "").trim(), intro: "", sections: [] };
      chapters.push(currentChapter);
      continue;
    }
    if (isHeader) {
      pushSection();
      currentSection = { heading: line.replace(/^#{3,6}\s+/, "").trim(), body: "" };
      ensureChapter();
      continue;
    }
    if (!line) {
      if (currentSection?.body) currentSection.body += "\n\n";
      continue;
    }
    const chapter = ensureChapter();
    if (!currentSection && !chapter.intro) chapter.intro = line;
    else {
      if (!currentSection) currentSection = { heading: "Section " + (chapter.sections.length + 1), body: "" };
      currentSection.body += `${currentSection.body ? "\n" : ""}${rawLine}`;
    }
  }
  pushSection();
  return chapters.map((chapter) => ({
    ...chapter,
    sections: chapter.sections.length ? chapter.sections : [{ heading: chapter.title, body: chapter.intro }],
  }));
}

export async function importManuscriptIntoBooklet(bookletId: string, manuscript: string, mode: "append" | "replace" = "append") {
  const parsed = splitBookletManuscript(manuscript);
  const existingChapters = mode === "append" ? await listLibraryChapters(bookletId) : [];
  let chapterOffset = existingChapters.length;
  const createdChapters: LibraryChapter[] = [];
  const createdSections: LibrarySection[] = [];
  for (const chapter of parsed) {
    const chapterId = await upsertLibraryChapter({ bookletId, chapterNumber: ++chapterOffset, title: chapter.title, intro: chapter.intro });
    const savedChapter = (await listLibraryChapters(bookletId)).find((item) => item.id === chapterId);
    if (savedChapter) createdChapters.push(savedChapter);
    let sectionNumber = 0;
    for (const section of chapter.sections) {
      const sectionId = await upsertLibrarySection({
        bookletId,
        chapterId,
        sectionNumber: ++sectionNumber,
        heading: section.heading,
        body: section.body,
        imagePrompt: "",
        imageUrl: "",
        interactiveLinksJson: "[]",
      });
      const savedSection = (await listLibrarySections(bookletId)).find((item) => item.id === sectionId);
      if (savedSection) createdSections.push(savedSection);
    }
  }
  await upsertLibraryBookletExtras({ bookletId, manuscript });
  return { chapters: createdChapters, sections: createdSections };
}

export async function listLibraryCategories(): Promise<LibraryCategory[]> {
  const defaults = DEFAULT_LIBRARY_CATEGORIES.map((name, index) => ({ id: normalizeCode(name).toLowerCase(), name, description: `${name} independent booklet category.`, sortOrder: index }));
  if (!isFirebaseConfigured) return defaults;
  try {
    const snapshots = await getDocs(query(collection(db, "eotLibraryCategories"), orderBy("sortOrder")));
    const rows = snapshots.docs.map((snapshot) => withId<LibraryCategory>(snapshot));
    return rows.length ? rows : defaults;
  } catch {
    return defaults;
  }
}

export async function listLibraryCatalogue() {
  if (!isFirebaseConfigured) return readerDb.libraryCatalogueCache.toArray();
  try {
    const rows = (await getDocs(query(collection(db, "eotLibraryBooklets"), where("status", "==", "published"), orderBy("title")))).docs.map((snapshot) => {
      const booklet = withId<LibraryBooklet>(snapshot);
      return catalogueEntryFromBooklet(booklet);
    });
    await readerDb.libraryCatalogueCache.bulkPut(rows);
    return rows;
  } catch {
    return readerDb.libraryCatalogueCache.toArray();
  }
}

export function catalogueEntryFromBooklet(booklet: LibraryBooklet): LibraryCatalogueEntry {
  return {
    id: booklet.id,
    bookletId: booklet.id,
    bookletCode: booklet.bookletCode,
    title: booklet.title,
    subtitle: booklet.subtitle,
    author: booklet.author,
    category: booklet.category,
    description: booklet.description,
    coverImageUrl: booklet.coverImageUrl,
    language: booklet.language,
    ageRating: booklet.ageRating,
    requiredLicencePlan: booklet.requiredLicencePlan,
    isPartOfEotStory: false,
    status: booklet.status === "archived" ? "archived" : "published",
    updatedAt: now(),
  };
}

export async function publishLibraryBooklet(booklet: LibraryBooklet) {
  const entry = catalogueEntryFromBooklet({ ...booklet, status: "published" });
  if (!isFirebaseConfigured) {
    const booklets = read<LibraryBooklet[]>(LOCAL_BOOKLETS_KEY, []);
    write(LOCAL_BOOKLETS_KEY, booklets.map((item) => item.id === booklet.id ? { ...item, status: "published", updatedAt: now() } : item));
    await readerDb.libraryCatalogueCache.put(entry);
    return entry.id;
  }
  await setDoc(doc(db, "eotLibraryBooklets", booklet.id), { status: "published", updatedAt: serverTimestamp() }, { merge: true });
  await setDoc(doc(db, "eotLibraryCategories", normalizeCode(booklet.category).toLowerCase()), { name: booklet.category, sortOrder: DEFAULT_LIBRARY_CATEGORIES.indexOf(booklet.category), updatedAt: serverTimestamp() }, { merge: true });
  await setDoc(doc(db, "eotLibraryPacks", `catalogue_${booklet.id}`), { ...entry, updatedAt: serverTimestamp() }, { merge: true });
  await readerDb.libraryCatalogueCache.put(entry);
  return entry.id;
}

export async function buildLibraryBookletPack(booklet: LibraryBooklet, chapters: LibraryChapter[], sections: LibrarySection[], version = "1.0.0", extras?: LibraryBookletExtras): Promise<LibraryBookletPack> {
  const resolvedExtras = extras ?? await getLibraryBookletExtras(booklet.id);
  const packedChapters = chapters.slice().sort((a, b) => a.chapterNumber - b.chapterNumber).map((chapter) => ({
    id: chapter.id,
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    intro: chapter.intro,
    sections: sections.filter((section) => section.chapterId === chapter.id).sort((a, b) => a.sectionNumber - b.sectionNumber).map((section) => ({
      id: section.id,
      sectionNumber: section.sectionNumber,
      heading: section.heading,
      body: section.body,
      imagePrompt: section.imagePrompt,
      imageUrl: section.imageUrl,
      interactiveLinks: parseJsonArray(section.interactiveLinksJson),
    })),
  }));
  const flatSections = packedChapters.flatMap((chapter) => chapter.sections.map((section) => ({ ...section, chapterId: chapter.id })));
  const content: LibraryBookletPack["content"] = {
    cover: {
      title: booklet.title,
      subtitle: booklet.subtitle,
      author: booklet.author,
      imageUrl: booklet.coverImageUrl,
      description: booklet.description,
      category: booklet.category,
      ageRating: booklet.ageRating,
    },
    chapters: packedChapters,
    sections: flatSections,
    images: resolvedExtras.images,
    illustrations: resolvedExtras.illustrations,
    quizzes: resolvedExtras.quizzes,
    whatsappPrompts: resolvedExtras.whatsappPrompts,
    readingSettings: resolvedExtras.readingSettings,
    metadata: {
      ...resolvedExtras.metadata,
      source: "Empire of Trust Studio Booklet Builder",
      manuscriptStored: String(Boolean(resolvedExtras.manuscript)),
    },
    booklet: {
      id: booklet.id,
      title: booklet.title,
      subtitle: booklet.subtitle,
      author: booklet.author,
      category: booklet.category,
      description: booklet.description,
      coverImageUrl: booklet.coverImageUrl,
      language: booklet.language,
      ageRating: booklet.ageRating,
      requiredLicencePlan: booklet.requiredLicencePlan,
      isPartOfEotStory: false,
      chapters: packedChapters,
    },
  };
  const checksum = await sha256(JSON.stringify(content));
  return {
    manifest: {
      packId: `LIB-${booklet.bookletCode}`,
      packType: "library_booklet",
      version,
      bookletCode: booklet.bookletCode,
      title: booklet.title,
      author: booklet.author,
      category: booklet.category,
      createdAt: now(),
      requiredLicencePlan: booklet.requiredLicencePlan,
      isPartOfEotStory: false,
      checksumAlgorithm: "SHA-256",
      checksum,
      signature: "frontend-placeholder-signature",
    },
    content,
  };
}

export async function saveLibraryPackMetadata(pack: LibraryBookletPack) {
  const key = `${pack.manifest.packId}_${pack.manifest.version}`;
  const row = { id: key, ...pack.manifest, bookletId: pack.content.booklet.id, updatedAt: now() };
  if (!isFirebaseConfigured) {
    const rows = read<Array<Record<string, unknown>>>(LOCAL_PACKS_KEY, []);
    write(LOCAL_PACKS_KEY, [...rows.filter((item) => item.id !== key), row]);
    return key;
  }
  await setDoc(doc(db, "eotLibraryPacks", key), { ...row, updatedAt: serverTimestamp() }, { merge: true });
  return key;
}

export function downloadLibraryPack(pack: LibraryBookletPack) {
  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${pack.manifest.packId}-v${pack.manifest.version}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function validateLibraryPack(input: unknown): LibraryBookletPack {
  if (!input || typeof input !== "object") throw new Error("Pack file is not a JSON object.");
  const pack = input as Partial<LibraryBookletPack>;
  if (!pack.manifest || !pack.content?.booklet) throw new Error("Pack is missing manifest or booklet content.");
  if (pack.manifest.packType !== "library_booklet") throw new Error("Only independent library booklet packs can be imported here.");
  if (pack.manifest.isPartOfEotStory !== false || pack.content.booklet.isPartOfEotStory !== false) throw new Error("Library booklet packs must be marked as not part of the EOT story.");
  if (!pack.manifest.packId || !pack.manifest.version || !pack.content.booklet.id || !pack.content.booklet.title) throw new Error("Pack is missing required identifiers.");
  return pack as LibraryBookletPack;
}

export async function getImportedLibraryPack(bookletId: string) {
  return (
    (await readerDb.libraryBookletPacks.where("content.booklet.id").equals(bookletId).first()) ??
    (await readerDb.libraryPacks.where("content.booklet.id").equals(bookletId).first()) ??
    null
  );
}

export async function listImportedLibraryPacks() {
  const [current, legacy] = await Promise.all([readerDb.libraryBookletPacks.toArray(), readerDb.libraryPacks.toArray()]);
  const byId = new Map<string, LibraryBookletPack>();
  [...legacy, ...current].forEach((pack) => byId.set(pack.content.booklet.id, pack));
  return Array.from(byId.values());
}

export async function importLibraryPack(pack: LibraryBookletPack, options: { replace?: boolean } = {}) {
  const reader = await getOrCreateReaderIdentity();
  const existing = await getImportedLibraryPack(pack.content.booklet.id);
  if (existing && !options.replace && compareEpisodePackVersions(pack.manifest.version, existing.manifest.version) <= 0) {
    throw new Error(`Version ${existing.manifest.version} is already imported. Import a newer booklet pack or choose replace.`);
  }
  await readerDb.libraryBookletPacks.put(pack);
  await readerDb.libraryPacks.put(pack);
  await readerDb.libraryCatalogueCache.put({
    id: pack.content.booklet.id,
    bookletId: pack.content.booklet.id,
    bookletCode: pack.manifest.bookletCode,
    title: pack.manifest.title,
    subtitle: pack.content.booklet.subtitle,
    author: pack.manifest.author,
    category: pack.manifest.category,
    description: pack.content.booklet.description,
    coverImageUrl: pack.content.booklet.coverImageUrl,
    language: pack.content.booklet.language,
    ageRating: pack.content.booklet.ageRating,
    requiredLicencePlan: pack.manifest.requiredLicencePlan,
    isPartOfEotStory: false,
    status: "published",
    updatedAt: now(),
  });
  await logActivity("booklet_pack_imported", {
    targetType: "libraryPack",
    targetId: pack.manifest.packId,
    metadata: { version: pack.manifest.version, bookletId: pack.content.booklet.id, replaced: Boolean(existing) },
  }, reader);
  return pack.content.booklet.id;
}

export async function deleteImportedLibraryPack(bookletId: string) {
  await readerDb.transaction("rw", readerDb.libraryBookletPacks, readerDb.libraryPacks, readerDb.libraryReadingProgress, async () => {
    const current = await readerDb.libraryBookletPacks.where("content.booklet.id").equals(bookletId).toArray();
    const legacy = await readerDb.libraryPacks.where("content.booklet.id").equals(bookletId).toArray();
    await readerDb.libraryBookletPacks.bulkDelete(current.map((pack) => pack.manifest.packId));
    await readerDb.libraryPacks.bulkDelete(legacy.map((pack) => pack.manifest.packId));
    await readerDb.libraryReadingProgress.delete(bookletId);
  });
}

export async function getLibraryReadingProgress(bookletId: string) {
  return readerDb.libraryReadingProgress.get(bookletId);
}

export async function saveLibraryReadingProgress(progress: LibraryReadingProgress) {
  await readerDb.libraryReadingProgress.put(progress);
  await logActivity("library_reading_progress_saved", {
    targetType: "libraryBooklet",
    targetId: progress.bookletId,
    metadata: { chapterId: progress.chapterId, sectionId: progress.sectionId },
  });
}
