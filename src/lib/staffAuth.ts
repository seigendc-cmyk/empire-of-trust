import {
  GoogleAuthProvider, signInWithPopup, signOut, type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { StaffUser } from '../types/staff';
import { getOrCreateDeviceId } from './dataPack';
import { getStaffSessionId } from './staffAudit';

const provider = new GoogleAuthProvider();

export type StaffAuthorizationErrorCode =
  | 'staff/permission-denied'
  | 'staff/malformed-record'
  | 'staff/network-error';

export class StaffAuthorizationError extends Error {
  constructor(
    public readonly code: StaffAuthorizationErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'StaffAuthorizationError';
  }
}

const errorCode = (error: unknown): string => {
  if (!error || typeof error !== 'object' || !('code' in error)) return '';
  return String((error as { code?: unknown }).code || '');
};

export function getStaffAuthErrorMessage(error: unknown): string {
  const code = error instanceof StaffAuthorizationError ? error.code : errorCode(error);
  switch (code) {
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in popup. Allow popups for this site and try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Google sign-in was cancelled before it completed.';
    case 'auth/unauthorized-domain':
      return 'Google sign-in is not authorized for this preview domain. Ask an administrator to add it in Firebase Authentication settings.';
    case 'staff/permission-denied':
    case 'permission-denied':
    case 'firestore/permission-denied':
      return 'Google sign-in succeeded, but the app could not read your staff record. Verify that Firestore rules are deployed and that your staff record exists.';
    case 'staff/malformed-record':
      return 'Google sign-in succeeded, but your staff record is invalid. Ask an administrator to review its required fields.';
    case 'auth/network-request-failed':
    case 'staff/network-error':
    case 'unavailable':
    case 'firestore/unavailable':
      return 'The staff authorization service is temporarily unavailable. Check your connection and try again.';
    default:
      return 'Staff sign-in could not be completed. Try again or contact an administrator.';
  }
}

export function isBrowserFallbackIdentity(uid: string): boolean {
  return uid.startsWith('google-browser-') || uid.startsWith('google-browser-fallback-');
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isFirestoreTimestamp = (value: unknown): boolean =>
  Boolean(
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  );

export function isValidStaffUser(value: unknown, uid: string): value is StaffUser {
  if (!value || typeof value !== 'object') return false;
  const staff = value as Partial<StaffUser>;
  return staff.uid === uid &&
    typeof staff.email === 'string' &&
    typeof staff.displayName === 'string' &&
    ['active', 'suspended', 'invited', 'disabled'].includes(String(staff.status)) &&
    isStringArray(staff.roles) &&
    isStringArray(staff.permissions) &&
    isStringArray(staff.assignedSeriesIds) &&
    isStringArray(staff.assignedSeasonIds) &&
    isStringArray(staff.assignedEpisodeIds) &&
    isFirestoreTimestamp(staff.createdAt) &&
    typeof staff.createdBy === 'string' &&
    isFirestoreTimestamp(staff.lastLoginAt);
}

export async function getStaffUser(firebaseUser: User): Promise<StaffUser | null> {
  if (firebaseUser.isAnonymous || isBrowserFallbackIdentity(firebaseUser.uid)) return null;
  try {
    const snapshot = await getDoc(doc(db, 'staffUsers', firebaseUser.uid));
    if (!snapshot.exists()) return null;
    const value = snapshot.data();
    if (!isValidStaffUser(value, firebaseUser.uid)) {
      throw new StaffAuthorizationError(
        'staff/malformed-record',
        'The staff record does not satisfy the required contract.',
      );
    }
    return value;
  } catch (error) {
    if (error instanceof StaffAuthorizationError) throw error;
    const code = errorCode(error);
    if (code === 'permission-denied' || code === 'firestore/permission-denied') {
      throw new StaffAuthorizationError(
        'staff/permission-denied',
        'The authenticated user cannot read their staff record.',
        { cause: error },
      );
    }
    if (code === 'unavailable' || code === 'firestore/unavailable') {
      throw new StaffAuthorizationError(
        'staff/network-error',
        'The staff record service is unavailable.',
        { cause: error },
      );
    }
    throw error;
  }
}

async function recordAuthEvent(action: 'login' | 'logout' | 'login-failure', details: {
  uid?: string;
  email?: string;
  reason?: string;
}): Promise<void> {
  try {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : undefined;
    await fetch('/api/staff/auth-events', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        ...details,
        action,
        sessionId: getStaffSessionId(),
        deviceId: getOrCreateDeviceId(),
        source: 'staff-web',
      }),
    });
  } catch {
    // Authentication must still succeed/fail deterministically if audit transport is unavailable.
  }
}

export async function signInStaffWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, provider);
    if (result.user.isAnonymous) throw new Error('Anonymous identities cannot access staff routes.');
    await recordAuthEvent('login', {
      uid: result.user.uid,
      email: result.user.email || undefined,
    });
    return result.user;
  } catch (error) {
    await recordAuthEvent('login-failure', {
      reason: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function signOutStaff(): Promise<void> {
  const user = auth.currentUser;
  await recordAuthEvent('logout', {
    uid: user?.uid,
    email: user?.email || undefined,
  });
  await signOut(auth);
}
