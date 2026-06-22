import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/States";
import { PageHeader } from "../components/PageHeader";
import { listEpisodes } from "../lib/firestore";
import type { Episode } from "../types";

export default function EpisodesList() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listEpisodes().then(setEpisodes).finally(() => setLoading(false));
  }, []);

  return (
    <section className="page">
      <PageHeader eyebrow="Studio" title="Episodes" subtitle="Draft, edit, preview, and package Empire of Trust episodes." actions={[{ label: "New episode", to: "/studio/episodes/new", primary: true }]} />
      <div className="panel divide-y divide-white/10">
        {loading && <div className="p-4 text-paper/65">Loading episodes...</div>}
        {!loading && episodes.length === 0 && (
          <div className="p-4">
            <EmptyState title="No episodes yet" message="Create the first episode, then add chapters and paragraphs from the phone editor." actionLabel="Create episode" actionTo="/studio/episodes/new" />
          </div>
        )}
        {episodes.map((episode) => (
          <div key={episode.id} className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-signal">{episode.episodeIdentifier}</p>
              <h2 className="mt-1 text-xl font-black">{episode.title}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-paper/65">{episode.synopsis}</p>
            </div>
            <div className="grid gap-2 sm:flex sm:flex-wrap">
              <Link className="btn" to={`/studio/episodes/${episode.id}/edit`}>Edit</Link>
              <Link className="btn" to={`/studio/episodes/${episode.id}/preview`}>Preview</Link>
              <Link className="btn" to={`/studio/episodes/${episode.id}/build-pack`}>Build Pack</Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
