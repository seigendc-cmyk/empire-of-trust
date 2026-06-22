import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { firebaseConfigError, isFirebaseConfigured } from "../lib/firebase";
import { getReaderProfileSummary, listImportedPacks, readerDb } from "../lib/offlineDb";
import { useAuth } from "../state/AuthContext";

interface DashboardState {
  online: boolean;
  serviceWorker: "ready" | "registering" | "unsupported";
  packs: number;
  progress: number;
  pendingSync: number;
  points: number;
  badges: number;
  level: string;
  lastActivity: string;
}

const initialState: DashboardState = {
  online: typeof navigator === "undefined" ? true : navigator.onLine,
  serviceWorker: typeof navigator !== "undefined" && "serviceWorker" in navigator ? "registering" : "unsupported",
  packs: 0,
  progress: 0,
  pendingSync: 0,
  points: 0,
  badges: 0,
  level: "Reader",
  lastActivity: "No local activity yet",
};

const quickActions = [
  { to: "/reader", label: "Open Reader", detail: "Continue local packs" },
  { to: "/characters/meet", label: "Meet Characters", detail: "Discover the family players" },
  { to: "/reader/import", label: "Import Pack", detail: "Load episode JSON" },
  { to: "/studio", label: "Studio", detail: "Production workspace" },
  { to: "/mall", label: "Mall", detail: "Browse vendors" },
  { to: "/licence", label: "Licence", detail: "Plan and activation" },
  { to: "/settings", label: "Settings", detail: "Reader controls" },
];

const studioActions = [
  { to: "/studio/story-engine/episode-planner", label: "Plan Episode" },
  { to: "/studio/production", label: "Production" },
  { to: "/studio/release-command", label: "Release Command" },
  { to: "/packs", label: "Packs" },
];

export default function Home() {
  const { loading, user, isAdmin } = useAuth();
  const [state, setState] = useState<DashboardState>(initialState);

  useEffect(() => {
    let cancelled = false;

    const updateOnline = () => setState((current) => ({ ...current, online: navigator.onLine }));
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);

    async function loadDashboard() {
      const [packs, progress, pendingSync, profile, recentActivity] = await Promise.all([
        listImportedPacks(),
        readerDb.readingProgress.count(),
        readerDb.syncQueue.where("syncStatus").equals("pending").count(),
        getReaderProfileSummary(),
        readerDb.readerActivityLog.orderBy("createdAt").last(),
      ]);

      if (cancelled) return;
      setState((current) => ({
        ...current,
        packs: packs.length,
        progress,
        pendingSync,
        points: profile.totalPoints,
        badges: profile.badges.length,
        level: profile.level,
        lastActivity: recentActivity ? new Date(recentActivity.createdAt).toLocaleString() : "No local activity yet",
      }));
    }

    loadDashboard().catch(() => undefined);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then(() => {
          if (!cancelled) setState((current) => ({ ...current, serviceWorker: "ready" }));
        })
        .catch(() => undefined);
    }

    return () => {
      cancelled = true;
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  const deploymentItems = useMemo(
    () => [
      { label: "Firebase", value: isFirebaseConfigured ? "Configured" : "Local mode", good: isFirebaseConfigured },
      { label: "Network", value: state.online ? "Online" : "Offline", good: state.online },
      { label: "Service worker", value: state.serviceWorker === "ready" ? "Ready" : state.serviceWorker === "unsupported" ? "Unsupported" : "Registering", good: state.serviceWorker === "ready" },
      { label: "Admin", value: loading ? "Checking" : isAdmin ? "Signed in" : user ? "Not admin" : "Signed out", good: isAdmin },
    ],
    [isAdmin, loading, state.online, state.serviceWorker, user],
  );

  return (
    <section className="page grid gap-4">
      <header className="grid gap-3 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={state.online ? "good" : "warn"} label={state.online ? "Online" : "Offline"} />
          <StatusPill tone={isFirebaseConfigured ? "good" : "warn"} label={isFirebaseConfigured ? "Firebase ready" : "Local draft mode"} />
          <StatusPill tone={state.serviceWorker === "ready" ? "good" : "muted"} label={state.serviceWorker === "ready" ? "PWA ready" : "PWA pending"} />
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-signal">Empire of Trust command center</p>
            <h1 className="mt-2 text-2xl font-black leading-tight text-paper sm:text-4xl">App Shell Dashboard</h1>
          </div>
          <Link className="btn btn-primary w-full sm:w-auto" to={isAdmin ? "/studio" : "/studio/login"}>
            {isAdmin ? "Open Studio" : "Studio Login"}
          </Link>
        </div>
      </header>

      {!isFirebaseConfigured && (
        <section className="border border-signal/50 bg-signal/10 p-4 text-sm leading-6 text-paper/75">
          <p className="font-bold text-signal">Deployment needs Firebase environment values.</p>
          <p className="mt-1">{firebaseConfigError || "Firebase is not configured for this build."}</p>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Imported packs" value={state.packs} detail="Offline reader inventory" />
        <MetricCard label="Reading progress" value={state.progress} detail="Saved local positions" />
        <MetricCard label="Pending sync" value={state.pendingSync} detail="Queued local events" tone={state.pendingSync > 0 ? "warn" : "good"} />
        <MetricCard label="Reader level" value={state.level} detail={`${state.points} points / ${state.badges} badges`} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-4">
          <section className="panel p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-black">Quick Actions</h2>
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-paper/45">Mobile ready</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {quickActions.map((action) => (
                <Link key={action.to} to={action.to} className="grid min-h-20 gap-1 border border-white/10 bg-black/20 p-3 hover:border-signal hover:bg-signal hover:text-ink">
                  <span className="text-sm font-black">{action.label}</span>
                  <span className="text-xs font-semibold opacity-70">{action.detail}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="panel p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-black">Studio Workbench</h2>
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-paper/45">{isAdmin ? "Unlocked" : "Login required"}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-4">
              {studioActions.map((action) => (
                <Link key={action.to} to={action.to} className="btn min-h-14 px-3 py-2 text-center text-xs">
                  {action.label}
                </Link>
              ))}
            </div>
          </section>
        </div>

        <aside className="grid gap-4">
          <section className="panel p-4">
            <h2 className="text-base font-black">Deployment Health</h2>
            <div className="mt-3 grid gap-2">
              {deploymentItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 border border-white/10 bg-black/20 p-3 text-sm">
                  <span className="font-semibold text-paper/65">{item.label}</span>
                  <span className={item.good ? "font-black text-ledger" : "font-black text-signal"}>{item.value}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel p-4">
            <h2 className="text-base font-black">Local Reader</h2>
            <dl className="mt-3 grid gap-2 text-sm">
              <InfoRow label="Last activity" value={state.lastActivity} />
              <InfoRow label="Auth state" value={user?.email ?? "Reader mode"} />
              <InfoRow label="Storage" value="IndexedDB active" />
            </dl>
          </section>
        </aside>
      </section>
    </section>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "good" | "warn" | "muted" }) {
  const classes = {
    good: "border-ledger text-ledger",
    warn: "border-signal text-signal",
    muted: "border-white/15 text-paper/55",
  };
  return <span className={`status-badge ${classes[tone]}`}>{label}</span>;
}

function MetricCard({ label, value, detail, tone = "neutral" }: { label: string; value: string | number; detail: string; tone?: "neutral" | "good" | "warn" }) {
  const valueClass = tone === "good" ? "text-ledger" : tone === "warn" ? "text-signal" : "text-paper";
  return (
    <article className="panel p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-paper/45">{label}</p>
      <p className={`mt-3 break-words text-3xl font-black leading-none ${valueClass}`}>{value}</p>
      <p className="mt-3 text-sm font-semibold text-paper/60">{detail}</p>
    </article>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-white/10 pb-2 last:border-0 last:pb-0">
      <dt className="text-xs font-bold uppercase tracking-[0.14em] text-paper/40">{label}</dt>
      <dd className="break-words font-semibold text-paper/75">{value}</dd>
    </div>
  );
}
