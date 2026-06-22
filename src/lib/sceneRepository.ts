import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc, where, type DocumentData, type QueryDocumentSnapshot } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { numberValue, stringValue } from "./forms";
import { listActors, listCastingAssignments } from "./actorRepository";
import { readerDb } from "./offlineDb";
import type { Chapter, Episode, EotScene, EotSceneAsset, EotSceneBreakdown, EotSceneCast, EotSceneContinuity, EotSceneProp, EotSceneSchedule, EotSceneShot, EotSceneWardrobe, Paragraph } from "../types";

const withId = <T>(snapshot: QueryDocumentSnapshot<DocumentData> | { id: string; data: () => DocumentData }) => ({ id: snapshot.id, ...snapshot.data() }) as T;

export const sceneTypes = ["dialogue", "boardroom", "family", "romance", "conflict", "action", "business", "transition", "montage", "exterior", "interior", "other"] as const;
export const productionStatuses = ["draft", "planned", "scheduled", "filming", "filmed", "review", "approved"] as const;
export const continuityStatuses = ["unchecked", "warning", "cleared"] as const;

function now() {
  return new Date().toISOString();
}

function listFromText(value: string) {
  return value.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean);
}

export function normalizeScene(input: Partial<EotScene> & { id: string }): EotScene {
  const productionStatus = input.productionStatus || (input.status === "ready" ? "planned" : input.status) || "draft";
  return {
    id: input.id,
    sceneCode: input.sceneCode || "",
    episodeId: input.episodeId || "",
    chapterId: input.chapterId || "",
    paragraphIds: input.paragraphIds || [],
    seasonNumber: input.seasonNumber || 1,
    episodeNumber: input.episodeNumber || 1,
    sceneNumber: input.sceneNumber || 1,
    title: input.title || "Untitled scene",
    description: input.description || "",
    sceneType: input.sceneType || "dialogue",
    storyDate: input.storyDate || "",
    storyTimeOfDay: input.storyTimeOfDay || "",
    locationType: input.locationType || "unspecified",
    locationId: input.locationId || "",
    propertyId: input.propertyId || "",
    businessId: input.businessId || "",
    emotionalTone: input.emotionalTone || "",
    dramaticPurpose: input.dramaticPurpose || "",
    cameraDirection: input.cameraDirection || "",
    visualStyle: input.visualStyle || "",
    dialogueSummary: input.dialogueSummary || "",
    imagePrompt: input.imagePrompt || "",
    videoPrompt: input.videoPrompt || "",
    continuityNotes: input.continuityNotes || "",
    productionStatus,
    continuityStatus: input.continuityStatus || "unchecked",
    estimatedDurationMinutes: input.estimatedDurationMinutes || 0,
    estimatedDuration: input.estimatedDuration || String(input.estimatedDurationMinutes || ""),
    status: input.status || (productionStatus === "filmed" || productionStatus === "approved" ? productionStatus : productionStatus === "planned" ? "planned" : "draft"),
    createdAt: input.createdAt || now(),
    updatedAt: input.updatedAt || now(),
  };
}

export function sceneInputFromForm(formData: FormData, id?: string): EotScene {
  return normalizeScene({
    id: id || `local-scene-${Date.now()}`,
    sceneCode: stringValue(formData, "sceneCode"),
    episodeId: stringValue(formData, "episodeId"),
    chapterId: stringValue(formData, "chapterId"),
    paragraphIds: listFromText(stringValue(formData, "paragraphIds")),
    seasonNumber: numberValue(formData, "seasonNumber"),
    episodeNumber: numberValue(formData, "episodeNumber"),
    sceneNumber: numberValue(formData, "sceneNumber"),
    title: stringValue(formData, "title"),
    description: stringValue(formData, "description"),
    sceneType: stringValue(formData, "sceneType", "dialogue") as EotScene["sceneType"],
    storyDate: stringValue(formData, "storyDate"),
    storyTimeOfDay: stringValue(formData, "storyTimeOfDay"),
    locationType: stringValue(formData, "locationType", "unspecified") as EotScene["locationType"],
    locationId: stringValue(formData, "locationId"),
    propertyId: stringValue(formData, "propertyId"),
    businessId: stringValue(formData, "businessId"),
    emotionalTone: stringValue(formData, "emotionalTone"),
    dramaticPurpose: stringValue(formData, "dramaticPurpose"),
    cameraDirection: stringValue(formData, "cameraDirection"),
    visualStyle: stringValue(formData, "visualStyle"),
    productionStatus: stringValue(formData, "productionStatus", "draft") as EotScene["productionStatus"],
    continuityStatus: stringValue(formData, "continuityStatus", "unchecked") as EotScene["continuityStatus"],
    estimatedDurationMinutes: numberValue(formData, "estimatedDurationMinutes"),
  });
}

export async function listScenes() {
  if (!isFirebaseConfigured) return readerDb.sceneCache.toArray();
  const snapshots = await getDocs(query(collection(db, "eotScenes"), orderBy("sceneNumber")));
  const rows = snapshots.docs.map((snapshot) => normalizeScene(withId<EotScene>(snapshot)));
  await readerDb.sceneCache.bulkPut(rows);
  return rows;
}

export async function getScene(sceneId: string) {
  const cached = await readerDb.sceneCache.get(sceneId);
  if (!isFirebaseConfigured) return cached ?? null;
  const snapshot = await getDoc(doc(db, "eotScenes", sceneId));
  if (!snapshot.exists()) return cached ?? null;
  const scene = normalizeScene(withId<EotScene>(snapshot));
  await readerDb.sceneCache.put(scene);
  return scene;
}

export async function upsertScene(input: EotScene) {
  const scene = normalizeScene(input);
  if (!isFirebaseConfigured) {
    await readerDb.sceneCache.put({ ...scene, updatedAt: now() });
    return scene.id;
  }
  const { id, ...payload } = scene;
  if (id && !id.startsWith("local-scene-")) {
    await updateDoc(doc(db, "eotScenes", id), { ...payload, updatedAt: serverTimestamp() });
    await readerDb.sceneCache.put(scene);
    return id;
  }
  const snapshot = await addDoc(collection(db, "eotScenes"), { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await readerDb.sceneCache.put({ ...scene, id: snapshot.id });
  return snapshot.id;
}

export async function searchScenes(term = "", productionStatus = "all", continuityStatus = "all") {
  const rows = await listScenes();
  const needle = term.trim().toLowerCase();
  return rows.filter((scene) => {
    const prodOk = productionStatus === "all" || scene.productionStatus === productionStatus;
    const contOk = continuityStatus === "all" || scene.continuityStatus === continuityStatus;
    const haystack = [scene.sceneCode, scene.title, scene.description, scene.episodeId, scene.chapterId, scene.propertyId, scene.businessId, scene.locationId, scene.emotionalTone, scene.cameraDirection].join(" ").toLowerCase();
    return prodOk && contOk && (!needle || haystack.includes(needle));
  });
}

async function listRelated<T>(collectionName: string, table: { bulkPut: (rows: T[]) => Promise<unknown>; toArray: () => Promise<T[]> }, sceneId?: string) {
  if (!isFirebaseConfigured) {
    const rows = await table.toArray();
    return sceneId ? rows.filter((row) => (row as { sceneId?: string }).sceneId === sceneId) : rows;
  }
  const source = sceneId ? query(collection(db, collectionName), where("sceneId", "==", sceneId)) : query(collection(db, collectionName));
  const snapshots = await getDocs(source);
  const rows = snapshots.docs.map((snapshot) => withId<T>(snapshot));
  await table.bulkPut(rows);
  return rows;
}

export const listSceneBreakdowns = (sceneId?: string) => listRelated<EotSceneBreakdown>("eotSceneBreakdowns", readerDb.sceneBreakdownCache, sceneId);
export const listSceneCast = (sceneId?: string) => listRelated<EotSceneCast>("eotSceneCast", readerDb.sceneCastCache, sceneId);
export const listSceneAssets = (sceneId?: string) => listRelated<EotSceneAsset>("eotSceneAssets", readerDb.sceneAssetCache, sceneId);
export const listSceneContinuity = (sceneId?: string) => listRelated<EotSceneContinuity>("eotSceneContinuity", readerDb.sceneContinuityCache, sceneId);
export const listSceneSchedules = (sceneId?: string) => listRelated<EotSceneSchedule>("eotSceneSchedules", readerDb.sceneScheduleCache, sceneId);
export const listSceneShots = (sceneId?: string) => listRelated<EotSceneShot>("eotSceneShotList", readerDb.sceneShotListCache, sceneId);
export const listSceneProps = (sceneId?: string) => listRelated<EotSceneProp>("eotSceneProps", readerDb.scenePropCache, sceneId);
export const listSceneWardrobe = (sceneId?: string) => listRelated<EotSceneWardrobe>("eotSceneWardrobe", readerDb.sceneWardrobeCache, sceneId);

export async function getSceneContext(sceneId: string) {
  const [scene, breakdowns, cast, assets, continuity, schedules, shots, props, wardrobe] = await Promise.all([
    getScene(sceneId),
    listSceneBreakdowns(sceneId),
    listSceneCast(sceneId),
    listSceneAssets(sceneId),
    listSceneContinuity(sceneId),
    listSceneSchedules(sceneId),
    listSceneShots(sceneId),
    listSceneProps(sceneId),
    listSceneWardrobe(sceneId),
  ]);
  return { scene, breakdowns, cast, assets, continuity, schedules, shots, props, wardrobe };
}

export function sceneFromChapter(episode: Episode, chapter: Chapter): EotScene {
  return normalizeScene({
    id: `local-scene-${Date.now()}`,
    sceneCode: `${episode.episodeIdentifier}-C${chapter.chapterNumber}`,
    episodeId: episode.id,
    chapterId: chapter.id,
    paragraphIds: [],
    seasonNumber: episode.seasonNumber,
    episodeNumber: episode.episodeNumber,
    sceneNumber: chapter.chapterNumber,
    title: chapter.title,
    description: chapter.intro || chapter.previousEpisodeBridge,
    storyDate: episode.storyDate,
    locationId: chapter.sceneLocation,
    propertyId: chapter.scenePropertyId,
    emotionalTone: chapter.emotionalTone,
    cameraDirection: "",
  });
}

export function sceneFromParagraphs(episode: Episode, chapter: Chapter, paragraphs: Paragraph[]): EotScene {
  const first = paragraphs[0];
  return normalizeScene({
    id: `local-scene-${Date.now()}`,
    sceneCode: `${episode.episodeIdentifier}-P${first?.paragraphNumber ?? "X"}`,
    episodeId: episode.id,
    chapterId: chapter.id,
    paragraphIds: paragraphs.map((row) => row.id),
    seasonNumber: episode.seasonNumber,
    episodeNumber: episode.episodeNumber,
    sceneNumber: first?.paragraphNumber ?? chapter.chapterNumber,
    title: `${chapter.title} scene`,
    description: paragraphs.map((row) => row.body).join("\n\n"),
    storyDate: episode.storyDate,
    emotionalTone: first?.emotionalTone || chapter.emotionalTone,
    cameraDirection: first?.cameraDirection || "",
    imagePrompt: first?.imagePrompt || "",
    dialogueSummary: paragraphs.map((row) => row.dialogueJson).filter(Boolean).join("\n"),
    continuityNotes: paragraphs.map((row) => [row.businessContinuityNote, row.propertyInteractionPrompt, row.vehicleInteractionPrompt].filter(Boolean).join(" / ")).filter(Boolean).join("\n"),
  });
}

export async function getSceneDashboard() {
  const [scenes, cast, continuity, schedules] = await Promise.all([listScenes(), listSceneCast(), listSceneContinuity(), listSceneSchedules()]);
  const byStatus = productionStatuses.map((status) => ({ status, count: scenes.filter((scene) => scene.productionStatus === status).length }));
  return {
    scenes,
    byStatus,
    missingCast: scenes.filter((scene) => !cast.some((row) => row.sceneId === scene.id)),
    missingLocation: scenes.filter((scene) => !scene.locationId && !scene.propertyId),
    continuityWarnings: continuity.filter((row) => !row.resolved && row.severity !== "info"),
    upcoming: schedules.filter((row) => row.status === "planned" || row.status === "scheduled").sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)).slice(0, 8),
    highPriority: scenes.filter((scene) => scene.continuityStatus === "warning" || scene.productionStatus === "filming"),
  };
}

export async function runSceneContinuityChecks(sceneId: string) {
  const context = await getSceneContext(sceneId);
  if (!context.scene) return [];
  const [actors, casting] = await Promise.all([listActors(), listCastingAssignments()]);
  const checks: Array<{ severity: "info" | "warning" | "critical"; note: string }> = [];
  if (context.cast.length === 0) checks.push({ severity: "critical", note: "Scene has no assigned cast." });
  context.cast.forEach((row) => {
    const assignment = casting.find((item) => item.characterId === row.characterId && item.actorId === row.actorId && ["approved", "confirmed"].includes(item.status));
    if (!row.actorId || !assignment || !actors.some((actor) => actor.id === row.actorId)) checks.push({ severity: "warning", note: `Character ${row.characterId} does not have an approved assigned actor for this scene.` });
  });
  if (!context.scene.emotionalTone) checks.push({ severity: "warning", note: "Scene is missing emotional tone." });
  if (!context.scene.cameraDirection) checks.push({ severity: "warning", note: "Scene is missing camera direction." });
  context.continuity.filter((row) => row.severity === "critical" && !row.resolved).forEach((row) => checks.push({ severity: "critical", note: `Unresolved critical continuity: ${row.note}` }));
  return checks;
}
