export type StaffStatus = 'active' | 'suspended' | 'invited' | 'disabled';

export type StaffPermission =
  | 'staff.portal.view'
  | 'staff.manage'
  | 'books.view'
  | 'books.edit'
  | 'series.view'
  | 'series.edit'
  | 'characters.manage'
  | 'assets.manage'
  | 'payments.review'
  | 'publishing.manage'
  | 'audit.view'
  | 'audit.export'
  | 'team.view'
  | 'team.manage'
  | 'team.approve';

export type StaffAccessRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface StaffAccessRequest {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  requestedRole: string;
  reason: string;
  status: StaffAccessRequestStatus;
  requestedAt: unknown;
  updatedAt: unknown;
  reviewedAt: unknown | null;
  reviewedBy: string | null;
  reviewerName: string | null;
  reviewerNotes: string;
  approvedRoles: string[];
  approvedPermissions: StaffPermission[];
  assignedSeriesIds: string[];
  assignedSeasonIds: string[];
  assignedEpisodeIds: string[];
}

export interface StaffAccessApproval {
  roles: string[];
  permissions: StaffPermission[];
  assignedSeriesIds: string[];
  assignedSeasonIds: string[];
  assignedEpisodeIds: string[];
  reviewerNotes?: string;
}

export interface StaffUser {
  uid: string;
  email: string;
  displayName: string;
  status: StaffStatus;
  roles: string[];
  permissions: StaffPermission[];
  assignedSeriesIds: string[];
  assignedSeasonIds: string[];
  assignedEpisodeIds: string[];
  createdAt: unknown;
  createdBy: string;
  lastLoginAt: unknown;
}

export interface StaffAuditHierarchy {
  seriesId?: string;
  seasonId?: string;
  episodeId?: string;
  bookId?: string;
  chapterId?: string;
  sceneId?: string;
  blockId?: string;
}

export interface StaffAuditLog {
  id: string;
  staffUid: string;
  staffDisplayName: string;
  action: string;
  entityType: string;
  entityId: string;
  hierarchy: StaffAuditHierarchy;
  changedFields: string[];
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string;
  sessionId: string;
  deviceId: string;
  timestamp: unknown;
  source: 'staff-web' | 'server' | 'firebase-function';
}

export interface StaffAuditInput extends Omit<StaffAuditLog, 'id' | 'staffUid' | 'staffDisplayName' | 'timestamp' | 'before' | 'after'> {
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

export interface StaffAuditFilters {
  dateFrom?: string;
  dateTo?: string;
  staff?: string;
  action?: string;
  entityType?: string;
  seriesId?: string;
  seasonId?: string;
  episodeId?: string;
  bookId?: string;
  sessionId?: string;
}
