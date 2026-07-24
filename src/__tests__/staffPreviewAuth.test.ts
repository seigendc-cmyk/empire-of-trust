import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';

const mocks = vi.hoisted(() => ({
  getDoc: vi.fn(),
  doc: vi.fn(() => ({ path: 'staffUsers/staff-1' })),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class GoogleAuthProvider {},
  signInWithPopup: mocks.signInWithPopup,
  signOut: mocks.signOut,
}));
vi.mock('firebase/firestore', () => ({
  doc: mocks.doc,
  getDoc: mocks.getDoc,
}));
vi.mock('../lib/firebase', () => ({
  auth: { currentUser: null },
  db: {},
}));
vi.mock('../lib/dataPack', () => ({
  getOrCreateDeviceId: () => 'device-1',
}));
vi.mock('../lib/staffAudit', () => ({
  getStaffSessionId: () => 'session-1',
}));

import {
  StaffAuthorizationError,
  getStaffAuthErrorMessage,
  getStaffUser,
  isBrowserFallbackIdentity,
  isValidStaffUser,
} from '../lib/staffAuth';

const timestamp = () => ({ toDate: () => new Date('2026-07-24T00:00:00Z') });
const record = {
  uid: 'staff-1',
  email: 'staff@example.com',
  displayName: 'Staff One',
  status: 'active',
  roles: ['administrator'],
  permissions: ['staff.portal.view', 'books.view'],
  assignedSeriesIds: [],
  assignedSeasonIds: [],
  assignedEpisodeIds: [],
  createdAt: timestamp(),
  createdBy: 'bootstrap-admin',
  lastLoginAt: timestamp(),
};
const firebaseUser = {
  uid: 'staff-1',
  isAnonymous: false,
} as User;

beforeEach(() => {
  mocks.getDoc.mockReset();
  mocks.doc.mockClear();
});

describe('staff preview authorization diagnostics', () => {
  it('accepts a complete active staff record with books.view', async () => {
    mocks.getDoc.mockResolvedValue({ exists: () => true, data: () => record });
    await expect(getStaffUser(firebaseUser)).resolves.toEqual(record);
    expect(isValidStaffUser(record, firebaseUser.uid)).toBe(true);
  });

  it('treats a missing staff record as non-staff', async () => {
    mocks.getDoc.mockResolvedValue({ exists: () => false });
    await expect(getStaffUser(firebaseUser)).resolves.toBeNull();
  });

  it('rejects malformed staff records', async () => {
    mocks.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ ...record, createdAt: undefined }),
    });
    await expect(getStaffUser(firebaseUser)).rejects.toMatchObject({
      code: 'staff/malformed-record',
    });
  });

  it('classifies a Firestore self-read denial without exposing internals', async () => {
    mocks.getDoc.mockRejectedValue({ code: 'permission-denied' });
    await expect(getStaffUser(firebaseUser)).rejects.toMatchObject({
      code: 'staff/permission-denied',
    });
    expect(getStaffAuthErrorMessage(
      new StaffAuthorizationError('staff/permission-denied', 'internal')
    )).toContain('Google sign-in succeeded');
    expect(getStaffAuthErrorMessage(
      new StaffAuthorizationError('staff/permission-denied', 'internal')
    )).not.toContain('internal');
  });

  it('rejects browser fallback identities before Firestore access', async () => {
    const fallback = {
      ...firebaseUser,
      uid: 'google-browser-fallback-local',
    } as User;
    expect(isBrowserFallbackIdentity(fallback.uid)).toBe(true);
    await expect(getStaffUser(fallback)).resolves.toBeNull();
    expect(mocks.getDoc).not.toHaveBeenCalled();
  });

  it.each([
    ['auth/popup-blocked', 'blocked'],
    ['auth/popup-closed-by-user', 'cancelled'],
    ['auth/unauthorized-domain', 'preview domain'],
    ['auth/network-request-failed', 'temporarily unavailable'],
  ])('classifies %s safely', (code, expected) => {
    expect(getStaffAuthErrorMessage({ code })).toContain(expected);
  });
});
