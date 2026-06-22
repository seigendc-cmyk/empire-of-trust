import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, isFirebaseConfigured, storage } from "./firebase";
import { numberValue, stringValue } from "./forms";
import { readerDb } from "./offlineDb";
import type {
  EotActor,
  EotActorAudition,
  EotActorAvailability,
  EotActorEpisodeAppearance,
  EotActorPortfolio,
  EotActorSceneAssignment,
  EotCastingAssignment,
  EotTalentNote,
} from "../types";

const withId = <T>(snapshot: QueryDocumentSnapshot<DocumentData> | { id: string; data: () => DocumentData }) =>
  ({ id: snapshot.id, ...snapshot.data() }) as T;

export const actorStatuses = ["active", "shortlisted", "auditioning", "cast", "inactive", "rejected"] as const;
export const availabilityStatuses = ["available", "limited", "unavailable", "booked", "inactive"] as const;
export const castingStatuses = ["proposed", "shortlisted", "approved", "rejected", "confirmed", "replaced"] as const;
export const storagePaths = {
  headshots: "assets/actors/headshots",
  portfolio: "assets/actors/portfolio",
  auditions: "assets/actors/auditions",
  contracts: "assets/actors/contracts",
} as const;

function now() {
  return new Date().toISOString();
}

function listFromText(value: string) {
  return value.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean);
}

export function normalizeActor(input: Partial<EotActor> & { id: string }): EotActor {
  const fullName = input.fullName || input.name || input.stageName || "Untitled actor";
  return {
    id: input.id,
    actorCode: input.actorCode || "",
    name: input.name || fullName,
    fullName,
    stageName: input.stageName || "",
    gender: input.gender || "",
    dateOfBirth: input.dateOfBirth || "",
    age: input.age || 0,
    nationality: input.nationality || "",
    tribe: input.tribe || "",
    languages: input.languages || [],
    phone: input.phone || "",
    whatsapp: input.whatsapp || "",
    email: input.email || "",
    address: input.address || "",
    city: input.city || "",
    country: input.country || "",
    bio: input.bio || input.biography || "",
    biography: input.biography || input.bio || "",
    skills: input.skills || [],
    experienceLevel: input.experienceLevel || "new",
    availabilityStatus: input.availabilityStatus || "available",
    status: input.status || "active",
    characterIds: input.characterIds || [],
    headshotUrl: input.headshotUrl || input.imageUrl || "",
    imageUrl: input.imageUrl || input.headshotUrl || "",
    galleryUrls: input.galleryUrls || [],
    portfolioLinks: input.portfolioLinks || [],
    socialLinks: input.socialLinks || "",
    notes: input.notes || "",
    createdAt: input.createdAt || now(),
    updatedAt: input.updatedAt || now(),
  };
}

export function actorInputFromForm(formData: FormData, id?: string): EotActor {
  return normalizeActor({
    id: id || `local-actor-${Date.now()}`,
    actorCode: stringValue(formData, "actorCode"),
    fullName: stringValue(formData, "fullName"),
    name: stringValue(formData, "fullName"),
    stageName: stringValue(formData, "stageName"),
    gender: stringValue(formData, "gender"),
    dateOfBirth: stringValue(formData, "dateOfBirth"),
    age: numberValue(formData, "age"),
    nationality: stringValue(formData, "nationality"),
    tribe: stringValue(formData, "tribe"),
    languages: listFromText(stringValue(formData, "languages")),
    phone: stringValue(formData, "phone"),
    whatsapp: stringValue(formData, "whatsapp"),
    email: stringValue(formData, "email"),
    address: stringValue(formData, "address"),
    city: stringValue(formData, "city"),
    country: stringValue(formData, "country"),
    bio: stringValue(formData, "bio"),
    biography: stringValue(formData, "bio"),
    skills: listFromText(stringValue(formData, "skills")),
    experienceLevel: stringValue(formData, "experienceLevel", "new") as EotActor["experienceLevel"],
    availabilityStatus: stringValue(formData, "availabilityStatus", "available") as EotActor["availabilityStatus"],
    status: stringValue(formData, "status", "active") as EotActor["status"],
    characterIds: listFromText(stringValue(formData, "characterIds")),
    headshotUrl: stringValue(formData, "headshotUrl"),
    imageUrl: stringValue(formData, "headshotUrl"),
    galleryUrls: listFromText(stringValue(formData, "galleryUrls")),
    portfolioLinks: listFromText(stringValue(formData, "portfolioLinks")),
    socialLinks: stringValue(formData, "socialLinks"),
    notes: stringValue(formData, "notes"),
  });
}

export async function uploadActorMedia(actorId: string, file: File, bucket: keyof typeof storagePaths) {
  if (!isFirebaseConfigured) throw new Error("Firebase Storage is unavailable until Firebase env values are configured.");
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const storagePath = `${storagePaths[bucket]}/${actorId}/${Date.now()}-${cleanName}`;
  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, file);
  return { storagePath, url: await getDownloadURL(fileRef) };
}

export async function listActors() {
  if (!isFirebaseConfigured) return readerDb.actorCache.toArray();
  const snapshots = await getDocs(query(collection(db, "eotActors"), orderBy("fullName")));
  const rows = snapshots.docs.map((snapshot) => normalizeActor(withId<EotActor>(snapshot)));
  await readerDb.actorCache.bulkPut(rows);
  await readerDb.assetCache.bulkPut(rows);
  return rows;
}

export async function getActor(actorId: string) {
  const cached = await readerDb.actorCache.get(actorId);
  if (!isFirebaseConfigured) return cached ?? null;
  const snapshot = await getDoc(doc(db, "eotActors", actorId));
  if (!snapshot.exists()) return cached ?? null;
  const actor = normalizeActor(withId<EotActor>(snapshot));
  await readerDb.actorCache.put(actor);
  await readerDb.assetCache.put(actor);
  return actor;
}

export async function upsertActor(input: EotActor) {
  const actor = normalizeActor(input);
  if (!isFirebaseConfigured) {
    await readerDb.actorCache.put({ ...actor, updatedAt: now() });
    await readerDb.assetCache.put({ ...actor, updatedAt: now() });
    return actor.id;
  }
  const { id, ...payload } = actor;
  if (id && !id.startsWith("local-actor-")) {
    await updateDoc(doc(db, "eotActors", id), { ...payload, updatedAt: serverTimestamp() });
    await readerDb.actorCache.put(actor);
    await readerDb.assetCache.put(actor);
    return id;
  }
  const snapshot = await addDoc(collection(db, "eotActors"), { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  const created = { ...actor, id: snapshot.id };
  await readerDb.actorCache.put(created);
  await readerDb.assetCache.put(created);
  return snapshot.id;
}

export async function searchActors(term = "", status = "all", availability = "all") {
  const rows = await listActors();
  const needle = term.trim().toLowerCase();
  return rows.filter((actor) => {
    const statusOk = status === "all" || actor.status === status;
    const availabilityOk = availability === "all" || actor.availabilityStatus === availability;
    const haystack = [actor.fullName, actor.stageName, actor.email, actor.phone, actor.city, actor.status, actor.availabilityStatus, ...(actor.languages ?? []), ...(actor.skills ?? []), ...(actor.characterIds ?? [])].join(" ").toLowerCase();
    return statusOk && availabilityOk && (!needle || haystack.includes(needle));
  });
}

async function listRelated<T>(collectionName: string, table: { bulkPut: (rows: T[]) => Promise<unknown>; toArray: () => Promise<T[]> }, actorId?: string) {
  if (!isFirebaseConfigured) {
    const rows = await table.toArray();
    return actorId ? rows.filter((row) => (row as { actorId?: string }).actorId === actorId) : rows;
  }
  const source = actorId ? query(collection(db, collectionName), where("actorId", "==", actorId)) : query(collection(db, collectionName));
  const snapshots = await getDocs(source);
  const rows = snapshots.docs.map((snapshot) => withId<T>(snapshot));
  await table.bulkPut(rows);
  return rows;
}

export const listActorPortfolio = (actorId?: string) => listRelated<EotActorPortfolio>("eotActorPortfolios", readerDb.actorPortfolioCache, actorId);
export const listActorAvailability = (actorId?: string) => listRelated<EotActorAvailability>("eotActorAvailability", readerDb.actorAvailabilityCache, actorId);
export const listActorAuditions = (actorId?: string) => listRelated<EotActorAudition>("eotActorAuditions", readerDb.actorAuditionCache, actorId);
export const listCastingAssignments = (actorId?: string) => listRelated<EotCastingAssignment>("eotCastingAssignments", readerDb.castingAssignmentCache, actorId);
export const listActorEpisodeAppearances = (actorId?: string) => listRelated<EotActorEpisodeAppearance>("eotActorEpisodeAppearances", readerDb.actorEpisodeAppearanceCache, actorId);
export const listActorSceneAssignments = (actorId?: string) => listRelated<EotActorSceneAssignment>("eotActorSceneAssignments", readerDb.actorSceneAssignmentCache, actorId);
export const listTalentNotes = (actorId?: string) => listRelated<EotTalentNote>("eotTalentNotes", readerDb.talentNoteCache, actorId);

export async function getActorContext(actorId: string) {
  const [actor, portfolio, availability, auditions, casting, episodes, scenes, notes] = await Promise.all([
    getActor(actorId),
    listActorPortfolio(actorId),
    listActorAvailability(actorId),
    listActorAuditions(actorId),
    listCastingAssignments(actorId),
    listActorEpisodeAppearances(actorId),
    listActorSceneAssignments(actorId),
    listTalentNotes(actorId),
  ]);
  return { actor, portfolio, availability, auditions, casting, episodes, scenes, notes };
}

export async function getCastingBoard() {
  const [actors, assignments, notes] = await Promise.all([listActors(), listCastingAssignments(), listTalentNotes()]);
  return castingStatuses.map((status) => ({
    status,
    assignments: assignments.filter((assignment) => assignment.status === status).map((assignment) => ({
      assignment,
      actor: actors.find((actor) => actor.id === assignment.actorId),
      latestNote: notes.filter((note) => note.actorId === assignment.actorId).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0],
    })),
  }));
}
