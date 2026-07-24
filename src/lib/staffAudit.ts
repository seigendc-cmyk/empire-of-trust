import { auth } from './firebase';
import type {
  StaffAuditFilters, StaffAuditInput, StaffAuditLog, StaffUser,
} from '../types/staff';

const SESSION_KEY = 'empire_staff_session_id';

export const AUDITED_STAFF_ACTIONS = [
  'auth.login', 'auth.logout', 'auth.login-failure',
  'staff.invite', 'staff.role-change',
  'series.create', 'series.update', 'series.delete', 'series.restore',
  'season.create', 'season.update', 'season.delete', 'season.restore',
  'episode.create', 'episode.update', 'episode.delete', 'episode.restore',
  'book.create', 'book.update', 'book.delete', 'book.restore',
  'chapter.create', 'chapter.update', 'chapter.delete', 'chapter.restore',
  'scene.create', 'scene.update', 'scene.delete', 'scene.restore',
  'block.create', 'block.update', 'block.delete', 'block.restore',
  'character.create', 'character.update', 'character.delete',
  'actor.create', 'actor.update', 'actor.delete',
  'asset.create', 'asset.update', 'asset.delete',
  'possession.assign', 'possession.transfer', 'possession.remove',
  'cover.update', 'cover.approve', 'editorial.review',
  'pop.verify', 'pop.reject',
  'entitlement.create', 'entitlement.revoke',
  'package.issue', 'package.download', 'package.revoke',
  'publishing.publish', 'publishing.unpublish',
] as const;

export type AuditedStaffAction = typeof AUDITED_STAFF_ACTIONS[number];

export function getStaffSessionId(): string {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const value = crypto.randomUUID();
  sessionStorage.setItem(SESSION_KEY, value);
  return value;
}

export function createAuditDiff(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): string[] {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  return [...keys].filter((key) =>
    JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key])
  ).sort();
}

async function authorizedFetch(path: string, init?: RequestInit): Promise<Response> {
  const user = auth.currentUser;
  if (!user) throw new Error('Genuine Firebase authentication is required.');
  const token = await user.getIdToken();
  return fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

export async function writeStaffAuditLog(
  staff: StaffUser,
  input: StaffAuditInput,
): Promise<StaffAuditLog> {
  if (!auth.currentUser || auth.currentUser.uid !== staff.uid) {
    throw new Error('Audit identity must match the Firebase authenticated user.');
  }
  const payload = {
    ...input,
    before: input.before || null,
    after: input.after || null,
    changedFields: input.changedFields.length
      ? input.changedFields
      : createAuditDiff(input.before, input.after),
    sessionId: input.sessionId || getStaffSessionId(),
  };
  const response = await authorizedFetch('/api/staff/audit-logs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Staff audit logging failed.');
  return body as StaffAuditLog;
}

export async function withAuditedMutation<T>(
  endpoint: string,
  mutation: Record<string, unknown>,
  audit: StaffAuditInput,
): Promise<T> {
  const response = await authorizedFetch('/api/staff/audited-mutations', {
    method: 'POST',
    body: JSON.stringify({ endpoint, mutation, audit: {
      ...audit,
      changedFields: audit.changedFields.length
        ? audit.changedFields
        : createAuditDiff(audit.before, audit.after),
      sessionId: audit.sessionId || getStaffSessionId(),
    } }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Audited mutation failed.');
  return body as T;
}

export async function listStaffAuditLogs(filters: StaffAuditFilters): Promise<StaffAuditLog[]> {
  const parameters = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) parameters.set(key, value);
  });
  const response = await authorizedFetch(`/api/staff/audit-logs?${parameters}`);
  const body = await response.json().catch(() => ([]));
  if (!response.ok) throw new Error((body as { message?: string }).message || 'Audit log query failed.');
  return body as StaffAuditLog[];
}

export async function exportStaffAuditLogs(filters: StaffAuditFilters): Promise<Blob> {
  const parameters = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) parameters.set(key, value);
  });
  const response = await authorizedFetch(`/api/staff/audit-logs/export?${parameters}`);
  if (!response.ok) throw new Error('Audit export failed.');
  return response.blob();
}
