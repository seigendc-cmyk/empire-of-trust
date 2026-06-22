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
import { stringValue } from "./forms";
import { readerDb } from "./offlineDb";
import type { EotAsset, EotAssetFolder, EotAssetPrompt, EotAssetUsage, EotAssetVersion } from "../types";

const withId = <T>(snapshot: QueryDocumentSnapshot<DocumentData> | { id: string; data: () => DocumentData }) =>
  ({ id: snapshot.id, ...snapshot.data() }) as T;

export const assetTypes = [
  "character_image",
  "actor_image",
  "business_logo",
  "business_banner",
  "property_image",
  "vehicle_image",
  "scene_image",
  "episode_poster",
  "season_poster",
  "marketing_image",
  "production_reference",
  "concept_art",
  "other",
] as const;

export const assetCategories = ["character", "actor", "business", "property", "vehicle", "scene", "episode", "season", "marketing", "production"] as const;
export const assetStatuses = ["draft", "approved", "published", "archived"] as const;
export const promptTypes = ["image", "video", "animation", "character", "scene", "poster", "marketing", "trailer", "business", "property", "vehicle"] as const;
export const promptStyles = ["photorealistic", "cinematic", "executive", "corporate", "dramatic", "tv_series", "real_estate", "business", "african", "custom"] as const;
export const aspectRatios = ["1:1", "16:9", "9:16", "4:5", "3:2"] as const;

export const storageRootByCategory: Record<string, string> = {
  character: "assets/characters",
  actor: "assets/actors",
  business: "assets/businesses",
  property: "assets/properties",
  vehicle: "assets/vehicles",
  scene: "assets/scenes",
  episode: "assets/posters",
  season: "assets/posters",
  marketing: "assets/marketing",
  production: "assets/production",
  reference: "assets/reference",
};

function now() {
  return new Date().toISOString();
}

function listFromText(value: string) {
  return value.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean);
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function normalizeAsset(input: Partial<EotAsset> & { id: string }): EotAsset {
  const title = input.title || input.name || "Untitled asset";
  const assetType = input.assetType || input.type || "other";
  const category = input.category || categoryFromType(assetType);
  const downloadUrl = input.downloadUrl || input.imageUrl || "";
  return {
    id: input.id,
    assetCode: input.assetCode || "",
    title,
    name: title,
    description: input.description || "",
    assetType,
    type: assetType,
    category,
    storagePath: input.storagePath || "",
    downloadUrl,
    imageUrl: downloadUrl,
    mimeType: input.mimeType || "",
    fileSize: input.fileSize || 0,
    width: input.width || 0,
    height: input.height || 0,
    relatedCharacterIds: input.relatedCharacterIds || input.ownerCharacterIds || [],
    relatedActorIds: input.relatedActorIds || [],
    relatedBusinessIds: input.relatedBusinessIds || input.businessIds || [],
    relatedPropertyIds: input.relatedPropertyIds || [],
    relatedVehicleIds: input.relatedVehicleIds || [],
    relatedSceneIds: input.relatedSceneIds || [],
    relatedEpisodeIds: input.relatedEpisodeIds || [],
    ownerCharacterIds: input.ownerCharacterIds || input.relatedCharacterIds || [],
    businessIds: input.businessIds || input.relatedBusinessIds || [],
    tags: input.tags || [],
    status: input.status || "draft",
    createdBy: input.createdBy || "",
    createdAt: input.createdAt || now(),
    updatedAt: input.updatedAt || now(),
  };
}

function categoryFromType(assetType: string) {
  if (assetType.startsWith("character")) return "character";
  if (assetType.startsWith("actor")) return "actor";
  if (assetType.startsWith("business")) return "business";
  if (assetType.startsWith("property")) return "property";
  if (assetType.startsWith("vehicle")) return "vehicle";
  if (assetType.startsWith("scene")) return "scene";
  if (assetType.includes("poster")) return assetType.startsWith("season") ? "season" : "episode";
  if (assetType.includes("marketing")) return "marketing";
  return "production";
}

export function assetInputFromForm(formData: FormData, id?: string): EotAsset {
  const assetType = stringValue(formData, "assetType", "other");
  const category = stringValue(formData, "category", categoryFromType(assetType));
  return normalizeAsset({
    id: id || `local-asset-${Date.now()}`,
    assetCode: stringValue(formData, "assetCode").trim(),
    title: stringValue(formData, "title").trim(),
    description: stringValue(formData, "description").trim(),
    assetType,
    category,
    storagePath: stringValue(formData, "storagePath").trim(),
    downloadUrl: stringValue(formData, "downloadUrl").trim(),
    mimeType: stringValue(formData, "mimeType").trim(),
    tags: listFromText(stringValue(formData, "tags")),
    status: stringValue(formData, "status", "draft"),
    relatedCharacterIds: listFromText(stringValue(formData, "relatedCharacterIds")),
    relatedActorIds: listFromText(stringValue(formData, "relatedActorIds")),
    relatedBusinessIds: listFromText(stringValue(formData, "relatedBusinessIds")),
    relatedPropertyIds: listFromText(stringValue(formData, "relatedPropertyIds")),
    relatedVehicleIds: listFromText(stringValue(formData, "relatedVehicleIds")),
    relatedSceneIds: listFromText(stringValue(formData, "relatedSceneIds")),
    relatedEpisodeIds: listFromText(stringValue(formData, "relatedEpisodeIds")),
  });
}

export function promptInputFromForm(formData: FormData, id?: string, assetId?: string): EotAssetPrompt {
  return {
    id: id || `local-prompt-${Date.now()}`,
    assetId: stringValue(formData, "assetId", assetId || "").trim() || undefined,
    promptType: stringValue(formData, "promptType", "image"),
    title: stringValue(formData, "title").trim() || "Untitled prompt",
    promptText: stringValue(formData, "promptText").trim(),
    negativePrompt: stringValue(formData, "negativePrompt").trim(),
    style: stringValue(formData, "style", "cinematic"),
    aspectRatio: stringValue(formData, "aspectRatio", "16:9"),
    notes: stringValue(formData, "notes").trim(),
    status: stringValue(formData, "status", "draft"),
    createdAt: now(),
    updatedAt: now(),
  };
}

async function listCollection<T>(collectionName: string, table: { bulkPut: (rows: T[]) => Promise<unknown>; toArray: () => Promise<T[]> }, orderField = "createdAt") {
  if (!isFirebaseConfigured) return table.toArray();
  const snapshots = await getDocs(query(collection(db, collectionName), orderBy(orderField)));
  const rows = snapshots.docs.map((snapshot) => withId<T>(snapshot));
  await table.bulkPut(rows);
  return rows;
}

export async function listAssets(category = "all") {
  if (!isFirebaseConfigured) {
    const rows = (await readerDb.assetCache.filter((item) => "assetType" in item || "downloadUrl" in item).toArray()) as EotAsset[];
    return category === "all" ? rows.map(normalizeAsset) : rows.map(normalizeAsset).filter((asset) => asset.category === category);
  }
  const source = category === "all" ? query(collection(db, "eotAssets"), orderBy("updatedAt")) : query(collection(db, "eotAssets"), where("category", "==", category));
  const snapshots = await getDocs(source);
  const rows = snapshots.docs.map((snapshot) => normalizeAsset(withId<EotAsset>(snapshot)));
  await readerDb.assetCache.bulkPut(rows);
  return rows;
}

export async function getAsset(assetId: string) {
  const cached = await readerDb.assetCache.get(assetId);
  if (!isFirebaseConfigured) return cached && ("assetType" in cached || "downloadUrl" in cached) ? normalizeAsset(cached as EotAsset) : null;
  const snapshot = await getDoc(doc(db, "eotAssets", assetId));
  if (!snapshot.exists()) return cached && ("assetType" in cached || "downloadUrl" in cached) ? normalizeAsset(cached as EotAsset) : null;
  const asset = normalizeAsset(withId<EotAsset>(snapshot));
  await readerDb.assetCache.put(asset);
  return asset;
}

export async function upsertAsset(input: EotAsset) {
  const asset = normalizeAsset(input);
  if (!isFirebaseConfigured) {
    await readerDb.assetCache.put({ ...asset, updatedAt: now() });
    return asset.id;
  }
  const { id, ...payload } = asset;
  if (id && !id.startsWith("local-asset-")) {
    await updateDoc(doc(db, "eotAssets", id), { ...payload, updatedAt: serverTimestamp() });
    await readerDb.assetCache.put(asset);
    return id;
  }
  const snapshot = await addDoc(collection(db, "eotAssets"), { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  const created = { ...asset, id: snapshot.id };
  await readerDb.assetCache.put(created);
  return snapshot.id;
}

export async function uploadAssetFile(file: File, asset: EotAsset) {
  if (!isFirebaseConfigured) throw new Error("Firebase is not configured. Add Firebase env values before uploading media.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const base = storageRootByCategory[asset.category || "reference"] || "assets/reference";
  const path = `${base}/${asset.id}-${Date.now()}-${safeName}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file, { contentType: file.type });
  const downloadUrl = await getDownloadURL(fileRef);
  const updated = normalizeAsset({ ...asset, storagePath: path, downloadUrl, imageUrl: downloadUrl, mimeType: file.type, fileSize: file.size });
  const id = await upsertAsset(updated);
  await saveAssetVersion({ assetId: id, downloadUrl, notes: `Uploaded ${file.name}` });
  return { ...updated, id };
}

export async function saveAssetWithOptionalFile(asset: EotAsset, file?: File | null) {
  const id = await upsertAsset(asset);
  const saved = { ...asset, id };
  if (file && file.size > 0) return uploadAssetFile(file, saved);
  return saved;
}

export async function searchAssets(term = "", category = "all", type = "all") {
  const rows = await listAssets(category);
  const needle = term.trim().toLowerCase();
  return rows.filter((asset) => {
    const typeOk = type === "all" || asset.assetType === type;
    const haystack = [
      asset.title,
      asset.assetCode,
      asset.description,
      asset.assetType,
      asset.category,
      ...(asset.tags ?? []),
      ...(asset.relatedCharacterIds ?? []),
      ...(asset.relatedActorIds ?? []),
      ...(asset.relatedBusinessIds ?? []),
      ...(asset.relatedPropertyIds ?? []),
      ...(asset.relatedVehicleIds ?? []),
      ...(asset.relatedSceneIds ?? []),
      ...(asset.relatedEpisodeIds ?? []),
    ].join(" ").toLowerCase();
    return typeOk && (!needle || haystack.includes(needle));
  });
}

export const listAssetFolders = () => listCollection<EotAssetFolder>("eotAssetFolders", readerDb.assetFolderCache, "name");
export const listAssetVersions = (assetId?: string) => listRelated<EotAssetVersion>("eotAssetVersions", readerDb.assetVersionCache, "assetId", assetId);
export const listAssetUsage = (assetId?: string) => listRelated<EotAssetUsage>("eotAssetUsage", readerDb.assetUsageCache, "assetId", assetId);

export async function listAssetPrompts(assetId?: string) {
  const rows = await listCollection<EotAssetPrompt>("eotAssetPrompts", readerDb.assetPromptCache, "updatedAt");
  return assetId ? rows.filter((prompt) => prompt.assetId === assetId) : rows;
}

async function listRelated<T>(collectionName: string, table: { bulkPut: (rows: T[]) => Promise<unknown>; toArray: () => Promise<T[]> }, field: string, value?: string) {
  if (!isFirebaseConfigured) {
    const rows = await table.toArray();
    return value ? rows.filter((row) => (row as Record<string, unknown>)[field] === value) : rows;
  }
  const source = value ? query(collection(db, collectionName), where(field, "==", value)) : query(collection(db, collectionName));
  const snapshots = await getDocs(source);
  const rows = snapshots.docs.map((snapshot) => withId<T>(snapshot));
  await table.bulkPut(rows);
  return rows;
}

export async function upsertAssetPrompt(input: EotAssetPrompt) {
  const prompt = { ...input, title: input.title || "Untitled prompt", updatedAt: now(), createdAt: input.createdAt || now() };
  if (!isFirebaseConfigured) {
    await readerDb.assetPromptCache.put(prompt);
    return prompt.id;
  }
  const { id, ...payload } = prompt;
  if (id && !id.startsWith("local-prompt-")) {
    await updateDoc(doc(db, "eotAssetPrompts", id), { ...payload, updatedAt: serverTimestamp() });
    await readerDb.assetPromptCache.put(prompt);
    return id;
  }
  const snapshot = await addDoc(collection(db, "eotAssetPrompts"), { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await readerDb.assetPromptCache.put({ ...prompt, id: snapshot.id });
  return snapshot.id;
}

export async function duplicateAssetPrompt(prompt: EotAssetPrompt) {
  return upsertAssetPrompt({ ...prompt, id: `local-prompt-${Date.now()}`, title: `${prompt.title} copy`, createdAt: now(), updatedAt: now() });
}

export async function archiveAssetPrompt(prompt: EotAssetPrompt) {
  return upsertAssetPrompt({ ...prompt, status: "archived", updatedAt: now() });
}

export async function saveAssetVersion(input: Omit<EotAssetVersion, "id" | "versionNumber" | "createdAt">) {
  const existing = await listAssetVersions(input.assetId);
  const version: EotAssetVersion = {
    ...input,
    id: `version-${input.assetId}-${Date.now()}`,
    versionNumber: existing.length + 1,
    createdAt: now(),
  };
  if (!isFirebaseConfigured) {
    await readerDb.assetVersionCache.put(version);
    return version;
  }
  await addDoc(collection(db, "eotAssetVersions"), { ...version, createdAt: serverTimestamp() });
  await readerDb.assetVersionCache.put(version);
  return version;
}

export async function getAssetContext(assetId: string) {
  const [asset, prompts, versions, usage] = await Promise.all([
    getAsset(assetId),
    listAssetPrompts(assetId),
    listAssetVersions(assetId),
    listAssetUsage(assetId),
  ]);
  return { asset, prompts, versions, usage };
}

export async function getRelatedAssets(entityType: string, entityId: string) {
  const rows = await listAssets("all");
  const keyMap: Record<string, keyof EotAsset> = {
    character: "relatedCharacterIds",
    actor: "relatedActorIds",
    business: "relatedBusinessIds",
    property: "relatedPropertyIds",
    vehicle: "relatedVehicleIds",
    scene: "relatedSceneIds",
    episode: "relatedEpisodeIds",
  };
  const key = keyMap[entityType];
  if (!key) return [];
  return rows.filter((asset) => ((asset[key] as string[] | undefined) ?? []).includes(entityId));
}

export function buildPromptTemplate(promptType: string) {
  const parts: Record<string, string[]> = {
    character: ["Name", "Age", "Height", "Build", "Clothing", "Mood", "Location", "Camera Direction", "Lighting", "Art Style"],
    scene: ["Location", "Characters", "Action", "Emotion", "Camera Direction", "Time Of Day", "Visual Style"],
    poster: ["Title", "Central Image", "Character Focus", "Mood", "Typography Direction", "Lighting", "Aspect Ratio"],
    marketing: ["Product or Offer", "Audience", "Core Message", "Visual Hook", "Brand Mood", "Call To Action"],
    trailer: ["Episode", "Opening Image", "Key Scenes", "Voiceover Tone", "Music Mood", "Final Frame"],
    business: ["Business Name", "Sector", "Logo Mood", "Materials", "Setting", "Camera Direction"],
    property: ["Property Name", "Architecture", "Location", "Time Of Day", "Atmosphere", "Camera Direction"],
    vehicle: ["Vehicle", "Color", "Condition", "Location", "Motion", "Camera Direction"],
  };
  return (parts[promptType] ?? parts.character).map((label) => `${label}:`).join("\n");
}

export function collectAssetTags(assets: EotAsset[]) {
  return unique(assets.flatMap((asset) => asset.tags ?? [])).sort();
}
