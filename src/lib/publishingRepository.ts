import { addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "./firebase";
import { listEpisodes, updateEpisode } from "./firestore";
import { canOpenPack } from "./licenceRepository";
import { readerDb } from "./offlineDb";
import { getProductionReadiness } from "./productionRepository";
import type { ContentPlan, EotCatalogueEntry, EotContentRule, EotPublishedPack, EotReleaseSchedule, Episode, EpisodeStatus } from "../types";

const statusTransitions: Record<EpisodeStatus, EpisodeStatus[]> = {
  draft: ["review", "archived"],
  review: ["draft", "approved", "archived"],
  approved: ["scheduled", "published", "archived"],
  scheduled: ["published", "approved", "archived"],
  published: ["scheduled", "archived"],
  archived: ["draft", "published"],
};

function withId<T>(snapshot: { id: string; data: () => unknown }) {
  return { id: snapshot.id, ...(snapshot.data() as object) } as T;
}

function isoDateOnly(value: string) {
  return value || new Date().toISOString().slice(0, 10);
}

function catalogueIdForEpisode(episodeId: string) {
  return `episode_${episodeId}`;
}

function publishedPackId(episode: Episode) {
  return `EOT-EP-${episode.episodeIdentifier || `S${String(episode.seasonNumber).padStart(2, "0")}E${String(episode.episodeNumber).padStart(2, "0")}`}`;
}

export function canTransitionEpisode(from: EpisodeStatus, to: EpisodeStatus) {
  return statusTransitions[from]?.includes(to) ?? false;
}

export async function listPublishingEpisodes() {
  return listEpisodes();
}

export async function setEpisodeWorkflowStatus(episode: Episode, status: EpisodeStatus) {
  if (!canTransitionEpisode(episode.status, status) && episode.status !== status) {
    throw new Error(`Cannot move ${episode.status} episode to ${status}.`);
  }
  await updateEpisode(episode.id, { status });
}

function buildCatalogueEntry(episode: Episode, input: { releaseDate?: string; releaseTime?: string; timezone?: string; downloadUrl?: string; status?: "scheduled" | "published" | "archived" } = {}): EotCatalogueEntry {
  return {
    id: catalogueIdForEpisode(episode.id),
    contentType: "episode",
    episodeId: episode.id,
    packId: publishedPackId(episode),
    title: episode.title,
    synopsis: episode.synopsis,
    seasonNumber: episode.seasonNumber,
    episodeNumber: episode.episodeNumber,
    releaseDate: input.releaseDate,
    releaseTime: input.releaseTime,
    timezone: input.timezone,
    requiredLicencePlan: (episode.requiredLicencePlan || "free") as ContentPlan,
    downloadUrl: input.downloadUrl,
    isDownloadAvailable: Boolean(input.downloadUrl),
    visibility: episode.requiredLicencePlan && episode.requiredLicencePlan !== "free" ? "licensed" : "public",
    status: input.status ?? "published",
    updatedAt: new Date().toISOString(),
  };
}

function buildPublishedPack(episode: Episode, input: { releaseDate?: string; releaseTime?: string; timezone?: string; downloadUrl?: string; status?: "scheduled" | "published" | "archived" } = {}): EotPublishedPack {
  const packId = publishedPackId(episode);
  return {
    id: packId,
    episodeId: episode.id,
    packId,
    packType: "episode",
    version: "latest",
    title: episode.title,
    synopsis: episode.synopsis,
    seasonNumber: episode.seasonNumber,
    episodeNumber: episode.episodeNumber,
    releaseDate: input.releaseDate,
    releaseTime: input.releaseTime,
    timezone: input.timezone,
    requiredLicencePlan: (episode.requiredLicencePlan || "free") as ContentPlan,
    downloadUrl: input.downloadUrl,
    isDownloadAvailable: Boolean(input.downloadUrl),
    status: input.status ?? "published",
    updatedAt: new Date().toISOString(),
  };
}

function buildContentRule(episode: Episode): EotContentRule {
  return {
    id: `episode_${episode.id}`,
    contentId: episode.id,
    contentType: "episode",
    requiredLicencePlan: (episode.requiredLicencePlan || "free") as ContentPlan,
    visibility: episode.requiredLicencePlan && episode.requiredLicencePlan !== "free" ? "licensed" : "public",
    canDownload: true,
    updatedAt: new Date().toISOString(),
  };
}

export async function publishEpisodeNow(episode: Episode, downloadUrl = "") {
  const published = buildPublishedPack(episode, { status: "published", releaseDate: new Date().toISOString().slice(0, 10), downloadUrl });
  const catalogue = buildCatalogueEntry(episode, { status: "published", releaseDate: published.releaseDate, downloadUrl });
  const rule = buildContentRule(episode);
  await Promise.all([
    updateEpisode(episode.id, { status: "published" }),
    setDoc(doc(db, "eotPublishedPacks", published.id), { ...published, publishedAt: serverTimestamp(), updatedAt: serverTimestamp() }),
    setDoc(doc(db, "eotCatalogue", catalogue.id), { ...catalogue, updatedAt: serverTimestamp() }),
    setDoc(doc(db, "eotContentRules", rule.id), { ...rule, updatedAt: serverTimestamp() }),
  ]);
  await readerDb.catalogueCache.put(catalogue);
  await readerDb.publishedPackCache.put(published);
  await readerDb.contentRuleCache.put(rule);
  return catalogue;
}

export async function scheduleEpisodeRelease(episode: Episode, input: { releaseDate: string; releaseTime: string; timezone: string; downloadUrl?: string }) {
  const schedule: Omit<EotReleaseSchedule, "id"> = {
    episodeId: episode.id,
    packId: publishedPackId(episode),
    releaseDate: isoDateOnly(input.releaseDate),
    releaseTime: input.releaseTime || "08:00",
    timezone: input.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    seasonNumber: episode.seasonNumber,
    episodeNumber: episode.episodeNumber,
    status: "scheduled",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const scheduleRef = await addDoc(collection(db, "eotReleaseSchedule"), { ...schedule, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  const published = buildPublishedPack(episode, { ...input, status: "scheduled" });
  const catalogue = buildCatalogueEntry(episode, { ...input, status: "scheduled" });
  const rule = buildContentRule(episode);
  await Promise.all([
    updateEpisode(episode.id, { status: "scheduled" }),
    setDoc(doc(db, "eotPublishedPacks", published.id), { ...published, updatedAt: serverTimestamp() }),
    setDoc(doc(db, "eotCatalogue", catalogue.id), { ...catalogue, updatedAt: serverTimestamp() }),
    setDoc(doc(db, "eotContentRules", rule.id), { ...rule, updatedAt: serverTimestamp() }),
  ]);
  const saved = { id: scheduleRef.id, ...schedule };
  await readerDb.releaseScheduleCache.put(saved);
  await readerDb.catalogueCache.put(catalogue);
  await readerDb.publishedPackCache.put(published);
  await readerDb.contentRuleCache.put(rule);
  return saved;
}

export async function archiveEpisode(episode: Episode) {
  await Promise.all([
    updateEpisode(episode.id, { status: "archived" }),
    updateDoc(doc(db, "eotCatalogue", catalogueIdForEpisode(episode.id)), { status: "archived", visibility: "hidden", updatedAt: serverTimestamp() }).catch(() => undefined),
    updateDoc(doc(db, "eotPublishedPacks", publishedPackId(episode)), { status: "archived", updatedAt: serverTimestamp() }).catch(() => undefined),
  ]);
}

export async function listReleaseSchedule() {
  try {
    const snapshots = await getDocs(query(collection(db, "eotReleaseSchedule"), orderBy("releaseDate"), orderBy("releaseTime")));
    const rows = snapshots.docs.map((item) => withId<EotReleaseSchedule>(item));
    await readerDb.releaseScheduleCache.bulkPut(rows);
    return rows;
  } catch {
    return readerDb.releaseScheduleCache.toArray();
  }
}

export async function listCatalogueEntries(contentType?: EotCatalogueEntry["contentType"]) {
  try {
    const source = contentType ? query(collection(db, "eotCatalogue"), where("contentType", "==", contentType), orderBy("seasonNumber"), orderBy("episodeNumber")) : query(collection(db, "eotCatalogue"), orderBy("releaseDate"));
    const snapshots = await getDocs(source);
    const rows = snapshots.docs.map((item) => withId<EotCatalogueEntry>(item));
    await readerDb.catalogueCache.bulkPut(rows);
    return rows;
  } catch {
    const cached = await readerDb.catalogueCache.toArray();
    return contentType ? cached.filter((item) => item.contentType === contentType) : cached;
  }
}

export async function listAccessibleCatalogue(contentType?: EotCatalogueEntry["contentType"]) {
  const rows = await listCatalogueEntries(contentType);
  const checks = await Promise.all(rows.map(async (entry) => ({ entry, access: await canOpenPack(entry.requiredLicencePlan) })));
  return checks
    .filter(({ entry }) => entry.visibility !== "hidden" && entry.status !== "archived")
    .map(({ entry, access }) => ({ ...entry, accessAllowed: access.allowed, accessReason: access.reason }));
}

export async function getReleaseCommandCenter() {
  const [episodes, schedules, catalogue, readiness] = await Promise.all([
    listPublishingEpisodes(),
    listReleaseSchedule(),
    listCatalogueEntries("episode"),
    getProductionReadiness(),
  ]);

  return episodes.map((episode) => {
    const releaseSchedule = schedules.find((item) => item.episodeId === episode.id || item.packId === publishedPackId(episode));
    const catalogueEntry = catalogue.find((item) => item.episodeId === episode.id);
    const plannedEpisodeId = `planned_s${String(episode.seasonNumber).padStart(2, "0")}e${String(episode.episodeNumber).padStart(2, "0")}`;
    const readinessRow = readiness.find((item) => item.episodeId === episode.id || item.episodeId === plannedEpisodeId);
    const blockers = [
      episode.status === "draft" ? "Episode is still draft." : "",
      episode.status === "review" ? "Episode is still in review." : "",
      !readinessRow ? "No production readiness record." : "",
      readinessRow && !readinessRow.ready ? "Production readiness has open blockers." : "",
      !catalogueEntry && episode.status === "published" ? "Published episode is missing catalogue entry." : "",
    ].filter(Boolean);

    return {
      episode,
      releaseSchedule,
      catalogueEntry,
      readiness: readinessRow,
      blockers,
      canSchedule: blockers.length === 0 || episode.status === "approved" || episode.status === "scheduled",
      canPublish: blockers.length === 0 && (episode.status === "approved" || episode.status === "scheduled"),
    };
  });
}
