import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ADMIN_EMAIL, auth, db, firebaseConfigError, isFirebaseConfigured } from "../lib/firebase";
import { getOrCreateReaderIdentity, readerDb } from "../lib/offlineDb";
import { useAuth } from "../state/AuthContext";

type TestStatus = "pending" | "pass" | "fail" | "warn";

interface TestRow {
  id: string;
  label: string;
  status: TestStatus;
  detail: string;
}

const buildVersion = import.meta.env.VITE_APP_VERSION || import.meta.env.VITE_FIREBASE_PROJECT_ID || "local-build";

const smokeChecklist = [
  ["Create test episode", "/studio/episodes/new"],
  ["Add test chapter", "/studio/episodes"],
  ["Add test paragraph", "/studio/episodes"],
  ["Preview episode", "/studio/episodes"],
  ["Build pack", "/studio/episodes"],
  ["Download pack", "/studio/episodes"],
  ["Import pack into Reader", "/reader/import"],
  ["Open imported episode", "/reader"],
  ["Save reading progress", "/reader"],
  ["Switch offline and reopen episode", "/reader"],
] as const;

export default function ProductionTest() {
  const { user, isAdmin, loading } = useAuth();
  const [rows, setRows] = useState<TestRow[]>([]);
  const [running, setRunning] = useState(true);
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  async function runTests() {
    setRunning(true);
    const nextRows: TestRow[] = [];
    const add = (row: TestRow) => nextRows.push(row);

    add({
      id: "firebase",
      label: "Firebase configured",
      status: isFirebaseConfigured ? "pass" : "fail",
      detail: isFirebaseConfigured ? "Firebase web config is present." : firebaseConfigError || "Firebase config missing.",
    });
    add({
      id: "auth",
      label: "Google Auth available",
      status: isFirebaseConfigured && auth ? "pass" : "fail",
      detail: isFirebaseConfigured && auth ? `Auth domain: ${auth.config.authDomain}` : "Firebase Auth is unavailable.",
    });
    add({
      id: "admin",
      label: "Current user admin status",
      status: loading ? "pending" : isAdmin ? "pass" : user ? "fail" : "warn",
      detail: loading ? "Checking auth state." : isAdmin ? `${user?.email} matches ${ADMIN_EMAIL}.` : user ? `${user.email} is signed in but not admin.` : "No signed-in admin user.",
    });

    if (isFirebaseConfigured && db && isAdmin) {
      try {
        const testId = `browser_${Date.now()}`;
        const ref = doc(db, "eotProductionTests", testId);
        await setDoc(ref, {
          testId,
          userEmail: user?.email ?? "",
          buildVersion,
          createdAt: serverTimestamp(),
        });
        add({ id: "firestore-write", label: "Firestore write test", status: "pass", detail: `Wrote eotProductionTests/${testId}.` });
        const snapshot = await getDoc(ref);
        add({
          id: "firestore-read",
          label: "Firestore read test",
          status: snapshot.exists() ? "pass" : "fail",
          detail: snapshot.exists() ? "Read back the production test document." : "Could not read back the test document.",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Firestore test failed.";
        add({ id: "firestore-write", label: "Firestore write test", status: "fail", detail: message });
        add({ id: "firestore-read", label: "Firestore read test", status: "fail", detail: "Skipped because write/read permissions failed." });
      }
    } else {
      add({ id: "firestore-write", label: "Firestore write test", status: "warn", detail: "Sign in as admin to run Firestore write test." });
      add({ id: "firestore-read", label: "Firestore read test", status: "warn", detail: "Sign in as admin to run Firestore read test." });
    }

    try {
      await readerDb.open();
      add({ id: "dexie", label: "Dexie/IndexedDB available", status: "pass", detail: `Database: ${readerDb.name}.` });
      const identity = await getOrCreateReaderIdentity();
      add({ id: "reader-id", label: "Reader identity generated", status: "pass", detail: identity.readerId });
      const packCount = await readerDb.episodePacks.count();
      add({ id: "pack-table", label: "Episode pack import table available", status: "pass", detail: `${packCount} imported pack record${packCount === 1 ? "" : "s"}.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "IndexedDB is not available.";
      add({ id: "dexie", label: "Dexie/IndexedDB available", status: "fail", detail: message });
      add({ id: "reader-id", label: "Reader identity generated", status: "fail", detail: "Skipped because IndexedDB failed." });
      add({ id: "pack-table", label: "Episode pack import table available", status: "fail", detail: "Skipped because IndexedDB failed." });
    }

    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        add({
          id: "service-worker",
          label: "Service worker registered",
          status: registration ? "pass" : "warn",
          detail: registration ? `Scope: ${registration.scope}` : "No active service worker registration yet.",
        });
      } catch (error) {
        add({ id: "service-worker", label: "Service worker registered", status: "fail", detail: error instanceof Error ? error.message : "Service worker check failed." });
      }
    } else {
      add({ id: "service-worker", label: "Service worker registered", status: "warn", detail: "Service workers are not supported in this browser." });
    }

    add({
      id: "online",
      label: "Online/offline status",
      status: online ? "pass" : "warn",
      detail: online ? "Browser reports online." : "Browser reports offline.",
    });
    add({
      id: "build-version",
      label: "Build version visible",
      status: "pass",
      detail: buildVersion,
    });

    setRows(nextRows);
    setRunning(false);
  }

  useEffect(() => {
    runTests();
    // Auth state and browser online state are the intended inputs for this test run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, loading, online, user?.email]);

  const summary = useMemo(() => {
    const failed = rows.filter((row) => row.status === "fail").length;
    const warnings = rows.filter((row) => row.status === "warn").length;
    const passed = rows.filter((row) => row.status === "pass").length;
    return { failed, warnings, passed };
  }, [rows]);

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow="Production QA"
        title="Production Test Dashboard"
        subtitle="Firebase-only smoke checks for studio authoring, offline reader storage, PWA registration, and deploy readiness."
        actions={[{ label: "Run Again", onClick: runTests, primary: true }, { label: "Reader Import", to: "/reader/import" }, { label: "Studio", to: "/studio" }]}
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Passed" value={summary.passed} tone="good" />
        <Metric label="Warnings" value={summary.warnings} tone="warn" />
        <Metric label="Failed" value={summary.failed} tone={summary.failed ? "bad" : "good"} />
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-white/10 p-4">
          <h2 className="text-lg font-black">Automated Checks</h2>
          {running && <p className="mt-1 text-sm font-semibold text-signal">Running tests...</p>}
        </div>
        <div className="divide-y divide-white/10">
          {rows.map((row) => <TestRow key={row.id} row={row} />)}
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="text-lg font-black">Guided Smoke Test Checklist</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {smokeChecklist.map(([label, to], index) => (
            <Link key={label} className="grid min-h-16 gap-1 border border-white/10 bg-black/20 p-3 hover:border-signal hover:bg-signal hover:text-ink" to={to}>
              <span className="text-xs font-black uppercase tracking-[0.14em] opacity-60">Step {index + 1}</span>
              <span className="text-sm font-black">{label}</span>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "good" | "warn" | "bad" }) {
  const valueClass = tone === "good" ? "text-ledger" : tone === "warn" ? "text-signal" : "text-ember";
  return (
    <article className="panel p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-paper/45">{label}</p>
      <p className={`mt-2 text-3xl font-black ${valueClass}`}>{value}</p>
    </article>
  );
}

function TestRow({ row }: { row: TestRow }) {
  const classes = {
    pass: "border-ledger text-ledger",
    fail: "border-ember text-ember",
    warn: "border-signal text-signal",
    pending: "border-white/15 text-paper/50",
  };
  return (
    <article className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <h3 className="font-black">{row.label}</h3>
        <p className="mt-1 break-words text-sm leading-6 text-paper/60">{row.detail}</p>
      </div>
      <span className={`status-badge ${classes[row.status]}`}>{row.status}</span>
    </article>
  );
}
