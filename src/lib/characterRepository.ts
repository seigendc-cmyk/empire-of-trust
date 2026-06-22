import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { readerDb } from "./offlineDb";
import type { EotCharacter, EotCharacterAppearance, EotCharacterTimelineEvent, EotRelationship } from "../types";

export const characterStatuses = ["active", "inactive", "deceased", "retired", "missing"] as const;
export const relationshipTypes = ["parent", "child", "sibling", "spouse", "former_spouse", "lover", "friend", "enemy", "mentor", "rival", "shareholder", "director", "employee", "business_partner"] as const;

type CharacterInput = Omit<EotCharacter, "id" | "createdAt" | "updatedAt"> & { id?: string };
type RelationshipInput = Omit<EotRelationship, "id" | "createdAt" | "updatedAt"> & { id?: string };

const publicCharacterSeeds: EotCharacter[] = [
  {
    id: "trust-ncube",
    characterCode: "TRUST-NCUBE",
    firstName: "Trust",
    lastName: "Ncube",
    name: "Trust Ncube",
    displayName: "TRUST NCUBE",
    nickname: "",
    gender: "male",
    age: 55,
    archetype: "The Builder",
    position: "Founder of Digital Commerce / Founder of SCI / Chairman of John Ekeniah Trust",
    role: "Chairman of John Ekeniah Trust",
    occupation: "Founder of Digital Commerce and SCI",
    biography: "A visionary entrepreneur who built one of Africa's most ambitious commerce ecosystems from almost nothing. Respected by many and trusted by thousands, Trust now faces the greatest challenge of his life: securing the future of the empire he spent decades building.",
    shortBiography: "A visionary entrepreneur who built one of Africa's most ambitious commerce ecosystems from almost nothing.",
    coreTraits: ["Strategic", "Patient", "Analytical", "Resilient"],
    strengths: "Strategic, patient, analytical, resilient",
    personality: "Calm, calculating, trusted, and difficult to read.",
    signatureQuote: "A business is not built by money. It is built by people who trust each other.",
    memorableQuotes: ["A business is not built by money. It is built by people who trust each other."],
    currentStatus: "Protecting succession while testing who can carry the empire forward.",
    currentStoryStatus: "Protecting succession while testing who can carry the empire forward.",
    currentConflict: "The empire he built now depends on the trustworthiness of those closest to him.",
    currentGoal: "Secure the future of the John Ekeniah Empire without destroying the family.",
    imageUrl: "",
    portraitUrl: "",
    relationshipIds: [],
    businessIds: ["digital-commerce", "sci", "john-ekeniah-trust"],
    propertyIds: [],
    vehicleIds: [],
    episodeAppearances: [],
    isPublic: true,
    enabled: true,
    displayOrder: 1,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "selion-ncube",
    characterCode: "SELION-NCUBE",
    firstName: "Selion",
    lastName: "Ncube",
    name: "Selion Ncube",
    displayName: "SELION NCUBE",
    nickname: "",
    gender: "female",
    age: 31,
    archetype: "The Strategist",
    position: "Primary Successor Candidate",
    role: "Primary Successor Candidate",
    occupation: "Strategist",
    biography: "Quiet, intelligent and highly disciplined, Selion possesses an unusual ability to see opportunities and dangers long before others. Many believe she may be the future leader of the empire.",
    shortBiography: "Quiet, intelligent and highly disciplined, Selion sees opportunities and dangers long before others.",
    coreTraits: ["Analytical", "Reserved", "Strategic", "Emotionally Controlled"],
    strengths: "Analytical, reserved, strategic, emotionally controlled",
    personality: "Disciplined, observant, measured, and hard to unsettle.",
    signatureQuote: "Every move matters. Even the ones nobody sees.",
    memorableQuotes: ["Every move matters. Even the ones nobody sees."],
    currentStatus: "Watched closely as a possible future leader.",
    currentStoryStatus: "Watched closely as a possible future leader.",
    currentConflict: "Her restraint makes people underestimate how much she sees.",
    currentGoal: "Prove she can protect the empire without becoming consumed by it.",
    imageUrl: "",
    portraitUrl: "",
    relationshipIds: [],
    businessIds: [],
    propertyIds: [],
    vehicleIds: [],
    episodeAppearances: [],
    isPublic: true,
    enabled: true,
    displayOrder: 2,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "gerald-ncube",
    characterCode: "GERALD-NCUBE",
    firstName: "Gerald",
    lastName: "Ncube",
    name: "Gerald Ncube",
    displayName: "GERALD NCUBE",
    nickname: "",
    gender: "male",
    age: 26,
    archetype: "The Operator",
    position: "Head of John Ekeniah Real Estate",
    role: "Head of John Ekeniah Real Estate",
    occupation: "Real estate operator",
    biography: "Gerald turns vision into reality. Known for discipline and execution, he quietly delivers results while avoiding unnecessary attention.",
    shortBiography: "Gerald turns vision into reality and quietly delivers results while avoiding unnecessary attention.",
    coreTraits: ["Loyal", "Disciplined", "Methodical", "Practical"],
    strengths: "Loyal, disciplined, methodical, practical",
    personality: "Grounded, focused, and more comfortable executing than performing.",
    signatureQuote: "Dreams are useless without execution.",
    memorableQuotes: ["Dreams are useless without execution."],
    currentStatus: "Building the real estate arm while family pressure rises.",
    currentStoryStatus: "Building the real estate arm while family pressure rises.",
    currentConflict: "Execution gives him influence, even when others overlook him.",
    currentGoal: "Turn the empire's property vision into visible results.",
    imageUrl: "",
    portraitUrl: "",
    relationshipIds: [],
    businessIds: ["john-ekeniah-real-estate"],
    propertyIds: [],
    vehicleIds: [],
    episodeAppearances: [],
    isPublic: true,
    enabled: true,
    displayOrder: 3,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "tandi-ncube",
    characterCode: "TANDI-NCUBE",
    firstName: "Tandi",
    lastName: "Ncube",
    name: "Tandi Ncube",
    displayName: "TANDI NCUBE",
    nickname: "",
    gender: "female",
    age: 24,
    archetype: "The Heart",
    position: "Family Anchor",
    role: "Family Anchor",
    occupation: "Family member",
    biography: "Warm, caring and deeply loyal to family, Tandi often finds herself caught between emotional bonds and difficult realities.",
    shortBiography: "Warm, caring and deeply loyal, Tandi is caught between emotional bonds and difficult realities.",
    coreTraits: ["Loving", "Social", "Loyal", "Emotional"],
    strengths: "Loving, social, loyal, emotional",
    personality: "Warm, expressive, loyal, and vulnerable to family wounds.",
    signatureQuote: "Family should never become a battlefield.",
    memorableQuotes: ["Family should never become a battlefield."],
    currentStatus: "Trying to keep family bonds alive as business pressure grows.",
    currentStoryStatus: "Trying to keep family bonds alive as business pressure grows.",
    currentConflict: "Love and loyalty pull her in different directions.",
    currentGoal: "Protect the family from becoming casualties of the empire.",
    imageUrl: "",
    portraitUrl: "",
    relationshipIds: [],
    businessIds: [],
    propertyIds: [],
    vehicleIds: [],
    episodeAppearances: [],
    isPublic: true,
    enabled: true,
    displayOrder: 4,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "mamada",
    characterCode: "MAMADA",
    firstName: "Mamada",
    lastName: "",
    name: "Mamada",
    displayName: "MAMADA",
    nickname: "",
    gender: "female",
    age: 32,
    archetype: "The Loyalist",
    position: "Executive Assistant to Trust",
    role: "Executive Assistant to Trust",
    occupation: "Executive assistant",
    biography: "Trusted by the empire's founder more than almost anyone else, Mamada stands at the intersection of loyalty, friendship, and dangerous secrets.",
    shortBiography: "Trusted by the founder, Mamada stands at the intersection of loyalty, friendship, and dangerous secrets.",
    coreTraits: ["Caring", "Loyal", "Professional", "Emotional"],
    strengths: "Caring, loyal, professional, emotional",
    personality: "Protective, discreet, emotionally intelligent, and burdened by trust.",
    signatureQuote: "Sometimes loyalty costs more than betrayal.",
    memorableQuotes: ["Sometimes loyalty costs more than betrayal."],
    currentStatus: "Close enough to know what others should not.",
    currentStoryStatus: "Close enough to know what others should not.",
    currentConflict: "Her loyalty may demand sacrifices nobody sees coming.",
    currentGoal: "Serve Trust faithfully while surviving the secrets around him.",
    imageUrl: "",
    portraitUrl: "",
    relationshipIds: [],
    businessIds: [],
    propertyIds: [],
    vehicleIds: [],
    episodeAppearances: [],
    isPublic: true,
    enabled: true,
    displayOrder: 5,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "marjo-ncube",
    characterCode: "MARJO-NCUBE",
    firstName: "Marjo",
    lastName: "Ncube",
    name: "Marjo Ncube",
    displayName: "MARJO NCUBE",
    nickname: "",
    gender: "female",
    age: 52,
    archetype: "The Sacrifice",
    position: "Family Matriarch",
    role: "Family Matriarch",
    occupation: "Family matriarch",
    biography: "Marjo witnessed the struggles, failures and sacrifices required to build an empire. She carries scars that success can never erase.",
    shortBiography: "Marjo witnessed the sacrifices required to build an empire and carries scars success can never erase.",
    coreTraits: ["Disciplined", "Protective", "Religious", "Emotionally Controlled"],
    strengths: "Disciplined, protective, religious, emotionally controlled",
    personality: "Principled, protective, controlled, and marked by sacrifice.",
    signatureQuote: "Every empire has a price. Families usually pay it.",
    memorableQuotes: ["Every empire has a price. Families usually pay it."],
    currentStatus: "Holding history, faith, and family pain in silence.",
    currentStoryStatus: "Holding history, faith, and family pain in silence.",
    currentConflict: "She knows what the empire cost before others saw the success.",
    currentGoal: "Keep the family morally anchored as ambition grows.",
    imageUrl: "",
    portraitUrl: "",
    relationshipIds: [],
    businessIds: [],
    propertyIds: [],
    vehicleIds: [],
    episodeAppearances: [],
    isPublic: true,
    enabled: true,
    displayOrder: 6,
    createdAt: "",
    updatedAt: "",
  },
];

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
    archetype: row.archetype || "",
    position: row.position || row.role || "",
    shortBiography: row.shortBiography || row.biography || row.backstory || "",
    coreTraits: row.coreTraits || listFromText(row.strengths || ""),
    signatureQuote: row.signatureQuote || row.memorableQuotes?.[0] || "",
    memorableQuotes: row.memorableQuotes || (row.signatureQuote ? [row.signatureQuote] : []),
    isPublic: row.isPublic ?? true,
    enabled: row.enabled ?? row.status !== "inactive",
    displayOrder: Number(row.displayOrder || 999),
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
    archetype: String(formData.get("archetype") ?? "").trim(),
    position: String(formData.get("position") ?? "").trim(),
    shortBiography: String(formData.get("shortBiography") ?? "").trim(),
    coreTraits: listFromText(String(formData.get("coreTraits") ?? "")),
    strengths: String(formData.get("coreTraits") ?? "").trim() || String(formData.get("strengths") ?? "").trim(),
    signatureQuote: String(formData.get("signatureQuote") ?? "").trim(),
    memorableQuotes: listFromText(String(formData.get("memorableQuotes") ?? "")),
    isPublic: formData.get("isPublic") === "on",
    enabled: formData.get("enabled") === "on",
    displayOrder: Number(formData.get("displayOrder") ?? 999) || 999,
    role: String(formData.get("role") ?? "").trim(),
    status: String(formData.get("status") ?? "active"),
    physicalDescription: String(formData.get("physicalDescription") ?? "").trim(),
    height: String(formData.get("height") ?? "").trim(),
    build: String(formData.get("build") ?? "").trim(),
    complexion: String(formData.get("complexion") ?? "").trim(),
    hairStyle: String(formData.get("hairStyle") ?? "").trim(),
    eyeColor: String(formData.get("eyeColor") ?? "").trim(),
    personality: String(formData.get("personality") ?? "").trim(),
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

export async function listPublicCharacters() {
  const rows = await listMasterCharacters();
  const publicRows = rows
    .filter((character) => character.enabled !== false && character.status !== "inactive" && character.isPublic !== false)
    .sort((a, b) => Number(a.displayOrder || 999) - Number(b.displayOrder || 999) || (a.displayName || a.name).localeCompare(b.displayName || b.name));
  return publicRows.length ? publicRows : publicCharacterSeeds;
}

export async function getMasterCharacter(characterId: string) {
  const seed = publicCharacterSeeds.find((character) => character.id === characterId);
  if (!isFirebaseConfigured) return (await readerDb.characterCache.get(characterId)) ?? seed;
  try {
    const snapshot = await getDoc(doc(db, "eotCharacters", characterId));
    if (!snapshot.exists()) return (await readerDb.characterCache.get(characterId)) ?? seed;
    const row = normalizeCharacter(withId<EotCharacter>(snapshot));
    await readerDb.characterCache.put(row);
    return row;
  } catch {
    return (await readerDb.characterCache.get(characterId)) ?? seed;
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
