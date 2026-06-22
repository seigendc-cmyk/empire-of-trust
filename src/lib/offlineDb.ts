import Dexie, { type Table } from "dexie";
import type {
  EpisodePack,
  ActivationAttempt,
  AgentActivationRequest,
  DeviceIdentity,
  EotActor,
  EotAsset,
  EotBusiness,
  EotCatalogueEntry,
  EotCharacter,
  EotContentRule,
  EotLeaderboardEntry,
  EotPoll,
  EotProduct,
  EotProductCategory,
  EotPrediction,
  EotProperty,
  EotQuiz,
  EotPublishedPack,
  EotReleaseSchedule,
  EotRelationship,
  EotVendor,
  EotVendorBranch,
  EotVendorContact,
  EotVehicle,
  LicenceActivityLog,
  LocalLicence,
  EotCasting,
  EotContinuityRecord,
  EotLocation,
  EotProductionAsset,
  EotProductionProperty,
  EotProductionSchedule,
  EotProductionVehicle,
  EotScene,
  EotBusinessTimeline,
  EotCharacterArc,
  EotConflictMap,
  EotContinuityCheck,
  EotEpisodePlan,
  EotRelationshipArc,
  EotStoryPrompt,
  EotStoryRule,
  EotStoryTimeline,
  ProductionActor,
  ProductionCharacter,
  ScratchCardAttempt,
  VendorPack,
} from "../types";

export type SyncStatus = "pending" | "synced" | "failed";
export type ReaderEventType =
  | "app_opened"
  | "reader_created"
  | "pack_imported"
  | "episode_opened"
  | "chapter_opened"
  | "paragraph_viewed"
  | "reading_progress_saved"
  | "episode_completed"
  | "interactive_link_clicked"
  | "character_profile_opened"
  | "prediction_submitted"
  | "poll_voted"
  | "choice_made"
  | "quiz_started"
  | "quiz_completed"
  | "reward_earned"
  | "badge_earned"
  | "leaderboard_viewed";

export interface ReaderIdentity {
  readerId: string;
  deviceId: string;
  displayName?: string;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
  lastSeenAt: string;
  syncStatus: SyncStatus;
}

export interface ReadingProgress {
  episodeId: string;
  chapterId: string;
  paragraphId: string;
  updatedAt: string;
}

export interface ReaderActivityLog {
  id: string;
  readerId: string;
  eventType: ReaderEventType;
  episodeId?: string;
  chapterId?: string;
  paragraphId?: string;
  targetType?: string;
  targetId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  syncedAt?: string;
  syncStatus: SyncStatus;
}

export interface ReaderChoice {
  id: string;
  readerId: string;
  episodeId: string;
  chapterId?: string;
  paragraphId?: string;
  choiceType: "prediction" | "vote" | "moral_choice" | "business_decision" | "relationship_choice" | "succession_choice";
  prompt: string;
  selectedOption: string;
  optionsJson: string;
  createdAt: string;
  syncStatus: SyncStatus;
  syncedAt?: string;
}

export interface ReaderReward {
  id: string;
  readerId: string;
  rewardType: "points" | "badge" | "unlock" | "rank";
  title: string;
  description: string;
  points: number;
  sourceEventId?: string;
  episodeId?: string;
  earnedAt: string;
  syncStatus: SyncStatus;
}

export interface ReaderBadge {
  id: string;
  readerId: string;
  badgeCode: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: string;
  syncStatus: SyncStatus;
}

export interface ReaderDramaParticipation {
  id: string;
  readerId: string;
  participationType: "prediction" | "poll" | "debate" | "decision" | "fan_theory" | "character_support";
  episodeId?: string;
  characterId?: string;
  prompt: string;
  response: string;
  scoreImpact?: number;
  createdAt: string;
  syncStatus: SyncStatus;
}

export type ReaderParticipation = ReaderDramaParticipation;

export interface ReaderPollVote {
  id: string;
  readerId: string;
  pollId: string;
  episodeId?: string;
  selectedOption: string;
  optionsJson: string;
  createdAt: string;
  syncStatus: SyncStatus;
}

export interface ReaderPredictionSubmission {
  id: string;
  readerId: string;
  predictionId: string;
  episodeId?: string;
  selectedOption: string;
  optionsJson: string;
  createdAt: string;
  syncStatus: SyncStatus;
}

export interface ReaderQuizAttempt {
  id: string;
  readerId: string;
  quizId: string;
  episodeId?: string;
  score: number;
  maxScore: number;
  answersJson: string;
  completedAt: string;
  syncStatus: SyncStatus;
}

export interface ReaderRanking {
  id: string;
  readerId: string;
  displayName: string;
  level: string;
  points: number;
  badges: number;
  completedEpisodes: number;
  predictions: number;
  quizScores: number;
  period: "local" | "weekly" | "monthly" | "allTime";
  updatedAt: string;
  syncStatus: SyncStatus;
}

export interface SyncQueueItem {
  id: string;
  readerId: string;
  entityType:
    | "readerActivityLog"
    | "readerChoices"
    | "readerRewards"
    | "readerBadges"
    | "readerDramaParticipation"
    | "readerIdentity"
    | "readerQuizAttempts"
    | "readerPollVotes"
    | "readerPredictions"
    | "readerRankings";
  entityId: string;
  operation: "create" | "update" | "delete";
  payload: Record<string, unknown>;
  createdAt: string;
  attemptCount: number;
  lastAttemptAt?: string;
  syncStatus: SyncStatus;
}

export interface ReaderSettings {
  id: "reader";
  fontSize: "small" | "medium" | "large";
  showImagePrompts: boolean;
  showMetadata: boolean;
}

class EotReaderDb extends Dexie {
  readerIdentity!: Table<ReaderIdentity, string>;
  episodePacks!: Table<EpisodePack, string>;
  readingProgress!: Table<ReadingProgress, string>;
  readerActivityLog!: Table<ReaderActivityLog, string>;
  readerChoices!: Table<ReaderChoice, string>;
  readerQuizAttempts!: Table<ReaderQuizAttempt, string>;
  readerPollVotes!: Table<ReaderPollVote, string>;
  readerPredictions!: Table<ReaderPredictionSubmission, string>;
  readerRewards!: Table<ReaderReward, string>;
  readerBadges!: Table<ReaderBadge, string>;
  readerRankings!: Table<ReaderRanking, string>;
  readerDramaParticipation!: Table<ReaderDramaParticipation, string>;
  readerParticipation!: Table<ReaderParticipation, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  readerSettings!: Table<ReaderSettings, string>;
  deviceIdentity!: Table<DeviceIdentity, string>;
  localLicences!: Table<LocalLicence, string>;
  activationAttempts!: Table<ActivationAttempt, string>;
  scratchCardAttempts!: Table<ScratchCardAttempt, string>;
  agentActivationRequests!: Table<AgentActivationRequest, string>;
  licenceActivityLog!: Table<LicenceActivityLog, string>;
  characterCache!: Table<EotCharacter, string>;
  assetCache!: Table<EotActor | EotAsset | EotBusiness | EotProperty | EotVehicle, string>;
  relationshipCache!: Table<EotRelationship, string>;
  vendorPacks!: Table<VendorPack, string>;
  vendors!: Table<EotVendor, string>;
  products!: Table<EotProduct, string>;
  productCategories!: Table<EotProductCategory, string>;
  vendorBranches!: Table<EotVendorBranch, string>;
  vendorContacts!: Table<EotVendorContact, string>;
  quizCache!: Table<EotQuiz, string>;
  pollCache!: Table<EotPoll, string>;
  predictionCache!: Table<EotPrediction, string>;
  leaderboardCache!: Table<EotLeaderboardEntry, string>;
  catalogueCache!: Table<EotCatalogueEntry, string>;
  publishedPackCache!: Table<EotPublishedPack, string>;
  releaseScheduleCache!: Table<EotReleaseSchedule, string>;
  contentRuleCache!: Table<EotContentRule, string>;
  productionActorCache!: Table<ProductionActor, string>;
  castingCache!: Table<EotCasting, string>;
  productionCharacterCache!: Table<ProductionCharacter, string>;
  sceneCache!: Table<EotScene, string>;
  locationCache!: Table<EotLocation, string>;
  productionPropertyCache!: Table<EotProductionProperty, string>;
  productionVehicleCache!: Table<EotProductionVehicle, string>;
  productionAssetCache!: Table<EotProductionAsset, string>;
  productionScheduleCache!: Table<EotProductionSchedule, string>;
  continuityRecordCache!: Table<EotContinuityRecord, string>;
  storyTimelineCache!: Table<EotStoryTimeline, string>;
  characterArcCache!: Table<EotCharacterArc, string>;
  relationshipArcCache!: Table<EotRelationshipArc, string>;
  businessTimelineCache!: Table<EotBusinessTimeline, string>;
  conflictMapCache!: Table<EotConflictMap, string>;
  continuityCheckCache!: Table<EotContinuityCheck, string>;
  episodePlanCache!: Table<EotEpisodePlan, string>;
  storyPromptCache!: Table<EotStoryPrompt, string>;
  storyRuleCache!: Table<EotStoryRule, string>;

  constructor() {
    super("eot-reader-packs");
    this.version(3).stores({
      readerIdentity: "readerId, deviceId, syncStatus",
      episodePacks: "content.episode.id, manifest.title, manifest.packId, manifest.version",
      readingProgress: "episodeId, chapterId, updatedAt",
      readerActivityLog: "id, readerId, eventType, episodeId, syncStatus, createdAt",
      readerChoices: "id, readerId, episodeId, choiceType, syncStatus, createdAt",
      readerQuizAttempts: "id, readerId, episodeId, syncStatus, createdAt",
      readerRewards: "id, readerId, rewardType, episodeId, syncStatus, earnedAt",
      readerBadges: "id, readerId, badgeCode, syncStatus, earnedAt",
      readerDramaParticipation: "id, readerId, participationType, episodeId, syncStatus, createdAt",
      syncQueue: "id, readerId, entityType, entityId, syncStatus, createdAt",
      readerSettings: "id",
    });
    this.version(4).stores({
      readerIdentity: "readerId, deviceId, syncStatus",
      episodePacks: "content.episode.id, manifest.title, manifest.packId, manifest.version",
      readingProgress: "episodeId, chapterId, updatedAt",
      readerActivityLog: "id, readerId, eventType, episodeId, syncStatus, createdAt",
      readerChoices: "id, readerId, episodeId, choiceType, syncStatus, createdAt",
      readerQuizAttempts: "id, readerId, episodeId, syncStatus, createdAt",
      readerRewards: "id, readerId, rewardType, episodeId, syncStatus, earnedAt",
      readerBadges: "id, readerId, badgeCode, syncStatus, earnedAt",
      readerDramaParticipation: "id, readerId, participationType, episodeId, syncStatus, createdAt",
      readerParticipation: "id, readerId, participationType, episodeId, syncStatus, createdAt",
      syncQueue: "id, readerId, entityType, entityId, syncStatus, createdAt",
      readerSettings: "id",
    });
    this.version(5).stores({
      readerIdentity: "readerId, deviceId, syncStatus",
      episodePacks: "content.episode.id, manifest.title, manifest.packId, manifest.version",
      readingProgress: "episodeId, chapterId, updatedAt",
      readerActivityLog: "id, readerId, eventType, episodeId, syncStatus, createdAt",
      readerChoices: "id, readerId, episodeId, choiceType, syncStatus, createdAt",
      readerQuizAttempts: "id, readerId, episodeId, syncStatus, createdAt",
      readerRewards: "id, readerId, rewardType, episodeId, syncStatus, earnedAt",
      readerBadges: "id, readerId, badgeCode, syncStatus, earnedAt",
      readerDramaParticipation: "id, readerId, participationType, episodeId, syncStatus, createdAt",
      readerParticipation: "id, readerId, participationType, episodeId, syncStatus, createdAt",
      syncQueue: "id, readerId, entityType, entityId, syncStatus, createdAt",
      readerSettings: "id",
      characterCache: "id, name, displayName, role",
      assetCache: "id, name, type",
      relationshipCache: "id, type, fromCharacterId, toCharacterId, businessId",
    });
    this.version(6).stores({
      readerIdentity: "readerId, deviceId, syncStatus",
      episodePacks: "content.episode.id, manifest.title, manifest.packId, manifest.version",
      readingProgress: "episodeId, chapterId, updatedAt",
      readerActivityLog: "id, readerId, eventType, episodeId, syncStatus, createdAt",
      readerChoices: "id, readerId, episodeId, choiceType, syncStatus, createdAt",
      readerQuizAttempts: "id, readerId, episodeId, syncStatus, createdAt",
      readerRewards: "id, readerId, rewardType, episodeId, syncStatus, earnedAt",
      readerBadges: "id, readerId, badgeCode, syncStatus, earnedAt",
      readerDramaParticipation: "id, readerId, participationType, episodeId, syncStatus, createdAt",
      readerParticipation: "id, readerId, participationType, episodeId, syncStatus, createdAt",
      syncQueue: "id, readerId, entityType, entityId, syncStatus, createdAt",
      readerSettings: "id",
      characterCache: "id, name, displayName, role",
      assetCache: "id, name, type",
      relationshipCache: "id, type, fromCharacterId, toCharacterId, businessId",
      vendorPacks: "manifest.packId, manifest.vendorId, manifest.version",
      vendors: "id, businessName, sector, city, status",
      products: "id, vendorId, name, category, brand, stockStatus",
      productCategories: "id, name, sector",
      vendorBranches: "id, vendorId, city, suburb",
      vendorContacts: "id, vendorId, label",
    });
    this.version(7).stores({
      readerIdentity: "readerId, deviceId, syncStatus",
      episodePacks: "content.episode.id, manifest.title, manifest.packId, manifest.version",
      readingProgress: "episodeId, chapterId, updatedAt",
      readerActivityLog: "id, readerId, eventType, episodeId, syncStatus, createdAt",
      readerChoices: "id, readerId, episodeId, choiceType, syncStatus, createdAt",
      readerQuizAttempts: "id, readerId, quizId, episodeId, syncStatus, completedAt",
      readerPollVotes: "id, readerId, pollId, episodeId, syncStatus, createdAt",
      readerPredictions: "id, readerId, predictionId, episodeId, syncStatus, createdAt",
      readerRewards: "id, readerId, rewardType, episodeId, syncStatus, earnedAt",
      readerBadges: "id, readerId, badgeCode, syncStatus, earnedAt",
      readerRankings: "id, readerId, period, points, updatedAt, syncStatus",
      readerDramaParticipation: "id, readerId, participationType, episodeId, syncStatus, createdAt",
      readerParticipation: "id, readerId, participationType, episodeId, syncStatus, createdAt",
      syncQueue: "id, readerId, entityType, entityId, syncStatus, createdAt",
      readerSettings: "id",
      characterCache: "id, name, displayName, role",
      assetCache: "id, name, type",
      relationshipCache: "id, type, fromCharacterId, toCharacterId, businessId",
      vendorPacks: "manifest.packId, manifest.vendorId, manifest.version",
      vendors: "id, businessName, sector, city, status",
      products: "id, vendorId, name, category, brand, stockStatus",
      productCategories: "id, name, sector",
      vendorBranches: "id, vendorId, city, suburb",
      vendorContacts: "id, vendorId, label",
      quizCache: "id, episodeId, status, createdAt",
      pollCache: "id, episodeId, status, createdAt",
      predictionCache: "id, episodeId, status, closingDate",
      leaderboardCache: "id, readerId, period, points, updatedAt",
    });
    this.version(8).stores({
      readerIdentity: "readerId, deviceId, syncStatus",
      episodePacks: "content.episode.id, manifest.title, manifest.packId, manifest.version",
      readingProgress: "episodeId, chapterId, updatedAt",
      readerActivityLog: "id, readerId, eventType, episodeId, syncStatus, createdAt",
      readerChoices: "id, readerId, episodeId, choiceType, syncStatus, createdAt",
      readerQuizAttempts: "id, readerId, quizId, episodeId, syncStatus, completedAt",
      readerPollVotes: "id, readerId, pollId, episodeId, syncStatus, createdAt",
      readerPredictions: "id, readerId, predictionId, episodeId, syncStatus, createdAt",
      readerRewards: "id, readerId, rewardType, episodeId, syncStatus, earnedAt",
      readerBadges: "id, readerId, badgeCode, syncStatus, earnedAt",
      readerRankings: "id, readerId, period, points, updatedAt, syncStatus",
      readerDramaParticipation: "id, readerId, participationType, episodeId, syncStatus, createdAt",
      readerParticipation: "id, readerId, participationType, episodeId, syncStatus, createdAt",
      syncQueue: "id, readerId, entityType, entityId, syncStatus, createdAt",
      readerSettings: "id",
      deviceIdentity: "deviceId, createdAt, lastSeenAt",
      localLicences: "licenceId, readerId, deviceId, phoneNumber, plan, status, expiresAt, source, syncStatus",
      activationAttempts: "id, readerId, deviceId, phoneNumber, activationCode, status, createdAt",
      scratchCardAttempts: "id, readerId, deviceId, phoneNumber, scratchCardCode, status, createdAt",
      agentActivationRequests: "id, agentCode, phoneNumber, plan, status, createdAt, syncStatus",
      licenceActivityLog: "id, readerId, deviceId, eventType, licenceId, createdAt, syncStatus",
      characterCache: "id, name, displayName, role",
      assetCache: "id, name, type",
      relationshipCache: "id, type, fromCharacterId, toCharacterId, businessId",
      vendorPacks: "manifest.packId, manifest.vendorId, manifest.version",
      vendors: "id, businessName, sector, city, status",
      products: "id, vendorId, name, category, brand, stockStatus",
      productCategories: "id, name, sector",
      vendorBranches: "id, vendorId, city, suburb",
      vendorContacts: "id, vendorId, label",
      quizCache: "id, episodeId, status, createdAt",
      pollCache: "id, episodeId, status, createdAt",
      predictionCache: "id, episodeId, status, closingDate",
      leaderboardCache: "id, readerId, period, points, updatedAt",
    });
    this.version(9).stores({
      readerIdentity: "readerId, deviceId, syncStatus",
      episodePacks: "content.episode.id, manifest.title, manifest.packId, manifest.version",
      readingProgress: "episodeId, chapterId, updatedAt",
      readerActivityLog: "id, readerId, eventType, episodeId, syncStatus, createdAt",
      readerChoices: "id, readerId, episodeId, choiceType, syncStatus, createdAt",
      readerQuizAttempts: "id, readerId, quizId, episodeId, syncStatus, completedAt",
      readerPollVotes: "id, readerId, pollId, episodeId, syncStatus, createdAt",
      readerPredictions: "id, readerId, predictionId, episodeId, syncStatus, createdAt",
      readerRewards: "id, readerId, rewardType, episodeId, syncStatus, earnedAt",
      readerBadges: "id, readerId, badgeCode, syncStatus, earnedAt",
      readerRankings: "id, readerId, period, points, updatedAt, syncStatus",
      readerDramaParticipation: "id, readerId, participationType, episodeId, syncStatus, createdAt",
      readerParticipation: "id, readerId, participationType, episodeId, syncStatus, createdAt",
      syncQueue: "id, readerId, entityType, entityId, syncStatus, createdAt",
      readerSettings: "id",
      deviceIdentity: "deviceId, createdAt, lastSeenAt",
      localLicences: "licenceId, readerId, deviceId, phoneNumber, plan, status, expiresAt, source, syncStatus",
      activationAttempts: "id, readerId, deviceId, phoneNumber, activationCode, status, createdAt",
      scratchCardAttempts: "id, readerId, deviceId, phoneNumber, scratchCardCode, status, createdAt",
      agentActivationRequests: "id, agentCode, phoneNumber, plan, status, createdAt, syncStatus",
      licenceActivityLog: "id, readerId, deviceId, eventType, licenceId, createdAt, syncStatus",
      characterCache: "id, name, displayName, role",
      assetCache: "id, name, type",
      relationshipCache: "id, type, fromCharacterId, toCharacterId, businessId",
      vendorPacks: "manifest.packId, manifest.vendorId, manifest.version",
      vendors: "id, businessName, sector, city, status",
      products: "id, vendorId, name, category, brand, stockStatus",
      productCategories: "id, name, sector",
      vendorBranches: "id, vendorId, city, suburb",
      vendorContacts: "id, vendorId, label",
      quizCache: "id, episodeId, status, createdAt",
      pollCache: "id, episodeId, status, createdAt",
      predictionCache: "id, episodeId, status, closingDate",
      leaderboardCache: "id, readerId, period, points, updatedAt",
      catalogueCache: "id, contentType, episodeId, packId, requiredLicencePlan, visibility, status, releaseDate",
      publishedPackCache: "id, episodeId, packId, packType, requiredLicencePlan, status, releaseDate",
      releaseScheduleCache: "id, episodeId, packId, releaseDate, status, seasonNumber, episodeNumber",
      contentRuleCache: "id, contentId, contentType, requiredLicencePlan, visibility",
    });
    this.version(10).stores({
      readerIdentity: "readerId, deviceId, syncStatus",
      episodePacks: "content.episode.id, manifest.title, manifest.packId, manifest.version",
      readingProgress: "episodeId, chapterId, updatedAt",
      readerActivityLog: "id, readerId, eventType, episodeId, syncStatus, createdAt",
      readerChoices: "id, readerId, episodeId, choiceType, syncStatus, createdAt",
      readerQuizAttempts: "id, readerId, quizId, episodeId, syncStatus, completedAt",
      readerPollVotes: "id, readerId, pollId, episodeId, syncStatus, createdAt",
      readerPredictions: "id, readerId, predictionId, episodeId, syncStatus, createdAt",
      readerRewards: "id, readerId, rewardType, episodeId, syncStatus, earnedAt",
      readerBadges: "id, readerId, badgeCode, syncStatus, earnedAt",
      readerRankings: "id, readerId, period, points, updatedAt, syncStatus",
      readerDramaParticipation: "id, readerId, participationType, episodeId, syncStatus, createdAt",
      readerParticipation: "id, readerId, participationType, episodeId, syncStatus, createdAt",
      syncQueue: "id, readerId, entityType, entityId, syncStatus, createdAt",
      readerSettings: "id",
      deviceIdentity: "deviceId, createdAt, lastSeenAt",
      localLicences: "licenceId, readerId, deviceId, phoneNumber, plan, status, expiresAt, source, syncStatus",
      activationAttempts: "id, readerId, deviceId, phoneNumber, activationCode, status, createdAt",
      scratchCardAttempts: "id, readerId, deviceId, phoneNumber, scratchCardCode, status, createdAt",
      agentActivationRequests: "id, agentCode, phoneNumber, plan, status, createdAt, syncStatus",
      licenceActivityLog: "id, readerId, deviceId, eventType, licenceId, createdAt, syncStatus",
      characterCache: "id, name, displayName, role",
      assetCache: "id, name, type",
      relationshipCache: "id, type, fromCharacterId, toCharacterId, businessId",
      vendorPacks: "manifest.packId, manifest.vendorId, manifest.version",
      vendors: "id, businessName, sector, city, status",
      products: "id, vendorId, name, category, brand, stockStatus",
      productCategories: "id, name, sector",
      vendorBranches: "id, vendorId, city, suburb",
      vendorContacts: "id, vendorId, label",
      quizCache: "id, episodeId, status, createdAt",
      pollCache: "id, episodeId, status, createdAt",
      predictionCache: "id, episodeId, status, closingDate",
      leaderboardCache: "id, readerId, period, points, updatedAt",
      catalogueCache: "id, contentType, episodeId, packId, requiredLicencePlan, visibility, status, releaseDate",
      publishedPackCache: "id, episodeId, packId, packType, requiredLicencePlan, status, releaseDate",
      releaseScheduleCache: "id, episodeId, packId, releaseDate, status, seasonNumber, episodeNumber",
      contentRuleCache: "id, contentId, contentType, requiredLicencePlan, visibility",
      productionActorCache: "id, fullName, stageName, availabilityStatus, status",
      castingCache: "id, characterId, actorId, status",
      productionCharacterCache: "id, name, actorId, role, currentStoryStatus",
      sceneCache: "id, episodeId, chapterId, sceneNumber, locationId, status",
      locationCache: "id, name, city, locationType, availability",
      productionPropertyCache: "id, name, type, status",
      productionVehicleCache: "id, name, registration, type",
      productionAssetCache: "id, assetType, relatedCharacterId, relatedSceneId, relatedEpisodeId",
      productionScheduleCache: "id, episodeId, sceneId, scheduledDate, locationId, status",
      continuityRecordCache: "id, episodeId, sceneId, continuityType, severity, status",
    });
    this.version(11).stores({
      readerIdentity: "readerId, deviceId, syncStatus",
      episodePacks: "content.episode.id, manifest.title, manifest.packId, manifest.version",
      readingProgress: "episodeId, chapterId, updatedAt",
      readerActivityLog: "id, readerId, eventType, episodeId, syncStatus, createdAt",
      readerChoices: "id, readerId, episodeId, choiceType, syncStatus, createdAt",
      readerQuizAttempts: "id, readerId, quizId, episodeId, syncStatus, completedAt",
      readerPollVotes: "id, readerId, pollId, episodeId, syncStatus, createdAt",
      readerPredictions: "id, readerId, predictionId, episodeId, syncStatus, createdAt",
      readerRewards: "id, readerId, rewardType, episodeId, syncStatus, earnedAt",
      readerBadges: "id, readerId, badgeCode, syncStatus, earnedAt",
      readerRankings: "id, readerId, period, points, updatedAt, syncStatus",
      readerDramaParticipation: "id, readerId, participationType, episodeId, syncStatus, createdAt",
      readerParticipation: "id, readerId, participationType, episodeId, syncStatus, createdAt",
      syncQueue: "id, readerId, entityType, entityId, syncStatus, createdAt",
      readerSettings: "id",
      deviceIdentity: "deviceId, createdAt, lastSeenAt",
      localLicences: "licenceId, readerId, deviceId, phoneNumber, plan, status, expiresAt, source, syncStatus",
      activationAttempts: "id, readerId, deviceId, phoneNumber, activationCode, status, createdAt",
      scratchCardAttempts: "id, readerId, deviceId, phoneNumber, scratchCardCode, status, createdAt",
      agentActivationRequests: "id, agentCode, phoneNumber, plan, status, createdAt, syncStatus",
      licenceActivityLog: "id, readerId, deviceId, eventType, licenceId, createdAt, syncStatus",
      characterCache: "id, name, displayName, role",
      assetCache: "id, name, type",
      relationshipCache: "id, type, fromCharacterId, toCharacterId, businessId",
      vendorPacks: "manifest.packId, manifest.vendorId, manifest.version",
      vendors: "id, businessName, sector, city, status",
      products: "id, vendorId, name, category, brand, stockStatus",
      productCategories: "id, name, sector",
      vendorBranches: "id, vendorId, city, suburb",
      vendorContacts: "id, vendorId, label",
      quizCache: "id, episodeId, status, createdAt",
      pollCache: "id, episodeId, status, createdAt",
      predictionCache: "id, episodeId, status, closingDate",
      leaderboardCache: "id, readerId, period, points, updatedAt",
      catalogueCache: "id, contentType, episodeId, packId, requiredLicencePlan, visibility, status, releaseDate",
      publishedPackCache: "id, episodeId, packId, packType, requiredLicencePlan, status, releaseDate",
      releaseScheduleCache: "id, episodeId, packId, releaseDate, status, seasonNumber, episodeNumber",
      contentRuleCache: "id, contentId, contentType, requiredLicencePlan, visibility",
      productionActorCache: "id, fullName, stageName, availabilityStatus, status",
      castingCache: "id, characterId, actorId, status",
      productionCharacterCache: "id, name, actorId, role, currentStoryStatus",
      sceneCache: "id, episodeId, chapterId, sceneNumber, locationId, status",
      locationCache: "id, name, city, locationType, availability",
      productionPropertyCache: "id, name, type, status",
      productionVehicleCache: "id, name, registration, type",
      productionAssetCache: "id, assetType, relatedCharacterId, relatedSceneId, relatedEpisodeId",
      productionScheduleCache: "id, episodeId, sceneId, scheduledDate, locationId, status",
      continuityRecordCache: "id, episodeId, sceneId, continuityType, severity, status",
      storyTimelineCache: "id, storyDate, seasonNumber, episodeNumber, characterInvolved, businessInvolved",
      characterArcCache: "id, characterId, seasonNumber, episodeId, arcStage",
      relationshipArcCache: "id, characterA, characterB, relationshipType, currentStatus",
      businessTimelineCache: "id, company, episodeId, eventType",
      conflictMapCache: "id, episodeId, conflictType, intensity, status",
      continuityCheckCache: "id, episodeId, checkType, severity, status",
      episodePlanCache: "id, seasonNumber, episodeNumber, title, storyDate",
      storyPromptCache: "id, episodePlanId, promptType, title",
      storyRuleCache: "id, ruleType, status, title",
    });
  }
}

export const readerDb = new EotReaderDb();

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

function compareVersions(a: string, b: string) {
  const left = a.split(".").map((part) => Number(part) || 0);
  const right = b.split(".").map((part) => Number(part) || 0);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

async function enqueue(entityType: SyncQueueItem["entityType"], entityId: string, payload: Record<string, unknown>, readerId: string) {
  await readerDb.syncQueue.put({
    id: `${entityType}_${entityId}`,
    readerId,
    entityType,
    entityId,
    operation: "create",
    payload,
    createdAt: now(),
    attemptCount: 0,
    syncStatus: "pending",
  });
}

export async function getOrCreateReaderIdentity() {
  const existing = await readerDb.readerIdentity.toCollection().first();
  const timestamp = now();
  if (existing) {
    await readerDb.readerIdentity.update(existing.readerId, { lastSeenAt: timestamp });
    return { ...existing, lastSeenAt: timestamp };
  }

  const identity: ReaderIdentity = {
    readerId: `reader_${crypto.randomUUID()}`,
    deviceId: `device_${crypto.randomUUID()}`,
    createdAt: timestamp,
    lastSeenAt: timestamp,
    syncStatus: "pending",
  };
  await readerDb.readerIdentity.put(identity);
  await enqueue("readerIdentity", identity.readerId, identity as unknown as Record<string, unknown>, identity.readerId);
  await logActivity("reader_created", { metadata: { deviceId: identity.deviceId } }, identity);
  return identity;
}

export async function updateReaderIdentity(input: Partial<Pick<ReaderIdentity, "displayName" | "phone" | "avatarUrl">>) {
  const identity = await getOrCreateReaderIdentity();
  const next = { ...identity, ...input, lastSeenAt: now(), syncStatus: "pending" as SyncStatus };
  await readerDb.readerIdentity.put(next);
  await enqueue("readerIdentity", next.readerId, next as unknown as Record<string, unknown>, next.readerId);
  return next;
}

export async function logActivity(
  eventType: ReaderEventType,
  input: Partial<Omit<ReaderActivityLog, "id" | "readerId" | "eventType" | "createdAt" | "syncStatus" | "metadata">> & { metadata?: Record<string, unknown> } = {},
  identity?: ReaderIdentity,
) {
  const reader = identity ?? (await getOrCreateReaderIdentity());
  const log: ReaderActivityLog = {
    id: id("log"),
    readerId: reader.readerId,
    eventType,
    metadata: input.metadata ?? {},
    createdAt: now(),
    syncStatus: "pending",
    episodeId: input.episodeId,
    chapterId: input.chapterId,
    paragraphId: input.paragraphId,
    targetType: input.targetType,
    targetId: input.targetId,
  };
  await readerDb.readerActivityLog.put(log);
  await enqueue("readerActivityLog", log.id, log as unknown as Record<string, unknown>, reader.readerId);
  await applyRewardRules(log);
  return log;
}

async function addReward(reward: Omit<ReaderReward, "syncStatus">) {
  const existing = await readerDb.readerRewards.get(reward.id);
  if (existing) return null;
  const saved = { ...reward, syncStatus: "pending" as SyncStatus };
  await readerDb.readerRewards.put(saved);
  await enqueue("readerRewards", saved.id, saved as unknown as Record<string, unknown>, saved.readerId);
  await logActivity("reward_earned", { episodeId: saved.episodeId, targetType: "reward", targetId: saved.id, metadata: { title: saved.title, points: saved.points } });
  return saved;
}

async function addBadge(badge: Omit<ReaderBadge, "syncStatus">) {
  const existing = await readerDb.readerBadges.get(badge.id);
  if (existing) return null;
  const saved = { ...badge, syncStatus: "pending" as SyncStatus };
  await readerDb.readerBadges.put(saved);
  await enqueue("readerBadges", saved.id, saved as unknown as Record<string, unknown>, saved.readerId);
  await logActivity("badge_earned", { targetType: "badge", targetId: saved.id, metadata: { badgeCode: saved.badgeCode } });
  return saved;
}

export async function awardReaderReward(input: Omit<ReaderReward, "id" | "readerId" | "earnedAt" | "syncStatus"> & { id?: string; readerId?: string }) {
  const reader = await getOrCreateReaderIdentity();
  return addReward({
    ...input,
    id: input.id ?? `reward_${reader.readerId}_${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${input.sourceEventId ?? input.episodeId ?? "global"}`,
    readerId: input.readerId ?? reader.readerId,
    earnedAt: now(),
  });
}

export async function awardReaderBadge(input: Omit<ReaderBadge, "id" | "readerId" | "earnedAt" | "syncStatus"> & { id?: string; readerId?: string }) {
  const reader = await getOrCreateReaderIdentity();
  return addBadge({
    ...input,
    id: input.id ?? `badge_${reader.readerId}_${input.badgeCode}`,
    readerId: input.readerId ?? reader.readerId,
    earnedAt: now(),
  });
}

async function applyRewardRules(log: ReaderActivityLog) {
  if (log.eventType === "reward_earned" || log.eventType === "badge_earned") return;
  const earnedAt = now();
  const rewardMap: Partial<Record<ReaderEventType, { points: number; title: string; description: string }>> = {
    pack_imported: { points: 10, title: "First pack imported", description: "Imported an Empire of Trust episode pack." },
    episode_opened: { points: 5, title: "Episode opened", description: "Opened an offline episode." },
    episode_completed: { points: 25, title: "Episode completed", description: "Finished reading an episode." },
    prediction_submitted: { points: 10, title: "Prediction submitted", description: "Made a story prediction." },
    poll_voted: { points: 5, title: "Poll voted", description: "Voted in an Empire of Trust poll." },
    interactive_link_clicked: { points: 2, title: "Interactive link", description: "Engaged with an interactive story link." },
    quiz_completed: { points: 20, title: "Quiz completed", description: "Completed an episode quiz." },
  };
  const rule = rewardMap[log.eventType];
  if (rule) {
    await addReward({
      id: `reward_${log.readerId}_${log.eventType}_${log.episodeId ?? "global"}_${log.targetId ?? "once"}`,
      readerId: log.readerId,
      rewardType: "points",
      title: rule.title,
      description: rule.description,
      points: rule.points,
      sourceEventId: log.id,
      episodeId: log.episodeId,
      earnedAt,
    });
  }

  const completed = await readerDb.readerActivityLog.where("eventType").equals("episode_completed").toArray();
  const completedEpisodeCount = new Set(completed.map((item) => item.episodeId).filter(Boolean)).size;
  const predictions = await readerDb.readerChoices.where("choiceType").equals("prediction").count();
  const quizAttempts = await readerDb.readerQuizAttempts.count();
  if (log.eventType === "episode_completed") {
    await addBadge({
      id: `badge_${log.readerId}_gateway_reader`,
      readerId: log.readerId,
      badgeCode: "gateway_reader",
      title: "Gateway Reader",
      description: "Completed the first Empire of Trust episode.",
      icon: "GR",
      earnedAt,
    });
  }
  if (completedEpisodeCount >= 3) {
    await addBadge({
      id: `badge_${log.readerId}_empire_follower`,
      readerId: log.readerId,
      badgeCode: "empire_follower",
      title: "Empire Follower",
      description: "Completed three Empire of Trust episodes.",
      icon: "EF",
      earnedAt,
    });
  }
  if (predictions > 0) {
    await addBadge({
      id: `badge_${log.readerId}_boardroom_predictor`,
      readerId: log.readerId,
      badgeCode: "boardroom_predictor",
      title: "Boardroom Predictor",
      description: "Submitted the first story prediction.",
      icon: "BP",
      earnedAt,
    });
  }
  const successionChoices = await readerDb.readerChoices.where("choiceType").equals("succession_choice").count();
  if (successionChoices > 0) {
    await addBadge({
      id: `badge_${log.readerId}_succession_analyst`,
      readerId: log.readerId,
      badgeCode: "succession_analyst",
      title: "Succession Analyst",
      description: "Made a succession-focused choice.",
      icon: "SA",
      earnedAt,
    });
  }
  const businessChoices = await readerDb.readerChoices.where("choiceType").equals("business_decision").count();
  if (businessChoices > 0) {
    await addBadge({
      id: `badge_${log.readerId}_business_strategist`,
      readerId: log.readerId,
      badgeCode: "business_strategist",
      title: "Corporate Strategist",
      description: "Made a business decision in the story.",
      icon: "CS",
      earnedAt,
    });
  }
  if (quizAttempts >= 3) {
    await addBadge({
      id: `badge_${log.readerId}_quiz_master`,
      readerId: log.readerId,
      badgeCode: "quiz_master",
      title: "Quiz Master",
      description: "Completed three Empire of Trust quizzes.",
      icon: "QM",
      earnedAt,
    });
  }
  const rewards = await readerDb.readerRewards.where("readerId").equals(log.readerId).toArray();
  const totalPoints = rewards.reduce((sum, reward) => sum + reward.points, 0);
  if (totalPoints >= 500) {
    await addBadge({
      id: `badge_${log.readerId}_top_reader`,
      readerId: log.readerId,
      badgeCode: "top_reader",
      title: "Top Reader",
      description: "Reached 500 local participation points.",
      icon: "TR",
      earnedAt,
    });
  }
}

export function validateEpisodePack(input: unknown): EpisodePack {
  if (!input || typeof input !== "object") throw new Error("Pack file is not a JSON object.");
  const pack = input as Partial<EpisodePack>;
  if (!pack.manifest || !pack.content?.episode) throw new Error("Pack is missing manifest or episode content.");
  if (pack.manifest.packType !== "episode") throw new Error("Only episode packs can be imported.");
  if (!pack.manifest.packId || !pack.manifest.version) throw new Error("Pack manifest is missing packId or version.");
  const episode = pack.content.episode;
  if (!episode.id || !episode.title || !Array.isArray(episode.chapters)) {
    throw new Error("Episode content is missing id, title, or chapters.");
  }
  const manifest = pack.manifest;
  return {
    manifest: {
      packId: manifest.packId,
      packType: "episode",
      version: manifest.version,
      title: manifest.title || episode.title,
      seasonNumber: manifest.seasonNumber ?? 1,
      episodeNumber: manifest.episodeNumber ?? 1,
      releaseWeekNumber: manifest.releaseWeekNumber ?? 1,
      episodeIdentifier: manifest.episodeIdentifier || "",
      createdAt: manifest.createdAt || "",
      storyDate: manifest.storyDate || "",
      requiredLicencePlan: manifest.requiredLicencePlan || "reader",
      checksumAlgorithm: manifest.checksumAlgorithm || "SHA-256",
      checksum: manifest.checksum || "frontend-placeholder-checksum",
      signature: manifest.signature || "frontend-placeholder-signature",
    },
    content: {
      episode: {
        ...episode,
        synopsis: episode.synopsis || "",
        seasonNumber: episode.seasonNumber ?? manifest.seasonNumber ?? 1,
        episodeNumber: episode.episodeNumber ?? manifest.episodeNumber ?? 1,
        releaseWeekNumber: episode.releaseWeekNumber ?? manifest.releaseWeekNumber ?? 1,
        episodeIdentifier: episode.episodeIdentifier || manifest.episodeIdentifier || "",
        storyDate: episode.storyDate || manifest.storyDate || "",
        status: episode.status || "published",
        requiredLicencePlan: episode.requiredLicencePlan || manifest.requiredLicencePlan || "reader",
        previousEpisodeId: episode.previousEpisodeId || "",
        nextEpisodeId: episode.nextEpisodeId || "",
        activeCharacters: episode.activeCharacters || "",
        businessContinuityNotes: episode.businessContinuityNotes || "",
        culturalContinuityNotes: episode.culturalContinuityNotes || "",
      },
    },
  } as EpisodePack;
}

export async function importPack(pack: EpisodePack) {
  const reader = await getOrCreateReaderIdentity();
  const existing = await readerDb.episodePacks.get(pack.content.episode.id);
  if (existing && compareVersions(pack.manifest.version, existing.manifest.version) <= 0) {
    throw new Error(`Version ${existing.manifest.version} is already imported. Import a newer pack version.`);
  }
  await readerDb.episodePacks.put(pack);
  await logActivity("pack_imported", { episodeId: pack.content.episode.id, targetType: "episodePack", targetId: pack.manifest.packId, metadata: { version: pack.manifest.version } }, reader);
  return pack.content.episode.id;
}

export async function listImportedPacks() {
  return readerDb.episodePacks.toArray();
}

export async function getImportedPack(episodeId: string) {
  return readerDb.episodePacks.get(episodeId);
}

export async function deleteImportedPack(episodeId: string) {
  await readerDb.transaction("rw", readerDb.episodePacks, readerDb.readingProgress, async () => {
    await readerDb.episodePacks.delete(episodeId);
    await readerDb.readingProgress.delete(episodeId);
  });
}

export async function getReadingProgress(episodeId: string) {
  return readerDb.readingProgress.get(episodeId);
}

export async function saveReadingProgress(progress: ReadingProgress) {
  await readerDb.readingProgress.put(progress);
  await logActivity("reading_progress_saved", { episodeId: progress.episodeId, chapterId: progress.chapterId, paragraphId: progress.paragraphId });
}

export async function getReaderSettings() {
  const settings = await readerDb.readerSettings.get("reader");
  return {
    id: "reader" as const,
    fontSize: settings?.fontSize ?? "medium",
    showImagePrompts: settings?.showImagePrompts ?? true,
    showMetadata: settings?.showMetadata ?? true,
  };
}

export async function saveReaderSettings(settings: ReaderSettings) {
  await readerDb.readerSettings.put(settings);
}

export async function saveReaderChoice(input: Omit<ReaderChoice, "id" | "readerId" | "createdAt" | "syncStatus" | "syncedAt">) {
  const reader = await getOrCreateReaderIdentity();
  const choice: ReaderChoice = {
    ...input,
    id: id("choice"),
    readerId: reader.readerId,
    createdAt: now(),
    syncStatus: "pending",
  };
  await readerDb.readerChoices.put(choice);
  await enqueue("readerChoices", choice.id, choice as unknown as Record<string, unknown>, reader.readerId);
  await saveReaderParticipation({
    participationType: input.choiceType === "prediction" ? "prediction" : input.choiceType === "vote" ? "poll" : "decision",
    episodeId: input.episodeId,
    prompt: input.prompt,
    response: input.selectedOption,
    scoreImpact: input.choiceType === "prediction" ? 10 : input.choiceType === "vote" ? 5 : 3,
  }, reader);
  await logActivity(input.choiceType === "prediction" ? "prediction_submitted" : input.choiceType === "vote" ? "poll_voted" : "choice_made", {
    episodeId: input.episodeId,
    chapterId: input.chapterId,
    paragraphId: input.paragraphId,
    targetType: "readerChoice",
    targetId: choice.id,
    metadata: { choiceType: input.choiceType, selectedOption: input.selectedOption },
  }, reader);
  return choice;
}

export async function saveReaderParticipation(input: Omit<ReaderParticipation, "id" | "readerId" | "createdAt" | "syncStatus">, identity?: ReaderIdentity) {
  const reader = identity ?? (await getOrCreateReaderIdentity());
  const participation: ReaderParticipation = {
    ...input,
    id: id("participation"),
    readerId: reader.readerId,
    createdAt: now(),
    syncStatus: "pending",
  };
  await readerDb.readerParticipation.put(participation);
  return participation;
}

export async function saveDramaParticipation(input: Omit<ReaderDramaParticipation, "id" | "readerId" | "createdAt" | "syncStatus">) {
  const reader = await getOrCreateReaderIdentity();
  const participation: ReaderDramaParticipation = {
    ...input,
    id: id("drama"),
    readerId: reader.readerId,
    createdAt: now(),
    syncStatus: "pending",
  };
  await readerDb.readerDramaParticipation.put(participation);
  await readerDb.readerParticipation.put(participation);
  await enqueue("readerDramaParticipation", participation.id, participation as unknown as Record<string, unknown>, reader.readerId);
  return participation;
}

export function getReaderLevel(points: number) {
  if (points >= 2000) return "Empire Insider";
  if (points >= 1200) return "Board Member";
  if (points >= 800) return "Shareholder";
  if (points >= 500) return "Director";
  if (points >= 300) return "Executive";
  if (points >= 150) return "Advisor";
  if (points >= 50) return "Analyst";
  return "Reader";
}

export async function saveQuizAttempt(input: Omit<ReaderQuizAttempt, "id" | "readerId" | "completedAt" | "syncStatus"> & { title?: string }) {
  const reader = await getOrCreateReaderIdentity();
  const attempt: ReaderQuizAttempt = {
    id: id("quiz"),
    readerId: reader.readerId,
    quizId: input.quizId,
    episodeId: input.episodeId,
    score: input.score,
    maxScore: input.maxScore,
    answersJson: input.answersJson,
    completedAt: now(),
    syncStatus: "pending",
  };
  await readerDb.readerQuizAttempts.put(attempt);
  await enqueue("readerQuizAttempts", attempt.id, attempt as unknown as Record<string, unknown>, reader.readerId);
  await awardReaderReward({
    id: `reward_${reader.readerId}_quiz_${attempt.quizId}_${attempt.id}`,
    rewardType: "points",
    title: input.title ? `Quiz completed: ${input.title}` : "Quiz completed",
    description: `Scored ${attempt.score} out of ${attempt.maxScore}.`,
    points: Math.max(0, attempt.score),
    sourceEventId: attempt.id,
    episodeId: attempt.episodeId,
  });
  await logActivity("quiz_completed", { episodeId: attempt.episodeId, targetType: "quiz", targetId: attempt.quizId, metadata: { score: attempt.score, maxScore: attempt.maxScore } }, reader);
  await refreshLocalRanking();
  return attempt;
}

export async function savePollVote(input: Omit<ReaderPollVote, "id" | "readerId" | "createdAt" | "syncStatus"> & { question: string }) {
  const reader = await getOrCreateReaderIdentity();
  const vote: ReaderPollVote = {
    id: id("poll"),
    readerId: reader.readerId,
    pollId: input.pollId,
    episodeId: input.episodeId,
    selectedOption: input.selectedOption,
    optionsJson: input.optionsJson,
    createdAt: now(),
    syncStatus: "pending",
  };
  await readerDb.readerPollVotes.put(vote);
  await enqueue("readerPollVotes", vote.id, vote as unknown as Record<string, unknown>, reader.readerId);
  await saveReaderChoice({ episodeId: input.episodeId ?? "global", choiceType: "vote", prompt: input.question, selectedOption: input.selectedOption, optionsJson: input.optionsJson });
  await refreshLocalRanking();
  return vote;
}

export async function saveReaderPrediction(input: Omit<ReaderPredictionSubmission, "id" | "readerId" | "createdAt" | "syncStatus"> & { question: string }) {
  const reader = await getOrCreateReaderIdentity();
  const prediction: ReaderPredictionSubmission = {
    id: id("prediction"),
    readerId: reader.readerId,
    predictionId: input.predictionId,
    episodeId: input.episodeId,
    selectedOption: input.selectedOption,
    optionsJson: input.optionsJson,
    createdAt: now(),
    syncStatus: "pending",
  };
  await readerDb.readerPredictions.put(prediction);
  await enqueue("readerPredictions", prediction.id, prediction as unknown as Record<string, unknown>, reader.readerId);
  await saveReaderChoice({ episodeId: input.episodeId ?? "global", choiceType: "prediction", prompt: input.question, selectedOption: input.selectedOption, optionsJson: input.optionsJson });
  await refreshLocalRanking();
  return prediction;
}

export async function refreshLocalRanking() {
  const identity = await getOrCreateReaderIdentity();
  const [rewards, badges, completedLogs, predictions, quizAttempts] = await Promise.all([
    readerDb.readerRewards.where("readerId").equals(identity.readerId).toArray(),
    readerDb.readerBadges.where("readerId").equals(identity.readerId).toArray(),
    readerDb.readerActivityLog.where("eventType").equals("episode_completed").toArray(),
    readerDb.readerPredictions.where("readerId").equals(identity.readerId).toArray(),
    readerDb.readerQuizAttempts.where("readerId").equals(identity.readerId).toArray(),
  ]);
  const points = rewards.reduce((sum, reward) => sum + reward.points, 0);
  const ranking: ReaderRanking = {
    id: `local_${identity.readerId}`,
    readerId: identity.readerId,
    displayName: identity.displayName || identity.readerId.slice(0, 18),
    level: getReaderLevel(points),
    points,
    badges: badges.length,
    completedEpisodes: new Set(completedLogs.map((item) => item.episodeId).filter(Boolean)).size,
    predictions: predictions.length,
    quizScores: quizAttempts.reduce((sum, attempt) => sum + attempt.score, 0),
    period: "local",
    updatedAt: now(),
    syncStatus: "pending",
  };
  await readerDb.readerRankings.put(ranking);
  await enqueue("readerRankings", ranking.id, ranking as unknown as Record<string, unknown>, identity.readerId);
  return ranking;
}

export async function getReaderProfileSummary() {
  const identity = await getOrCreateReaderIdentity();
  const [rewards, badges, completedLogs, predictions, choices, participation, quizAttempts, pollVotes] = await Promise.all([
    readerDb.readerRewards.where("readerId").equals(identity.readerId).toArray(),
    readerDb.readerBadges.where("readerId").equals(identity.readerId).toArray(),
    readerDb.readerActivityLog.where("eventType").equals("episode_completed").toArray(),
    readerDb.readerChoices.where("choiceType").equals("prediction").count(),
    readerDb.readerChoices.count(),
    readerDb.readerParticipation.where("readerId").equals(identity.readerId).toArray(),
    readerDb.readerQuizAttempts.where("readerId").equals(identity.readerId).toArray(),
    readerDb.readerPollVotes.where("readerId").equals(identity.readerId).toArray(),
  ]);
  const totalPoints = rewards.reduce((sum, reward) => sum + reward.points, 0);
  const ranking = await refreshLocalRanking();
  return {
    identity,
    totalPoints,
    badges,
    level: getReaderLevel(totalPoints),
    ranking,
    episodesCompleted: new Set(completedLogs.map((item) => item.episodeId).filter(Boolean)).size,
    predictionsSubmitted: predictions,
    quizHistory: quizAttempts,
    pollParticipation: pollVotes,
    choicesMade: choices,
    participationScore: participation.reduce((sum, item) => sum + (item.scoreImpact ?? 1), 0),
    localSyncStatus: "local-only",
  };
}

export async function getReaderRewardsSummary() {
  const identity = await getOrCreateReaderIdentity();
  const [rewards, badges, completedLogs, predictions, participation] = await Promise.all([
    readerDb.readerRewards.where("readerId").equals(identity.readerId).toArray(),
    readerDb.readerBadges.where("readerId").equals(identity.readerId).toArray(),
    readerDb.readerActivityLog.where("eventType").equals("episode_completed").toArray(),
    readerDb.readerChoices.where("choiceType").equals("prediction").toArray(),
    readerDb.readerParticipation.where("readerId").equals(identity.readerId).toArray(),
  ]);
  return {
    rewards,
    badges,
    totalPoints: rewards.reduce((sum, reward) => sum + reward.points, 0),
    episodesCompleted: new Set(completedLogs.map((item) => item.episodeId).filter(Boolean)).size,
    predictions,
    participation,
  };
}

export async function getReaderBadges() {
  const identity = await getOrCreateReaderIdentity();
  return readerDb.readerBadges.where("readerId").equals(identity.readerId).toArray();
}

export async function getReaderParticipationTimeline() {
  const identity = await getOrCreateReaderIdentity();
  const [participation, choices] = await Promise.all([
    readerDb.readerParticipation.where("readerId").equals(identity.readerId).toArray(),
    readerDb.readerChoices.where("readerId").equals(identity.readerId).toArray(),
  ]);
  return {
    participation: participation.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    choices: choices.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

export async function getReaderPredictions() {
  const identity = await getOrCreateReaderIdentity();
  return readerDb.readerChoices.where("readerId").equals(identity.readerId).and((choice) => choice.choiceType === "prediction").toArray();
}

export async function resetLocalReaderData() {
  await readerDb.delete();
  await readerDb.open();
}
