import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, LoadingState } from "../components/States";
import { listLibraryBooklets, publishLibraryBooklet } from "../lib/libraryRepository";
import type { LibraryBooklet } from "../types";

export default function StudioLibraryList() {
  const [booklets, setBooklets] = useState<LibraryBooklet[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    setBooklets(await listLibraryBooklets());
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Loading Studio Library..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow="Studio Library"
        title="Independent booklets"
        subtitle="Create and publish small non-EOT booklets without adding them to season, episode, or story continuity lists."
        actions={[{ label: "New Booklet", to: "/studio/library/new", primary: true }, { label: "Reader Library", to: "/library" }]}
      />
      {message && <div className="border border-ledger bg-ledger/10 p-3 text-sm font-semibold text-ledger">{message}</div>}
      <section className="panel divide-y divide-white/10">
        {booklets.length === 0 && <div className="p-4"><EmptyState title="No independent booklets" message="Create a booklet for guides, short stories, business, faith, education, community, or promotional reader packs." actionLabel="New booklet" actionTo="/studio/library/new" /></div>}
        {booklets.map((booklet) => (
          <article key={booklet.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <span className="status-badge border-signal text-signal">{booklet.category}</span>
                <span className="status-badge border-white/15 text-paper/60">Not part of EOT story</span>
                <span className="status-badge border-ledger text-ledger">{booklet.status}</span>
              </div>
              <h2 className="mt-2 text-xl font-black">{booklet.title}</h2>
              <p className="mt-2 text-sm leading-6 text-paper/60">{booklet.description}</p>
              <p className="mt-1 break-all text-xs font-semibold uppercase tracking-[0.12em] text-paper/45">{booklet.bookletCode} / {booklet.requiredLicencePlan}</p>
            </div>
            <div className="grid gap-2 sm:min-w-48">
              <Link className="btn" to={`/studio/library/${booklet.id}/edit`}>Edit</Link>
              <Link className="btn" to={`/studio/library/${booklet.id}/preview`}>Preview</Link>
              <Link className="btn btn-primary" to={`/studio/library/${booklet.id}/build-pack`}>Build Pack</Link>
              <button className="btn" type="button" onClick={async () => {
                await publishLibraryBooklet(booklet);
                setMessage(`${booklet.title} published to Library catalogue.`);
                await load();
              }}>Publish catalogue</button>
            </div>
          </article>
        ))}
      </section>
    </section>
  );
}
