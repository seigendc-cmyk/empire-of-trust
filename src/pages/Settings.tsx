import { signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { OfflineStatusBadge } from "../components/OfflineStatusBadge";
import { ThemeToggle } from "../components/ThemeToggle";
import { auth, ADMIN_EMAIL } from "../lib/firebase";
import { useAuth } from "../state/AuthContext";
import { getReaderSettings, saveReaderSettings, type ReaderSettings } from "../lib/offlineDb";
import { useTheme } from "../state/ThemeContext";

export default function Settings() {
  const { user, isAdmin } = useAuth();
  const { theme, setTheme } = useTheme();
  const [readerSettings, setReaderSettings] = useState<ReaderSettings>({ id: "reader", fontSize: "medium", showImagePrompts: true, showMetadata: true });

  useEffect(() => {
    getReaderSettings().then(setReaderSettings);
  }, []);

  async function updateReaderSettings(next: ReaderSettings) {
    setReaderSettings(next);
    await saveReaderSettings(next);
  }

  return (
    <section className="page">
      <PageHeader eyebrow="Settings" title="App settings" subtitle="Firebase-only PWA shell status and account controls." />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-4">
          <h2 className="text-xl font-black">Theme</h2>
          <p className="mt-3 text-sm leading-6 text-paper/60">Current theme: {theme === "dark" ? "Dark Cinematic" : "Light Executive"}.</p>
          <div className="mt-4 grid gap-2 sm:flex">
            <ThemeToggle />
            <button className="btn" type="button" onClick={() => setTheme("dark")}>Dark Cinematic</button>
            <button className="btn" type="button" onClick={() => setTheme("light")}>Light Executive</button>
          </div>
        </section>
        <section className="panel p-4">
          <h2 className="text-xl font-black">Connection</h2>
          <div className="mt-4">
            <OfflineStatusBadge />
          </div>
          <p className="mt-4 text-sm leading-6 text-paper/60">Reader packs remain available from IndexedDB when offline.</p>
        </section>
        <section className="panel p-4">
          <h2 className="text-xl font-black">Studio account</h2>
          <div className="mt-4 grid gap-2 text-sm text-paper/70">
            <p>Signed in: {user?.email ?? "No"}</p>
            <p>Admin email: {ADMIN_EMAIL}</p>
            <p>Studio access: {isAdmin ? "Allowed" : "Locked"}</p>
          </div>
          {user && <button className="btn mt-5 w-full sm:w-auto" onClick={() => signOut(auth)}>Sign out</button>}
        </section>
        <section className="panel p-4 lg:col-span-2">
          <h2 className="text-xl font-black">Reader settings</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label>
              <span className="label">Font size</span>
              <select className="field" value={readerSettings.fontSize} onChange={(event) => updateReaderSettings({ ...readerSettings, fontSize: event.currentTarget.value as ReaderSettings["fontSize"] })}>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </label>
            <label className="flex min-h-12 items-center justify-between border border-white/10 bg-black/20 px-3 text-sm font-semibold">
              Image prompts
              <input type="checkbox" checked={readerSettings.showImagePrompts} onChange={(event) => updateReaderSettings({ ...readerSettings, showImagePrompts: event.currentTarget.checked })} />
            </label>
            <label className="flex min-h-12 items-center justify-between border border-white/10 bg-black/20 px-3 text-sm font-semibold">
              Metadata
              <input type="checkbox" checked={readerSettings.showMetadata} onChange={(event) => updateReaderSettings({ ...readerSettings, showMetadata: event.currentTarget.checked })} />
            </label>
          </div>
        </section>
        <section className="panel p-4 lg:col-span-2">
          <h2 className="text-xl font-black">Backend policy</h2>
          <p className="mt-3 text-sm leading-6 text-paper/65">
            This app uses Firebase Auth, Firestore, Firebase Hosting, and IndexedDB only. There is no Prisma, Neon, Express API, custom JWT login, or Cloud Functions dependency.
          </p>
        </section>
      </div>
    </section>
  );
}
