export type SeriesRole =
  | 'owner' | 'lead-writer' | 'co-writer' | 'editor' | 'story-architect'
  | 'character-director' | 'asset-manager' | 'cover-designer'
  | 'continuity-editor' | 'publisher' | 'viewer';
export type SeriesPermission =
  | 'create' | 'edit' | 'delete' | 'approve' | 'publish'
  | 'manage-staff' | 'lock' | 'comment';
export type ProductionScope = 'series' | 'season' | 'episode' | 'chapter' | 'scene';
export type EditorialStatus =
  | 'draft' | 'in-progress' | 'submitted' | 'changes-requested'
  | 'approved' | 'locked' | 'published';
export type StoryBlockType =
  | 'heading' | 'paragraph' | 'dialogue' | 'narration' | 'quote' | 'image'
  | 'caption' | 'list' | 'table' | 'scene-break' | 'character-entry'
  | 'location-entry' | 'object-entry' | 'internal-note';
export type EntityLinkType = 'character' | 'actor' | 'asset' | 'possession' | 'location' | 'relationship';
export type ActorAssignmentType = 'primary' | 'young-version' | 'older-version' | 'voice' | 'stunt' | 'replacement';
export type SeriesAssetType =
  | 'portrait' | 'costume' | 'hairstyle' | 'makeup' | 'vehicle' | 'weapon'
  | 'tool' | 'document' | 'phone' | 'jewellery' | 'furniture' | 'house'
  | 'business' | 'animal' | 'symbol' | 'other';
export type ProductionRelationshipType =
  | 'family' | 'friend' | 'enemy' | 'business' | 'romantic' | 'mentor'
  | 'employee' | 'employer' | 'rival' | 'unknown';
export type CoverProjectType =
  | 'series-cover' | 'season-cover' | 'episode-cover' | 'book-front-cover'
  | 'book-back-cover' | 'library-thumbnail' | 'marketing-poster' | 'social-media-card';

export interface SeriesStaffAssignment {
  id: string; seriesId: string; userId: string; displayName: string; role: SeriesRole;
  scopeType: ProductionScope; scopeId: string; active: boolean; createdAt: string; updatedAt: string;
}
export interface SeriesPermissionGrant {
  id: string; assignmentId: string; permission: SeriesPermission; allowed: boolean;
  createdAt: string; updatedAt: string;
}
export interface SeriesChapter {
  id: string; seriesId: string; seasonId: string; episodeId: string; chapterNumber: number;
  title: string; synopsis: string; status: EditorialStatus; orderIndex: number;
  createdAt: string; updatedAt: string;
}
export interface StoryScene {
  id: string; seriesId: string; seasonId: string; episodeId: string; chapterId: string;
  sceneNumber: number; title: string; purpose: string; synopsis: string;
  openingSituation: string; conflict: string; turningPoint: string; outcome: string;
  locationId?: string; characterIds: string[]; assetIds: string[]; possessionIds: string[];
  storyDate?: string; storyTime: string; weather: string; status: EditorialStatus;
  orderIndex: number; archivedAt?: string; createdAt: string; updatedAt: string;
}
export interface SeriesStoryBlock {
  id: string; seriesId: string; chapterId: string; sceneId: string; type: StoryBlockType;
  content: string; imageAssetId?: string; caption: string; orderIndex: number;
  createdBy: string; createdAt: string; updatedAt: string;
}
export interface SeriesStoryBlockLink {
  id: string; blockId: string; entityType: EntityLinkType; entityId: string;
  label: string; startOffset: number; endOffset: number; createdAt: string;
}
export interface SeriesCharacter {
  id: string; seriesId: string; sourceBookCharacterId?: string; name: string; aliases: string[];
  description: string; status: 'alive' | 'dead' | 'unknown'; deathSceneId?: string;
  createdAt: string; updatedAt: string;
}
export interface SeriesActor {
  id: string; seriesId: string; name: string; bio: string; contactNotes: string;
  imageAssetId?: string; createdAt: string; updatedAt: string;
}
export interface CharacterActorAssignment {
  id: string; seriesId: string; characterId: string; actorId: string;
  assignmentType: ActorAssignmentType; seasonId?: string; episodeId?: string;
  startDate?: string; endDate?: string; notes: string; createdAt: string; updatedAt: string;
}
export interface SeriesAsset {
  id: string; seriesId: string; name: string; type: SeriesAssetType; description: string;
  ownerCharacterId?: string; custodianCharacterId?: string; status: 'available' | 'lost' | 'destroyed';
  acquiredSceneId?: string; lostSceneId?: string; destroyedSceneId?: string;
  firstAppearanceSceneId?: string; continuityNotes: string; fileUrl?: string;
  createdAt: string; updatedAt: string;
}
export interface CharacterPossession {
  id: string; seriesId: string; assetId: string; characterId: string;
  status: 'owned' | 'borrowed' | 'transferred' | 'lost' | 'destroyed';
  acquiredSceneId?: string; transferredSceneId?: string; transferredToCharacterId?: string;
  lostSceneId?: string; destroyedSceneId?: string; notes: string; createdAt: string; updatedAt: string;
}
export interface DialogueBlock {
  id: string; seriesId: string; sceneId: string; storyBlockId: string; characterId: string;
  actorId?: string; dialogue: string; emotion: string; delivery: string;
  actionBefore: string; actionAfter: string; audioAssetId?: string; imageAssetId?: string;
  orderIndex: number; createdAt: string; updatedAt: string;
}
export interface ProductionRelationship {
  id: string; seriesId: string; sourceCharacterId: string; targetCharacterId: string;
  type: ProductionRelationshipType; trustLevel: number; conflictLevel: number; active: boolean;
  betrayal: string; reconciliation: string; startEpisodeId?: string; endEpisodeId?: string;
  description: string; createdAt: string; updatedAt: string;
}
export interface EditorialReview {
  id: string; seriesId: string; scopeType: ProductionScope; scopeId: string;
  status: EditorialStatus; assignedTo?: string; requestedBy?: string; reviewedBy?: string;
  reviewNote: string; createdAt: string; updatedAt: string;
}
export interface SeriesComment {
  id: string; seriesId: string; scopeType: ProductionScope; scopeId: string;
  authorId: string; body: string; mentionUserIds: string[]; resolved: boolean;
  createdAt: string; updatedAt: string;
}
export interface SeriesRevision {
  id: string; seriesId: string; entityType: string; entityId: string; revisionNumber: number;
  changedBy: string; summary: string; snapshot: string; createdAt: string;
}
export interface SeriesCoverProject {
  id: string; seriesId: string; seasonId?: string; episodeId?: string; bookId?: string;
  type: CoverProjectType; title: string; subtitle: string; author: string;
  backgroundImageAssetId?: string; gradientStart: string; gradientEnd: string;
  seriesBadge: string; seasonBadge: string; episodeBadge: string;
  actorIds: string[]; characterIds: string[]; publisherMarkAssetId?: string;
  price: string; releaseDate?: string; templateId?: string; status: EditorialStatus;
  createdAt: string; updatedAt: string;
}
export interface ProductionContinuityWarning {
  code: string; severity: 'warning' | 'error'; message: string;
  sceneId?: string; entityId?: string;
}
