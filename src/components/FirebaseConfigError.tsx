export function FirebaseConfigError({ message }: { message: string }) {
  return (
    <section className="bg-ink px-4 py-4 text-paper sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-4">
        <div className="border border-ember bg-ember/10 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-ember">Firebase configuration</p>
          <h1 className="mt-2 text-2xl font-black">Firebase is not connected</h1>
          <p className="mt-3 text-sm leading-6 text-paper/75">{message || "Firebase environment values are missing or invalid."}</p>
        </div>
        <div className="panel p-5">
          <h2 className="text-xl font-black">Local builder mode</h2>
          <p className="mt-3 text-sm leading-6 text-paper/65">The episode builder can still create local draft episodes in this browser. Add Firebase values later to sync with Firestore.</p>
          <pre className="mt-4 overflow-auto border border-white/10 bg-black/30 p-4 text-xs leading-5 text-paper/75">{`VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...`}</pre>
        </div>
      </div>
    </section>
  );
}
