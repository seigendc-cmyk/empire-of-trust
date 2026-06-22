import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { readerDb } from "./offlineDb";
import type { EotCharacter, EotCharacterAppearance, EotCharacterTimelineEvent, EotRelationship } from "../types";

export const characterStatuses = ["active", "inactive", "deceased", "retired", "missing"] as const;
export const relationshipTypes = ["parent", "child", "sibling", "spouse", "former_spouse", "lover", "friend", "enemy", "mentor", "rival", "shareholder", "director", "employee", "business_partner"] as const;

type CharacterInput = Omit<EotCharacter, "id" | "createdAt" | "updatedAt"> & { id?: string };
type RelationshipInput = Omit<EotRelationship, "id" | "createdAt" | "updatedAt"> & { id?: string };

function withId<T>(snapshot: { id: string; data: () => unknown }) {
  return { id: snapshot.id, ...(snapshot.data() as object) } as T;
}

function listFromText(value: string) {
  return value.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean);
}

function characterName(input: { firstName?: string; middleName?: string; lastName?: string; displayName?: string; name?: string }) {
  return input.displayName?.trim() || [input.firstName, input.middleName, input.lastName].filter(Boolean).join(" ").trim() || input.name?.trim() || "Unnamed Character";
}

function codeFromName(name: string) {
  return name.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || `CHAR-${Date.now()}`;
}

function normalizeCharacter(row: Partial<EotCharacter> & { id?: string }): EotCharacter {
  const displayName = characterName(row);
  const portraitUrl = row.portraitUrl || row.imageUrl || "";
  return {
    id: row.id || "",
    characterCode: row.characterCode || codeFromName(displayName),
    firstName: row.firstName || "",
    middleName: row.middleName || "",
    lastName: row.lastName || "",
    name: row.name || displayName,
    displayName,
    nickname: row.nickname || "",
    gender: row.gender || "",
    dateOfBirth: row.dateOfBirth || "",
    age: Number(row.age || 0),
    nationality: row.nationality || "",
    tribe: row.tribe || "",
    language: row.language || "",
    occupation: row.occupation || "",
    role: row.role || "",
    status: row.status || "active",
    physicalDescription: row.physicalDescription || "",
    height: row.height || "",
    build: row.build || "",
    complexion: row.complexion || "",
    hairStyle: row.hairStyle || "",
    eyeColor: row.eyeColor || "",
    biography: row.biography || row.backstory || "",
    personality: row.personality || "",
    strengths: row.strengths || "",
    weaknesses: row.weaknesses || "",
    ambitions: row.ambitions || "",
    fears: row.fears || "",
    values: row.values || "",
    backstory: row.backstory || row.biography || "",
    currentStatus: row.currentStatus || row.currentStoryStatus || "",
    currentStoryStatus: row.currentStoryStatus || row.currentStatus || "",
    currentConflict: row.currentConflict || "",
    currentGoal: row.currentGoal || "",
    businessesOwned: row.businessesOwned || [],
    executiveRoles: row.executiveRoles || [],
    shareholdings: row.shareholdings || [],
    father: row.father || "",
    mother: row.mother || "",
    children: row.children || [],
    siblings: row.siblings || [],
    spouses: row.spouses || [],
    formerSpouses: row.formerSpouses || [],
    properties: row.properties || row.propertyIds || [],
    vehicles: row.vehicles || row.vehicleIds || [],
    imageUrl: portraitUrl,
    portraitUrl,
    galleryUrls: row.galleryUrls || [],
    relationshipIds: row.relationshipIds || [],
    businessIds: row.businessIds || row.businessesOwned || [],
    propertyIds: row.propertyIds || row.properties || [],
    vehicleIds: row.vehicleIds || row.vehicles || [],
    episodeAppearances: row.episodeAppearances || [],
    createdAt: row.createdAt || "",
    updatedAt: row.updatedAt || "",
  };
}

export function characterInputFromForm(formData: FormData): CharacterInput {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const middleName = String(formData.get("middleName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim() || [firstName, middleName, lastName].filter(Boolean).join(" ").trim();
  const portraitUrl = String(formData.get("portraitUrl") ?? "").trim();
  return normalizeCharacter({
    id: String(formData.get("id") ?? "").trim() || undefined,
    characterCode: String(formData.get("characterCode") ?? "").trim() || codeFromName(displayName),
    firstName,
    middleName,
    lastName,
    displayName,
    nickname: String(formData.get("nickname") ?? "").trim(),
    gender: String(formData.get("gender") ?? "").trim(),
    dateOfBirth: String(formData.get("dateOfBirth") ?? "").trim(),
    age: Number(formData.get("age") ?? 0) || 0,
    nationality: String(formData.get("nationality") ?? "").trim(),
    tribe: String(formData.get("tribe") ?? "").trim(),
    language: String(formData.get("language") ?? "").trim(),
    occupation: String(formData.get("occupation") ?? "").trim(),
    role: String(formData.get("role") ?? "").trim(),
    status: String(formData.get("status") ?? "active"),
    physicalDescription: String(formData.get("physicalDescription") ?? "").trim(),
    height: String(formData.get("height") ?? "").trim(),
    build: String(formData.get("build") ?? "").trim(),
    complexion: String(formData.get("complexion") ?? "").trim(),
    hairStyle: String(formData.get("hairStyle") ?? "").trim(),
    eyeColor: String(formData.get("eyeColor") ?? "").trim(),
    personality: String(formData.get("personality") ?? "").trim(),
    strengths: String(formData.get("strengths") ?? "").trim(),
    weaknesses: String(formData.get("weaknesses") ?? "").trim(),
    ambitions: String(formData.get("ambitions") ?? "").trim(),
    fears: String(formData.get("fears") ?? "").trim(),
    values: String(formData.get("values") ?? "").trim(),
    backstory: String(formData.get("backstory") ?? "").trim(),
    biography: String(formData.get("backstory") ?? "").trim(),
    currentStoryStatus: String(formData.get("currentStoryStatus") ?? "").trim(),
    currentStatus: String(formData.get("currentStoryStatus") ?? "").trim(),
    currentConflict: String(formData.get("currentConflict") ?? "").trim(),
    currentGoal: String(formData.get("currentGoal") ?? "").trim(),
    businessesOwned: listFromText(String(formData.get("businessesOwned") ?? "")),
    executiveRoles: listFromText(String(formData.get("executiveRoles") ?? "")),
    shareholdings: listFromText(String(formData.get("shareholdings") ?? "")),
    father: String(formData.get("father") ?? "").trim(),
    mother: String(formData.get("mother") ?? "").trim(),
    children: listFromText(String(formData.get("children") ?? "")),
    siblings: listFromText(String(formData.get("siblings") ?? "")),
    spouses: listFromText(String(formData.get("spouses") ?? "")),
    formerSpouses: listFromText(String(formData.get("formerSpouses") ?? "")),
    properties: listFromText(String(formData.get("properties") ?? "")),
    vehicles: listFromText(String(formData.get("vehicles") ?? "")),
    portraitUrl,
    imageUrl: portraitUrl,
    galleryUrls: listFromText(String(formData.get("galleryUrls") ?? "")),
  });
}

export async function listMasterCharacters() {
  if (!isFirebaseConfigured) return readerDb.characterCache.toArray();
  try {
    const snapshots = await getDocs(query(collection(db, "eotCharacters"), orderBy("displayName")));
    const rows = snapshots.docs.map((snapshot) => normalizeCharacter(withId<EotCharacter>(snapshot)));
    await readerDb.characterCache.bulkPut(rows);
    return rows;
  } catch {
    return readerDb.characterCache.toArray();
  }
}

export async function getMasterCharacter(characterId: string) {
  if (!isFirebaseConfigured) return readerDb.characterCache.get(characterId);
  try {
    const snapshot = await getDoc(doc(db, "eotCharacters", characterId));
    if (!snapshot.exists()) return readerDb.characterCache.get(characterId);
    const row = normalizeCharacter(withId<EotCharacter>(snapshot));
    await readerDb.characterCache.put(row);
    return row;
  } catch {
    return readerDb.characterCache.get(characterId);
  }
}

export async function upsertMasterCharacter(input: CharacterInput) {
  const row = normalizeCharacter(input);
  if (!row.displayName) throw new Error("Display name is required.");
  if (!isFirebaseConfigured) {
    const id = row.id || `char_${crypto.randomUUID()}`;
    await readerDb.characterCache.put({ ...row, id, createdAt: row.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() });
    return id;
  }
  if (row.id) {
    const { id, ...rest } = row;
    await updateDoc(doc(db, "eotCharacters", id), { ...rest, updatedAt: serverTimestamp() });
    await readerDb.characterCache.put(row);
    return id;
  }
  const snapshot = await addDoc(collection(db, "eotCharacters"), { ...row, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await readerDb.characterCache.put({ ...row, id: snapshot.id });
  return snapshot.id;
}

export async function listCharacterRelationships() {
  if (!isFirebaseConfigured) return readerDb.characterRelationshipCache.toArray();
  try {
    const snapshots = await getDocs(query(collection(db, "eotCharacterRelationships"), orderBy("relationshipType")));
    const rows = snapshots.docs.map((snapshot) => withId<EotRelationship>(snapshot));
    await readerDb.characterRelationshipCache.bulkPut(rows);
    await readerDb.relationshipCache.bulkPut(rows);
    return rows;
  } catch {
    const cached = await readerDb.characterRelationshipCache.toArray();
    return cached.length ? cached : readerDb.relationshipCache.toArray();
  }
}

export async function upsertCharacterRelationship(input: RelationshipInput) {
  const relationshipType = String(input.relationshipType || input.type || "friend");
  const row: EotRelationship = {
    ...input,
    id: input.id || "",
    relationshipId: input.relationshipId || input.id || `rel_${crypto.randomUUID()}`,
    type: relationshipType as EotRelationship["type"],
    relationshipType,
    fromCharacterId: input.fromCharacterId || input.characterA,
    toCharacterId: input.toCharacterId || input.characterB,
    characterA: input.characterA || input.fromCharacterId || "",
    characterB: input.characterB || input.toCharacterId || "",
    relationshipStrength: Number(input.relationshipStrength || 50),
    trustLevel: Number(input.trustLevel || 50),
    conflictLevel: Number(input.conflictLevel || 0),
    notes: input.notes || input.description || "",
    createdAt: "",
    updatedAt: "",
  };
  if (!isFirebaseConfigured) {
    const id = row.id || row.relationshipId || `rel_${crypto.randomUUID()}`;
    await readerDb.characterRelationshipCache.put({ ...row, id });
    return id;
  }
  if (row.id) {
    const { id, ...rest } = row;
    await updateDoc(doc(db, "eotCharacterRelationships", id), { ...rest, updatedAt: serverTimestamp() });
    await readerDb.characterRelationshipCache.put(row);
    return id;
  }
  const snapshot = await addDoc(collection(db, "eotCharacterRelationships"), { ...row, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await readerDb.characterRelationshipCache.put({ ...row, id: snapshot.id });
  return snapshot.id;
}

export async function listCharacterAppearances() {
  if (!isFirebaseConfigured) return readerDb.characterAppearanceCache.toArray();
  try {
    const snapshots = await getDocs(query(collection(db, "eotCharacterAppearances"), orderBy("seasonNumber"), orderBy("episodeNumber")));
    const rows = snapshots.docs.map((snapshot) => withId<EotCharacterAppearance>(snapshot));
    await readerDb.characterAppearanceCache.bulkPut(rows);
    return rows;
  } catch {
    return readerDb.characterAppearanceCache.toArray();
  }
}

export async function listCharacterTimeline() {
  if (!isFirebaseConfigured) return readerDb.characterTimelineCache.toArray();
  try {
    const snapshots = await getDocs(query(collection(db, "eotCharacterTimeline"), orderBy("eventDate")));
    const rows = snapshots.docs.map((snapshot) => withId<EotCharacterTimelineEvent>(snapshot));
    await readerDb.characterTimelineCache.bulkPut(rows);
    return rows;
  } catch {
    return readerDb.characterTimelineCache.toArray();
  }
}

export async function getCharacterContext(characterId: string) {
  const [character, relationships, appearances, timeline] = await Promise.all([
    getMasterCharacter(characterId),
    listCharacterRelationships(),
    listCharacterAppearances(),
    listCharacterTimeline(),
  ]);
  return {
    character,
    relationships: relationships.filter((rel) => [rel.characterA, rel.characterB, rel.fromCharacterId, rel.toCharacterId, ...(rel.characterIds ?? [])].includes(characterId)),
    appearances: appearances.filter((appearance) => appearance.characterId === characterId),
    timeline: timeline.filter((event) => event.characterId === characterId).sort((a, b) => String(a.eventDate).localeCompare(String(b.eventDate))),
  };
}

export async function searchCharacters(term: string, status = "all") {
  const normalized = term.trim().toLowerCase();
  const rows = await listMasterCharacters();
  return rows.filter((character) => {
    const haystack = [
      character.displayName,
      character.name,
      character.nickname,
      character.occupation,
      character.role,
      character.status,
      ...(character.businessesOwned ?? []),
      ...(character.executiveRoles ?? []),
      ...(character.shareholdings ?? []),
    ].join(" ").toLowerCase();
    return (!normalized || haystack.includes(normalized)) && (status === "all" || character.status === status);
  });
}

export async function getCharacterIntelligence() {
  const [characters, relationships, appearances] = await Promise.all([listMasterCharacters(), listCharacterRelationships(), listCharacterAppearances()]);
  const countConnections = (id: string) => relationships.filter((rel) => [rel.characterA, rel.characterB, rel.fromCharacterId, rel.toCharacterId, ...(rel.characterIds ?? [])].includes(id)).length;
  const countAppearances = (id: string) => appearances.filter((appearance) => appearance.characterId === id).length;
  const impact = (id: string) => appearances.filter((appearance) => appearance.characterId === id).reduce((sum, appearance) => sum + Number(appearance.storyImpactScore || 0), 0);
  const by = (score: (character: EotCharacter) => number) => characters.slice().sort((a, b) => score(b) - score(a)).slice(0, 8);
  return {
    mostActive: by((character) => countAppearances(character.id)),
    mostConnected: by((character) => countConnections(character.id)),
    mostInfluential: by((character) => impact(character.id)),
    mostMentioned: by((character) => (character.episodeAppearances?.length ?? 0) + countAppearances(character.id)),
    stats: { characters: characters.length, relationships: relationships.length, appearances: appearances.length },
  };
}

export async function getRelationshipGraph() {
  const [characters, relationships] = await Promise.all([listMasterCharacters(), listCharacterRelationships()]);
  return {
    characters,
    relationships,
    lookup: new Map(characters.map((character) => [character.id, character.displayName || character.name])),
  };
}
