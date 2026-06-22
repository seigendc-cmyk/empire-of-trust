import { Link } from "react-router-dom";

export default function Home() {
  return (
    <section className="page grid min-h-[calc(100dvh-8rem)] content-center gap-5 md:grid-cols-[1.1fr_0.9fr] md:items-center">
      <div>
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-signal">Firebase-only production flow</p>
        <h1 className="max-w-3xl text-4xl font-black leading-tight text-paper sm:text-6xl">Empire of Trust</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-paper/70">
          A mobile-first studio and offline reader for cinematic business-drama episode packs.
        </p>
        <div className="mt-8 grid gap-3 sm:flex sm:flex-row">
          <Link className="btn btn-primary" to="/studio/login">Studio Login</Link>
          <Link className="btn" to="/reader">Offline Reader</Link>
        </div>
      </div>
      <div className="panel border-l-4 border-l-signal p-5">
        <div className="grid gap-4">
          {["Google admin auth", "Firestore episode drafting", "IndexedDB reader packs", "Firebase Hosting: empireot"].map((item) => (
            <div key={item} className="border border-white/10 bg-black/20 p-4 text-sm font-semibold text-paper/80">
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
