import type { FieldValue, Timestamp } from "firebase/firestore";

export type FirestoreDate = Timestamp | FieldValue | string;
export type EpisodeStatus = "draft" | "review" | "approved" | "scheduled" | "published" | "archived";

export interface Episode {
  id: string;
  seasonNumber: number;
  episodeNumber: number;
  releaseWeekNumber: number;
  episodeIdentifier: string;
  episodeCode?: string;
  title: string;
  synopsis: string;
  introTitle?: string;
  introNarrative?: string;
  previousEpisodeBridge?: string;
  storyDate: string;
  settingDate?: string;
  mainConflict?: string;
  status: EpisodeStatus;
  requiredLicencePlan: string;
  previousEpisodeId: string;
  nextEpisodeId: string;
  activeCharacters: string;
  activeCharacterIds?: string[];
  activeBusinesses?: string[];
  activeProperties?: string[];
  activeVehicles?: string[];
  businessContinuityNotes: string;
  businessNotes?: string[];
  businessConflictNotes?: string;
  propertyContinuityNotes?: string;
  locationContinuityNotes?: string;
  vehicleContinuityNotes?: string;
  culturalContinuityNotes: string;
  continuityNotes?: string[];
  culturalNotes?: string[];
  endingHook?: string;
  nextEpisodeBridge?: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface Chapter {
  id: string;
  episodeId: string;
  chapterNumber: number;
  title: string;
  chapterTitle?: string;
  intro: string;
  chapterIntro?: string;
  previousEpisodeBridge: string;
  previousSceneReview?: string;
  emotionalTone: string;
  sceneLocation: string;
  scenePropertyId?: string;
  sceneLocationText?: string;
  sceneVehicleIds?: string[];
  featuredCharacterIds?: string[];
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface Paragraph {
  id: string;
  episodeId: string;
  chapterId: string;
  paragraphNumber: number;
  body: string;
  narrativeText?: string;
  dialogueJson: string;
  dialogueCues?: string[];
  imagePrompt: string;
  scenePrompt: string;
  cameraDirection: string;
  cinematicDirection?: string;
  emotionalTone: string;
  culturalDetail: string;
  culturalContinuityNote?: string;
  businessContinuityNote: string;
  interactiveLinksJson: string;
  mentionedCharacterIds?: string[];
  mentionedBusinesses?: string[];
  mentionedProperties?: string[];
  mentionedVehicles?: string[];
  businessDecisionPrompt?: string;
  propertyInteractionPrompt?: string;
  vehicleInteractionPrompt?: string;
  imageSlots?: ImageSlot[];
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface ImageSlot {
  id: string;
  imageType: "character" | "scene" | "illustration" | "location" | "asset";
  characterName?: string;
  firebaseStoragePath?: string;
  fallbackImagePath?: string;
  imagePrompt?: string;
  altText: string;
  displayMode: "inline" | "hero" | "chapter-header" | "background" | "gallery";
}

export interface CharacterAgeCheck {
  characterName: string;
  characterKey: string;
  baselineDate: string;
  baselineAge: number;
  currentStoryAge: number;
  ageProgression: string;
}

export interface CharacterImageCheck {
  characterName: string;
  characterKey: string;
  mainImagePath: string;
  portraitImagePath: string;
  placeholderPath: string;
}

export interface ContinuityPrep {
  previousEpisodeConnection: string;
  activeCharacters: string[];
  characterAgeCheck: CharacterAgeCheck[];
  characterImageCheck: CharacterImageCheck[];
  mainConflict: string;
  businessContinuityNotes: string[];
  culturalContinuityNotes: string[];
  chapterOutline: string[];
  illustrationPlan: string[];
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
      episodeCode?: string;
      storyDate: string;
      settingDate?: string;
      status: EpisodeStatus;
      requiredLicencePlan: string;
      previousEpisodeId: string;
      nextEpisodeId: string;
      introTitle?: string;
      introNarrative?: string;
      previousEpisodeBridge?: string;
      mainConflict?: string;
      endingHook?: string;
      nextEpisodeBridgeText?: string;
      activeCharacters: string;
      activeCharacterIds?: string[];
      activeBusinesses?: string[];
      activeProperties?: string[];
      activeVehicles?: string[];
      businessContinuityNotes: string;
      businessNotes?: string[];
      businessConflictNotes?: string;
      propertyContinuityNotes?: string;
      locationContinuityNotes?: string;
      vehicleContinuityNotes?: string;
      culturalContinuityNotes: string;
      culturalNotes?: string[];
      continuityPrep?: ContinuityPrep;
      imageSlots?: ImageSlot[];
      chapters: Array<{
        id: string;
        chapterNumber: number;
        title: string;
        intro: string;
        previousEpisodeBridge: string;
        previousSceneReview?: string;
        emotionalTone?: string;
        sceneLocation?: string;
        scenePropertyId?: string;
        sceneLocationText?: string;
        sceneVehicleIds?: string[];
        featuredCharacterIds?: string[];
        paragraphs: Array<{
          id: string;
          paragraphNumber: number;
          body: string;
          narrativeText?: string;
          dialogue: unknown[];
          dialogueCues?: string[];
          imagePrompt: string;
          scenePrompt: string;
          cameraDirection: string;
          cinematicDirection?: string;
          emotionalTone: string;
          culturalDetail: string;
          culturalContinuityNote?: string;
          businessContinuityNote: string;
          interactiveLinks: unknown[];
          imageSlots?: ImageSlot[];
          mentionedCharacterIds?: string[];
          mentionedBusinesses?: string[];
          mentionedProperties?: string[];
          mentionedVehicles?: string[];
          businessDecisionPrompt?: string;
          propertyInteractionPrompt?: string;
          vehicleInteractionPrompt?: string;
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

export type EotBookletStatus = "draft" | "review" | "approved" | "published" | "archived";

export interface EotBooklet {
  id: string;
  bookletCode: string;
  title: string;
  subtitle: string;
  author: string;
  publisher: string;
  tagline: string;
  edition: string;
  publicationDate: string;
  category: string;
  language: string;
  description: string;
  coverImageUrl: string;
  backCoverImageUrl: string;
  bannerImageUrl: string;
  libraryThumbnailUrl: string;
  ageRating: string;
  requiredLicencePlan: string;
  isPartOfEotStory: false;
  status: EotBookletStatus;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export type EotBookletCoverImageKind = "front_cover" | "back_cover" | "banner" | "library_thumbnail";

export interface EotBookletCoverImage {
  id: string;
  bookletId: string;
  imageKind: EotBookletCoverImageKind;
  imageUrl: string;
  storagePath: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  source: "uploaded" | "generated" | "external";
  width?: number;
  height?: number;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotBookletMedia {
  id: string;
  bookletId: string;
  chapterId?: string;
  sectionId?: string;
  mediaType: "cover" | "illustration" | "image" | "diagram" | "activity" | "other";
  title: string;
  caption: string;
  credit: string;
  credits?: string;
  altText: string;
  imagePrompt: string;
  downloadUrl: string;
  imageUrl?: string;
  storagePath?: string;
  displayMode: "cover" | "inline" | "full_width" | "gallery" | "background";
  fileName: string;
  contentType: string;
  fileSize: number;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export type EotBookletQuizQuestionType = "multiple_choice" | "true_false" | "short_answer";

export interface EotBookletQuizQuestion {
  id: string;
  questionType: EotBookletQuizQuestionType;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  points: number;
}

export interface EotBookletQuiz {
  id: string;
  bookletId: string;
  chapterId?: string;
  title: string;
  description: string;
  passMark: number;
  points: number;
  questions: EotBookletQuizQuestion[];
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export type EotBookletEngagementType = "feedback" | "submit_answers" | "ask_question" | "join_community" | "request_help" | "send_feedback" | "ask_questions";

export interface EotBookletEngagement {
  id: string;
  bookletId: string;
  chapterId?: string;
  sectionId?: string;
  ctaType: EotBookletEngagementType;
  purpose: EotBookletEngagementType;
  buttonLabel: string;
  whatsappNumber: string;
  messageTemplate: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotBookletChapter {
  id: string;
  bookletId: string;
  chapterNumber: number;
  title: string;
  summary: string;
  intro: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotBookletSection {
  id: string;
  bookletId: string;
  chapterId: string;
  sectionNumber: number;
  heading: string;
  content: string;
  imagePrompt: string;
  imageUrl: string;
  illustrationStyle: string;
  interactiveLinksJson: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export type LibraryBookletStatus = "draft" | "review" | "approved" | "published" | "archived";

export interface LibraryBooklet {
  id: string;
  bookletCode: string;
  title: string;
  subtitle: string;
  author: string;
  category: string;
  description: string;
  coverImageUrl: string;
  language: string;
  ageRating: string;
  status: LibraryBookletStatus;
  requiredLicencePlan: string;
  isPartOfEotStory: false;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface LibraryChapter {
  id: string;
  bookletId: string;
  chapterNumber: number;
  title: string;
  intro: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface LibrarySection {
  id: string;
  bookletId: string;
  chapterId: string;
  sectionNumber: number;
  heading: string;
  body: string;
  imagePrompt: string;
  imageUrl: string;
  interactiveLinksJson: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface LibraryBookletImage {
  id: string;
  label: string;
  imageUrl: string;
  altText: string;
  title?: string;
  caption?: string;
  credits?: string;
  chapterId?: string;
  sectionId?: string;
  prompt?: string;
}

export interface LibraryBookletQuizQuestion {
  id: string;
  questionType?: EotBookletQuizQuestionType;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  points?: number;
}

export interface LibraryBookletQuiz {
  id: string;
  scope: "booklet" | "chapter";
  chapterId?: string;
  title: string;
  passScore: number;
  questions: LibraryBookletQuizQuestion[];
}

export interface LibraryWhatsappPrompt {
  id: string;
  scope: "booklet" | "chapter" | "section";
  chapterId?: string;
  sectionId?: string;
  ctaType?: EotBookletEngagementType;
  buttonLabel?: string;
  whatsappNumber?: string;
  prompt: string;
  responseTemplate: string;
}

export interface LibraryReadingSettings {
  fontScale: "standard" | "large";
  estimatedMinutes: number;
  allowOffline: boolean;
  showImages: boolean;
}

export interface LibraryBookletExtras {
  bookletId: string;
  manuscript: string;
  images: LibraryBookletImage[];
  illustrations: LibraryBookletImage[];
  quizzes: LibraryBookletQuiz[];
  whatsappPrompts: LibraryWhatsappPrompt[];
  readingSettings: LibraryReadingSettings;
  metadata: Record<string, string>;
  updatedAt: FirestoreDate;
}

export interface LibraryCatalogueEntry {
  id: string;
  bookletId: string;
  bookletCode: string;
  title: string;
  subtitle: string;
  author: string;
  category: string;
  description: string;
  coverImageUrl: string;
  language: string;
  ageRating: string;
  requiredLicencePlan: string;
  isPartOfEotStory: false;
  status: "published" | "archived";
  updatedAt: FirestoreDate;
}

export interface LibraryCategory {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

export interface LibraryBookletPack {
  manifest: {
    packId: string;
    packType: "library_booklet";
    version: string;
    bookletCode: string;
    title: string;
    author: string;
    category: string;
    createdAt: string;
    requiredLicencePlan: string;
    isPartOfEotStory: false;
    checksumAlgorithm: "SHA-256";
    checksum: string;
    signature: string;
  };
  content: {
    cover?: {
      title: string;
      subtitle: string;
      author: string;
      imageUrl: string;
      description: string;
      category: string;
      ageRating: string;
    };
    chapters?: Array<{
      id: string;
      chapterNumber: number;
      title: string;
      intro: string;
      sections: Array<{
        id: string;
        sectionNumber: number;
        heading: string;
        body: string;
        imagePrompt: string;
        imageUrl: string;
        interactiveLinks: unknown[];
      }>;
    }>;
    sections?: Array<{
      id: string;
      chapterId: string;
      sectionNumber: number;
      heading: string;
      body: string;
      imagePrompt: string;
      imageUrl: string;
      interactiveLinks: unknown[];
    }>;
    images?: LibraryBookletImage[];
    illustrations?: LibraryBookletImage[];
    media?: LibraryBookletImage[];
    quizzes?: LibraryBookletQuiz[];
    whatsappPrompts?: LibraryWhatsappPrompt[];
    readingSettings?: LibraryReadingSettings;
    metadata?: Record<string, string>;
    booklet: {
      id: string;
      title: string;
      subtitle: string;
      author: string;
      category: string;
      description: string;
      coverImageUrl: string;
      language: string;
      ageRating: string;
      requiredLicencePlan: string;
      isPartOfEotStory: false;
      chapters: Array<{
        id: string;
        chapterNumber: number;
        title: string;
        intro: string;
        sections: Array<{
          id: string;
          sectionNumber: number;
          heading: string;
          body: string;
          imagePrompt: string;
          imageUrl: string;
          interactiveLinks: unknown[];
        }>;
      }>;
    };
  };
}

export interface DeployableBookletPack extends LibraryBookletPack {
  cover: NonNullable<LibraryBookletPack["content"]["cover"]>;
  chapters: NonNullable<LibraryBookletPack["content"]["chapters"]>;
  sections: NonNullable<LibraryBookletPack["content"]["sections"]>;
  illustrations: NonNullable<LibraryBookletPack["content"]["illustrations"]>;
  media: NonNullable<LibraryBookletPack["content"]["media"]>;
  quizzes: NonNullable<LibraryBookletPack["content"]["quizzes"]>;
  whatsappEngagement: NonNullable<LibraryBookletPack["content"]["whatsappPrompts"]>;
}

export interface EotBookletBuildHistory {
  id: string;
  bookletId: string;
  packId: string;
  version: string;
  fileName: string;
  checksum: string;
  chapterCount: number;
  sectionCount: number;
  illustrationCount: number;
  quizCount: number;
  whatsappEngagementCount: number;
  createdAt: FirestoreDate;
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
  characterCode?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  name: string;
  displayName: string;
  nickname: string;
  gender: string;
  dateOfBirth?: string;
  age: number;
  nationality?: string;
  tribe?: string;
  language?: string;
  role: string;
  occupation: string;
  archetype?: string;
  position?: string;
  shortBiography?: string;
  coreTraits?: string[];
  signatureQuote?: string;
  memorableQuotes?: string[];
  isPublic?: boolean;
  enabled?: boolean;
  displayOrder?: number;
  status?: "active" | "inactive" | "deceased" | "retired" | "missing" | string;
  physicalDescription?: string;
  height?: string;
  build?: string;
  complexion?: string;
  hairStyle?: string;
  eyeColor?: string;
  biography: string;
  strengths?: string;
  weaknesses?: string;
  ambitions?: string;
  fears?: string;
  values?: string;
  personality: string;
  backstory?: string;
  currentConflict?: string;
  currentGoal?: string;
  currentStatus: string;
  currentStoryStatus?: string;
  businessesOwned?: string[];
  executiveRoles?: string[];
  shareholdings?: string[];
  father?: string;
  mother?: string;
  children?: string[];
  siblings?: string[];
  spouses?: string[];
  formerSpouses?: string[];
  properties?: string[];
  vehicles?: string[];
  imageUrl: string;
  portraitUrl?: string;
  galleryUrls?: string[];
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
  actorCode?: string;
  name: string;
  fullName?: string;
  stageName: string;
  gender?: string;
  dateOfBirth?: string;
  age?: number;
  nationality?: string;
  tribe?: string;
  languages?: string[];
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  bio?: string;
  biography: string;
  skills?: string[];
  experienceLevel?: "new" | "emerging" | "experienced" | "veteran";
  availabilityStatus?: "available" | "limited" | "unavailable" | "booked" | "inactive";
  status?: "active" | "shortlisted" | "auditioning" | "cast" | "inactive" | "rejected";
  characterIds: string[];
  headshotUrl?: string;
  imageUrl: string;
  galleryUrls?: string[];
  portfolioLinks?: string[];
  socialLinks: Record<string, string> | string;
  notes?: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotActorPortfolio {
  id: string;
  actorId: string;
  portfolioType: "image" | "video" | "document" | "link" | "audition_clip";
  title: string;
  description: string;
  fileUrl?: string;
  externalUrl?: string;
  storagePath?: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotActorAvailability {
  id: string;
  actorId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  status: "available" | "unavailable" | "tentative" | "booked";
  reason?: string;
  notes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotActorAudition {
  id: string;
  actorId: string;
  characterId: string;
  auditionDate: string;
  auditionType: "live" | "self_tape" | "online" | "callback" | "chemistry_read";
  status: "scheduled" | "completed" | "missed" | "cancelled" | "shortlisted" | "rejected";
  scoreActing?: number;
  scorePresence?: number;
  scoreVoice?: number;
  scoreFit?: number;
  overallScore?: number;
  auditionClipUrl?: string;
  notes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotCastingAssignment {
  id: string;
  actorId: string;
  characterId: string;
  roleType: "main" | "supporting" | "recurring" | "guest" | "cameo" | "extra";
  status: "proposed" | "shortlisted" | "approved" | "rejected" | "confirmed" | "replaced";
  assignedDate: string;
  approvedBy?: string;
  approvedAt?: string;
  replacementReason?: string;
  notes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotActorEpisodeAppearance {
  id: string;
  actorId: string;
  characterId: string;
  episodeId: string;
  seasonNumber: number;
  episodeNumber: number;
  appearanceType: "main" | "supporting" | "cameo" | "voice_only" | "background";
  productionStatus: "planned" | "scheduled" | "filmed" | "approved";
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotActorSceneAssignment {
  id: string;
  actorId: string;
  characterId: string;
  sceneId: string;
  episodeId: string;
  locationId?: string;
  scheduledDate?: string;
  callTime?: string;
  wrapTime?: string;
  status: "planned" | "scheduled" | "confirmed" | "completed" | "cancelled";
  notes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotActorContract {
  id: string;
  actorId: string;
  contractType: "episode" | "season" | "cameo" | "production" | "nda" | "release_form";
  status: "draft" | "sent" | "signed" | "expired" | "cancelled";
  documentUrl?: string;
  startDate?: string;
  endDate?: string;
  notes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotTalentNote {
  id: string;
  actorId: string;
  noteType: "casting" | "performance" | "availability" | "contract" | "conduct" | "general";
  note: string;
  createdBy: string;
  createdAt: FirestoreDate;
}

export interface EotBusiness {
  id: string;
  businessCode?: string;
  name: string;
  tradingName?: string;
  sector: string;
  industry?: string;
  description: string;
  ownerCharacterIds?: string[];
  executiveCharacterIds?: string[];
  headOffice: string;
  country: string;
  city: string;
  district?: string;
  suburb?: string;
  address?: string;
  registrationNumber?: string;
  taxNumber?: string;
  status?: "active" | "inactive" | "suspended" | "closed" | "acquired" | "fictional" | string;
  storyRole?: string;
  isFictional?: boolean;
  isCommerceLinked?: boolean;
  imageUrl: string;
  logoUrl?: string;
  bannerUrl?: string;
  vendorId?: string;
  vendorIds?: string[];
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotBusinessOwnership {
  id: string;
  businessId: string;
  ownerType: "character" | "business" | "trust" | "family" | "external";
  ownerId: string;
  ownerName: string;
  sharePercentage: number;
  votingPower: number;
  notes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotBusinessDirector {
  id: string;
  businessId: string;
  characterId: string;
  title: string;
  appointmentDate: string;
  status: "active" | "resigned" | "removed" | "deceased";
  notes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotBusinessBranch {
  id: string;
  businessId: string;
  branchName: string;
  country: string;
  city: string;
  district: string;
  suburb: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  managerCharacterId?: string;
  status: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotBusinessAssetRecord {
  id: string;
  businessId: string;
  assetType: "property" | "vehicle" | "equipment" | "brand" | "system" | "investment" | "cash" | "other";
  assetId?: string;
  assetName: string;
  valueEstimate: number;
  currency: string;
  notes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotBusinessRelationship {
  id: string;
  businessA: string;
  businessB: string;
  relationshipType: "parent_company" | "subsidiary" | "competitor" | "supplier" | "customer" | "partner" | "investor" | "acquisition_target" | "regulator" | "creditor" | "debtor" | string;
  strength: number;
  conflictLevel: number;
  notes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotBusinessAppearance {
  id: string;
  businessId: string;
  seasonNumber: number;
  episodeNumber: number;
  chapterNumber?: number;
  sceneContext: string;
  importance: "main" | "supporting" | "background";
  storyImpactScore: number;
  createdAt: FirestoreDate;
}

export interface EotProperty {
  id: string;
  propertyCode?: string;
  name: string;
  type: string;
  propertyType?: string;
  location: string;
  description: string;
  country?: string;
  province?: string;
  city?: string;
  district?: string;
  suburb?: string;
  address?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  sizeValue?: number;
  sizeUnit?: string;
  zoning?: string;
  status?: "active" | "inactive" | "sold" | "leased" | "under_development" | "damaged" | "fictional" | string;
  storyRole?: string;
  isFictional?: boolean;
  isCommercial?: boolean;
  isResidential?: boolean;
  isProductionLocation?: boolean;
  ownerCharacterIds: string[];
  ownerBusinessIds?: string[];
  linkedBusinessIds?: string[];
  linkedVehicleIds?: string[];
  linkedAssetIds?: string[];
  businessIds?: string[];
  imageUrl: string;
  galleryUrls?: string[];
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotPropertyOwnership {
  id: string;
  propertyId: string;
  ownerType: "character" | "business" | "family" | "trust" | "external";
  ownerId: string;
  ownerName: string;
  ownershipPercentage: number;
  acquisitionDate: string;
  acquisitionMethod: "purchase" | "inheritance" | "gift" | "company_asset" | "disputed" | "unknown";
  notes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotPropertyTenant {
  id: string;
  propertyId: string;
  tenantType: "character" | "business" | "external";
  tenantId: string;
  tenantName: string;
  tenancyType: "residential" | "commercial" | "informal" | "temporary" | "production_use";
  startDate: string;
  endDate?: string;
  rentAmount?: number;
  currency?: string;
  status: "active" | "ended" | "disputed";
  notes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotPropertyValuation {
  id: string;
  propertyId: string;
  valuationDate: string;
  estimatedValue: number;
  currency: string;
  valuationSource: "owner_estimate" | "market" | "agent" | "bank" | "story_reference" | "unknown";
  notes: string;
  createdAt: FirestoreDate;
}

export interface EotPropertyAssetRecord {
  id: string;
  propertyId: string;
  assetType: "building" | "furniture" | "equipment" | "security_system" | "vehicle_parking" | "signage" | "infrastructure" | "other";
  assetName: string;
  valueEstimate?: number;
  currency?: string;
  notes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotPropertyRelationship {
  id: string;
  propertyA: string;
  propertyB: string;
  relationshipType: "nearby" | "same_estate" | "same_business_complex" | "parent_land" | "subdivision" | "competing_site" | "replacement_site" | "hidden_connection" | string;
  notes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotPropertyAppearance {
  id: string;
  propertyId: string;
  seasonNumber: number;
  episodeNumber: number;
  chapterNumber?: number;
  sceneContext: string;
  importance: "main" | "supporting" | "background";
  storyImpactScore: number;
  createdAt: FirestoreDate;
}

export interface EotVehicle {
  id: string;
  vehicleCode?: string;
  name: string;
  type: string;
  vehicleType?: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  registration: string;
  registrationNumber?: string;
  vinOrChassisNumber?: string;
  engineNumber?: string;
  country?: string;
  city?: string;
  district?: string;
  suburb?: string;
  status?: "active" | "inactive" | "sold" | "damaged" | "stolen" | "destroyed" | "fictional" | string;
  storyRole?: string;
  isFictional?: boolean;
  isBusinessAsset?: boolean;
  isProductionVehicle?: boolean;
  ownerCharacterIds: string[];
  ownerBusinessIds?: string[];
  linkedPropertyIds?: string[];
  linkedAssetIds?: string[];
  imageUrl: string;
  galleryUrls?: string[];
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotVehicleOwnership {
  id: string;
  vehicleId: string;
  ownerType: "character" | "business" | "family" | "trust" | "external";
  ownerId: string;
  ownerName: string;
  ownershipPercentage: number;
  acquisitionDate: string;
  acquisitionMethod: "purchase" | "gift" | "inheritance" | "company_asset" | "leased" | "rented" | "disputed" | "unknown";
  notes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotVehicleUsage {
  id: string;
  vehicleId: string;
  usageType: "personal" | "executive" | "delivery" | "logistics" | "security" | "family" | "production" | "story_event" | "emergency" | "unknown";
  assignedCharacterId?: string;
  assignedBusinessId?: string;
  assignedDriverName?: string;
  startDate: string;
  endDate?: string;
  notes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotVehicleMaintenance {
  id: string;
  vehicleId: string;
  maintenanceDate: string;
  maintenanceType: "service" | "repair" | "tyre_change" | "accident_repair" | "fuel" | "inspection" | "insurance" | "registration" | "other";
  costAmount?: number;
  currency?: string;
  serviceProvider?: string;
  notes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotVehicleRelationship {
  id: string;
  vehicleA: string;
  vehicleB: string;
  relationshipType: "same_owner" | "same_fleet" | "replacement" | "convoy" | "accident_related" | "competitor_vehicle" | "hidden_connection" | string;
  notes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotVehicleAppearance {
  id: string;
  vehicleId: string;
  seasonNumber: number;
  episodeNumber: number;
  chapterNumber?: number;
  sceneContext: string;
  importance: "main" | "supporting" | "background";
  storyImpactScore: number;
  createdAt: FirestoreDate;
}

export interface EotAsset {
  id: string;
  name: string;
  type: string;
  description: string;
  imageUrl: string;
  ownerCharacterIds?: string[];
  businessIds?: string[];
  assetCode?: string;
  title?: string;
  assetType?: "character_image" | "actor_image" | "business_logo" | "business_banner" | "property_image" | "vehicle_image" | "scene_image" | "episode_poster" | "season_poster" | "marketing_image" | "production_reference" | "concept_art" | "other" | string;
  category?: "character" | "actor" | "business" | "property" | "vehicle" | "scene" | "episode" | "season" | "marketing" | "production" | string;
  storagePath?: string;
  downloadUrl?: string;
  mimeType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  relatedCharacterIds?: string[];
  relatedActorIds?: string[];
  relatedBusinessIds?: string[];
  relatedPropertyIds?: string[];
  relatedVehicleIds?: string[];
  relatedSceneIds?: string[];
  relatedEpisodeIds?: string[];
  tags?: string[];
  status?: "draft" | "approved" | "published" | "archived" | string;
  createdBy?: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotAssetFolder {
  id: string;
  name: string;
  category: string;
  storagePath: string;
  description: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotAssetTag {
  id: string;
  label: string;
  usageCount: number;
  createdAt: FirestoreDate;
}

export interface EotAssetPrompt {
  id: string;
  assetId?: string;
  promptType: "image" | "video" | "animation" | "character" | "scene" | "poster" | "marketing" | string;
  title: string;
  promptText: string;
  negativePrompt?: string;
  style: "photorealistic" | "cinematic" | "executive" | "corporate" | "dramatic" | "tv_series" | "real_estate" | "business" | "african" | "custom" | string;
  aspectRatio: "1:1" | "16:9" | "9:16" | "4:5" | "3:2" | string;
  notes: string;
  status?: "draft" | "approved" | "published" | "archived" | string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotAssetVersion {
  id: string;
  assetId: string;
  versionNumber: number;
  downloadUrl: string;
  notes: string;
  createdAt: FirestoreDate;
}

export interface EotAssetRelationship {
  id: string;
  assetId: string;
  relatedAssetId: string;
  relationshipType: string;
  notes: string;
  createdAt: FirestoreDate;
}

export interface EotAssetUsage {
  id: string;
  assetId: string;
  usedInType: "episode" | "scene" | "chapter" | "character" | "business" | "property" | "vehicle" | "marketing" | string;
  usedInId: string;
  createdAt: FirestoreDate;
}

export interface EotRelationship {
  id: string;
  relationshipId?: string;
  type: RelationshipType;
  relationshipType?: RelationshipType | string;
  characterA?: string;
  characterB?: string;
  relationshipStrength?: number;
  trustLevel?: number;
  conflictLevel?: number;
  fromCharacterId?: string;
  toCharacterId?: string;
  characterIds?: string[];
  businessId?: string;
  assetId?: string;
  label?: string;
  description?: string;
  notes?: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotCharacterAppearance {
  id: string;
  characterId: string;
  episodeId?: string;
  chapterId?: string;
  paragraphId?: string;
  seasonNumber: number;
  episodeNumber: number;
  chapterNumber: number;
  importance: "main" | "supporting" | "cameo";
  screenTimeEstimate: string;
  storyImpactScore: number;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotCharacterTimelineEvent {
  id: string;
  characterId: string;
  eventType: "birth" | "marriage" | "divorce" | "promotion" | "acquisition" | "betrayal" | "inheritance" | "arrest" | "death" | "businessLaunch" | "propertyPurchase" | string;
  title: string;
  description: string;
  eventDate: string;
  seasonNumber?: number;
  episodeNumber?: number;
  impactScore: number;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotVendor {
  id: string;
  vendorCode?: string;
  businessId?: string;
  businessName: string;
  tradingName?: string;
  sector: string;
  category?: string;
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
  isStoryLinked?: boolean;
  linkedCharacterIds?: string[];
  linkedBusinessIds?: string[];
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotProduct {
  id: string;
  productCode?: string;
  vendorId: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  brand: string;
  price: number;
  currency: string;
  unit?: string;
  imageUrl: string;
  galleryUrls?: string[];
  availability: string;
  stockStatus: string;
  tags: string[];
  linkedEpisodeIds?: string[];
  linkedCharacterIds?: string[];
  linkedBusinessIds?: string[];
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotProductCategory {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  sector?: string;
  parentCategoryId?: string;
  sortOrder?: number;
  active?: boolean;
  imageUrl?: string;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

export interface EotVendorBranch {
  id: string;
  vendorId: string;
  branchName?: string;
  name: string;
  country: string;
  city: string;
  district: string;
  suburb: string;
  address: string;
  phone?: string;
  whatsapp?: string;
  managerName?: string;
  active?: boolean;
}

export interface EotVendorContact {
  id: string;
  vendorId: string;
  label: string;
  contactType?: "phone" | "whatsapp" | "email" | "website" | "location" | string;
  value?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  active?: boolean;
}

export type AdvertisingStatus = "draft" | "review" | "approved" | "active" | "paused" | "rejected" | "expired";
export type AdvertisingPackage = "starter" | "growth" | "pro" | "enterprise";
export type AdvertisingPlacement = "daily_spotlight" | "episode_sponsor" | "chapter_spotlight" | "marketplace_home" | "vendor_listing" | "product_listing" | "category" | "search";

export interface Advertiser {
  id: string;
  vendorId?: string;
  businessName: string;
  industry: string;
  location: string;
  shortDescription: string;
  logoUrl: string;
  bannerUrl: string;
  website?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  verified: boolean;
  status: AdvertisingStatus;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
  createdBy?: string;
  audit?: Record<string, unknown>;
}

export interface AdvertisingCampaign {
  id: string;
  advertiserId: string;
  vendorId?: string;
  title: string;
  packageType: AdvertisingPackage;
  placementTypes: AdvertisingPlacement[];
  startDate: string;
  endDate: string;
  status: AdvertisingStatus;
  moderationStatus: "pending" | "approved" | "rejected";
  priority: number;
  budget: number;
  targetRegion: string;
  targetCategory: string;
  bannerUrl: string;
  logoUrl: string;
  destinationUrl: string;
  contactPhone: string;
  contactWhatsapp: string;
  summary: string;
  rejectionReason?: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
  createdBy?: string;
  audit?: Record<string, unknown>;
}

export interface BusinessSpotlight {
  id: string;
  campaignId: string;
  advertiserId: string;
  vendorId?: string;
  businessName: string;
  industry: string;
  location: string;
  shortDescription: string;
  bannerUrl: string;
  logoUrl: string;
  verified: boolean;
  status: AdvertisingStatus;
  priority: number;
  startDate: string;
  endDate: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EpisodeSponsor {
  id: string;
  campaignId: string;
  advertiserId: string;
  episodeId?: string;
  sponsorName: string;
  industry: string;
  tagline: string;
  logoUrl: string;
  status: AdvertisingStatus;
  priority: number;
  startDate: string;
  endDate: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface AdvertisingImpression {
  id: string;
  campaignId: string;
  advertiserId?: string;
  readerId?: string;
  placement: AdvertisingPlacement | string;
  entityId?: string;
  metadata: Record<string, unknown>;
  createdAt: FirestoreDate;
  syncStatus?: "pending" | "synced" | "failed" | "local-only";
}

export interface AdvertisingClick {
  id: string;
  campaignId: string;
  advertiserId?: string;
  readerId?: string;
  placement: AdvertisingPlacement | string;
  action: "view_business" | "contact_vendor" | "whatsapp" | "phone" | "dismiss" | "profile_visit" | "lead" | string;
  entityId?: string;
  metadata: Record<string, unknown>;
  createdAt: FirestoreDate;
  syncStatus?: "pending" | "synced" | "failed" | "local-only";
}

export interface CampaignAnalytics {
  id: string;
  campaignId: string;
  advertiserId?: string;
  impressions: number;
  clicks: number;
  modalViews: number;
  modalClosures: number;
  profileVisits: number;
  contactClicks: number;
  whatsappClicks: number;
  phoneClicks: number;
  leads: number;
  revenue: number;
  updatedAt: FirestoreDate;
}

export interface EotCommerceLink {
  id: string;
  linkType: "story_business_to_vendor" | "character_to_vendor" | "character_to_product" | "episode_to_vendor" | "paragraph_to_product" | "business_to_product" | string;
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  label: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotCommerceInterestLog {
  id: string;
  readerId: string;
  eventType: "vendor_viewed" | "product_viewed" | "whatsapp_clicked" | "call_clicked" | "search_performed" | "category_opened" | "vendor_pack_imported" | string;
  vendorId?: string;
  productId?: string;
  searchTerm?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  syncStatus: "pending" | "synced" | "failed" | "local-only";
}

export interface EotAnalyticsSnapshot {
  id: string;
  snapshotType: string;
  period: string;
  dateFrom: string;
  dateTo: string;
  metrics: Record<string, unknown>;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotAnalyticsCacheRecord {
  id: string;
  cacheKey: string;
  payload: Record<string, unknown>;
  updatedAt: string;
}

export interface EotAnalyticsFilterRecord {
  id: string;
  filters: Record<string, string>;
  updatedAt: string;
}

export interface VendorPack {
  manifest: {
    packId: string;
    packType: "vendor";
    version: string;
    vendorId: string;
    vendorName: string;
    sector?: string;
    createdAt: string;
    checksumAlgorithm?: "SHA-256" | string;
    checksum?: string;
    signature?: string;
  };
  content: {
    vendor: EotVendor;
    branches?: EotVendorBranch[];
    contacts?: EotVendorContact[];
    categories?: EotProductCategory[];
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
  episodeId?: string;
  packId: string;
  packType: "episode" | "library_booklet" | "vendor" | "asset" | "quiz";
  version: string;
  title: string;
  synopsis?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  releaseDate?: string;
  releaseTime?: string;
  timezone?: string;
  requiredLicencePlan: ContentPlan | string;
  checksum?: string;
  downloadUrl?: string;
  isDownloadAvailable?: boolean;
  status: "scheduled" | "published" | "archived";
  createdAt?: FirestoreDate;
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
  sceneCode?: string;
  episodeId: string;
  chapterId?: string;
  paragraphIds?: string[];
  seasonNumber?: number;
  episodeNumber?: number;
  sceneNumber: number;
  title: string;
  description: string;
  sceneType?: "dialogue" | "boardroom" | "family" | "romance" | "conflict" | "action" | "business" | "transition" | "montage" | "exterior" | "interior" | "other";
  storyDate?: string;
  storyTimeOfDay?: string;
  locationType?: "property" | "location" | "virtual" | "unspecified";
  locationId?: string;
  propertyId?: string;
  businessId?: string;
  emotionalTone: string;
  dramaticPurpose?: string;
  cameraDirection: string;
  visualStyle?: string;
  dialogueSummary: string;
  imagePrompt: string;
  videoPrompt: string;
  continuityNotes: string;
  productionStatus?: "draft" | "planned" | "scheduled" | "filming" | "filmed" | "review" | "approved";
  continuityStatus?: "unchecked" | "warning" | "cleared";
  estimatedDurationMinutes?: number;
  estimatedDuration: string;
  status: "draft" | "planned" | "ready" | "filmed" | "approved";
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

export interface EotSceneBreakdown {
  id: string;
  sceneId: string;
  synopsis: string;
  keyConflict: string;
  characterMotivations: string;
  businessConsequence: string;
  familyConsequence: string;
  culturalMoment: string;
  requiredProps: string;
  requiredWardrobe: string;
  requiredVehicles: string;
  requiredLocations: string;
  requiredAssets: string;
  safetyNotes: string;
  productionNotes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotSceneCast {
  id: string;
  sceneId: string;
  characterId: string;
  actorId?: string;
  roleImportance: "lead" | "supporting" | "background" | "cameo";
  dialogueRequired: boolean;
  emotionalDemand: string;
  callRequired: boolean;
  notes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotSceneAsset {
  id: string;
  sceneId: string;
  assetType: "prop" | "wardrobe" | "vehicle" | "location" | "document" | "phone" | "computer" | "furniture" | "signage" | "other";
  assetId?: string;
  assetName: string;
  description: string;
  required: boolean;
  continuityCritical: boolean;
  notes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotSceneContinuity {
  id: string;
  sceneId: string;
  continuityType: "character" | "wardrobe" | "vehicle" | "property" | "business" | "timeline" | "relationship" | "object" | "dialogue" | "cultural";
  severity: "info" | "warning" | "critical";
  note: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotSceneSchedule {
  id: string;
  sceneId: string;
  scheduledDate: string;
  startTime?: string;
  endTime?: string;
  locationId?: string;
  propertyId?: string;
  assignedActors: string[];
  assignedCrew?: string[];
  status: "planned" | "scheduled" | "in_progress" | "completed" | "cancelled";
  notes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotSceneShot {
  id: string;
  sceneId: string;
  shotNumber: number;
  shotType: "wide" | "medium" | "close_up" | "over_shoulder" | "insert" | "drone" | "tracking" | "handheld" | "static" | "other";
  description: string;
  cameraMovement: string;
  lensNote?: string;
  durationEstimateSeconds?: number;
  notes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotSceneProp {
  id: string;
  sceneId: string;
  propName: string;
  propType: string;
  source: "owned" | "rented" | "borrowed" | "to_create" | "unknown";
  required: boolean;
  continuityCritical: boolean;
  notes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotSceneWardrobe {
  id: string;
  sceneId: string;
  characterId: string;
  actorId?: string;
  wardrobeDescription: string;
  colorNotes: string;
  continuityNotes: string;
  required: boolean;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotTimelineEvent {
  id: string;
  eventCode: string;
  title: string;
  description: string;
  eventType: "story" | "family" | "business" | "romance" | "betrayal" | "succession" | "property" | "vehicle" | "legal" | "cultural" | "production" | "release" | "other";
  seasonNumber?: number;
  episodeNumber?: number;
  episodeId?: string;
  chapterId?: string;
  sceneId?: string;
  paragraphId?: string;
  storyDate: string;
  storyTime?: string;
  releaseDate?: string;
  importance: "low" | "medium" | "high" | "critical";
  involvedCharacterIds: string[];
  involvedBusinessIds: string[];
  involvedPropertyIds: string[];
  involvedVehicleIds: string[];
  involvedRelationshipIds: string[];
  consequenceSummary: string;
  continuityNotes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotContinuityRuleRecord {
  id: string;
  ruleCode: string;
  title: string;
  description: string;
  ruleType: "character" | "relationship" | "business" | "property" | "vehicle" | "timeline" | "episode" | "production" | "cultural" | "visual";
  severity: "info" | "warning" | "critical";
  active: boolean;
  notes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotContinuityCheckRecord {
  id: string;
  checkCode: string;
  checkType: "character_age" | "character_status" | "relationship_status" | "business_status" | "property_status" | "vehicle_status" | "story_date_order" | "episode_bridge" | "chapter_sequence" | "scene_sequence" | "production_asset" | "cultural_note" | "visual_consistency";
  targetType: "episode" | "chapter" | "paragraph" | "scene" | "character" | "business" | "property" | "vehicle" | "relationship";
  targetId: string;
  result: "pass" | "warning" | "fail" | "not_checked";
  severity: "info" | "warning" | "critical";
  message: string;
  recommendation: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotContinuityWarning {
  id: string;
  warningCode: string;
  targetType: string;
  targetId: string;
  linkedEntityType?: string;
  linkedEntityId?: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  recommendation: string;
  status: "open" | "acknowledged" | "resolved" | "ignored";
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotEntityContinuity {
  id: string;
  entityId: string;
  entityType: "character" | "business" | "property" | "vehicle" | "relationship";
  status: string;
  statusDate?: string;
  notes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface EotEpisodeContinuitySummary {
  id: string;
  episodeId: string;
  seasonNumber: number;
  episodeNumber: number;
  previousEpisodeId?: string;
  nextEpisodeId?: string;
  storyDate: string;
  previousEpisodeBridge: string;
  endingBridge: string;
  activeCharacterCount: number;
  activeBusinessCount: number;
  activePropertyCount: number;
  activeVehicleCount: number;
  unresolvedWarningCount: number;
  criticalWarningCount: number;
  continuityStatus: "unchecked" | "clean" | "warnings" | "critical";
  summaryNotes: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
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
