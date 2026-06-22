import type { FieldValue, Timestamp } from "firebase/firestore";

export type FirestoreDate = Timestamp | FieldValue | string;
export type EpisodeStatus = "draft" | "review" | "approved" | "scheduled" | "published" | "archived";

export interface Episode {
  id: string;
  seasonNumber: number;
  episodeNumber: number;
  releaseWeekNumber: number;
  episodeIdentifier: string;
  title: string;
  synopsis: string;
  storyDate: string;
  status: EpisodeStatus;
  requiredLicencePlan: string;
  previousEpisodeId: string;
  nextEpisodeId: string;
  activeCharacters: string;
  businessContinuityNotes: string;
  culturalContinuityNotes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface Chapter {
  id: string;
  episodeId: string;
  chapterNumber: number;
  title: string;
  intro: string;
  previousEpisodeBridge: string;
  emotionalTone: string;
  sceneLocation: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface Paragraph {
  id: string;
  episodeId: string;
  chapterId: string;
  paragraphNumber: number;
  body: string;
  dialogueJson: string;
  imagePrompt: string;
  scenePrompt: string;
  cameraDirection: string;
  emotionalTone: string;
  culturalDetail: string;
  businessContinuityNote: string;
  interactiveLinksJson: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EpisodePack {
  manifest: {
    packId: string;
    packType: "episode";
    version: string;
    title: string;
    seasonNumber: number;
    episodeNumber: number;
    releaseWeekNumber: number;
    episodeIdentifier: string;
    createdAt: string;
    storyDate: string;
    requiredLicencePlan: string;
    checksumAlgorithm: "SHA-256";
    checksum: string;
    signature: string;
  };
  content: {
    episode: {
      id: string;
      title: string;
      synopsis: string;
      seasonNumber: number;
      episodeNumber: number;
      releaseWeekNumber: number;
      episodeIdentifier: string;
      storyDate: string;
      status: EpisodeStatus;
      requiredLicencePlan: string;
      previousEpisodeId: string;
      nextEpisodeId: string;
      activeCharacters: string;
      businessContinuityNotes: string;
      culturalContinuityNotes: string;
      chapters: Array<{
        id: string;
        chapterNumber: number;
        title: string;
        intro: string;
        previousEpisodeBridge: string;
        emotionalTone?: string;
        sceneLocation?: string;
        paragraphs: Array<{
          id: string;
          paragraphNumber: number;
          body: string;
          dialogue: unknown[];
          imagePrompt: string;
          scenePrompt: string;
          cameraDirection: string;
          emotionalTone: string;
          culturalDetail: string;
          businessContinuityNote: string;
          interactiveLinks: unknown[];
        }>;
      }>;
    };
  };
}

export interface EotBook {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  author: string;
  synopsis: string;
  language: string;
  coverImageUrl: string;
  requiredLicencePlan: string;
  status: "draft" | "review" | "published" | "archived";
  episodeIds: string[];
  sortOrder: number;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface BookPack {
  manifest: {
    packId: string;
    packType: "book";
    version: string;
    title: string;
    slug: string;
    author: string;
    language: string;
    requiredLicencePlan: string;
    episodeCount: number;
    createdAt: string;
    checksumAlgorithm: "SHA-256";
    checksum: string;
    signature: string;
  };
  content: {
    book: Omit<EotBook, "createdAt" | "updatedAt">;
    episodes: EpisodePack["content"]["episode"][];
  };
}

export type RelationshipType =
  | "parent"
  | "child"
  | "sibling"
  | "spouse"
  | "ex_spouse"
  | "lover"
  | "friend"
  | "enemy"
  | "business_partner"
  | "director"
  | "shareholder"
  | "employee"
  | "mentor"
  | "rival";

export interface EotCharacter {
  id: string;
  name: string;
  displayName: string;
  nickname: string;
  gender: string;
  age: number;
  role: string;
  occupation: string;
  biography: string;
  personality: string;
  currentStatus: string;
  imageUrl: string;
  relationshipIds: string[];
  businessIds: string[];
  propertyIds: string[];
  vehicleIds: string[];
  episodeAppearances: string[];
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotActor {
  id: string;
  name: string;
  stageName: string;
  biography: string;
  characterIds: string[];
  imageUrl: string;
  socialLinks: Record<string, string> | string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotBusiness {
  id: string;
  name: string;
  sector: string;
  description: string;
  ownerCharacterIds: string[];
  executiveCharacterIds: string[];
  headOffice: string;
  country: string;
  city: string;
  imageUrl: string;
  vendorId?: string;
  vendorIds?: string[];
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotProperty {
  id: string;
  name: string;
  type: string;
  location: string;
  description: string;
  ownerCharacterIds: string[];
  businessIds?: string[];
  imageUrl: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotVehicle {
  id: string;
  name: string;
  type: string;
  registration: string;
  ownerCharacterIds: string[];
  imageUrl: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotAsset {
  id: string;
  name: string;
  type: string;
  description: string;
  imageUrl: string;
  ownerCharacterIds?: string[];
  businessIds?: string[];
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotRelationship {
  id: string;
  type: RelationshipType;
  fromCharacterId?: string;
  toCharacterId?: string;
  characterIds?: string[];
  businessId?: string;
  assetId?: string;
  label?: string;
  description?: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotVendor {
  id: string;
  businessName: string;
  sector: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  country: string;
  city: string;
  district: string;
  suburb: string;
  address: string;
  branchCount: number;
  productCount: number;
  status: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotProduct {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  price: number;
  currency: string;
  imageUrl: string;
  availability: string;
  stockStatus: string;
  tags: string[];
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotProductCategory {
  id: string;
  name: string;
  description?: string;
  sector?: string;
  imageUrl?: string;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

export interface EotVendorBranch {
  id: string;
  vendorId: string;
  name: string;
  country: string;
  city: string;
  district: string;
  suburb: string;
  address: string;
  phone?: string;
  whatsapp?: string;
}

export interface EotVendorContact {
  id: string;
  vendorId: string;
  label: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
}

export interface VendorPack {
  manifest: {
    packId: string;
    packType: "vendor";
    version: string;
    vendorId: string;
    vendorName: string;
    createdAt: string;
  };
  content: {
    vendor: EotVendor;
    products: EotProduct[];
  };
}

export interface EotQuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  points: number;
}

export interface EotQuiz {
  id: string;
  title: string;
  description: string;
  episodeId: string;
  seasonNumber: number;
  episodeNumber: number;
  questions: EotQuizQuestion[];
  pointsAwarded: number;
  status: string;
  createdAt: FirestoreDate;
}

export interface EotPoll {
  id: string;
  title: string;
  question: string;
  options: string[];
  episodeId: string;
  status: string;
  createdAt: FirestoreDate;
}

export interface EotPrediction {
  id: string;
  title: string;
  question: string;
  options: string[];
  episodeId: string;
  closingDate: string;
  status: string;
}

export interface EotLeaderboardEntry {
  id: string;
  readerId: string;
  displayName: string;
  points: number;
  badges: number;
  completedEpisodes: number;
  predictions: number;
  quizScores: number;
  period: "weekly" | "monthly" | "allTime";
  weekNumber?: number;
  month?: string;
  updatedAt: FirestoreDate;
}

export interface EotRewardDefinition {
  id: string;
  title: string;
  description: string;
  points: number;
  trigger: string;
  createdAt?: FirestoreDate;
}

export interface EotBadgeDefinition {
  id: string;
  badgeCode: string;
  title: string;
  description: string;
  icon: string;
  requiredPoints?: number;
  trigger?: string;
  createdAt?: FirestoreDate;
}

export type LicenceStatus = "active" | "expired" | "grace" | "revoked" | "invalid";
export type LicenceSource = "activation_code" | "scratch_card" | "agent" | "manual";
export type SubscriptionPlanCode = "free" | "reader" | "premium" | "studio" | "enterprise";

export interface DeviceIdentity {
  deviceId: string;
  createdAt: string;
  lastSeenAt: string;
  platform: string;
  userAgent: string;
}

export interface LocalLicence {
  licenceId: string;
  readerId: string;
  deviceId: string;
  phoneNumber: string;
  plan: SubscriptionPlanCode | string;
  status: LicenceStatus;
  features: string[];
  issuedAt: string;
  expiresAt: string;
  graceExpiresAt: string;
  source: LicenceSource;
  syncStatus: "pending" | "synced" | "failed" | "local-only";
}

export interface ActivationAttempt {
  id: string;
  readerId: string;
  deviceId: string;
  phoneNumber: string;
  activationCode: string;
  status: "pending" | "success" | "failed";
  message: string;
  createdAt: string;
}

export interface ScratchCardAttempt {
  id: string;
  readerId: string;
  deviceId: string;
  phoneNumber: string;
  scratchCardCode: string;
  status: "pending" | "success" | "failed";
  message: string;
  createdAt: string;
}

export interface AgentActivationRequest {
  id: string;
  agentCode: string;
  customerName: string;
  phoneNumber: string;
  plan: SubscriptionPlanCode | string;
  deviceId?: string;
  readerId?: string;
  notes: string;
  status: "pending" | "approved" | "rejected" | "completed";
  createdAt: string;
  updatedAt: string;
  syncStatus: "pending" | "synced" | "failed" | "local-only";
}

export interface LicenceActivityLog {
  id: string;
  readerId: string;
  deviceId: string;
  eventType: string;
  licenceId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  syncStatus: "pending" | "synced" | "failed" | "local-only";
}

export interface EotActivationCode {
  id: string;
  activationCode: string;
  plan: SubscriptionPlanCode | string;
  status: "unused" | "active" | "redeemed" | "revoked" | "expired";
  features: string[];
  durationDays: number;
  redeemedByReaderId?: string;
  redeemedByDeviceId?: string;
  phoneNumber?: string;
  licenceId?: string;
  createdAt?: FirestoreDate;
  redeemedAt?: FirestoreDate;
}

export interface EotScratchCard {
  id: string;
  scratchCardCode: string;
  batchId?: string;
  plan: SubscriptionPlanCode | string;
  status: "unused" | "redeemed" | "revoked" | "expired";
  features: string[];
  durationDays: number;
  redeemedByReaderId?: string;
  redeemedByDeviceId?: string;
  phoneNumber?: string;
  licenceId?: string;
  createdAt?: FirestoreDate;
  redeemedAt?: FirestoreDate;
}

export interface EotScratchCardBatch {
  id: string;
  batchName: string;
  plan: SubscriptionPlanCode | string;
  quantity: number;
  status: "draft" | "issued" | "closed";
  createdAt: FirestoreDate;
}

export interface EotAgent {
  id: string;
  agentCode: string;
  name: string;
  phoneNumber: string;
  status: "active" | "inactive";
  createdAt: FirestoreDate;
}

export interface EotSubscriptionPlan {
  id: SubscriptionPlanCode | string;
  name: string;
  description: string;
  features: string[];
  status: "placeholder" | "active" | "inactive";
  createdAt?: FirestoreDate;
}

export type ContentPlan = "free" | "reader" | "premium" | "studio" | "enterprise";

export interface EotPublishedPack {
  id: string;
  episodeId: string;
  packId: string;
  packType: "episode" | "vendor" | "asset";
  version: string;
  title: string;
  synopsis?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  releaseDate?: string;
  releaseTime?: string;
  timezone?: string;
  requiredLicencePlan: ContentPlan | string;
  downloadUrl?: string;
  isDownloadAvailable: boolean;
  status: "scheduled" | "published" | "archived";
  publishedAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

export interface EotReleaseSchedule {
  id: string;
  episodeId?: string;
  packId?: string;
  releaseDate: string;
  releaseTime: string;
  timezone: string;
  seasonNumber: number;
  episodeNumber: number;
  status: "draft" | "scheduled" | "released" | "missed" | "cancelled";
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

export interface EotCatalogueEntry {
  id: string;
  contentType: "episode" | "vendor" | "asset" | "pack";
  episodeId?: string;
  vendorId?: string;
  assetId?: string;
  packId?: string;
  title: string;
  synopsis: string;
  seasonNumber?: number;
  episodeNumber?: number;
  releaseDate?: string;
  releaseTime?: string;
  timezone?: string;
  requiredLicencePlan: ContentPlan | string;
  downloadUrl?: string;
  isDownloadAvailable: boolean;
  visibility: "public" | "licensed" | "hidden";
  status: "scheduled" | "published" | "archived";
  updatedAt?: FirestoreDate;
}

export interface EotContentRule {
  id: string;
  contentId: string;
  contentType: "episode" | "vendor" | "asset" | "pack";
  requiredLicencePlan: ContentPlan | string;
  visibility: "public" | "licensed" | "hidden";
  canDownload: boolean;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

export interface ProductionActor {
  id: string;
  fullName: string;
  stageName: string;
  gender: string;
  dateOfBirth: string;
  nationality: string;
  phone: string;
  email: string;
  address: string;
  bio: string;
  headshotUrl: string;
  portfolioUrls: string[];
  socialLinks: Record<string, string> | string;
  availabilityStatus: string;
  status: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotCasting {
  id: string;
  characterId: string;
  actorId: string;
  status: "shortlisted" | "auditioned" | "selected" | "approved" | "rejected";
  notes: string;
  assignedDate: string;
  approvedDate: string;
}

export interface ProductionCharacter {
  id: string;
  name: string;
  nickname: string;
  age: number;
  gender: string;
  role: string;
  occupation: string;
  personality: string;
  backstory: string;
  relationships: string[] | string;
  currentStoryStatus: string;
  actorId: string;
  imagePrompt: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotScene {
  id: string;
  episodeId: string;
  chapterId: string;
  sceneNumber: number;
  title: string;
  description: string;
  locationId: string;
  emotionalTone: string;
  cameraDirection: string;
  dialogueSummary: string;
  imagePrompt: string;
  videoPrompt: string;
  continuityNotes: string;
  estimatedDuration: string;
  status: "draft" | "planned" | "ready" | "filmed" | "approved";
}

export interface EotLocation {
  id: string;
  name: string;
  locationType: string;
  address: string;
  city: string;
  country: string;
  description: string;
  imageUrl: string;
  availability: string;
  notes: string;
}

export interface EotProductionProperty {
  id: string;
  name: string;
  type: string;
  ownerCharacterIds: string[];
  description: string;
  imageUrl: string;
  status: string;
}

export interface EotProductionVehicle {
  id: string;
  name: string;
  registration: string;
  type: string;
  ownerCharacterIds: string[];
  description: string;
  imageUrl: string;
}

export interface EotProductionAsset {
  id: string;
  assetType: "character" | "scene" | "location" | "vehicle" | "property" | "episodePoster" | "marketing";
  prompt: string;
  relatedCharacterId: string;
  relatedSceneId: string;
  relatedEpisodeId: string;
  generatedImageUrl: string;
  generatedVideoUrl: string;
  createdAt: FirestoreDate;
}

export interface EotProductionSchedule {
  id: string;
  episodeId: string;
  sceneId: string;
  scheduledDate: string;
  locationId: string;
  assignedActors: string[];
  assignedAssets: string[];
  status: "planned" | "scheduled" | "in_progress" | "completed";
  notes: string;
}

export interface EotContinuityRecord {
  id: string;
  episodeId: string;
  sceneId: string;
  continuityType: "character_age" | "clothing" | "relationship" | "business" | "location" | "vehicle" | "timeline";
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
  status: "open" | "resolved" | "ignored";
  relatedCharacterId?: string;
  relatedAssetId?: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotStoryTimeline {
  id: string;
  storyDate: string;
  seasonNumber: number;
  episodeNumber: number;
  chapterNumber: number;
  majorEvent: string;
  characterInvolved: string;
  businessInvolved: string;
  familyConsequence: string;
  corporateConsequence: string;
  culturalNote: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotCharacterArc {
  id: string;
  characterId: string;
  seasonNumber: number;
  episodeId: string;
  arcStage: string;
  emotionalState: string;
  goal: string;
  fear: string;
  conflict: string;
  relationshipChanges: string;
  businessImpact: string;
  familyImpact: string;
  notes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotRelationshipArc {
  id: string;
  characterA: string;
  characterB: string;
  relationshipType: string;
  currentStatus: string;
  tensionLevel: number;
  trustLevel: number;
  betrayalRisk: number;
  romanceRisk: number;
  successionImpact: string;
  notes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotBusinessTimeline {
  id: string;
  company: string;
  episodeId: string;
  eventType: string;
  deal: string;
  threat: string;
  acquisition: string;
  marketplaceGrowth: string;
  regulatoryIssue: string;
  investorPressure: string;
  familyBusinessConflict: string;
  notes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotConflictMap {
  id: string;
  episodeId: string;
  conflictType: "family" | "succession" | "romance" | "betrayal" | "corporate" | "investor" | "marketplace" | "cultural";
  title: string;
  description: string;
  characterIds: string[];
  businessIds: string[];
  intensity: number;
  status: "open" | "escalating" | "resolved";
  notes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotContinuityCheck {
  id: string;
  episodeId: string;
  checkType: string;
  title: string;
  description: string;
  severity: "pass" | "info" | "warning" | "critical";
  status: "open" | "resolved" | "ignored";
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotEpisodePlan {
  id: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  storyDate: string;
  mainConflict: string;
  emotionalTurn: string;
  businessConsequence: string;
  familyConsequence: string;
  culturalMoment: string;
  activeCharacters: string;
  requiredAssets: string;
  requiredLocations: string;
  cliffhangerQuestion: string;
  nextEpisodeBridge: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotStoryPrompt {
  id: string;
  episodePlanId: string;
  promptType: "episode" | "chapter" | "paragraph" | "image" | "scene" | "character" | "trailer" | "recap";
  title: string;
  output: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotStoryRule {
  id: string;
  ruleType: "cultural" | "character" | "business" | "episode_ending" | "image_prompt" | "continuity";
  title: string;
  body: string;
  status: "active" | "inactive";
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}
