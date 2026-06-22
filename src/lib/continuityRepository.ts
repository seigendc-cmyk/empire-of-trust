import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where, type DocumentData, type QueryDocumentSnapshot } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { listActors, listCastingAssignments } from "./actorRepository";
import { listChapters, listEpisodes, listParagraphs } from "./firestore";
import { readerDb } from "./offlineDb";
import { listSceneAssets, listSceneCast, listSceneContinuity, listScenes } from "./sceneRepository";
import type { Episode, EotContinuityCheckRecord, EotContinuityRuleRecord, EotContinuityWarning, EotEpisodeContinuitySummary, EotTimelineEvent } from "../types";

const withId = <T>(snapshot: QueryDocumentSnapshot<DocumentData> | { id: string; data: () => DocumentData }) => ({ id: snapshot.id, ...snapshot.data() }) as T;

export const timelineEventTypes = ["story", "family", "business", "romance", "betrayal", "succession", "property", "vehicle", "legal", "cultural", "production", "release", "other"] as const;
export const continuitySeverities = ["info", "warning", "critical"] as const;
export const continuityStatuses = ["open", "acknowledged", "resolved", "ignored"] as const;

function now() {
  return new Date().toISOString();
}

function listFromText(value: string) {
  return value.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean);
}

export function timelineEventInputFromForm(formData: FormData, id?: string): EotTimelineEvent {
  return {
    id: id || `local-timeline-${Date.now()}`,
    eventCode: String(formData.get("eventCode") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    eventType: String(formData.get("eventType") ?? "story") as EotTimelineEvent["eventType"],
    seasonNumber: Number(formData.get("seasonNumber") || 0) || undefined,
    episodeNumber: Number(formData.get("episodeNumber") || 0) || undefined,
    episodeId: String(formData.get("episodeId") ?? ""),
    chapterId: String(formData.get("chapterId") ?? ""),
    sceneId: String(formData.get("sceneId") ?? ""),
    paragraphId: String(formData.get("paragraphId") ?? ""),
    storyDate: String(formData.get("storyDate") ?? ""),
    storyTime: String(formData.get("storyTime") ?? ""),
    releaseDate: String(formData.get("releaseDate") ?? ""),
    importance: String(formData.get("importance") ?? "medium") as EotTimelineEvent["importance"],
    involvedCharacterIds: listFromText(String(formData.get("involvedCharacterIds") ?? "")),
    involvedBusinessIds: listFromText(String(formData.get("involvedBusinessIds") ?? "")),
    involvedPropertyIds: listFromText(String(formData.get("involvedPropertyIds") ?? "")),
    involvedVehicleIds: listFromText(String(formData.get("involvedVehicleIds") ?? "")),
    involvedRelationshipIds: listFromText(String(formData.get("involvedRelationshipIds") ?? "")),
    consequenceSummary: String(formData.get("consequenceSummary") ?? ""),
    continuityNotes: String(formData.get("continuityNotes") ?? ""),
    createdAt: now(),
    updatedAt: now(),
  };
}

async function listCollection<T>(collectionName: string, table: { bulkPut: (rows: T[]) => Promise<unknown>; toArray: () => Promise<T[]> }, orderField = "id") {
  if (!isFirebaseConfigured) return table.toArray();
  try {
    const snapshots = await getDocs(query(collection(db, collectionName), orderBy(orderField)));
    const rows = snapshots.docs.map((snapshot) => withId<T>(snapshot));
    await table.bulkPut(rows);
    return rows;
  } catch {
    return table.toArray();
  }
}

export const listTimelineEvents = () => listCollection<EotTimelineEvent>("eotTimelineEvents", readerDb.timelineEventCache, "storyDate");
export const listContinuityRules = () => listCollection<EotContinuityRuleRecord>("eotContinuityRules", readerDb.continuityRuleCache, "ruleCode");
export const listContinuityChecks = () => listCollection<EotContinuityCheckRecord>("eotContinuityChecks", readerDb.continuityCheckCache as never, "createdAt");
export const listContinuityWarnings = () => listCollection<EotContinuityWarning>("eotContinuityWarnings", readerDb.continuityWarningCache, "createdAt");
export const listEpisodeContinuitySummaries = () => listCollection<EotEpisodeContinuitySummary>("eotEpisodeContinuitySummaries", readerDb.episodeContinuitySummaryCache, "seasonNumber");

export async function getTimelineEvent(id: string) {
  const cached = await readerDb.timelineEventCache.get(id);
  if (!isFirebaseConfigured) return cached ?? null;
  const snapshot = await getDoc(doc(db, "eotTimelineEvents", id));
  if (!snapshot.exists()) return cached ?? null;
  const event = withId<EotTimelineEvent>(snapshot);
  await readerDb.timelineEventCache.put(event);
  return event;
}

export async function upsertTimelineEvent(input: EotTimelineEvent) {
  const event = { ...input, updatedAt: now() };
  if (!isFirebaseConfigured) {
    await readerDb.timelineEventCache.put(event);
    return event.id;
  }
  if (event.id && !event.id.startsWith("local-timeline-")) {
    await updateDoc(doc(db, "eotTimelineEvents", event.id), { ...event, updatedAt: serverTimestamp() });
    await readerDb.timelineEventCache.put(event);
    return event.id;
  }
  const { id: _id, ...payload } = event;
  const snapshot = await addDoc(collection(db, "eotTimelineEvents"), { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await readerDb.timelineEventCache.put({ ...event, id: snapshot.id });
  return snapshot.id;
}

export async function updateWarningStatus(warning: EotContinuityWarning, status: EotContinuityWarning["status"], actorEmail = "") {
  const next = { ...warning, status, updatedAt: now() };
  if (status === "resolved") (next as EotContinuityWarning & { resolvedBy?: string; resolvedAt?: string }).resolvedBy = actorEmail;
  if (status === "resolved") (next as EotContinuityWarning & { resolvedBy?: string; resolvedAt?: string }).resolvedAt = now();
  await readerDb.continuityWarningCache.put(next);
  if (isFirebaseConfigured) await setDoc(doc(db, "eotContinuityWarnings", warning.id), { ...next, updatedAt: serverTimestamp() }, { merge: true });
  return next;
}

function check(id: string, type: EotContinuityCheckRecord["checkType"], targetType: EotContinuityCheckRecord["targetType"], targetId: string, result: EotContinuityCheckRecord["result"], severity: EotContinuityCheckRecord["severity"], message: string, recommendation: string): EotContinuityCheckRecord {
  return { id, checkCode: id, checkType: type, targetType, targetId, result, severity, message, recommendation, resolved: false, createdAt: now(), updatedAt: now() };
}

function warningFromCheck(item: EotContinuityCheckRecord): EotContinuityWarning | null {
  if (item.result === "pass") return null;
  return {
    id: `warn_${item.id}`,
    warningCode: `WARN-${item.checkCode}`,
    targetType: item.targetType,
    targetId: item.targetId,
    severity: item.severity,
    title: item.message,
    message: item.message,
    recommendation: item.recommendation,
    status: "open",
    createdAt: now(),
    updatedAt: now(),
  };
}

export async function runEpisodeContinuityChecks(episode: Episode) {
  const [chapters, paragraphs, warnings] = await Promise.all([listChapters(episode.id), listParagraphs(episode.id), listContinuityWarnings()]);
  const checks: EotContinuityCheckRecord[] = [];
  checks.push(check(`episode_bridge_prev_${episode.id}`, "episode_bridge", "episode", episode.id, episode.previousEpisodeId ? "pass" : "warning", "warning", "Missing previous episode bridge.", "Add previousEpisodeId or bridge notes before approval."));
  checks.push(check(`episode_bridge_next_${episode.id}`, "episode_bridge", "episode", episode.id, episode.nextEpisodeId ? "pass" : "warning", "warning", "Missing ending bridge.", "Add nextEpisodeId or ending bridge notes."));
  checks.push(check(`episode_active_characters_${episode.id}`, "character_status", "episode", episode.id, episode.activeCharacterIds?.length ? "pass" : "warning", "warning", "Episode has no active characters.", "Add active character IDs in the episode editor."));
  checks.push(check(`episode_chapters_${episode.id}`, "chapter_sequence", "episode", episode.id, chapters.length ? "pass" : "fail", "critical", "Episode has no chapters.", "Add at least one chapter."));
  chapters.forEach((chapter) => {
    const chapterParagraphs = paragraphs.filter((paragraph) => paragraph.chapterId === chapter.id);
    checks.push(check(`chapter_paragraphs_${chapter.id}`, "chapter_sequence", "chapter", chapter.id, chapterParagraphs.length ? "pass" : "fail", "critical", `Chapter ${chapter.chapterNumber} has no paragraphs.`, "Add paragraph content before production."));
  });
  paragraphs.forEach((paragraph) => {
    checks.push(check(`paragraph_tone_${paragraph.id}`, "visual_consistency", "paragraph", paragraph.id, paragraph.emotionalTone ? "pass" : "warning", "warning", `Paragraph ${paragraph.paragraphNumber} has no emotional tone.`, "Add emotional tone for continuity."));
    checks.push(check(`paragraph_camera_${paragraph.id}`, "visual_consistency", "paragraph", paragraph.id, paragraph.cameraDirection || paragraph.scenePrompt ? "pass" : "warning", "warning", `Paragraph ${paragraph.paragraphNumber} has no scene/camera direction.`, "Add camera direction or scene prompt."));
  });
  const openEpisodeWarnings = warnings.filter((warning) => warning.targetType === "episode" && warning.targetId === episode.id && warning.status === "open");
  const failed = checks.filter((item) => item.result === "fail" || item.result === "warning");
  await (readerDb.continuityCheckCache as never as { bulkPut: (rows: EotContinuityCheckRecord[]) => Promise<unknown> }).bulkPut(checks);
  const newWarnings = failed.map(warningFromCheck).filter(Boolean) as EotContinuityWarning[];
  await readerDb.continuityWarningCache.bulkPut(newWarnings);
  const summary: EotEpisodeContinuitySummary = {
    id: episode.id,
    episodeId: episode.id,
    seasonNumber: episode.seasonNumber,
    episodeNumber: episode.episodeNumber,
    previousEpisodeId: episode.previousEpisodeId,
    nextEpisodeId: episode.nextEpisodeId,
    storyDate: episode.storyDate,
    previousEpisodeBridge: episode.previousEpisodeId || "",
    endingBridge: episode.nextEpisodeId || "",
    activeCharacterCount: episode.activeCharacterIds?.length ?? 0,
    activeBusinessCount: episode.activeBusinesses?.length ?? 0,
    activePropertyCount: episode.activeProperties?.length ?? 0,
    activeVehicleCount: episode.activeVehicles?.length ?? 0,
    unresolvedWarningCount: openEpisodeWarnings.length + newWarnings.filter((item) => item.severity !== "critical").length,
    criticalWarningCount: newWarnings.filter((item) => item.severity === "critical").length,
    continuityStatus: newWarnings.some((item) => item.severity === "critical") ? "critical" : newWarnings.length ? "warnings" : "clean",
    summaryNotes: failed.map((item) => item.message).join("\n"),
    createdAt: now(),
    updatedAt: now(),
  };
  await readerDb.episodeContinuitySummaryCache.put(summary);
  return { checks, warnings: newWarnings, summary };
}

export async function runProductionContinuityChecks() {
  const [scenes, sceneCast, sceneAssets, sceneContinuity, actors, casting] = await Promise.all([listScenes(), listSceneCast(), listSceneAssets(), listSceneContinuity(), listActors(), listCastingAssignments()]);
  const checks: EotContinuityCheckRecord[] = [];
  scenes.forEach((scene) => {
    const cast = sceneCast.filter((row) => row.sceneId === scene.id);
    const assets = sceneAssets.filter((row) => row.sceneId === scene.id);
    checks.push(check(`scene_cast_${scene.id}`, "scene_sequence", "scene", scene.id, cast.length ? "pass" : "fail", "critical", `Scene ${scene.title} is missing cast.`, "Assign scene cast before scheduling."));
    checks.push(check(`scene_location_${scene.id}`, "scene_sequence", "scene", scene.id, scene.locationId || scene.propertyId ? "pass" : "warning", "warning", `Scene ${scene.title} is missing location.`, "Assign a location or property."));
    checks.push(check(`scene_assets_${scene.id}`, "production_asset", "scene", scene.id, assets.some((asset) => asset.required) ? "pass" : "warning", "warning", `Scene ${scene.title} has no required assets.`, "Add required props, wardrobe, vehicles, or documents."));
    cast.forEach((row) => {
      const approved = casting.some((assignment) => assignment.characterId === row.characterId && assignment.actorId === row.actorId && ["approved", "confirmed"].includes(assignment.status));
      const actorExists = row.actorId ? actors.some((actor) => actor.id === row.actorId) : false;
      checks.push(check(`scene_actor_${scene.id}_${row.characterId}`, "character_status", "scene", scene.id, approved && actorExists ? "pass" : "warning", "warning", `Scene ${scene.title} has active character without approved actor.`, "Approve/confirm actor casting for scene character."));
    });
  });
  sceneContinuity.filter((row) => row.severity === "critical" && !row.resolved).forEach((row) => checks.push(check(`scene_critical_${row.id}`, "visual_consistency", "scene", row.sceneId, "fail", "critical", `Critical continuity unresolved: ${row.note}`, "Resolve critical scene continuity item.")));
  await (readerDb.continuityCheckCache as never as { bulkPut: (rows: EotContinuityCheckRecord[]) => Promise<unknown> }).bulkPut(checks);
  const warnings = checks.map(warningFromCheck).filter(Boolean) as EotContinuityWarning[];
  await readerDb.continuityWarningCache.bulkPut(warnings);
  return { checks, warnings };
}

export async function getContinuityDashboard() {
  const [events, rules, checks, warnings, summaries, episodes] = await Promise.all([listTimelineEvents(), listContinuityRules(), listContinuityChecks(), listContinuityWarnings(), listEpisodeContinuitySummaries(), listEpisodes()]);
  return {
    counts: {
      events: events.length,
      rules: rules.length,
      checks: checks.length,
      warnings: warnings.length,
      episodes: episodes.length,
      openWarnings: warnings.filter((warning) => warning.status === "open").length,
      criticalWarnings: warnings.filter((warning) => warning.status === "open" && warning.severity === "critical").length,
    },
    events,
    rules,
    checks,
    warnings,
    summaries,
  };
}

export async function getEntityContinuity(targetType: string, targetId: string) {
  const [events, warnings] = await Promise.all([listTimelineEvents(), listContinuityWarnings()]);
  const eventMatches = events.filter((event) =>
    event.episodeId === targetId ||
    event.sceneId === targetId ||
    event.involvedCharacterIds.includes(targetId) ||
    event.involvedBusinessIds.includes(targetId) ||
    event.involvedPropertyIds.includes(targetId) ||
    event.involvedVehicleIds.includes(targetId) ||
    event.involvedRelationshipIds.includes(targetId),
  );
  return { events: eventMatches, warnings: warnings.filter((warning) => warning.targetType === targetType && warning.targetId === targetId) };
}
