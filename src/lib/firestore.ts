import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  type DocumentData,
  type QueryDocumentSnapshot,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { isFirebaseConfigured } from "./firebase";
import {
  createLocalEpisode,
  deleteLocalParagraph,
  findLocalEpisodeByIdentifier,
  getLocalEpisode,
  listLocalChapters,
  listLocalEpisodes,
  listLocalParagraphs,
  saveLocalPackMetadata,
  updateLocalEpisode,
  upsertLocalChapter,
  upsertLocalParagraph,
} from "./localStudioRepository";
import type { Chapter, Episode, EpisodePack, Paragraph } from "../types";

const withId = <T>(snapshot: QueryDocumentSnapshot<DocumentData> | { id: string; data: () => DocumentData }) =>
  ({ id: snapshot.id, ...snapshot.data() }) as T;

export async function listEpisodes() {
  if (!isFirebaseConfigured) return listLocalEpisodes();
  const snapshots = await getDocs(query(collection(db, "eotEpisodes"), orderBy("seasonNumber"), orderBy("episodeNumber")));
  return snapshots.docs.map((item) => withId<Episode>(item));
}

export async function getEpisode(episodeId: string) {
  if (!isFirebaseConfigured) return getLocalEpisode(episodeId);
  const snapshot = await getDoc(doc(db, "eotEpisodes", episodeId));
  return snapshot.exists() ? withId<Episode>(snapshot) : null;
}

export async function findEpisodeByIdentifier(episodeIdentifier: string) {
  if (!isFirebaseConfigured) return findLocalEpisodeByIdentifier(episodeIdentifier);
  const snapshots = await getDocs(
    query(collection(db, "eotEpisodes"), where("episodeIdentifier", "==", episodeIdentifier)),
  );
  return snapshots.docs.map((item) => withId<Episode>(item));
}

export async function createEpisode(input: Omit<Episode, "id" | "createdAt" | "updatedAt">) {
  if (!isFirebaseConfigured) return createLocalEpisode(input);
  const snapshot = await addDoc(collection(db, "eotEpisodes"), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return snapshot.id;
}

export async function updateEpisode(episodeId: string, input: Partial<Omit<Episode, "id" | "createdAt" | "updatedAt">>) {
  if (!isFirebaseConfigured) return updateLocalEpisode(episodeId, input);
  await updateDoc(doc(db, "eotEpisodes", episodeId), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function listChapters(episodeId: string) {
  if (!isFirebaseConfigured) return listLocalChapters(episodeId);
  const snapshots = await getDocs(
    query(collection(db, "eotChapters"), where("episodeId", "==", episodeId), orderBy("chapterNumber")),
  );
  return snapshots.docs.map((item) => withId<Chapter>(item));
}

export async function upsertChapter(input: Omit<Chapter, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  if (!isFirebaseConfigured) return upsertLocalChapter(input);
  if (input.id) {
    const { id, ...rest } = input;
    await updateDoc(doc(db, "eotChapters", id), { ...rest, updatedAt: serverTimestamp() });
    return id;
  }

  const snapshot = await addDoc(collection(db, "eotChapters"), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return snapshot.id;
}

export async function listParagraphs(episodeId: string) {
  if (!isFirebaseConfigured) return listLocalParagraphs(episodeId);
  const snapshots = await getDocs(
    query(collection(db, "eotParagraphs"), where("episodeId", "==", episodeId), orderBy("paragraphNumber")),
  );
  return snapshots.docs.map((item) => withId<Paragraph>(item));
}

export async function upsertParagraph(input: Omit<Paragraph, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  if (!isFirebaseConfigured) return upsertLocalParagraph(input);
  if (input.id) {
    const { id, ...rest } = input;
    await updateDoc(doc(db, "eotParagraphs", id), { ...rest, updatedAt: serverTimestamp() });
    return id;
  }

  const snapshot = await addDoc(collection(db, "eotParagraphs"), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return snapshot.id;
}

export async function deleteParagraph(paragraphId: string) {
  if (!isFirebaseConfigured) return deleteLocalParagraph(paragraphId);
  await deleteDoc(doc(db, "eotParagraphs", paragraphId));
}

export async function savePackMetadata(episodeId: string, pack: EpisodePack) {
  if (!isFirebaseConfigured) return saveLocalPackMetadata(episodeId, pack);
  await setDoc(doc(db, "eotPacks", `${pack.manifest.packId}_${pack.manifest.version}`), {
    episodeId,
    packId: pack.manifest.packId,
    packType: pack.manifest.packType,
    version: pack.manifest.version,
    title: pack.manifest.title,
    episodeIdentifier: pack.manifest.episodeIdentifier,
    releaseWeekNumber: pack.manifest.releaseWeekNumber,
    checksumAlgorithm: pack.manifest.checksumAlgorithm,
    checksum: pack.manifest.checksum,
    signature: pack.manifest.signature,
    packCreatedAt: pack.manifest.createdAt,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
