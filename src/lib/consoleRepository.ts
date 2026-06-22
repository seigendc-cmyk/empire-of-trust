import { collection, getCountFromServer, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "./firebase";

type Row = Record<string, unknown> & { id: string };

export type ConsoleView =
  | "overview"
  | "readers"
  | "episodes"
  | "characters"
  | "predictions"
  | "quizzes"
  | "licensing"
  | "rpn"
  | "vendors"
  | "publishing";

export interface ConsoleFilters {
  search: string;
  dateFrom: string;
  dateTo: string;
  season: string;
  episode: string;
  character: string;
  licencePlan: string;
}

export interface ReaderScore {
  readerId: string;
  displayName: string;
  engagementScore: number;
  category: "Casual Reader" | "Active Reader" | "Loyal Reader" | "Community Leader" | "Empire Insider";
  points: number;
  badges: number;
  completions: number;
  predictions: number;
  quizzes: number;
}

export interface ConsoleAnalytics {
  overview: Record<string, number>;
  readers: ReaderScore[];
  episodes: Array<Row & { opens: number; completions: number; completionRate: number; predictionParticipation: number; quizParticipation: number; popularityRanking: number }>;
  characters: Array<Row & { profileOpens: number; relationshipViews: number; popularityScore: number; supportScore: number; predictionMentions: number }>;
  predictions: Array<Row & { participationCount: number; optionDistribution: Record<string, number>; accuracy: number }>;
  quizzes: Array<Row & { attempts: number; passRate: number; averageScore: number; hardestQuestions: string[]; easiestQuestions: string[] }>;
  licensing: {
    activations: number;
    activeLicences: number;
    expiredLicences: number;
    planDistribution: Record<string, number>;
  };
  rpn: {
    agents: Array<Row & { requestsSubmitted: number; approvals: number; approvalRate: number; conversionRate: number }>;
    requestsSubmitted: number;
  };
  vendors: Array<Row & { storefrontViews: number; productViews: number; popularity: number; category: string }>;
  publishing: {
    byStatus: Record<string, number>;
    scheduledReleases: number;
    publishedReleases: number;
    archivedReleases: number;
  };
  searchResults: Row[];
}

async function countCollection(collectionName: string) {
  try {
    const snapshot = await getCountFromServer(collection(db, collectionName));
    return snapshot.data().count;
  } catch {
    return 0;
  }
}

async function listCollection(collectionName: string, orderField = "", max = 200): Promise<Row[]> {
  try {
    const source = orderField ? query(collection(db, collectionName), orderBy(orderField, "desc"), limit(max)) : query(collection(db, collectionName), limit(max));
    const snapshot = await getDocs(source);
    return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Record<string, unknown>) }));
  } catch {
    return [];
  }
}

async function countWhere(collectionName: string, field: string, op: "==" | "!=" | ">" | ">=" | "<" | "<=", value: unknown) {
  try {
    const snapshot = await getCountFromServer(query(collection(db, collectionName), where(field, op, value)));
    return snapshot.data().count;
  } catch {
    return 0;
  }
}

function stringValue(value: unknown) {
  return String(value ?? "");
}

function numberValue(value: unknown) {
  return Number(value ?? 0) || 0;
}

function dateValue(value: unknown) {
  if (typeof value === "string") return Date.parse(value) || 0;
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") return value.toDate().getTime();
  return 0;
}

function matchesDate(row: Row, filters: ConsoleFilters) {
  const created = dateValue(row.createdAt ?? row.updatedAt ?? row.earnedAt ?? row.completedAt);
  if (!created) return true;
  if (filters.dateFrom && created < Date.parse(filters.dateFrom)) return false;
  if (filters.dateTo && created > Date.parse(filters.dateTo)) return false;
  return true;
}

function textMatches(row: Row, term: string) {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return true;
  return Object.values(row).some((value) => stringValue(value).toLowerCase().includes(normalized));
}

function groupCount(rows: Row[], key: string) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const value = stringValue(row[key] || "unknown");
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function readerCategory(score: number): ReaderScore["category"] {
  if (score >= 1000) return "Empire Insider";
  if (score >= 500) return "Community Leader";
  if (score >= 250) return "Loyal Reader";
  if (score >= 75) return "Active Reader";
  return "Casual Reader";
}

function buildReaderScores(profiles: Row[], logs: Row[], choices: Row[], rewards: Row[], badges: Row[], quizAttempts: Row[]) {
  const ids = new Set<string>();
  [...profiles, ...logs, ...choices, ...rewards, ...badges, ...quizAttempts].forEach((row) => {
    const readerId = stringValue(row.readerId || row.id);
    if (readerId) ids.add(readerId);
  });
  return [...ids].map((readerId) => {
    const profile = profiles.find((row) => row.id === readerId || row.readerId === readerId);
    const readerLogs = logs.filter((row) => row.readerId === readerId);
    const readerChoices = choices.filter((row) => row.readerId === readerId);
    const readerRewards = rewards.filter((row) => row.readerId === readerId);
    const readerBadges = badges.filter((row) => row.readerId === readerId);
    const readerQuizzes = quizAttempts.filter((row) => row.readerId === readerId);
    const points = readerRewards.reduce((sum, row) => sum + numberValue(row.points), 0);
    const completions = readerLogs.filter((row) => row.eventType === "episode_completed").length;
    const predictions = readerChoices.filter((row) => row.choiceType === "prediction").length;
    const quizzes = readerQuizzes.length || readerLogs.filter((row) => row.eventType === "quiz_completed").length;
    const engagementScore = points + completions * 25 + predictions * 10 + quizzes * 20 + readerBadges.length * 15 + readerLogs.length;
    return {
      readerId,
      displayName: stringValue(profile?.displayName || profile?.name || readerId.slice(0, 18)),
      engagementScore,
      category: readerCategory(engagementScore),
      points,
      badges: readerBadges.length,
      completions,
      predictions,
      quizzes,
    };
  }).sort((a, b) => b.engagementScore - a.engagementScore);
}

function optionDistribution(rows: Row[]) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const option = stringValue(row.selectedOption || row.response || "unknown");
    acc[option] = (acc[option] ?? 0) + 1;
    return acc;
  }, {});
}

export async function getCommandConsoleAnalytics(filters: ConsoleFilters): Promise<ConsoleAnalytics> {
  const [
    profiles,
    logs,
    choices,
    rewards,
    badges,
    episodes,
    packs,
    licences,
    agents,
    quizzes,
    predictions,
    businesses,
    readerCount,
    packsCount,
    activeLicences,
  ] = await Promise.all([
    listCollection("eotReaderProfiles", "createdAt"),
    listCollection("eotReaderActivityLogs", "createdAt", 500),
    listCollection("eotReaderChoices", "createdAt", 500),
    listCollection("eotReaderRewards", "earnedAt", 500),
    listCollection("eotReaderBadges", "earnedAt", 500),
    listCollection("eotEpisodes", "updatedAt", 300),
    listCollection("eotPacks", "updatedAt", 300),
    listCollection("eotLicences", "issuedAt", 300),
    listCollection("eotAgents", "createdAt", 200),
    listCollection("eotQuizzes", "createdAt", 200),
    listCollection("eotPredictions", "closingDate", 200),
    listCollection("eotBusinesses", "updatedAt", 200),
    countCollection("eotReaderProfiles"),
    countCollection("eotPacks"),
    countWhere("eotLicences", "status", "==", "active"),
  ]);

  const visibleLogs = logs.filter((row) => matchesDate(row, filters));
  const visibleChoices = choices.filter((row) => matchesDate(row, filters));
  const visibleRewards = rewards.filter((row) => matchesDate(row, filters));
  const visibleEpisodes = episodes.filter((row) => {
    if (filters.season && stringValue(row.seasonNumber) !== filters.season) return false;
    if (filters.episode && stringValue(row.episodeNumber) !== filters.episode) return false;
    return textMatches(row, filters.search);
  });
  const quizAttempts = visibleLogs.filter((row) => row.eventType === "quiz_completed");
  const readerScores = buildReaderScores(profiles, visibleLogs, visibleChoices, visibleRewards, badges, quizAttempts);

  const episodeAnalytics = visibleEpisodes.map((episode) => {
    const episodeId = episode.id;
    const episodeLogs = visibleLogs.filter((row) => row.episodeId === episodeId);
    const opens = episodeLogs.filter((row) => row.eventType === "episode_opened").length;
    const completions = episodeLogs.filter((row) => row.eventType === "episode_completed").length;
    const predictionParticipation = visibleChoices.filter((row) => row.episodeId === episodeId && row.choiceType === "prediction").length;
    const quizParticipation = quizAttempts.filter((row) => row.episodeId === episodeId).length;
    const progressEvents = episodeLogs.filter((row) => row.eventType === "paragraph_viewed").length;
    return {
      ...episode,
      opens,
      completions,
      completionRate: opens ? Math.round((completions / opens) * 100) : 0,
      averageReadingProgress: progressEvents,
      averageTimeSpent: 0,
      predictionParticipation,
      quizParticipation,
      popularityRanking: opens + completions * 3 + predictionParticipation + quizParticipation,
    };
  }).sort((a, b) => b.popularityRanking - a.popularityRanking);

  const characterAnalytics = businesses
    .filter((row) => !filters.search || textMatches(row, filters.search))
    .map((business) => {
      const id = business.id;
      const profileOpens = visibleLogs.filter((row) => row.targetType === "character" && row.targetId === id).length;
      const relationshipViews = visibleLogs.filter((row) => row.targetType === "relationship" && row.targetId === id).length;
      const predictionMentions = visibleChoices.filter((row) => stringValue(row.prompt).toLowerCase().includes(stringValue(business.name).toLowerCase())).length;
      return { ...business, profileOpens, relationshipViews, episodeAppearances: 0, popularityScore: profileOpens + relationshipViews + predictionMentions, supportScore: 0, predictionMentions };
    });

  const predictionAnalytics = predictions.map((prediction) => {
    const rows = visibleChoices.filter((row) => row.choiceType === "prediction" && (row.predictionId === prediction.id || stringValue(row.prompt) === stringValue(prediction.question)));
    return { ...prediction, participationCount: rows.length, optionDistribution: optionDistribution(rows), accuracy: 0 };
  });

  const quizAnalytics = quizzes.map((quiz) => {
    const attempts = quizAttempts.filter((row) => row.targetId === quiz.id || row.quizId === quiz.id);
    const scores = attempts.map((row) => numberValue((row.metadata as Record<string, unknown> | undefined)?.score ?? row.score));
    const maxScores = attempts.map((row) => numberValue(((row.metadata as Record<string, unknown> | undefined)?.maxScore ?? row.maxScore) || 1));
    const averageScore = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
    const passRate = attempts.length ? Math.round((scores.filter((score, index) => score >= maxScores[index] * 0.6).length / attempts.length) * 100) : 0;
    return { ...quiz, attempts: attempts.length, passRate, averageScore, hardestQuestions: [], easiestQuestions: [] };
  });

  const expiredLicences = licences.filter((row) => row.status === "expired").length;
  const agentRequests = await listCollection("eotAgentActivationRequests", "createdAt", 300);
  const rpnAgents = agents.map((agent) => {
    const requests = agentRequests.filter((row) => row.agentCode === agent.agentCode);
    const approvals = requests.filter((row) => row.status === "approved" || row.status === "completed").length;
    const completions = requests.filter((row) => row.status === "completed").length;
    return { ...agent, requestsSubmitted: requests.length, approvals, approvalRate: requests.length ? Math.round((approvals / requests.length) * 100) : 0, conversionRate: requests.length ? Math.round((completions / requests.length) * 100) : 0 };
  });

  const vendorAnalytics = businesses.map((business) => {
    const storefrontViews = visibleLogs.filter((row) => row.targetType === "vendor" && row.targetId === business.id).length;
    const productViews = visibleLogs.filter((row) => row.targetType === "product" && (row.metadata as Record<string, unknown> | undefined)?.vendorId === business.id).length;
    return { ...business, storefrontViews, productViews, popularity: storefrontViews + productViews, category: stringValue(business.sector || "General") };
  }).sort((a, b) => b.popularity - a.popularity);

  const publishingByStatus = groupCount(episodes, "status");
  const searchPool = [...profiles, ...episodes, ...businesses, ...predictions, ...quizzes].filter((row) => textMatches(row, filters.search)).slice(0, 30);

  return {
    overview: {
      totalReaders: readerCount || profiles.length,
      activeReaders: new Set(visibleLogs.map((row) => row.readerId).filter(Boolean)).size,
      importedPacks: packsCount || packs.length,
      episodesPublished: episodes.filter((row) => row.status === "published").length,
      episodesCompleted: visibleLogs.filter((row) => row.eventType === "episode_completed").length,
      predictionsSubmitted: visibleChoices.filter((row) => row.choiceType === "prediction").length,
      quizzesCompleted: quizAttempts.length,
      licencesActivated: activeLicences,
      activeVendors: businesses.filter((row) => row.status !== "inactive").length,
      totalPointsAwarded: visibleRewards.reduce((sum, row) => sum + numberValue(row.points), 0),
    },
    readers: readerScores,
    episodes: episodeAnalytics,
    characters: characterAnalytics,
    predictions: predictionAnalytics,
    quizzes: quizAnalytics,
    licensing: { activations: licences.length, activeLicences, expiredLicences, planDistribution: groupCount(licences, "plan") },
    rpn: { agents: rpnAgents, requestsSubmitted: agentRequests.length },
    vendors: vendorAnalytics,
    publishing: {
      byStatus: publishingByStatus,
      scheduledReleases: publishingByStatus.scheduled ?? 0,
      publishedReleases: publishingByStatus.published ?? 0,
      archivedReleases: publishingByStatus.archived ?? 0,
    },
    searchResults: searchPool,
  };
}
