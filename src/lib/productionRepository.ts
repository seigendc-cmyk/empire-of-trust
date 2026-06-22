import { addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import type { Table } from "dexie";
import { db } from "./firebase";
import { readerDb } from "./offlineDb";
import type {
  EotCasting,
  EotContinuityRecord,
  EotLocation,
  EotProductionAsset,
  EotProductionProperty,
  EotProductionSchedule,
  EotProductionVehicle,
  EotScene,
  EotEpisodePlan,
  ProductionActor,
  ProductionCharacter,
} from "../types";

export type ProductionKind = "actors" | "casting" | "characters" | "scenes" | "locations" | "properties" | "vehicles" | "assets" | "schedules" | "continuity";
export type ProductionRecord =
  | ProductionActor
  | EotCasting
  | ProductionCharacter
  | EotScene
  | EotLocation
  | EotProductionProperty
  | EotProductionVehicle
  | EotProductionAsset
  | EotProductionSchedule
  | EotContinuityRecord;

interface ProductionConfig<T extends ProductionRecord> {
  collectionName: string;
  orderBy: string;
  table: Table<T, string>;
  title: string;
  singular: string;
  searchFields: string[];
}

const config = {
  actors: { collectionName: "eotActors", orderBy: "fullName", table: readerDb.productionActorCache, title: "Actors", singular: "Actor", searchFields: ["fullName", "stageName", "email", "phone"] },
  casting: { collectionName: "eotCasting", orderBy: "status", table: readerDb.castingCache, title: "Casting", singular: "Casting", searchFields: ["characterId", "actorId", "status", "notes"] },
  characters: { collectionName: "eotCharacters", orderBy: "name", table: readerDb.productionCharacterCache, title: "Characters", singular: "Character", searchFields: ["name", "nickname", "role", "occupation"] },
  scenes: { collectionName: "eotScenes", orderBy: "sceneNumber", table: readerDb.sceneCache, title: "Scenes", singular: "Scene", searchFields: ["title", "description", "emotionalTone", "status"] },
  locations: { collectionName: "eotLocations", orderBy: "name", table: readerDb.locationCache, title: "Locations", singular: "Location", searchFields: ["name", "city", "country", "locationType"] },
  properties: { collectionName: "eotProperties", orderBy: "name", table: readerDb.productionPropertyCache, title: "Properties", singular: "Property", searchFields: ["name", "type", "description", "status"] },
  vehicles: { collectionName: "eotVehicles", orderBy: "name", table: readerDb.productionVehicleCache, title: "Vehicles", singular: "Vehicle", searchFields: ["name", "registration", "type", "description"] },
  assets: { collectionName: "eotProductionAssets", orderBy: "assetType", table: readerDb.productionAssetCache, title: "Production Assets", singular: "Asset", searchFields: ["assetType", "prompt", "relatedEpisodeId"] },
  schedules: { collectionName: "eotProductionSchedules", orderBy: "scheduledDate", table: readerDb.productionScheduleCache, title: "Schedules", singular: "Schedule", searchFields: ["episodeId", "sceneId", "status", "notes"] },
  continuity: { collectionName: "eotContinuityRecords", orderBy: "severity", table: readerDb.continuityRecordCache, title: "Continuity", singular: "Continuity record", searchFields: ["title", "description", "continuityType", "severity", "status"] },
} satisfies Record<ProductionKind, ProductionConfig<ProductionRecord>>;

function withId<T>(snapshot: { id: string; data: () => unknown }) {
  return { id: snapshot.id, ...(snapshot.data() as object) } as T;
}

function matches(record: ProductionRecord, fields: string[], term: string) {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return true;
  const row = record as unknown as Record<string, unknown>;
  return fields.some((field) => String(row[field] ?? "").toLowerCase().includes(normalized));
}

function productionConfig(kind: ProductionKind) {
  return config[kind];
}

export function getProductionConfig(kind: ProductionKind) {
  const item = productionConfig(kind);
  return { title: item.title, singular: item.singular, searchFields: item.searchFields };
}

export async function listProduction<T extends ProductionRecord>(kind: ProductionKind): Promise<T[]> {
  const item = productionConfig(kind) as ProductionConfig<T>;
  try {
    const snapshots = await getDocs(query(collection(db, item.collectionName), orderBy(item.orderBy)));
    const rows = snapshots.docs.map((snapshot) => withId<T>(snapshot));
    await item.table.bulkPut(rows);
    return rows;
  } catch {
    return item.table.toArray();
  }
}

export async function searchProduction(term: string) {
  const entries = await Promise.all((Object.keys(config) as ProductionKind[]).map(async (kind) => {
    const rows = await listProduction(kind);
    const item = productionConfig(kind);
    return rows.filter((row) => matches(row, item.searchFields, term)).map((row) => ({ kind, row }));
  }));
  return entries.flat();
}

export async function upsertProduction(kind: ProductionKind, input: Record<string, unknown> & { id?: string }) {
  const item = productionConfig(kind);
  const payload = { ...input, updatedAt: serverTimestamp() };
  if (input.id) {
    await setDoc(doc(db, item.collectionName, input.id), payload, { merge: true });
    return input.id;
  }
  const snapshot = await addDoc(collection(db, item.collectionName), { ...payload, createdAt: serverTimestamp() });
  return snapshot.id;
}

function compactId(input: string) {
  return input.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
}

function splitList(input: string) {
  return input
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function plannedProductionEpisodeId(plan: Pick<EotEpisodePlan, "seasonNumber" | "episodeNumber">) {
  return `planned_s${String(plan.seasonNumber).padStart(2, "0")}e${String(plan.episodeNumber).padStart(2, "0")}`;
}

export async function createProductionHandoff(plan: EotEpisodePlan) {
  const baseId = compactId(plan.id || `s${plan.seasonNumber}_e${plan.episodeNumber}`);
  const episodeId = plannedProductionEpisodeId(plan);
  const sceneId = `${baseId}_primary_scene`;
  const assetId = `${baseId}_visual_assets`;
  const continuityId = `${baseId}_continuity_brief`;
  const scheduleId = `${baseId}_first_shoot`;
  const assignedActors = splitList(plan.activeCharacters);
  const assignedAssets = splitList(plan.requiredAssets);
  const locationNotes = splitList(plan.requiredLocations);
  const sceneNumber = plan.seasonNumber * 1000 + plan.episodeNumber * 10 + 1;

  await upsertProduction("scenes", {
    id: sceneId,
    episodeId,
    chapterId: "",
    sceneNumber,
    title: plan.title || `S${plan.seasonNumber}E${plan.episodeNumber} primary scene`,
    description: [plan.mainConflict, plan.emotionalTurn, plan.familyConsequence, plan.businessConsequence].filter(Boolean).join("\n\n"),
    locationId: locationNotes[0] ?? "",
    emotionalTone: plan.emotionalTurn,
    cameraDirection: "",
    dialogueSummary: plan.cliffhangerQuestion,
    imagePrompt: [plan.culturalMoment, plan.requiredAssets, plan.requiredLocations].filter(Boolean).join("\n"),
    videoPrompt: plan.nextEpisodeBridge,
    continuityNotes: [plan.activeCharacters, plan.businessConsequence, plan.culturalMoment].filter(Boolean).join("\n\n"),
    estimatedDuration: "",
    status: "planned",
  });

  await upsertProduction("assets", {
    id: assetId,
    assetType: "marketing",
    prompt: [plan.title, plan.culturalMoment, plan.requiredAssets, plan.requiredLocations].filter(Boolean).join("\n"),
    relatedCharacterId: assignedActors[0] ?? "",
    relatedSceneId: sceneId,
    relatedEpisodeId: episodeId,
    generatedImageUrl: "",
    generatedVideoUrl: "",
  });

  await upsertProduction("schedules", {
    id: scheduleId,
    episodeId,
    sceneId,
    scheduledDate: plan.storyDate,
    locationId: locationNotes[0] ?? "",
    assignedActors,
    assignedAssets,
    status: "planned",
    notes: [plan.requiredLocations, plan.requiredAssets, plan.nextEpisodeBridge].filter(Boolean).join("\n\n"),
  });

  await upsertProduction("continuity", {
    id: continuityId,
    episodeId,
    sceneId,
    continuityType: "timeline",
    title: `${plan.title} production continuity`,
    description: [plan.mainConflict, plan.activeCharacters, plan.businessConsequence, plan.culturalMoment, plan.nextEpisodeBridge].filter(Boolean).join("\n\n"),
    severity: "warning",
    status: "open",
    relatedCharacterId: assignedActors[0] ?? "",
    relatedAssetId: assetId,
  });

  return { episodeId, sceneId, assetId, scheduleId, continuityId };
}

export async function getProductionHandoffStatus(plans: EotEpisodePlan[]) {
  const [scenes, schedules, assets, continuity] = await Promise.all([
    listProduction<EotScene>("scenes"),
    listProduction<EotProductionSchedule>("schedules"),
    listProduction<EotProductionAsset>("assets"),
    listProduction<EotContinuityRecord>("continuity"),
  ]);

  return plans.map((plan) => {
    const episodeId = plannedProductionEpisodeId(plan);
    const planScenes = scenes.filter((item) => item.episodeId === episodeId);
    const planSchedules = schedules.filter((item) => item.episodeId === episodeId);
    const planAssets = assets.filter((item) => item.relatedEpisodeId === episodeId);
    const planContinuity = continuity.filter((item) => item.episodeId === episodeId);
    const readyScenes = planScenes.filter((item) => item.status === "ready" || item.status === "filmed" || item.status === "approved").length;

    return {
      plan,
      episodeId,
      scenes: planScenes,
      schedules: planSchedules,
      assets: planAssets,
      continuity: planContinuity,
      hasHandoff: planScenes.length > 0 || planSchedules.length > 0 || planAssets.length > 0 || planContinuity.length > 0,
      openContinuity: planContinuity.filter((item) => item.status === "open"),
      progress: planScenes.length ? Math.round((readyScenes / planScenes.length) * 100) : 0,
    };
  });
}

export async function getCastingBoard() {
  const [characters, actors, casting] = await Promise.all([
    listProduction<ProductionCharacter>("characters"),
    listProduction<ProductionActor>("actors"),
    listProduction<EotCasting>("casting"),
  ]);

  return characters.map((character) => {
    const assignments = casting.filter((item) => item.characterId === character.id);
    const selectedCasting = assignments.find((item) => item.status === "approved" || item.status === "selected") ?? assignments[0];
    const selectedActor = selectedCasting ? actors.find((actor) => actor.id === selectedCasting.actorId) : undefined;
    return {
      character,
      assignments,
      selectedCasting,
      selectedActor,
      needsCasting: !assignments.some((item) => item.status === "selected" || item.status === "approved"),
    };
  });
}

export async function assignActorToCharacter(input: { characterId: string; actorId: string; status: EotCasting["status"]; notes?: string }) {
  const id = compactId(`${input.characterId}_${input.actorId}_casting`);
  return upsertProduction("casting", {
    id,
    characterId: input.characterId,
    actorId: input.actorId,
    status: input.status,
    notes: input.notes ?? "",
    assignedDate: new Date().toISOString().slice(0, 10),
    approvedDate: input.status === "approved" ? new Date().toISOString().slice(0, 10) : "",
  });
}

export async function updateCastingStatus(casting: EotCasting, status: EotCasting["status"]) {
  return upsertProduction("casting", {
    id: casting.id,
    status,
    approvedDate: status === "approved" ? new Date().toISOString().slice(0, 10) : casting.approvedDate ?? "",
  });
}

export async function getScheduleBoard() {
  const [scenes, schedules, locations, assets] = await Promise.all([
    listProduction<EotScene>("scenes"),
    listProduction<EotProductionSchedule>("schedules"),
    listProduction<EotLocation>("locations"),
    listProduction<EotProductionAsset>("assets"),
  ]);

  return schedules.map((schedule) => {
    const scene = scenes.find((item) => item.id === schedule.sceneId);
    const location = locations.find((item) => item.id === schedule.locationId || item.name === schedule.locationId);
    const assignedAssets = assets.filter((item) => schedule.assignedAssets?.includes(item.id) || schedule.assignedAssets?.includes(item.assetType));
    return { schedule, scene, location, assignedAssets };
  });
}

export async function updateScheduleStatus(schedule: EotProductionSchedule, status: EotProductionSchedule["status"]) {
  await upsertProduction("schedules", { id: schedule.id, status });
  if (status === "in_progress") await upsertProduction("scenes", { id: schedule.sceneId, status: "ready" });
  if (status === "completed") await upsertProduction("scenes", { id: schedule.sceneId, status: "filmed" });
  return schedule.id;
}

export async function getProductionReadiness() {
  const [scenes, schedules, casting, locations, assets, continuity] = await Promise.all([
    listProduction<EotScene>("scenes"),
    listProduction<EotProductionSchedule>("schedules"),
    listProduction<EotCasting>("casting"),
    listProduction<EotLocation>("locations"),
    listProduction<EotProductionAsset>("assets"),
    listProduction<EotContinuityRecord>("continuity"),
  ]);

  const episodeIds = Array.from(new Set([...scenes.map((item) => item.episodeId), ...schedules.map((item) => item.episodeId), ...continuity.map((item) => item.episodeId)].filter(Boolean))).sort();
  return episodeIds.map((episodeId) => {
    const episodeScenes = scenes.filter((item) => item.episodeId === episodeId);
    const episodeSchedules = schedules.filter((item) => item.episodeId === episodeId);
    const openContinuity = continuity.filter((item) => item.episodeId === episodeId && item.status === "open");
    const locationIds = new Set([...episodeScenes.map((item) => item.locationId), ...episodeSchedules.map((item) => item.locationId)].filter(Boolean));
    const missingLocations = Array.from(locationIds).filter((locationId) => !locations.some((item) => item.id === locationId || item.name === locationId));
    const requiredActors = new Set(episodeSchedules.flatMap((item) => item.assignedActors ?? []).filter(Boolean));
    const approvedActorRefs = new Set(casting.filter((item) => item.status === "approved" || item.status === "selected").flatMap((item) => [item.actorId, item.characterId]));
    const missingActors = Array.from(requiredActors).filter((actorId) => !approvedActorRefs.has(actorId));
    const requiredAssets = new Set(episodeSchedules.flatMap((item) => item.assignedAssets ?? []).filter(Boolean));
    const missingAssets = Array.from(requiredAssets).filter((assetId) => !assets.some((item) => item.id === assetId || item.assetType === assetId));
    const checks = [
      { label: "Scenes", passed: episodeScenes.length > 0, detail: `${episodeScenes.length} scene records` },
      { label: "Schedule", passed: episodeSchedules.length > 0, detail: `${episodeSchedules.length} schedule records` },
      { label: "Actors", passed: missingActors.length === 0, detail: missingActors.length ? `Missing: ${missingActors.join(", ")}` : "Casting covered" },
      { label: "Locations", passed: missingLocations.length === 0, detail: missingLocations.length ? `Missing: ${missingLocations.join(", ")}` : "Locations covered" },
      { label: "Assets", passed: missingAssets.length === 0, detail: missingAssets.length ? `Missing: ${missingAssets.join(", ")}` : "Assets covered" },
      { label: "Continuity", passed: openContinuity.length === 0, detail: openContinuity.length ? `${openContinuity.length} open continuity items` : "No open continuity" },
    ];
    const passed = checks.filter((item) => item.passed).length;
    return { episodeId, checks, scenes: episodeScenes, schedules: episodeSchedules, openContinuity, readiness: Math.round((passed / checks.length) * 100), ready: passed === checks.length };
  });
}

export async function getProductionDashboard() {
  const [actors, casting, characters, scenes, locations, properties, vehicles, assets, schedules, continuity] = await Promise.all([
    listProduction<ProductionActor>("actors"),
    listProduction<EotCasting>("casting"),
    listProduction<ProductionCharacter>("characters"),
    listProduction<EotScene>("scenes"),
    listProduction<EotLocation>("locations"),
    listProduction<EotProductionProperty>("properties"),
    listProduction<EotProductionVehicle>("vehicles"),
    listProduction<EotProductionAsset>("assets"),
    listProduction<EotProductionSchedule>("schedules"),
    listProduction<EotContinuityRecord>("continuity"),
  ]);
  const upcomingShoots = schedules
    .filter((item) => item.status === "planned" || item.status === "scheduled")
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
    .slice(0, 8);
  const actorsRequired = new Set(upcomingShoots.flatMap((item) => item.assignedActors ?? [])).size;
  const locationsRequired = new Set(upcomingShoots.map((item) => item.locationId).filter(Boolean)).size;
  const readyScenes = scenes.filter((item) => item.status === "ready" || item.status === "filmed" || item.status === "approved").length;
  const productionProgress = scenes.length ? Math.round((readyScenes / scenes.length) * 100) : 0;
  const continuityWarnings = continuity.filter((item) => item.status === "open" && item.severity !== "info");
  return {
    counts: {
      actors: actors.length,
      casting: casting.length,
      characters: characters.length,
      scenes: scenes.length,
      locations: locations.length,
      properties: properties.length,
      vehicles: vehicles.length,
      assets: assets.length,
      schedules: schedules.length,
      continuity: continuity.length,
    },
    upcomingShoots,
    actorsRequired,
    locationsRequired,
    productionProgress,
    continuityWarnings,
  };
}

export function summarizeProductionRecord(record: ProductionRecord) {
  const row = record as unknown as Record<string, unknown>;
  const title = String(row.fullName ?? row.stageName ?? row.name ?? row.title ?? row.assetType ?? row.id);
  const subtitle = String(row.status ?? row.role ?? row.locationType ?? row.type ?? row.availabilityStatus ?? "Production");
  const body = String(row.description ?? row.bio ?? row.prompt ?? row.notes ?? row.backstory ?? "");
  return { title, subtitle, body };
}
