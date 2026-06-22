import { collection, doc, getDocs, orderBy, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import {
  awardReaderBadge,
  getOrCreateReaderIdentity,
  getReaderLevel,
  logActivity,
  readerDb,
  refreshLocalRanking,
  updateReaderIdentity,
  type ReaderProfileRecord,
  type ReaderRank,
  type StoryVote,
} from "./offlineDb";

export const readerRanks: ReaderRank[] = ["Citizen", "Insider", "Influencer", "Advisor", "Investor", "Empire Builder", "Legend"];

export const communityBadges = [
  { badgeCode: "early_reader", title: "Early Reader", description: "Joined and completed early reader activity.", icon: "ER" },
  { badgeCode: "episode_explorer", title: "Episode Explorer", description: "Completed multiple Empire of Trust episodes.", icon: "EE" },
  { badgeCode: "quiz_master", title: "Quiz Master", description: "Passed Empire of Trust quizzes.", icon: "QM" },
  { badgeCode: "investor_mind", title: "Investor Mind", description: "Voted on business or investment decisions.", icon: "IM" },
  { badgeCode: "community_leader", title: "Community Leader", description: "Participated in the wider reader community.", icon: "CL" },
  { badgeCode: "top_reader", title: "Top Reader", description: "Reached high local reward points.", icon: "TR" },
  { badgeCode: "founder_member", title: "Founder Member", description: "Established a persistent ReaderID profile.", icon: "FM" },
  { badgeCode: "empire_builder", title: "Empire Builder", description: "Reached Empire Builder rank.", icon: "EB" },
];

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function rankPoints(rank: ReaderRank) {
  return readerRanks.indexOf(rank);
}

export async function recordDailyLogin() {
  const identity = await getOrCreateReaderIdentity();
  const logId = `daily_${identity.readerId}_${todayKey()}`;
  const existing = await readerDb.readerActivityLog.get(logId);
  if (existing) return existing;
  await readerDb.readerActivityLog.put({
    id: logId,
    readerId: identity.readerId,
    eventType: "daily_login",
    metadata: {},
    createdAt: now(),
    syncStatus: "pending",
  });
  await logActivity("daily_login", { targetType: "readerProfile", targetId: identity.readerId }, identity);
  return readerDb.readerActivityLog.get(logId);
}

export async function saveCommunityProfile(input: { displayName: string; avatar: string; country: string; city: string }) {
  const identity = await updateReaderIdentity({ displayName: input.displayName, avatarUrl: input.avatar });
  const profile = await getReaderCommunityProfile();
  const next: ReaderProfileRecord = {
    ...profile,
    displayName: input.displayName.trim() || profile.displayName,
    avatar: input.avatar.trim(),
    country: input.country.trim(),
    city: input.city.trim(),
    lastSeenAt: now(),
    syncStatus: "pending",
  };
  await readerDb.readerProfiles.put(next);
  await readerDb.syncQueue.put({
    id: `readerProfiles_${identity.readerId}`,
    readerId: identity.readerId,
    entityType: "readerProfiles",
    entityId: identity.readerId,
    operation: "update",
    payload: next as unknown as Record<string, unknown>,
    createdAt: now(),
    attemptCount: 0,
    syncStatus: "pending",
  });
  await awardReaderBadge({ badgeCode: "founder_member", title: "Founder Member", description: "Created a persistent ReaderID profile.", icon: "FM" });
  return next;
}

export async function getReaderCommunityProfile(): Promise<ReaderProfileRecord> {
  const identity = await getOrCreateReaderIdentity();
  const existing = await readerDb.readerProfiles.get(identity.readerId);
  const [rewards, badges, completedEpisodes, libraryProgress, quizAttempts, participation] = await Promise.all([
    readerDb.readerRewards.where("readerId").equals(identity.readerId).toArray(),
    readerDb.readerBadges.where("readerId").equals(identity.readerId).toArray(),
    readerDb.readerActivityLog.where("eventType").equals("episode_completed").toArray(),
    readerDb.libraryReadingProgress.toArray(),
    readerDb.readerQuizAttempts.where("readerId").equals(identity.readerId).toArray(),
    readerDb.readerParticipation.where("readerId").equals(identity.readerId).toArray(),
  ]);
  const rewardPoints = rewards.reduce((sum, reward) => sum + reward.points, 0);
  const currentRank = getReaderLevel(rewardPoints) as ReaderRank;
  const profile: ReaderProfileRecord = {
    id: identity.readerId,
    readerId: identity.readerId,
    displayName: identity.displayName || existing?.displayName || identity.readerId.slice(0, 18),
    avatar: identity.avatarUrl || existing?.avatar || "",
    country: existing?.country || "",
    city: existing?.city || "",
    joinedAt: existing?.joinedAt || identity.createdAt,
    lastSeenAt: now(),
    reputationScore: rewardPoints + badges.length * 20,
    participationScore: participation.reduce((sum, item) => sum + (item.scoreImpact ?? 1), 0),
    episodeCount: new Set(completedEpisodes.map((log) => log.episodeId).filter(Boolean)).size,
    bookletCount: new Set(libraryProgress.map((progress) => progress.bookletId)).size,
    quizCount: quizAttempts.length,
    rewardPoints,
    badges: badges.map((badge) => badge.badgeCode),
    currentRank,
    syncStatus: existing?.syncStatus ?? "pending",
  };
  await readerDb.readerProfiles.put(profile);
  await refreshLocalRanking();
  if (currentRank === "Empire Builder" || currentRank === "Legend") {
    await awardReaderBadge({ badgeCode: "empire_builder", title: "Empire Builder", description: "Reached Empire Builder rank.", icon: "EB" });
  }
  return profile;
}

export async function submitStoryVote(input: { episodeId: string; voteType: StoryVote["voteType"]; voteValue: string }) {
  const identity = await getOrCreateReaderIdentity();
  const vote: StoryVote = {
    id: id("story_vote"),
    episodeId: input.episodeId.trim() || "future",
    readerId: identity.readerId,
    voteType: input.voteType,
    voteValue: input.voteValue.trim(),
    createdAt: now(),
    syncStatus: "pending",
  };
  await readerDb.storyVotes.put(vote);
  await readerDb.syncQueue.put({
    id: `storyVotes_${vote.id}`,
    readerId: identity.readerId,
    entityType: "storyVotes",
    entityId: vote.id,
    operation: "create",
    payload: vote as unknown as Record<string, unknown>,
    createdAt: now(),
    attemptCount: 0,
    syncStatus: "pending",
  });
  await logActivity("story_vote_cast", { episodeId: vote.episodeId, targetType: "storyVote", targetId: vote.id, metadata: { voteType: vote.voteType, voteValue: vote.voteValue } }, identity);
  if (vote.voteType === "business_decision" || vote.voteType === "investment_option") {
    await awardReaderBadge({ badgeCode: "investor_mind", title: "Investor Mind", description: "Voted on business or investment options.", icon: "IM" });
  }
  return vote;
}

export async function recordCommunityAction(action: "community_participation" | "invite_accepted" | "content_reviewed") {
  const identity = await getOrCreateReaderIdentity();
  const log = await logActivity(action, { targetType: "readerProfile", targetId: identity.readerId }, identity);
  if (action === "community_participation") {
    await awardReaderBadge({ badgeCode: "community_leader", title: "Community Leader", description: "Participated in the reader community.", icon: "CL" });
  }
  return log;
}

export async function getParticipationDashboard() {
  await recordDailyLogin().catch(() => undefined);
  const profile = await getReaderCommunityProfile();
  const [rewards, badges, history, storyVotes, pendingQueue] = await Promise.all([
    readerDb.readerRewards.where("readerId").equals(profile.readerId).toArray(),
    readerDb.readerBadges.where("readerId").equals(profile.readerId).toArray(),
    readerDb.readerActivityLog.where("readerId").equals(profile.readerId).reverse().sortBy("createdAt"),
    readerDb.storyVotes.where("readerId").equals(profile.readerId).reverse().sortBy("createdAt"),
    readerDb.syncQueue.where("syncStatus").equals("pending").count(),
  ]);
  return { profile, rewards, badges, history: history.reverse(), storyVotes: storyVotes.reverse(), pendingQueue };
}

export async function getParticipationRankings(scope: "global" | "country" | "city") {
  const profile = await getReaderCommunityProfile();
  if (isFirebaseConfigured && navigator.onLine) {
    try {
      const constraints = scope === "country" && profile.country
        ? [where("country", "==", profile.country), orderBy("rewardPoints", "desc")]
        : scope === "city" && profile.city
          ? [where("city", "==", profile.city), orderBy("rewardPoints", "desc")]
          : [orderBy("rewardPoints", "desc")];
      const snapshots = await getDocs(query(collection(db, "readerProfiles"), ...constraints));
      const rows = snapshots.docs.map((snapshot) => snapshot.data() as ReaderProfileRecord);
      if (rows.length) {
        await readerDb.readerProfiles.bulkPut(rows);
        return rows;
      }
    } catch {
      // Fall back to local IndexedDB rankings.
    }
  }
  const rows = await readerDb.readerProfiles.toArray();
  return rows
    .filter((row) => scope === "global" || (scope === "country" ? row.country === profile.country : row.city === profile.city))
    .sort((a, b) => b.rewardPoints - a.rewardPoints || rankPoints(b.currentRank) - rankPoints(a.currentRank));
}

export async function syncCommunityActivity() {
  if (!isFirebaseConfigured || !navigator.onLine) return { synced: 0, skipped: true };
  const profile = await getReaderCommunityProfile();
  const pending = await readerDb.syncQueue.where("syncStatus").equals("pending").toArray();
  let synced = 0;
  await setDoc(doc(db, "readerProfiles", profile.readerId), { ...profile, updatedAt: serverTimestamp() }, { merge: true });
  for (const item of pending) {
    if (item.entityType === "readerProfiles") {
      await setDoc(doc(db, "readerProfiles", item.entityId), { ...item.payload, updatedAt: serverTimestamp() }, { merge: true });
    } else if (item.entityType === "storyVotes") {
      await setDoc(doc(db, "storyVotes", item.entityId), { ...item.payload, updatedAt: serverTimestamp() }, { merge: true });
    } else if (item.entityType === "readerActivityLog") {
      await setDoc(doc(db, "readerActivityLog", item.entityId), { ...item.payload, updatedAt: serverTimestamp() }, { merge: true });
    } else if (item.entityType === "readerRankings") {
      await setDoc(doc(db, "readerRankings", item.entityId), { ...item.payload, updatedAt: serverTimestamp() }, { merge: true });
    }
    await readerDb.syncQueue.update(item.id, { syncStatus: "synced", lastAttemptAt: now(), attemptCount: item.attemptCount + 1 });
    synced += 1;
  }
  await setDoc(doc(db, "readerRankings", profile.readerId), {
    id: profile.readerId,
    readerId: profile.readerId,
    displayName: profile.displayName,
    country: profile.country,
    city: profile.city,
    rank: profile.currentRank,
    points: profile.rewardPoints,
    badges: profile.badges.length,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return { synced, skipped: false };
}

export async function getStudioCommunityAnalytics() {
  const [profiles, logs, votes, episodePacks, libraryPacks] = await Promise.all([
    readerDb.readerProfiles.toArray(),
    readerDb.readerActivityLog.toArray(),
    readerDb.storyVotes.toArray(),
    readerDb.episodePacks.toArray(),
    readerDb.libraryPacks.toArray(),
  ]);
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const activeReaders = new Set(logs.map((log) => log.readerId)).size;
  const dailyReaders = new Set(logs.filter((log) => Date.parse(log.createdAt) >= dayAgo).map((log) => log.readerId)).size;
  const weeklyReaders = new Set(logs.filter((log) => Date.parse(log.createdAt) >= weekAgo).map((log) => log.readerId)).size;
  const countryDistribution = Object.entries(profiles.reduce<Record<string, number>>((counts, profile) => ({ ...counts, [profile.country || "Unknown"]: (counts[profile.country || "Unknown"] ?? 0) + 1 }), {}));
  const participationTrends = Object.entries(logs.reduce<Record<string, number>>((counts, log) => ({ ...counts, [log.eventType]: (counts[log.eventType] ?? 0) + 1 }), {}));
  const popularEpisodes = Object.entries(logs.filter((log) => log.episodeId).reduce<Record<string, number>>((counts, log) => ({ ...counts, [log.episodeId || ""]: (counts[log.episodeId || ""] ?? 0) + 1 }), {}))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const popularBooklets = Object.entries(logs.filter((log) => log.targetType === "libraryBooklet" || log.targetType === "librarySection").reduce<Record<string, number>>((counts, log) => ({ ...counts, [String(log.targetId || "booklet")]: (counts[String(log.targetId || "booklet")] ?? 0) + 1 }), {}))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  return {
    activeReaders,
    dailyReaders,
    weeklyReaders,
    topReaders: profiles.sort((a, b) => b.rewardPoints - a.rewardPoints).slice(0, 8),
    countryDistribution,
    participationTrends,
    popularEpisodes,
    popularBooklets,
    storyVotes: votes.length,
    importedEpisodes: episodePacks.length,
    importedBooklets: libraryPacks.length,
  };
}
