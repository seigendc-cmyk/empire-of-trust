import React, {
  createContext, useContext, useEffect, useMemo, useState,
} from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { getStaffAuthErrorMessage, getStaffUser } from '../lib/staffAuth';
import type { StaffUser } from '../types/staff';

export type StaffAuthPhase =
  | 'loading'
  | 'unauthenticated'
  | 'non-staff'
  | 'suspended'
  | 'invited'
  | 'disabled'
  | 'authorized'
  | 'error';

export interface StaffAuthState {
  phase: StaffAuthPhase;
  firebaseUser: User | null;
  staffUser: StaffUser | null;
  error: string | null;
  refresh: () => Promise<void>;
}

const initialState: StaffAuthState = {
  phase: 'loading',
  firebaseUser: null,
  staffUser: null,
  error: null,
  refresh: async () => undefined,
};

export const StaffAuthContext = createContext<StaffAuthState>(initialState);

export const StaffAuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null);
  const [phase, setPhase] = useState<StaffAuthPhase>('loading');
  const [error, setError] = useState<string | null>(null);

  const resolve = async (user: User | null) => {
    setFirebaseUser(user);
    setStaffUser(null);
    setError(null);
    if (!user) {
      setPhase('unauthenticated');
      return;
    }
    setPhase('loading');
    try {
      const staff = await getStaffUser(user);
      setStaffUser(staff);
      if (!staff) setPhase('non-staff');
      else if (staff.status === 'suspended') setPhase('suspended');
      else if (staff.status === 'invited') setPhase('invited');
      else if (staff.status === 'disabled') setPhase('disabled');
      else setPhase('authorized');
    } catch (cause) {
      if (import.meta.env.DEV) {
        console.error('Staff authorization resolution failed:', cause);
      }
      setError(getStaffAuthErrorMessage(cause));
      setPhase('error');
    }
  };

  useEffect(() => onAuthStateChanged(auth, (user) => void resolve(user)), []);

  const value = useMemo<StaffAuthState>(() => ({
    phase, firebaseUser, staffUser, error,
    refresh: () => resolve(auth.currentUser),
  }), [error, firebaseUser, phase, staffUser]);

  return <StaffAuthContext.Provider value={value}>{children}</StaffAuthContext.Provider>;
};

export const useStaffAuth = () => useContext(StaffAuthContext);
