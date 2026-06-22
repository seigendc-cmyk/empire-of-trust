import {
  addDoc,
  collection,
  deleteDoc,
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
import type { DeployableBookletPack, EotBooklet, EotBookletBuildHistory, EotBookletChapter, EotBookletCoverImage, EotBookletCoverImageKind, EotBookletEngagement, EotBookletMedia, EotBookletQuiz, EotBookletQuizQuestion, EotBookletSection } from "../types";

const LOCAL_BOOKLETS_KEY = "eot.bookletFoundation.booklets";
const LOCAL_CHAPTERS_KEY = "eot.bookletFoundation.chapters";
const LOCAL_SECTIONS_KEY = "eot.bookletFoundation.sections";
const LOCAL_COVER_IMAGES_KEY = "eot.bookletFoundation.coverImages";
const LOCAL_MEDIA_KEY = "eot.bookletFoundation.media";
const LOCAL_QUIZZES_KEY = "eot.bookletFoundation.quizzes";
const LOCAL_ENGAGEMENT_KEY = "eot.bookletFoundation.engagement";
const LOCAL_BUILD_HISTORY_KEY = "eot.bookletFoundation.buildHistory";

export const BOOKLET_FOUNDATION_CATEGORIES = [
  "Children's Stories",
  "Business Guides",
  "Faith Booklets",
  "Educational Books",
  "Community Publications",
  "Marketing Brochures",
  "Short Novels",
  "Corporate Reports",
  "Training Manuals",
];

type BookletInput = Omit<EotBooklet, "id" | "createdAt" | "updatedAt"> & { id?: string };
type ChapterInput = Omit<EotBookletChapter, "id" | "createdAt" | "updatedAt"> & { id?: string };
type SectionInput = Omit<EotBookletSection, "id" | "createdAt" | "updatedAt"> & { id?: string };
type CoverDetailsInput = Partial<Pick<EotBooklet, "title" | "subtitle" | "author" | "publisher" | "tagline" | "edition" | "publicationDate" | "description" | "coverImageUrl" | "backCoverImageUrl" | "bannerImageUrl" | "libraryThumbnailUrl">>;
type MediaDetailsInput = Pick<EotBookletMedia, "bookletId" | "chapterId" | "sectionId" | "mediaType" | "title" | "caption" | "credit" | "altText" | "imagePrompt" | "displayMode">;
type QuizInput = Omit<EotBookletQuiz, "id" | "createdAt" | "updatedAt" | "questions" | "description" | "points"> & { id?: string; description?: string; points?: number; questions: Partial<EotBookletQuizQuestion>[] };
type EngagementInput = Omit<EotBookletEngagement, "id" | "createdAt" | "updatedAt"> & { id?: string };
export interface ParsedBookletChapter {
  chapterNumber: number;
  title: string;
  summary: string;
  sections: Array<{
    sectionNumber: number;
    heading: string;
    content: string;
  }>;
}

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

function cleanFileName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "") || "cover-image";
}

function parseJsonList(value: string) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function imageUrlField(imageKind: EotBookletCoverImageKind): keyof Pick<EotBooklet, "coverImageUrl" | "backCoverImageUrl" | "bannerImageUrl" | "libraryThumbnailUrl"> {
  if (imageKind === "back_cover") return "backCoverImageUrl";
  if (imageKind === "banner") return "bannerImageUrl";
  if (imageKind === "library_thumbnail") return "libraryThumbnailUrl";
  return "coverImageUrl";
}

function xmlEscape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function generatedCoverSvg(booklet: EotBooklet, imageKind: EotBookletCoverImageKind) {
  const isBack = imageKind === "back_cover";
  const isThumbnail = imageKind === "library_thumbnail";
  const width = imageKind === "banner" ? 1600 : isThumbnail ? 900 : 1200;
  const height = imageKind === "banner" ? 520 : isThumbnail ? 1200 : 1800;
  const title = xmlEscape(booklet.title || "Untitled Booklet");
  const subtitle = xmlEscape(booklet.subtitle || booklet.category || "Independent Library");
  const author = xmlEscape(booklet.author || "Empire of Trust Studio");
  const publisher = xmlEscape(booklet.publisher || "");
  const tagline = xmlEscape(booklet.tagline || "Independent Library");
  const edition = xmlEscape(booklet.edition || "");
  const description = xmlEscape((booklet.description || tagline).slice(0, 280));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#f7f5ef"/>
  <rect x="56" y="56" width="${width - 112}" height="${height - 112}" fill="#ffffff" stroke="#b89445" stroke-width="8"/>
  <rect x="92" y="92" width="${width - 184}" height="${height - 184}" fill="#ece8dd" stroke="#cfc8b8" stroke-width="3"/>
  <text x="${width / 2}" y="${imageKind === "banner" ? 168 : 300}" text-anchor="middle" font-family="Georgia, serif" font-size="${imageKind === "banner" ? 74 : 92}" font-weight="700" fill="#1d1d1b">${isBack ? "About This Booklet" : title}</text>
  <text x="${width / 2}" y="${imageKind === "banner" ? 252 : 420}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${imageKind === "banner" ? 34 : 44}" fill="#5f625d">${isBack ? description : subtitle}</text>
  <line x1="${width * 0.2}" y1="${imageKind === "banner" ? 310 : height - 440}" x2="${width * 0.8}" y2="${imageKind === "banner" ? 310 : height - 440}" stroke="#b89445" stroke-width="6"/>
  <text x="${width / 2}" y="${imageKind === "banner" ? 380 : height - 330}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${imageKind === "banner" ? 28 : 38}" font-weight="700" fill="#8a6728">${tagline}</text>
  <text x="${width / 2}" y="${imageKind === "banner" ? 432 : height - 220}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${imageKind === "banner" ? 26 : 36}" fill="#1d1d1b">${isBack ? publisher : author}</text>
  <text x="${width / 2}" y="${height - 118}" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#5f625d">${edition}</text>
</svg>`;
}

const chapterWords: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
};

function chapterHeading(line: string) {
  const cleaned = line.trim().replace(/^#{1,2}\s+/, "");
  const match = cleaned.match(/^(?:chapter|chap\.?|part)\s+([0-9]+|[a-z]+)(?:\s*[:.\-]\s*|\s+)?(.*)$/i);
  if (!match) return null;
  const rawNumber = match[1].toLowerCase();
  const chapterNumber = Number(rawNumber) || chapterWords[rawNumber] || 0;
  if (!chapterNumber) return null;
  return { chapterNumber, title: match[2]?.trim() || `Chapter ${chapterNumber}` };
}

function sectionHeading(line: string) {
  const cleaned = line.trim().replace(/^#{3,6}\s+/, "");
  if (!cleaned) return null;
  if (/^#{3,6}\s+/.test(line.trim())) return cleaned;
  if (/^(section|lesson|unit)\s+([0-9]+|[a-z]+)(?:\s*[:.\-]\s*|\s+)?(.*)$/i.test(cleaned)) return cleaned;
  if (/^[A-Z0-9][A-Z0-9 ,:'"&()\-]+$/.test(cleaned) && cleaned.length >= 4 && cleaned.length <= 90) return cleaned;
  return null;
}

export function bookletFoundationInputFromForm(formData: FormData): BookletInput {
  const title = String(formData.get("title") ?? "").trim();
  return {
    id: String(formData.get("id") ?? "").trim() || undefined,
    bookletCode: normalizeCode(String(formData.get("bookletCode") ?? "") || title || "BOOKLET"),
    title,
    subtitle: String(formData.get("subtitle") ?? "").trim(),
    author: String(formData.get("author") ?? "").trim(),
    publisher: String(formData.get("publisher") ?? "").trim(),
    tagline: String(formData.get("tagline") ?? "").trim(),
    edition: String(formData.get("edition") ?? "").trim(),
    publicationDate: String(formData.get("publicationDate") ?? "").trim(),
    category: String(formData.get("category") ?? "Educational Books").trim(),
    language: String(formData.get("language") ?? "en").trim() || "en",
    description: String(formData.get("description") ?? "").trim(),
    coverImageUrl: String(formData.get("coverImageUrl") ?? "").trim(),
    backCoverImageUrl: String(formData.get("backCoverImageUrl") ?? "").trim(),
    bannerImageUrl: String(formData.get("bannerImageUrl") ?? "").trim(),
    libraryThumbnailUrl: String(formData.get("libraryThumbnailUrl") ?? "").trim(),
    ageRating: String(formData.get("ageRating") ?? "General").trim() || "General",
    requiredLicencePlan: String(formData.get("requiredLicencePlan") ?? "free").trim() || "free",
    isPartOfEotStory: false,
    status: String(formData.get("status") ?? "draft") as EotBooklet["status"],
  };
}

export function bookletChapterInputFromForm(formData: FormData, bookletId: string): ChapterInput {
  return {
    id: String(formData.get("chapterId") ?? "").trim() || undefined,
    bookletId,
    chapterNumber: Number(formData.get("chapterNumber") ?? 1) || 1,
    title: String(formData.get("chapterTitle") ?? "").trim(),
    summary: String(formData.get("chapterSummary") ?? "").trim(),
    intro: String(formData.get("chapterIntro") ?? formData.get("chapterSummary") ?? "").trim(),
  };
}

export function bookletSectionInputFromForm(formData: FormData, bookletId: string): SectionInput {
  return {
    id: String(formData.get("sectionId") ?? "").trim() || undefined,
    bookletId,
    chapterId: String(formData.get("sectionChapterId") ?? "").trim(),
    sectionNumber: Number(formData.get("sectionNumber") ?? 1) || 1,
    heading: String(formData.get("sectionHeading") ?? "").trim(),
    content: String(formData.get("sectionContent") ?? "").trim(),
    imagePrompt: String(formData.get("sectionImagePrompt") ?? "").trim(),
    imageUrl: String(formData.get("sectionImageUrl") ?? "").trim(),
    illustrationStyle: String(formData.get("sectionIllustrationStyle") ?? "").trim(),
    interactiveLinksJson: String(formData.get("sectionInteractiveLinksJson") ?? "[]").trim() || "[]",
  };
}

export function validateBookletFoundationInput(input: BookletInput) {
  const errors: string[] = [];
  if (!input.bookletCode) errors.push("Booklet code is required.");
  if (!input.title) errors.push("Title is required.");
  if (!input.author) errors.push("Author is required.");
  if (!input.publisher) errors.push("Publisher is required.");
  if (!input.category) errors.push("Category is required.");
  return errors;
}

export async function listBooklets() {
  if (!isFirebaseConfigured) return read<EotBooklet[]>(LOCAL_BOOKLETS_KEY, []).sort((a, b) => a.title.localeCompare(b.title));
  const snapshots = await getDocs(query(collection(db, "eotBooklets"), orderBy("title")));
  return snapshots.docs.map((snapshot) => withId<EotBooklet>(snapshot));
}

export async function getBooklet(bookletId: string) {
  if (!isFirebaseConfigured) return read<EotBooklet[]>(LOCAL_BOOKLETS_KEY, []).find((booklet) => booklet.id === bookletId) ?? null;
  const snapshot = await getDoc(doc(db, "eotBooklets", bookletId));
  return snapshot.exists() ? withId<EotBooklet>(snapshot) : null;
}

export async function saveBooklet(input: BookletInput) {
  if (!isFirebaseConfigured) {
    const rows = read<EotBooklet[]>(LOCAL_BOOKLETS_KEY, []);
    const id = input.id || input.bookletCode || localId("booklet");
    const existing = rows.find((row) => row.id === id);
    const booklet: EotBooklet = { ...input, id, createdAt: existing?.createdAt ?? now(), updatedAt: now() };
    write(LOCAL_BOOKLETS_KEY, [...rows.filter((row) => row.id !== id), booklet]);
    return id;
  }
  if (input.id) {
    const { id, ...rest } = input;
    await updateDoc(doc(db, "eotBooklets", id), { ...rest, updatedAt: serverTimestamp() });
    return id;
  }
  const snapshot = await addDoc(collection(db, "eotBooklets"), { ...input, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return snapshot.id;
}

export async function deleteBooklet(bookletId: string) {
  if (!isFirebaseConfigured) {
    write(LOCAL_BOOKLETS_KEY, read<EotBooklet[]>(LOCAL_BOOKLETS_KEY, []).filter((row) => row.id !== bookletId));
    write(LOCAL_CHAPTERS_KEY, read<EotBookletChapter[]>(LOCAL_CHAPTERS_KEY, []).filter((row) => row.bookletId !== bookletId));
    write(LOCAL_SECTIONS_KEY, read<EotBookletSection[]>(LOCAL_SECTIONS_KEY, []).filter((row) => row.bookletId !== bookletId));
    write(LOCAL_COVER_IMAGES_KEY, read<EotBookletCoverImage[]>(LOCAL_COVER_IMAGES_KEY, []).filter((row) => row.bookletId !== bookletId));
    write(LOCAL_MEDIA_KEY, read<EotBookletMedia[]>(LOCAL_MEDIA_KEY, []).filter((row) => row.bookletId !== bookletId));
    write(LOCAL_QUIZZES_KEY, read<EotBookletQuiz[]>(LOCAL_QUIZZES_KEY, []).filter((row) => row.bookletId !== bookletId));
    write(LOCAL_ENGAGEMENT_KEY, read<EotBookletEngagement[]>(LOCAL_ENGAGEMENT_KEY, []).filter((row) => row.bookletId !== bookletId));
    return;
  }
  const [chapters, sections] = await Promise.all([listBookletChapters(bookletId), listBookletSections(bookletId)]);
  await Promise.all(sections.map((section) => deleteDoc(doc(db, "eotBookletSections", section.id))));
  await Promise.all(chapters.map((chapter) => deleteDoc(doc(db, "eotBookletChapters", chapter.id))));
  await deleteDoc(doc(db, "eotBooklets", bookletId));
}

export async function saveBookletCoverDetails(bookletId: string, input: CoverDetailsInput) {
  const payload = { ...input, updatedAt: isFirebaseConfigured ? serverTimestamp() : now() };
  if (!isFirebaseConfigured) {
    const rows = read<EotBooklet[]>(LOCAL_BOOKLETS_KEY, []);
    write(LOCAL_BOOKLETS_KEY, rows.map((row) => (row.id === bookletId ? { ...row, ...input, updatedAt: now() } : row)));
    return;
  }
  await updateDoc(doc(db, "eotBooklets", bookletId), payload);
}

export async function listBookletCoverImages(bookletId: string) {
  if (!isFirebaseConfigured) return read<EotBookletCoverImage[]>(LOCAL_COVER_IMAGES_KEY, []).filter((row) => row.bookletId === bookletId).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const snapshots = await getDocs(query(collection(db, "eotBookletMedia"), where("bookletId", "==", bookletId), where("mediaType", "==", "cover")));
  return snapshots.docs.map((snapshot) => withId<EotBookletCoverImage>(snapshot)).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

async function saveCoverMetadata(metadata: EotBookletCoverImage) {
  if (!isFirebaseConfigured) {
    const rows = read<EotBookletCoverImage[]>(LOCAL_COVER_IMAGES_KEY, []);
    write(LOCAL_COVER_IMAGES_KEY, [...rows.filter((row) => row.id !== metadata.id), metadata]);
    return;
  }
  await setDoc(doc(db, "eotBookletMedia", metadata.id), { ...metadata, mediaType: "cover", updatedAt: serverTimestamp(), createdAt: metadata.createdAt || serverTimestamp() });
}

async function updateBookletImage(bookletId: string, imageKind: EotBookletCoverImageKind, imageUrl: string) {
  const field = imageUrlField(imageKind);
  if (!isFirebaseConfigured) {
    const rows = read<EotBooklet[]>(LOCAL_BOOKLETS_KEY, []);
    write(LOCAL_BOOKLETS_KEY, rows.map((row) => (row.id === bookletId ? { ...row, [field]: imageUrl, updatedAt: now() } : row)));
    return;
  }
  await updateDoc(doc(db, "eotBooklets", bookletId), { [field]: imageUrl, updatedAt: serverTimestamp() });
}

export async function uploadBookletCoverImage(bookletId: string, file: File, imageKind: EotBookletCoverImageKind) {
  if (!isFirebaseConfigured) throw new Error("Firebase Storage is unavailable because Firebase environment values are missing.");
  const storagePath = `booklets/${bookletId}/covers/${imageKind}/${Date.now()}-${cleanFileName(file.name)}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type || "application/octet-stream" });
  const imageUrl = await getDownloadURL(storageRef);
  const metadata: EotBookletCoverImage = {
    id: `${bookletId}_${imageKind}`,
    bookletId,
    imageKind,
    imageUrl,
    storagePath,
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    fileSize: file.size,
    source: "uploaded",
    createdAt: now(),
    updatedAt: now(),
  };
  await saveCoverMetadata(metadata);
  await updateBookletImage(bookletId, imageKind, imageUrl);
  return metadata;
}

export async function uploadGeneratedBookletCover(booklet: EotBooklet, imageKind: EotBookletCoverImageKind) {
  if (!isFirebaseConfigured) throw new Error("Firebase Storage is unavailable because Firebase environment values are missing.");
  const svg = generatedCoverSvg(booklet, imageKind);
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const fileName = `${booklet.bookletCode || booklet.id}-${imageKind}.svg`;
  const storagePath = `booklets/${booklet.id}/covers/generated/${Date.now()}-${cleanFileName(fileName)}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, blob, { contentType: "image/svg+xml" });
  const imageUrl = await getDownloadURL(storageRef);
  const metadata: EotBookletCoverImage = {
    id: `${booklet.id}_${imageKind}`,
    bookletId: booklet.id,
    imageKind,
    imageUrl,
    storagePath,
    fileName,
    contentType: "image/svg+xml",
    fileSize: blob.size,
    source: "generated",
    createdAt: now(),
    updatedAt: now(),
  };
  await saveCoverMetadata(metadata);
  await updateBookletImage(booklet.id, imageKind, imageUrl);
  return metadata;
}

export async function listBookletMedia(bookletId: string) {
  if (!isFirebaseConfigured) return read<EotBookletMedia[]>(LOCAL_MEDIA_KEY, []).filter((row) => row.bookletId === bookletId).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const snapshots = await getDocs(query(collection(db, "eotBookletMedia"), where("bookletId", "==", bookletId)));
  return snapshots.docs.map((snapshot) => withId<EotBookletMedia>(snapshot)).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export async function uploadBookletMedia(file: File, input: MediaDetailsInput) {
  if (!input.chapterId && !input.sectionId) throw new Error("Assign the media to a chapter or section.");
  if (!isFirebaseConfigured) throw new Error("Firebase Storage is unavailable because Firebase environment values are missing.");
  const id = localId("booklet_media");
  const storagePath = `booklets/${input.bookletId}/media/${input.mediaType}/${Date.now()}-${cleanFileName(file.name)}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type || "application/octet-stream" });
  const imageUrl = await getDownloadURL(storageRef);
  const media: EotBookletMedia = {
    id,
    ...input,
    downloadUrl: imageUrl,
    imageUrl,
    storagePath,
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    fileSize: file.size,
    createdAt: now(),
    updatedAt: now(),
  };
  await setDoc(doc(db, "eotBookletMedia", id), { ...media, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await updateDoc(doc(db, "eotBooklets", input.bookletId), { updatedAt: serverTimestamp() });
  return media;
}

export async function saveLocalBookletMedia(input: Omit<EotBookletMedia, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  const rows = read<EotBookletMedia[]>(LOCAL_MEDIA_KEY, []);
  const id = input.id || localId("booklet_media");
  const existing = rows.find((row) => row.id === id);
  const media: EotBookletMedia = { ...input, id, imageUrl: input.imageUrl || input.downloadUrl, createdAt: existing?.createdAt ?? now(), updatedAt: now() };
  write(LOCAL_MEDIA_KEY, [...rows.filter((row) => row.id !== id), media]);
  return media;
}

export async function deleteBookletMedia(mediaId: string) {
  if (!isFirebaseConfigured) {
    write(LOCAL_MEDIA_KEY, read<EotBookletMedia[]>(LOCAL_MEDIA_KEY, []).filter((row) => row.id !== mediaId));
    return;
  }
  await deleteDoc(doc(db, "eotBookletMedia", mediaId));
}

export async function listBookletQuizzes(bookletId: string) {
  if (!isFirebaseConfigured) return read<EotBookletQuiz[]>(LOCAL_QUIZZES_KEY, []).filter((row) => row.bookletId === bookletId).sort((a, b) => a.title.localeCompare(b.title));
  const snapshots = await getDocs(query(collection(db, "eotBookletQuizzes"), where("bookletId", "==", bookletId)));
  return snapshots.docs.map((snapshot) => withId<EotBookletQuiz>(snapshot)).sort((a, b) => a.title.localeCompare(b.title));
}

export function normalizeBookletQuizQuestion(input: Partial<EotBookletQuizQuestion>, index: number): EotBookletQuizQuestion {
  const type = input.questionType === "true_false" || input.questionType === "short_answer" ? input.questionType : "multiple_choice";
  const options = type === "true_false" ? ["True", "False"] : (input.options ?? []).map(String).filter(Boolean);
  return {
    id: input.id || localId("booklet_quiz_question"),
    questionType: type,
    question: String(input.question ?? "").trim(),
    options,
    correctAnswer: String(input.correctAnswer ?? "").trim(),
    explanation: String(input.explanation ?? "").trim(),
    points: Number(input.points ?? 1) || 1,
  };
}

export async function saveBookletQuiz(input: QuizInput) {
  if (!input.title) throw new Error("Quiz title is required.");
  if (!input.questions.length) throw new Error("Add at least one question.");
  const questions = input.questions.map(normalizeBookletQuizQuestion).filter((question) => question.question && question.correctAnswer);
  if (!questions.length) throw new Error("Each quiz needs at least one valid question and correct answer.");
  const payload = { ...input, questions, passMark: Number(input.passMark || 70), points: Number(input.points ?? questions.reduce((sum, question) => sum + question.points, 0)) || questions.length, description: input.description || "" };
  if (!isFirebaseConfigured) {
    const rows = read<EotBookletQuiz[]>(LOCAL_QUIZZES_KEY, []);
    const id = payload.id || localId("booklet_quiz");
    const existing = rows.find((row) => row.id === id);
    const quiz: EotBookletQuiz = { ...payload, id, createdAt: existing?.createdAt ?? now(), updatedAt: now() };
    write(LOCAL_QUIZZES_KEY, [...rows.filter((row) => row.id !== id), quiz]);
    return id;
  }
  if (payload.id) {
    const { id, ...rest } = payload;
    await updateDoc(doc(db, "eotBookletQuizzes", id), { ...rest, updatedAt: serverTimestamp() });
    return id;
  }
  const snapshot = await addDoc(collection(db, "eotBookletQuizzes"), { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return snapshot.id;
}

export async function deleteBookletQuiz(quizId: string) {
  if (!isFirebaseConfigured) {
    write(LOCAL_QUIZZES_KEY, read<EotBookletQuiz[]>(LOCAL_QUIZZES_KEY, []).filter((row) => row.id !== quizId));
    return;
  }
  await deleteDoc(doc(db, "eotBookletQuizzes", quizId));
}

export async function listBookletEngagement(bookletId: string) {
  if (!isFirebaseConfigured) return read<EotBookletEngagement[]>(LOCAL_ENGAGEMENT_KEY, []).filter((row) => row.bookletId === bookletId).sort((a, b) => a.buttonLabel.localeCompare(b.buttonLabel));
  const snapshots = await getDocs(query(collection(db, "eotBookletWhatsappPrompts"), where("bookletId", "==", bookletId)));
  return snapshots.docs.map((snapshot) => withId<EotBookletEngagement>(snapshot)).sort((a, b) => a.buttonLabel.localeCompare(b.buttonLabel));
}

export async function saveBookletEngagement(input: EngagementInput) {
  if (!input.buttonLabel) throw new Error("Button label is required.");
  if (!input.whatsappNumber) throw new Error("WhatsApp number is required.");
  if (!input.messageTemplate) throw new Error("Message template is required.");
  const purpose = input.purpose || input.ctaType;
  const payload = { ...input, ctaType: purpose, purpose, whatsappNumber: input.whatsappNumber.replace(/[^\d+]/g, "") };
  if (!isFirebaseConfigured) {
    const rows = read<EotBookletEngagement[]>(LOCAL_ENGAGEMENT_KEY, []);
    const id = payload.id || localId("booklet_engagement");
    const existing = rows.find((row) => row.id === id);
    const engagement: EotBookletEngagement = { ...payload, id, createdAt: existing?.createdAt ?? now(), updatedAt: now() };
    write(LOCAL_ENGAGEMENT_KEY, [...rows.filter((row) => row.id !== id), engagement]);
    return id;
  }
  if (payload.id) {
    const { id, ...rest } = payload;
    await updateDoc(doc(db, "eotBookletWhatsappPrompts", id), { ...rest, updatedAt: serverTimestamp() });
    return id;
  }
  const snapshot = await addDoc(collection(db, "eotBookletWhatsappPrompts"), { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return snapshot.id;
}

export async function deleteBookletEngagement(engagementId: string) {
  if (!isFirebaseConfigured) {
    write(LOCAL_ENGAGEMENT_KEY, read<EotBookletEngagement[]>(LOCAL_ENGAGEMENT_KEY, []).filter((row) => row.id !== engagementId));
    return;
  }
  await deleteDoc(doc(db, "eotBookletWhatsappPrompts", engagementId));
}

export async function buildBookletFoundationPack(booklet: EotBooklet, chapters: EotBookletChapter[], sections: EotBookletSection[], media: EotBookletMedia[], version = "1.0.0", quizzes: EotBookletQuiz[] = [], engagement: EotBookletEngagement[] = []): Promise<DeployableBookletPack> {
  const sortedChapters = chapters.slice().sort((a, b) => a.chapterNumber - b.chapterNumber);
  const packedChapters = sortedChapters.map((chapter) => ({
    id: chapter.id,
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    intro: chapter.intro || chapter.summary,
    sections: sections.filter((section) => section.chapterId === chapter.id).sort((a, b) => a.sectionNumber - b.sectionNumber).map((section) => {
      const sectionMedia = media.find((item) => item.sectionId === section.id);
      return {
        id: section.id,
        sectionNumber: section.sectionNumber,
        heading: section.heading,
        body: section.content,
        imagePrompt: section.imagePrompt || sectionMedia?.imagePrompt || "",
        imageUrl: section.imageUrl || sectionMedia?.downloadUrl || sectionMedia?.imageUrl || "",
        interactiveLinks: parseJsonList(section.interactiveLinksJson),
      };
    }),
  }));
  const flatSections = packedChapters.flatMap((chapter) => chapter.sections.map((section) => ({ ...section, chapterId: chapter.id })));
  const images = media.filter((item) => item.mediaType === "image").map((item) => ({
    id: item.id,
    label: item.title,
    title: item.title,
    caption: item.caption,
    credits: item.credit || item.credits,
    imageUrl: item.downloadUrl || item.imageUrl || "",
    altText: item.altText,
    chapterId: item.chapterId || undefined,
    sectionId: item.sectionId || undefined,
    prompt: item.imagePrompt,
  }));
  const illustrations = media.filter((item) => item.mediaType === "illustration").map((item) => ({
    id: item.id,
    label: item.title,
    title: item.title,
    caption: item.caption,
    credits: item.credit || item.credits,
    imageUrl: item.downloadUrl || item.imageUrl || "",
    altText: item.altText,
    chapterId: item.chapterId || undefined,
    sectionId: item.sectionId || undefined,
    prompt: item.imagePrompt,
  }));
  const packedMedia = media.map((item) => ({
    id: item.id,
    label: item.title,
    title: item.title,
    caption: item.caption,
    credits: item.credit || item.credits,
    imageUrl: item.downloadUrl || item.imageUrl || "",
    altText: item.altText,
    chapterId: item.chapterId || undefined,
    sectionId: item.sectionId || undefined,
    prompt: item.imagePrompt,
  }));
  const cover = {
    title: booklet.title,
    subtitle: booklet.subtitle,
    author: booklet.author,
    imageUrl: booklet.libraryThumbnailUrl || booklet.coverImageUrl,
    description: booklet.description,
    category: booklet.category,
    ageRating: booklet.ageRating,
  };
  const packedQuizzes = quizzes.map((quiz) => ({
      id: quiz.id,
      scope: quiz.chapterId ? "chapter" as const : "booklet" as const,
      chapterId: quiz.chapterId || undefined,
      title: quiz.title,
      passScore: quiz.passMark,
      questions: quiz.questions.map((question) => ({
        id: question.id,
        questionType: question.questionType,
        question: question.question,
        options: question.options,
        answer: question.correctAnswer,
        explanation: question.explanation,
        points: question.points,
      })),
    }));
  const whatsappEngagement = engagement.map((item) => ({
      id: item.id,
      scope: "booklet" as const,
      ctaType: item.ctaType,
      buttonLabel: item.buttonLabel,
      whatsappNumber: item.whatsappNumber,
      prompt: item.buttonLabel,
      responseTemplate: item.messageTemplate,
    }));
  const content: DeployableBookletPack["content"] = {
    cover,
    chapters: packedChapters,
    sections: flatSections,
    images,
    illustrations,
    media: packedMedia,
    quizzes: packedQuizzes,
    whatsappPrompts: whatsappEngagement,
    readingSettings: {
      fontScale: "standard",
      estimatedMinutes: Math.max(5, Math.ceil(sections.reduce((total, section) => total + section.content.split(/\s+/).filter(Boolean).length, 0) / 180)),
      allowOffline: true,
      showImages: true,
    },
    metadata: {
      source: "Empire of Trust Studio Booklet Builder",
      publisher: booklet.publisher,
      tagline: booklet.tagline,
      edition: booklet.edition,
      publicationDate: booklet.publicationDate,
      mediaCount: String(media.length),
      quizCount: String(quizzes.length),
      engagementCount: String(engagement.length),
    },
    booklet: {
      id: booklet.id,
      title: booklet.title,
      subtitle: booklet.subtitle,
      author: booklet.author,
      category: booklet.category,
      description: booklet.description,
      coverImageUrl: booklet.libraryThumbnailUrl || booklet.coverImageUrl,
      language: booklet.language,
      ageRating: booklet.ageRating,
      requiredLicencePlan: booklet.requiredLicencePlan,
      isPartOfEotStory: false,
      chapters: packedChapters,
    },
  };
  const checksum = await sha256(JSON.stringify(content));
  const manifest = {
    packId: `LIB-${booklet.bookletCode}`,
    packType: "library_booklet" as const,
    version,
    bookletCode: booklet.bookletCode,
    title: booklet.title,
    author: booklet.author,
    category: booklet.category,
    createdAt: now(),
    requiredLicencePlan: booklet.requiredLicencePlan,
    isPartOfEotStory: false as const,
    checksumAlgorithm: "SHA-256" as const,
    checksum,
    signature: "frontend-placeholder-signature",
  };
  return {
    manifest: {
      ...manifest,
    },
    cover,
    chapters: packedChapters,
    sections: flatSections,
    illustrations,
    media: packedMedia,
    quizzes: packedQuizzes,
    whatsappEngagement,
    content,
  };
}

export function bookletPackFileName(pack: Pick<DeployableBookletPack, "manifest">) {
  return `${pack.manifest.packId}-v${pack.manifest.version}.booklet.json`;
}

export function downloadBookletPack(pack: DeployableBookletPack) {
  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = bookletPackFileName(pack);
  link.click();
  URL.revokeObjectURL(url);
}

export async function saveBookletBuildHistory(pack: DeployableBookletPack) {
  const row: EotBookletBuildHistory = {
    id: `${pack.manifest.packId}_${pack.manifest.version}_${Date.now()}`,
    bookletId: pack.content.booklet.id,
    packId: pack.manifest.packId,
    version: pack.manifest.version,
    fileName: bookletPackFileName(pack),
    checksum: pack.manifest.checksum,
    chapterCount: pack.chapters.length,
    sectionCount: pack.sections.length,
    illustrationCount: pack.illustrations.length,
    quizCount: pack.quizzes.length,
    whatsappEngagementCount: pack.whatsappEngagement.length,
    createdAt: now(),
  };
  if (!isFirebaseConfigured) {
    const rows = read<EotBookletBuildHistory[]>(LOCAL_BUILD_HISTORY_KEY, []);
    write(LOCAL_BUILD_HISTORY_KEY, [row, ...rows]);
    return row.id;
  }
  await setDoc(doc(db, "eotBookletPacks", row.id), { ...row, createdAt: serverTimestamp() });
  return row.id;
}

export async function listBookletBuildHistory(bookletId: string) {
  if (!isFirebaseConfigured) return read<EotBookletBuildHistory[]>(LOCAL_BUILD_HISTORY_KEY, []).filter((row) => row.bookletId === bookletId).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const snapshots = await getDocs(query(collection(db, "eotBookletPacks"), where("bookletId", "==", bookletId)));
  return snapshots.docs.map((snapshot) => withId<EotBookletBuildHistory>(snapshot)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function listBookletChapters(bookletId: string) {
  if (!isFirebaseConfigured) return read<EotBookletChapter[]>(LOCAL_CHAPTERS_KEY, []).filter((row) => row.bookletId === bookletId).sort((a, b) => a.chapterNumber - b.chapterNumber);
  const snapshots = await getDocs(query(collection(db, "eotBookletChapters"), where("bookletId", "==", bookletId), orderBy("chapterNumber")));
  return snapshots.docs.map((snapshot) => withId<EotBookletChapter>(snapshot));
}

export async function saveBookletChapter(input: ChapterInput) {
  if (!input.title) throw new Error("Chapter title is required.");
  if (!isFirebaseConfigured) {
    const rows = read<EotBookletChapter[]>(LOCAL_CHAPTERS_KEY, []);
    const id = input.id || localId("booklet_chapter");
    const existing = rows.find((row) => row.id === id);
    const chapter: EotBookletChapter = { ...input, id, createdAt: existing?.createdAt ?? now(), updatedAt: now() };
    write(LOCAL_CHAPTERS_KEY, [...rows.filter((row) => row.id !== id), chapter]);
    return id;
  }
  if (input.id) {
    const { id, ...rest } = input;
    await updateDoc(doc(db, "eotBookletChapters", id), { ...rest, updatedAt: serverTimestamp() });
    return id;
  }
  const snapshot = await addDoc(collection(db, "eotBookletChapters"), { ...input, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return snapshot.id;
}

export async function listBookletSections(bookletId: string) {
  if (!isFirebaseConfigured) return read<EotBookletSection[]>(LOCAL_SECTIONS_KEY, []).filter((row) => row.bookletId === bookletId).sort((a, b) => a.sectionNumber - b.sectionNumber);
  const snapshots = await getDocs(query(collection(db, "eotBookletSections"), where("bookletId", "==", bookletId), orderBy("sectionNumber")));
  return snapshots.docs.map((snapshot) => withId<EotBookletSection>(snapshot));
}

export async function saveBookletSection(input: SectionInput) {
  if (!input.chapterId) throw new Error("Choose a chapter first.");
  if (!input.heading && !input.content) throw new Error("Section heading or content is required.");
  if (!isFirebaseConfigured) {
    const rows = read<EotBookletSection[]>(LOCAL_SECTIONS_KEY, []);
    const id = input.id || localId("booklet_section");
    const existing = rows.find((row) => row.id === id);
    const section: EotBookletSection = { ...input, id, createdAt: existing?.createdAt ?? now(), updatedAt: now() };
    write(LOCAL_SECTIONS_KEY, [...rows.filter((row) => row.id !== id), section]);
    return id;
  }
  if (input.id) {
    const { id, ...rest } = input;
    await updateDoc(doc(db, "eotBookletSections", id), { ...rest, updatedAt: serverTimestamp() });
    return id;
  }
  const snapshot = await addDoc(collection(db, "eotBookletSections"), { ...input, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return snapshot.id;
}

export async function getBookletContent(bookletId: string) {
  const [booklet, chapters, sections] = await Promise.all([getBooklet(bookletId), listBookletChapters(bookletId), listBookletSections(bookletId)]);
  return { booklet, chapters, sections };
}

export function parseBookletManuscript(manuscript: string): ParsedBookletChapter[] {
  const lines = manuscript.replace(/\r\n/g, "\n").split("\n");
  const chapters: ParsedBookletChapter[] = [];
  let currentChapter: ParsedBookletChapter | null = null;
  let currentSection: ParsedBookletChapter["sections"][number] | null = null;

  function ensureChapter() {
    if (!currentChapter) {
      currentChapter = { chapterNumber: 1, title: "Chapter 1", summary: "", sections: [] };
      chapters.push(currentChapter);
    }
    return currentChapter;
  }

  function pushSection() {
    if (currentSection && (currentSection.heading.trim() || currentSection.content.trim())) {
      ensureChapter().sections.push({ ...currentSection, heading: currentSection.heading.trim(), content: currentSection.content.trim() });
    }
    currentSection = null;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const chapter = chapterHeading(line);
    if (chapter) {
      pushSection();
      currentChapter = {
        chapterNumber: chapter.chapterNumber || chapters.length + 1,
        title: chapter.title,
        summary: "",
        sections: [],
      };
      chapters.push(currentChapter);
      continue;
    }

    const heading = sectionHeading(line);
    if (heading) {
      pushSection();
      currentSection = { sectionNumber: ensureChapter().sections.length + 1, heading, content: "" };
      continue;
    }

    if (!line) {
      if (currentSection?.content) currentSection.content += "\n\n";
      continue;
    }

    const activeChapter = ensureChapter();
    if (!currentSection && !activeChapter.summary) {
      activeChapter.summary = line;
      continue;
    }
    if (!currentSection) currentSection = { sectionNumber: activeChapter.sections.length + 1, heading: "Section " + (activeChapter.sections.length + 1), content: "" };
    currentSection.content += `${currentSection.content ? "\n" : ""}${rawLine}`;
  }

  pushSection();
  return chapters.map((chapter, chapterIndex) => ({
    ...chapter,
    chapterNumber: chapter.chapterNumber || chapterIndex + 1,
    sections: chapter.sections.length ? chapter.sections.map((section, sectionIndex) => ({ ...section, sectionNumber: sectionIndex + 1 })) : [{ sectionNumber: 1, heading: chapter.title, content: chapter.summary }],
  }));
}

export async function replaceBookletManuscriptStructure(bookletId: string, parsed: ParsedBookletChapter[]) {
  if (!parsed.length) throw new Error("Parsed manuscript has no chapters.");
  if (!isFirebaseConfigured) {
    const chapters = read<EotBookletChapter[]>(LOCAL_CHAPTERS_KEY, []).filter((row) => row.bookletId !== bookletId);
    const sections = read<EotBookletSection[]>(LOCAL_SECTIONS_KEY, []).filter((row) => row.bookletId !== bookletId);
    const nextChapters: EotBookletChapter[] = [];
    const nextSections: EotBookletSection[] = [];
    for (const chapter of parsed) {
      const chapterId = localId("booklet_chapter");
      nextChapters.push({ id: chapterId, bookletId, chapterNumber: chapter.chapterNumber, title: chapter.title, summary: chapter.summary, intro: chapter.summary, createdAt: now(), updatedAt: now() });
      for (const section of chapter.sections) {
        nextSections.push({ id: localId("booklet_section"), bookletId, chapterId, sectionNumber: section.sectionNumber, heading: section.heading, content: section.content, imagePrompt: "", imageUrl: "", illustrationStyle: "", interactiveLinksJson: "[]", createdAt: now(), updatedAt: now() });
      }
    }
    write(LOCAL_CHAPTERS_KEY, [...chapters, ...nextChapters]);
    write(LOCAL_SECTIONS_KEY, [...sections, ...nextSections]);
    return { chapters: nextChapters.length, sections: nextSections.length };
  }

  const [existingChapters, existingSections] = await Promise.all([listBookletChapters(bookletId), listBookletSections(bookletId)]);
  await Promise.all(existingSections.map((section) => deleteDoc(doc(db, "eotBookletSections", section.id))));
  await Promise.all(existingChapters.map((chapter) => deleteDoc(doc(db, "eotBookletChapters", chapter.id))));
  let sectionCount = 0;
  for (const chapter of parsed) {
    const chapterRef = await addDoc(collection(db, "eotBookletChapters"), {
      bookletId,
      chapterNumber: chapter.chapterNumber,
      title: chapter.title,
      summary: chapter.summary,
      intro: chapter.summary,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    for (const section of chapter.sections) {
      await addDoc(collection(db, "eotBookletSections"), {
        bookletId,
        chapterId: chapterRef.id,
        sectionNumber: section.sectionNumber,
        heading: section.heading,
        content: section.content,
        imagePrompt: "",
        imageUrl: "",
        illustrationStyle: "",
        interactiveLinksJson: "[]",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      sectionCount += 1;
    }
  }
  await updateDoc(doc(db, "eotBooklets", bookletId), { updatedAt: serverTimestamp() });
  return { chapters: parsed.length, sections: sectionCount };
}
