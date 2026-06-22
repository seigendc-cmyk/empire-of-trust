import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/States";
import { PageHeader } from "../components/PageHeader";
import { listImportedPacks } from "../lib/offlineDb";
import type { EpisodePack } from "../types";

export default function Packs() {
  const [packs, setPacks] = useState<EpisodePack[]>([]);

  useEffect(() => {
    listImportedPacks().then(setPacks);
  }, []);

  return (
    <section className="page">
      <PageHeader
        eyebrow="Packs"
        title="Offline packs"
        subtitle="Imported episode JSON packs stored locally in IndexedDB."
        actions={[{ label: "Import", to: "/reader/import", primary: true }, { label: "Studio episodes", to: "/studio/episodes" }]}
      />
      {packs.length === 0 ? (
        <EmptyState title="No packs on this device" message="Import an episode pack JSON file to make it available offline." actionLabel="Import pack" actionTo="/reader/import" />
      ) : (
        <div className="panel divide-y divide-white/10">
          {packs.map((pack) => (
            <Link key={pack.content.episode.id} className="block p-4 hover:bg-white/5" to={`/reader/${pack.content.episode.id}`}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-signal">{pack.manifest.packId}</p>
              <h2 className="mt-1 text-lg font-black">{pack.manifest.title}</h2>
              <p className="mt-2 text-sm text-paper/60">Version {pack.manifest.version} / {pack.content.episode.chapters.length} chapters</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
