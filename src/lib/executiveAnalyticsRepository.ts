import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { readerDb } from "./offlineDb";

export type AnalyticsView =
  | "overview"
  | "readers"
  | "episodes"
  | "library"
  | "packs"
  | "participation"
  | "quizzes"
  | "predictions"
  | "licensing"
  | "agents"
  | "businesses"
  | "properties"
  | "vehicles"
  | "actors"
  | "production"
  | "assets"
  | "commerce"
  | "staff";

export interface AnalyticsFilters {
  search: string;
  dateFrom: string;
  dateTo: string;
  season: string;
  episode: string;
  category: string;
  licencePlan: string;
  staffMember: string;
  country: string;
  city: string;
  status: string;
}

export interface AnalyticsRow {
  id: string;
  label: string;
  metric: string | number;
  detail: string;
  status?: string;
}

export interface AnalyticsSection {
  title: string;
  summary: string;
  metrics: Record<string, number>;
  rows: AnalyticsRow[];
}

export interface ExecutiveAnalytics {
  overview: Record<string, number>;
  sections: Record<AnalyticsView, AnalyticsSection>;
  searchResults: AnalyticsRow[];
  lastRefreshed: string;
}

type Row = Record<string, unknown> & { id: string };

const collectionConfig: Record<string, { name: string; order?: string; local?: () => Promise<Row[]> }> = {
  readerProfiles: { name: "eotReaderProfiles", order: "lastSeenAt", local: async () => readerDb.readerProfiles.toArray() as unknown as Row[] },
  readerActivity: { name: "eotReaderActivityLogs", order: "createdAt", local: async () => readerDb.readerActivityLog.toArray() as unknown as Row[] },
  readerChoices: { name: "eotReaderChoices", order: "createdAt", local: async () => readerDb.readerChoices.toArray() as unknown as Row[] },
  readerRewards: { name: "eotReaderRewards", order: "earnedAt", local: async () => readerDb.readerRewards.toArray() as unknown as Row[] },
  readerBadges: { name: "eotReaderBadges", order: "earnedAt", local: async () => readerDb.readerBadges.toArray() as unknown as Row[] },
  episodes: { name: "eotEpisodes", order: "updatedAt" },
  chapters: { name: "eotChapters", order: "updatedAt" },
  paragraphs: { name: "eotParagraphs", order: "updatedAt" },
  packs: { name: "eotPacks", order: "updatedAt", local: async () => readerDb.episodePacks.toArray() as unknown as Row[] },
  libraryBooklets: { name: "eotLibraryBooklets", order: "updatedAt" },
  libraryPacks: { name: "eotLibraryPacks", order: "updatedAt", local: async () => readerDb.libraryPacks.toArray() as unknown as Row[] },
  quizzes: { name: "eotQuizzes", order: "createdAt", local: async () => readerDb.quizCache.toArray() as unknown as Row[] },
  polls: { name: "eotPolls", order: "createdAt", local: async () => readerDb.pollCache.toArray() as unknown as Row[] },
  predictions: { name: "eotPredictions", order: "closingDate", local: async () => readerDb.predictionCache.toArray() as unknown as Row[] },
  licences: { name: "eotLicences", order: "issuedAt", local: async () => readerDb.localLicences.toArray() as unknown as Row[] },
  activationCodes: { name: "eotActivationCodes", order: "createdAt" },
  scratchCards: { name: "eotScratchCards", order: "createdAt", local: async () => readerDb.scratchCardAttempts.toArray() as unknown as Row[] },
  agents: { name: "eotAgents", order: "createdAt" },
  agentRequests: { name: "eotAgentActivationRequests", order: "createdAt", local: async () => readerDb.agentActivationRequests.toArray() as unknown as Row[] },
  businesses: { name: "eotBusinesses", order: "updatedAt" },
  properties: { name: "eotProperties", order: "updatedAt", local: async () => readerDb.propertyCache.toArray() as unknown as Row[] },
  vehicles: { name: "eotVehicles", order: "updatedAt", local: async () => readerDb.vehicleCache.toArray() as unknown as Row[] },
  actors: { name: "eotActors", order: "updatedAt", local: async () => readerDb.actorCache.toArray() as unknown as Row[] },
  casting: { name: "eotCastingAssignments", order: "updatedAt", local: async () => readerDb.castingAssignmentCache.toArray() as unknown as Row[] },
  scenes: { name: "eotScenes", order: "updatedAt", local: async () => readerDb.sceneCache.toArray() as unknown as Row[] },
  assets: { name: "eotAssets", order: "updatedAt", local: async () => readerDb.assetCache.toArray() as unknown as Row[] },
  vendors: { name: "eotCommerceVendors", order: "updatedAt", local: async () => readerDb.vendors.toArray() as unknown as Row[] },
  products: { name: "eotCommerceProducts", order: "updatedAt", local: async () => readerDb.products.toArray() as unknown as Row[] },
  commerceLogs: { name: "eotCommerceInterestLogs", order: "createdAt", local: async () => readerDb.commerceInterestLog.toArray() as unknown as Row[] },
  staff: { name: "studioStaff", order: "updatedAt" },
  auditLogs: { name: "studioAuditLogs", order: "createdAt" },
};

const emptyFilters: AnalyticsFilters = {
  search: "",
  dateFrom: "",
  dateTo: "",
  season: "",
  episode: "",
  category: "",
  licencePlan: "",
  staffMember: "",
  country: "",
  city: "",
  status: "",
};

export function defaultAnalyticsFilters(): AnalyticsFilters {
  return { ...emptyFilters };
}

async function listCollection(config: { name: string; order?: string; local?: () => Promise<Row[]> }, max = 500): Promise<Row[]> {
  if (isFirebaseConfigured) {
    try {
      const source = config.order ? query(collection(db, config.name), orderBy(config.order, "desc"), limit(max)) : query(collection(db, config.name), limit(max));
      const snapshots = await getDocs(source);
      return snapshots.docs.map((snapshot) => ({ id: snapshot.id, ...(snapshot.data() as Record<string, unknown>) }));
    } catch {
      // fall back below
    }
  }
  return config.local ? config.local() : [];
}

function text(value: unknown) {
  return String(value ?? "");
}

function num(value: unknown) {
  return Number(value ?? 0) || 0;
}

function dateMs(value: unknown) {
  if (typeof value === "string") return Date.parse(value) || 0;
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") return value.toDate().getTime();
  return 0;
}

function rowDate(row: Row) {
  return dateMs(row.createdAt ?? row.updatedAt ?? row.lastSeenAt ?? row.earnedAt ?? row.completedAt ?? row.issuedAt);
}

function applyFilters(rows: Row[], filters: AnalyticsFilters) {
  const term = filters.search.trim().toLowerCase();
  return rows.filter((row) => {
    const created = rowDate(row);
    if (filters.dateFrom && created && created < Date.parse(filters.dateFrom)) return false;
    if (filters.dateTo && created && created > Date.parse(filters.dateTo)) return false;
    if (filters.season && text(row.seasonNumber) !== filters.season) return false;
    if (filters.episode && text(row.episodeNumber) !== filters.episode && text(row.episodeId) !== filters.episode) return false;
    if (filters.category && ![row.category, row.sector, row.type, row.assetType].some((value) => text(value).toLowerCase() === filters.category.toLowerCase())) return false;
    if (filters.licencePlan && ![row.plan, row.planCode, row.requiredLicencePlan].some((value) => text(value).toLowerCase() === filters.licencePlan.toLowerCase())) return false;
    if (filters.staffMember && ![row.actorEmail, row.email].some((value) => text(value).toLowerCase().includes(filters.staffMember.toLowerCase()))) return false;
    if (filters.country && text(row.country).toLowerCase() !== filters.country.toLowerCase()) return false;
    if (filters.city && text(row.city).toLowerCase() !== filters.city.toLowerCase()) return false;
    if (filters.status && text(row.status).toLowerCase() !== filters.status.toLowerCase()) return false;
    return !term || Object.values(row).some((value) => text(value).toLowerCase().includes(term));
  });
}

function groupCount(rows: Row[], key: string) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const value = text(row[key] || "unknown");
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function topRows(rows: Row[], labelKeys: string[], metric: (row: Row) => string | number, detail: (row: Row) => string, max = 8): AnalyticsRow[] {
  return rows.slice(0, max).map((row) => ({
    id: row.id,
    label: labelKeys.map((key) => text(row[key])).find(Boolean) || row.id,
    metric: metric(row),
    detail: detail(row),
    status: text(row.status || row.active || ""),
  }));
}

function section(title: string, metrics: Record<string, number>, rows: AnalyticsRow[], summary = ""): AnalyticsSection {
  return { title, summary, metrics, rows };
}

function countEvent(rows: Row[], eventType: string) {
  return rows.filter((row) => row.eventType === eventType).length;
}

function activeSince(rows: Row[], days: number) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return new Set(rows.filter((row) => rowDate(row) >= cutoff).map((row) => text(row.readerId || row.id)).filter(Boolean)).size;
}

function sum(rows: Row[], key: string) {
  return rows.reduce((total, row) => total + num(row[key]), 0);
}

export async function getExecutiveAnalytics(filters: AnalyticsFilters = defaultAnalyticsFilters()): Promise<ExecutiveAnalytics> {
  const loaded = await Promise.all(Object.entries(collectionConfig).map(async ([key, config]) => [key, applyFilters(await listCollection(config), filters)] as const));
  const data = Object.fromEntries(loaded) as Record<keyof typeof collectionConfig, Row[]>;
  const nowIso = new Date().toISOString();

  const episodeOpens = data.readerActivity.filter((row) => row.eventType === "episode_opened");
  const episodeCompletions = data.readerActivity.filter((row) => row.eventType === "episode_completed");
  const bookletOpens = data.readerActivity.filter((row) => row.eventType === "library_booklet_opened");
  const bookletCompletions = data.readerActivity.filter((row) => row.eventType === "library_booklet_completed");
  const quizAttempts = data.readerActivity.filter((row) => row.eventType === "quiz_completed");
  const predictionChoices = data.readerChoices.filter((row) => row.choiceType === "prediction");
  const pollChoices = data.readerChoices.filter((row) => row.choiceType === "vote");
  const activeLicences = data.licences.filter((row) => row.status === "active").length;
  const expiredLicences = data.licences.filter((row) => row.status === "expired").length;
  const commerceViews = data.commerceLogs.filter((row) => row.eventType === "vendor_viewed" || row.eventType === "product_viewed").length;

  const overview = {
    totalReaders: data.readerProfiles.length,
    activeReadersToday: activeSince(data.readerActivity, 1),
    activeReadersThisWeek: activeSince(data.readerActivity, 7),
    importedEpisodePacks: data.packs.length,
    episodesCreated: data.episodes.length,
    episodesPublished: data.episodes.filter((row) => row.status === "published").length,
    libraryBookletsCreated: data.libraryBooklets.length,
    libraryPacksImported: data.libraryPacks.length,
    predictionsSubmitted: predictionChoices.length,
    quizzesCompleted: quizAttempts.length,
    rewardsIssued: data.readerRewards.length,
    badgesEarned: data.readerBadges.length,
    activeLicences,
    expiredLicences,
    agentActivationRequests: data.agentRequests.length,
    businessesRegistered: data.businesses.length,
    propertiesRegistered: data.properties.length,
    vehiclesRegistered: data.vehicles.length,
    actorsRegistered: data.actors.length,
    scenesPlanned: data.scenes.length,
    assetsUploaded: data.assets.length,
    vendorsRegistered: data.vendors.length,
    productsListed: data.products.length,
    commerceViews,
    staffMembers: data.staff.length,
  };

  const readerScores = data.readerProfiles
    .map((reader) => {
      const readerId = text(reader.readerId || reader.id);
      const logs = data.readerActivity.filter((row) => text(row.readerId) === readerId);
      const rewards = data.readerRewards.filter((row) => text(row.readerId) === readerId);
      const badges = data.readerBadges.filter((row) => text(row.readerId) === readerId);
      return {
        ...reader,
        points: sum(rewards, "points") || num(reader.rewardPoints),
        badgeCount: badges.length,
        actions: logs.length,
      };
    })
    .sort((a, b) => num(b.points) + num(b.actions) - (num(a.points) + num(a.actions)));

  const episodeRows = data.episodes
    .map((episode) => {
      const episodeId = episode.id;
      const opens = episodeOpens.filter((row) => row.episodeId === episodeId).length;
      const completions = episodeCompletions.filter((row) => row.episodeId === episodeId).length;
      return { ...episode, opens, completions, completionRate: opens ? Math.round((completions / opens) * 100) : 0 };
    })
    .sort((a, b) => num(b.opens) + num(b.completions) - (num(a.opens) + num(a.completions)));

  const sections: Record<AnalyticsView, AnalyticsSection> = {
    overview: section("Overview", overview, Object.entries(overview).map(([label, value]) => ({ id: label, label, metric: value, detail: "Executive metric" })), "Full ecosystem operating view."),
    readers: section("Reader analytics", { readers: data.readerProfiles.length, activeToday: overview.activeReadersToday, activeWeek: overview.activeReadersThisWeek, ranks: Object.keys(groupCount(data.readerProfiles, "currentRank")).length }, topRows(readerScores, ["displayName", "readerId"], (row) => num(row.points), (row) => `${num(row.actions)} actions / ${num(row.badgeCount)} badges / ${text(row.country)} ${text(row.city)}`)),
    episodes: section("Episode analytics", { episodes: data.episodes.length, opens: episodeOpens.length, completions: episodeCompletions.length, completionRate: episodeOpens.length ? Math.round((episodeCompletions.length / episodeOpens.length) * 100) : 0 }, topRows(episodeRows, ["title", "episodeIdentifier"], (row) => num(row.opens), (row) => `${num(row.completions)} completions / ${num(row.completionRate)}% completion / ${text(row.status)}`)),
    library: section("Library analytics", { booklets: data.libraryBooklets.length, packs: data.libraryPacks.length, opens: bookletOpens.length, completions: bookletCompletions.length }, topRows(data.libraryBooklets, ["title", "bookletCode"], (row) => text(row.category || "Library"), (row) => `${text(row.status)} / ${text(row.requiredLicencePlan)}`)),
    packs: section("Pack analytics", { episodePacks: data.packs.length, libraryPacks: data.libraryPacks.length, vendorPacks: await readerDb.vendorPacks.count(), importedPacks: data.packs.length + data.libraryPacks.length }, topRows([...data.packs, ...data.libraryPacks], ["title", "manifest.title", "id"], (row) => text(row.version || "pack"), (row) => text(row.updatedAt || row.createdAt))),
    participation: section("Participation analytics", { predictions: predictionChoices.length, polls: pollChoices.length, choices: data.readerChoices.length, dramaActions: data.readerActivity.length }, topRows(data.readerChoices, ["prompt", "selectedOption"], (row) => text(row.choiceType), (row) => `${text(row.episodeId)} / ${text(row.readerId)}`)),
    quizzes: section("Quiz analytics", { quizzes: data.quizzes.length, attempts: quizAttempts.length, averageScore: quizAttempts.length ? Math.round(sum(quizAttempts, "score") / quizAttempts.length) : 0, passRate: 0 }, topRows(data.quizzes, ["title", "id"], (row) => text(row.status || "quiz"), (row) => `${text(row.episodeId)} / ${num(row.pointsAwarded)} points`)),
    predictions: section("Prediction analytics", { predictions: data.predictions.length, submissions: predictionChoices.length, polls: data.polls.length, open: data.predictions.filter((row) => row.status !== "resolved").length }, topRows(data.predictions, ["title", "question"], (row) => text(row.status || "open"), (row) => `Closes ${text(row.closingDate)} / ${text(row.episodeId)}`)),
    licensing: section("Licensing analytics", { licences: data.licences.length, active: activeLicences, expired: expiredLicences, activationCodes: data.activationCodes.length, scratchCards: data.scratchCards.length }, topRows(data.licences, ["phoneNumber", "readerId", "id"], (row) => text(row.status), (row) => `${text(row.plan || row.planCode)} / ${text(row.source)}`)),
    agents: section("Agent analytics", { agents: data.agents.length, requests: data.agentRequests.length, approvals: data.agentRequests.filter((row) => row.status === "approved").length, completed: data.agentRequests.filter((row) => row.status === "completed").length }, topRows(data.agentRequests, ["agentId", "agentCode", "id"], (row) => text(row.status), (row) => text(row.createdAt))),
    businesses: section("Business analytics", { businesses: data.businesses.length, commerceLinked: data.businesses.filter((row) => row.isCommerceLinked || row.vendorId).length, fictional: data.businesses.filter((row) => row.isFictional).length, sectors: Object.keys(groupCount(data.businesses, "sector")).length }, topRows(data.businesses, ["name", "tradingName"], (row) => text(row.sector), (row) => `${text(row.status)} / ${text(row.city)}`)),
    properties: section("Property analytics", { properties: data.properties.length, productionLocations: data.properties.filter((row) => row.isProductionLocation).length, commercial: data.properties.filter((row) => row.isCommercial).length, residential: data.properties.filter((row) => row.isResidential).length }, topRows(data.properties, ["name", "propertyCode"], (row) => text(row.propertyType || row.type), (row) => `${text(row.status)} / ${text(row.city)}`)),
    vehicles: section("Vehicle analytics", { vehicles: data.vehicles.length, productionVehicles: data.vehicles.filter((row) => row.isProductionVehicle).length, businessOwned: data.vehicles.filter((row) => Array.isArray(row.ownerBusinessIds) && row.ownerBusinessIds.length).length, characterOwned: data.vehicles.filter((row) => Array.isArray(row.ownerCharacterIds) && row.ownerCharacterIds.length).length }, topRows(data.vehicles, ["name", "vehicleCode"], (row) => text(row.vehicleType || row.type), (row) => `${text(row.status)} / ${text(row.registrationNumber || row.registration)}`)),
    actors: section("Actor analytics", { actors: data.actors.length, castingAssignments: data.casting.length, confirmedRoles: data.casting.filter((row) => row.status === "confirmed").length, auditions: data.casting.filter((row) => text(row.status).includes("audition")).length }, topRows(data.actors, ["fullName", "name", "stageName"], (row) => text(row.status), (row) => `${text(row.availabilityStatus)} / ${text(row.city)}`)),
    production: section("Production analytics", { scenes: data.scenes.length, missingCast: data.scenes.filter((row) => !row.castReady && row.productionStatus !== "completed").length, missingLocation: data.scenes.filter((row) => !row.propertyId && !row.locationId).length, scheduled: data.scenes.filter((row) => row.productionStatus === "scheduled").length }, topRows(data.scenes, ["title", "sceneCode"], (row) => text(row.productionStatus), (row) => `${text(row.episodeId)} / ${text(row.continuityStatus)}`)),
    assets: section("Asset analytics", { assets: data.assets.length, uploaded: data.assets.filter((row) => row.downloadUrl || row.imageUrl).length, prompts: await readerDb.assetPromptCache.count(), linkedToEpisodes: data.assets.filter((row) => Array.isArray(row.relatedEpisodeIds) && row.relatedEpisodeIds.length).length }, topRows(data.assets, ["title", "name"], (row) => text(row.assetType || row.type), (row) => `${text(row.category)} / ${text(row.status)}`)),
    commerce: section("Commerce analytics", { vendors: data.vendors.length, products: data.products.length, categories: Object.keys(groupCount(data.products, "category")).length, views: commerceViews, whatsappClicks: countEvent(data.commerceLogs, "whatsapp_clicked"), callClicks: countEvent(data.commerceLogs, "call_clicked") }, topRows(data.commerceLogs, ["eventType", "searchTerm"], (row) => text(row.vendorId || row.productId || row.searchTerm), (row) => text(row.createdAt))),
    staff: section("Staff analytics", { activeStaff: data.staff.filter((row) => row.active !== false).length, inactiveStaff: data.staff.filter((row) => row.active === false).length, auditLogs: data.auditLogs.length, deniedAccess: data.auditLogs.filter((row) => text(row.action).includes("access denied")).length }, topRows(data.auditLogs, ["action", "actorEmail"], (row) => text(row.targetType), (row) => `${text(row.targetId)} / ${text(row.createdAt)}`)),
  };

  const searchPool = Object.entries(sections).flatMap(([view, value]) => value.rows.map((row) => ({ ...row, detail: `${view}: ${row.detail}` })));
  const analytics = { overview, sections, searchResults: searchPool.slice(0, 40), lastRefreshed: nowIso };
  await saveAnalyticsSnapshot("executive", filters, analytics).catch(() => undefined);
  return analytics;
}

async function saveAnalyticsSnapshot(snapshotType: string, filters: AnalyticsFilters, analytics: ExecutiveAnalytics) {
  const id = `${snapshotType}-${filters.dateFrom || "all"}-${filters.dateTo || "all"}`;
  const nowIso = new Date().toISOString();
  await readerDb.analyticsSnapshotCache.put({
    id,
    snapshotType,
    period: filters.dateFrom || filters.dateTo ? "custom" : "all",
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    metrics: analytics.overview,
    createdAt: nowIso,
    updatedAt: nowIso,
  });
  await readerDb.analyticsCache.put({ id: "latest-executive", cacheKey: "latest-executive", payload: analytics as unknown as Record<string, unknown>, updatedAt: nowIso });
  await readerDb.analyticsFilterCache.put({ id: "last", filters: { ...filters }, updatedAt: nowIso });
}

export function exportRowsToCsv(filename: string, rows: AnalyticsRow[]) {
  const headers = ["id", "label", "metric", "detail", "status"];
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((row) => headers.map((key) => escape(row[key as keyof AnalyticsRow])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
