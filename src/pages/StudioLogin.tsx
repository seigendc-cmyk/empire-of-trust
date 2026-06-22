import { Navigate } from "react-router-dom";
import { ADMIN_EMAIL, firebaseConfigError, isFirebaseConfigured } from "../lib/firebase";
import { useAuth } from "../state/AuthContext";

export default function StudioLogin() {
  const { signIn, user, isAdmin, staff, defaultDashboardPath, loading, error, clearError } = useAuth();
  if (!loading && user && isAdmin) return <Navigate to="/studio" replace />;
  if (!loading && user && staff?.active) return <Navigate to={defaultDashboardPath} replace />;

  return (
    <section className="page grid min-h-[calc(100dvh-8rem)] content-center">
      <div className="panel mx-auto w-full max-w-md p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-signal">Admin access</p>
        <h1 className="mt-2 text-2xl font-black">Studio Google login</h1>
        <p className="mt-3 text-sm leading-6 text-paper/70">Only {ADMIN_EMAIL} can enter the Studio.</p>
        {!isFirebaseConfigured && (
          <div className="mt-5 border border-ember bg-ember/15 p-3 text-sm leading-6 text-ember">
            {firebaseConfigError || "Firebase Authentication is not configured for this build."}
          </div>
        )}
        {error && (
          <div className="mt-5 grid gap-3 border border-ember bg-ember/15 p-3 text-sm leading-6 text-ember">
            <p>{error}</p>
            <button className="btn w-full" type="button" onClick={clearError}>Dismiss</button>
          </div>
        )}
        {user && !isAdmin && !staff?.active && <div className="mt-5 border border-ember bg-ember/15 p-3 text-sm">{user.email} is not authorized or is inactive.</div>}
        <button className="btn btn-primary mt-6 w-full" type="button" onClick={() => void signIn()} disabled={loading || !isFirebaseConfigured}>
          {loading ? "Checking Google..." : "Continue with Google"}
        </button>
      </div>
    </section>
  );
}
