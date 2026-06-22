import { onAuthStateChanged, signInWithPopup, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ADMIN_EMAIL, auth, googleProvider, isFirebaseConfigured } from "../lib/firebase";

interface AuthState {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return undefined;
    }
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      isAdmin: user?.email === ADMIN_EMAIL,
      signIn: () => {
        if (!auth) throw new Error("Firebase Auth is not configured.");
        return signInWithPopup(auth, googleProvider).then(() => undefined);
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
