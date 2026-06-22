import {
  browserLocalPersistence,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  type User,
} from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ADMIN_EMAIL, auth, googleProvider, isFirebaseConfigured } from "../lib/firebase";

interface AuthState {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  error: string;
  signIn: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return undefined;
    }

    setPersistence(auth, browserLocalPersistence)
      .then(() => getRedirectResult(auth))
      .catch((nextError: unknown) => {
        setError(authErrorMessage(nextError));
      });

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      isAdmin: normalizeEmail(user?.email) === normalizeEmail(ADMIN_EMAIL),
      error,
      clearError: () => setError(""),
      signIn: async () => {
        if (!auth) throw new Error("Firebase Auth is not configured.");
        setError("");
        setLoading(true);
        try {
          await setPersistence(auth, browserLocalPersistence);
          await signInWithPopup(auth, googleProvider);
        } catch (nextError) {
          if (shouldUseRedirect(nextError)) {
            await signInWithRedirect(auth, googleProvider);
            return;
          }
          setError(authErrorMessage(nextError));
          setLoading(false);
        }
      },
    }),
    [error, loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

function normalizeEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase();
}

function shouldUseRedirect(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
  return code === "auth/popup-blocked" || code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request";
}

function authErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
  if (code === "auth/unauthorized-domain") {
    return "This domain is not authorized in Firebase Authentication. Add the deployed domain and localhost in Firebase Console > Authentication > Settings > Authorized domains.";
  }
  if (code === "auth/popup-blocked") return "The Google popup was blocked. Try again, or open this app in the browser instead of an embedded webview.";
  if (code === "auth/popup-closed-by-user") return "Google sign-in was closed before it completed.";
  if (code === "auth/operation-not-allowed") return "Google sign-in is not enabled in Firebase Authentication.";
  if (error instanceof Error && error.message) return error.message;
  return "Google sign-in failed. Check Firebase Authentication settings and try again.";
}
