import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/States";
import { listImportedPacks } from "../lib/offlineDb";
import type { EpisodePack } from "../types";

export default function ReaderHome() {
  const [packs, setPacks] = useState<EpisodePack[]>([]);

  useEffect(() => {
    listImportedPacks().then(setPacks);
  }, []);

  return (
    <section className="page">
      <PageHeader eyebrow="Offline reader" title="Imported episodes" subtitle="Read episode packs stored locally on this device." actions={[{ label: "Import", to: "/reader/import", primary: true }]} />
      <div className="panel divide-y divide-white/10">
        {packs.length === 0 && (
          <div className="p-4">
            <EmptyState title="No offline episodes" message="Import a Studio pack JSON file to read it offline." actionLabel="Import pack" actionTo="/reader/import" />
          </div>
        )}
        {packs.map((pack) => (
          <Link key={pack.content.episode.id} to={`/reader/${pack.content.episode.id}`} className="block p-4 hover:bg-white/5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-signal">{pack.manifest.episodeIdentifier}</p>
            <h2 className="mt-1 text-xl font-black">{pack.manifest.title}</h2>
            <p className="mt-2 text-sm text-paper/60">{pack.content.episode.chapters.length} chapters stored offline</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
