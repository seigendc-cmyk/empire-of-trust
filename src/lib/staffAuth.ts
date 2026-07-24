import {
  GoogleAuthProvider, signInWithPopup, signOut, type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { StaffUser } from '../types/staff';
import { getOrCreateDeviceId } from './dataPack';
import { getStaffSessionId } from './staffAudit';

const provider = new GoogleAuthProvider();

export function isBrowserFallbackIdentity(uid: string): boolean {
  return uid.startsWith('google-browser-') || uid.startsWith('google-browser-fallback-');
}

export function isValidStaffUser(value: unknown, uid: string): value is StaffUser {
  if (!value || typeof value !== 'object') return false;
  const staff = value as Partial<StaffUser>;
  return staff.uid === uid &&
    typeof staff.email === 'string' &&
    typeof staff.displayName === 'string' &&
    ['active', 'suspended', 'invited', 'disabled'].includes(String(staff.status)) &&
    Array.isArray(staff.roles) &&
    Array.isArray(staff.permissions) &&
    Array.isArray(staff.assignedSeriesIds) &&
    Array.isArray(staff.assignedSeasonIds) &&
    Array.isArray(staff.assignedEpisodeIds);
}

export async function getStaffUser(firebaseUser: User): Promise<StaffUser | null> {
  if (firebaseUser.isAnonymous || isBrowserFallbackIdentity(firebaseUser.uid)) return null;
  const snapshot = await getDoc(doc(db, 'staffUsers', firebaseUser.uid));
  if (!snapshot.exists()) return null;
  const value = snapshot.data();
  return isValidStaffUser(value, firebaseUser.uid) ? value : null;
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
