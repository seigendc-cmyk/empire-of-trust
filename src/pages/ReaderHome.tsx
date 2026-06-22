import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/States";
import { getReadingProgress, listImportedPacks, readerDb } from "../lib/offlineDb";
import type { EpisodePack } from "../types";

interface PackRow {
  pack: EpisodePack;
  lastOpened: string;
  continueChapterId: string;
  progressLabel: string;
}

export default function ReaderHome() {
  const [rows, setRows] = useState<PackRow[]>([]);
  const [storageEstimate, setStorageEstimate] = useState("");

  useEffect(() => {
    async function load() {
      const packs = await listImportedPacks();
      const nextRows = await Promise.all(
        packs.map(async (pack) => {
          const episodeId = pack.content.episode.id;
          const progress = await getReadingProgress(episodeId);
          const lastOpen = await readerDb.readerActivityLog
            .where("episodeId")
            .equals(episodeId)
            .and((row) => row.eventType === "episode_opened" || row.eventType === "chapter_opened" || row.eventType === "reading_progress_saved")
            .toArray();
          const sortedActivity = lastOpen.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          const chapters = pack.content.episode.chapters.slice().sort((a, b) => a.chapterNumber - b.chapterNumber);
          const continueChapterId = progress?.chapterId || chapters[0]?.id || "";
          const chapter = chapters.find((item) => item.id === progress?.chapterId);
          return {
            pack,
            lastOpened: sortedActivity[0]?.createdAt ?? "",
            continueChapterId,
            progressLabel: progress && chapter ? `Saved at chapter ${chapter.chapterNumber}` : "Not started",
          };
        }),
      );
      setRows(nextRows);

      if (navigator.storage?.estimate) {
        const estimate = await navigator.storage.estimate();
        setStorageEstimate(formatBytes(estimate.usage ?? 0, estimate.quota ?? 0));
      }
    }

    load().catch(() => undefined);
  }, []);

  const totalChapters = useMemo(() => rows.reduce((sum, row) => sum + row.pack.content.episode.chapters.length, 0), [rows]);

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Offline reader" title="Imported episodes" subtitle="Read episode packs stored locally on this device." actions={[{ label: "Import", to: "/reader/import", primary: true }]} />
      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Offline packs" value={rows.length} detail="Stored in IndexedDB" />
        <Metric label="Chapters" value={totalChapters} detail="Available offline" />
        <Metric label="Storage" value={storageEstimate || "Checking"} detail="Browser estimate" />
      </section>
      <div className="panel divide-y divide-white/10">
        {rows.length === 0 && (
          <div className="p-4">
            <EmptyState title="No offline episodes" message="Import a Studio pack JSON file to read it offline." actionLabel="Import pack" actionTo="/reader/import" />
          </div>
        )}
        {rows.map(({ pack, lastOpened, continueChapterId, progressLabel }) => (
          <article key={pack.content.episode.id} className="grid gap-3 p-4 hover:bg-white/5 sm:grid-cols-[1fr_auto] sm:items-center">
            <Link to={`/reader/${pack.content.episode.id}`} className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="status-badge border-ledger text-ledger">Available Offline</span>
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-signal">{pack.manifest.episodeIdentifier}</span>
              </div>
              <h2 className="mt-2 text-xl font-black">{pack.manifest.title}</h2>
              <p className="mt-2 text-sm text-paper/60">{pack.content.episode.chapters.length} chapters / version {pack.manifest.version}</p>
              <p className="mt-1 text-sm text-paper/55">{progressLabel}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-paper/40">Last opened: {lastOpened ? new Date(lastOpened).toLocaleString() : "Never"}</p>
            </Link>
            <div className="grid gap-2">
              <Link className="btn btn-primary" to={continueChapterId ? `/reader/${pack.content.episode.id}/chapter/${continueChapterId}` : `/reader/${pack.content.episode.id}`}>
                Continue reading
              </Link>
              <Link className="btn" to={`/reader/${pack.content.episode.id}`}>Episode details</Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <article className="panel p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-paper/45">{label}</p>
      <p className="mt-2 break-words text-2xl font-black text-paper">{value}</p>
      <p className="mt-2 text-sm font-semibold text-paper/60">{detail}</p>
    </article>
  );
}

function formatBytes(usage: number, quota: number) {
  const used = usage < 1024 * 1024 ? `${Math.round(usage / 1024)} KB` : `${(usage / 1024 / 1024).toFixed(1)} MB`;
  if (!quota) return used;
  const total = quota < 1024 * 1024 ? `${Math.round(quota / 1024)} KB` : `${Math.round(quota / 1024 / 1024)} MB`;
  return `${used} of ${total}`;
}
