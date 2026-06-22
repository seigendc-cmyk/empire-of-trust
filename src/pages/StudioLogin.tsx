import { Navigate } from "react-router-dom";
import { ADMIN_EMAIL } from "../lib/firebase";
import { useAuth } from "../state/AuthContext";

export default function StudioLogin() {
  const { signIn, user, isAdmin, loading } = useAuth();
  if (!loading && user && isAdmin) return <Navigate to="/studio/episodes" replace />;

  return (
    <section className="page grid min-h-[calc(100dvh-8rem)] content-center">
      <div className="panel mx-auto w-full max-w-md p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-signal">Admin access</p>
        <h1 className="mt-2 text-2xl font-black">Studio Google login</h1>
        <p className="mt-3 text-sm leading-6 text-paper/70">Only {ADMIN_EMAIL} can enter the Studio.</p>
        {user && !isAdmin && <div className="mt-5 border border-ember bg-ember/15 p-3 text-sm">{user.email} is not authorized.</div>}
        <button className="btn btn-primary mt-6 w-full" onClick={signIn} disabled={loading}>Continue with Google</button>
      </div>
    </section>
  );
}
