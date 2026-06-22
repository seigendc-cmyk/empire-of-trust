import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { OfflineStatusBadge } from "../components/OfflineStatusBadge";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/States";
import { canOpenPack } from "../lib/licenceRepository";
import { deleteImportedPack, getImportedPack, getReadingProgress, logActivity, type ReadingProgress } from "../lib/offlineDb";
import type { EpisodePack } from "../types";

export default function ReaderEpisode() {
  const { episodeId } = useParams();
  const navigate = useNavigate();
  const [pack, setPack] = useState<EpisodePack | null>(null);
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [licenceCheck, setLicenceCheck] = useState<{ allowed: boolean; reason: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!episodeId) return;
    Promise.all([getImportedPack(episodeId), getReadingProgress(episodeId)])
      .then(async ([data, savedProgress]) => {
        setPack(data ?? null);
        setProgress(savedProgress ?? null);
        if (data) {
          const check = await canOpenPack(data.manifest.requiredLicencePlan || data.content.episode.requiredLicencePlan);
          setLicenceCheck({ allowed: check.allowed, reason: check.reason });
          if (check.allowed) logActivity("episode_opened", { episodeId, targetType: "episode", targetId: episodeId }).catch(() => undefined);
        }
      })
      .finally(() => setLoading(false));
  }, [episodeId]);

  const chapters = useMemo(() => {
    return pack?.content.episode.chapters.slice().sort((a, b) => a.chapterNumber - b.chapterNumber) ?? [];
  }, [pack]);

  if (loading) return <LoadingState label="Loading offline episode..." />;
  if (!pack || !episodeId) return <ErrorState title="Episode not found offline" message="Import the episode pack again to store it on this device." />;
  if (licenceCheck && !licenceCheck.allowed) {
    return (
      <section className="page grid gap-4">
        <PageHeader eyebrow={pack.manifest.episodeIdentifier} title="Licence required" subtitle={licenceCheck.reason} actions={[{ label: "Activate", to: "/licence/activate", primary: true }, { label: "Status", to: "/licence/status" }]} />
        <section className="panel border-ember p-4">
          <h2 className="text-xl font-black">Pack access blocked</h2>
          <p className="mt-2 text-sm leading-6 text-paper/65">Required plan: {pack.manifest.requiredLicencePlan || pack.content.episode.requiredLicencePlan || "reader"}. Free/sample packs open without a licence.</p>
        </section>
      </section>
    );
  }

  const continueChapterId = progress?.chapterId ?? chapters[0]?.id;

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow={pack.manifest.episodeIdentifier}
        title={pack.manifest.title}
        subtitle={pack.content.episode.synopsis}
        actions={[
          ...(continueChapterId ? [{ label: progress ? "Continue" : "Start", to: `/reader/${episodeId}/chapter/${continueChapterId}`, primary: true }] : []),
          { label: "Import", to: "/reader/import" },
        ]}
      />
      <div className="panel p-4">
        <div className="flex items-center justify-between gap-3">
          <OfflineStatusBadge />
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-paper/45">Version {pack.manifest.version}</span>
        </div>
        {progress && (
          <p className="mt-4 border-l-2 border-signal pl-3 text-sm leading-6 text-paper/70">
            Saved at chapter {chapters.find((chapter) => chapter.id === progress.chapterId)?.chapterNumber ?? "-"}.
          </p>
        )}
      </div>
      <section className="panel border-signal p-4">
        <h2 className="text-xl font-black">Privacy</h2>
        <p className="mt-2 text-sm leading-6 text-paper/65">Reader activity is stored locally first. When online, participation can sync to Empire of Trust cloud. Reading does not require login.</p>
      </section>
      <section className="panel divide-y divide-white/10">
        {chapters.length === 0 && <div className="p-4 text-sm text-paper/65">This pack has no chapters.</div>}
        {chapters.map((chapter) => (
          <Link key={chapter.id} className="block p-4 hover:bg-white/5" to={`/reader/${episodeId}/chapter/${chapter.id}`}>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-signal">Chapter {chapter.chapterNumber}</p>
            <h2 className="mt-1 text-xl font-black">{chapter.title}</h2>
            <p className="mt-2 text-sm text-paper/60">{chapter.paragraphs.length} paragraphs / {chapter.sceneLocation || "Location pending"}</p>
          </Link>
        ))}
      </section>
      <button
        className="btn border-ember bg-ember/20 text-paper hover:bg-ember hover:text-paper"
        disabled={deleting}
        onClick={async () => {
          if (!window.confirm("Delete this imported pack from this device?")) return;
          setDeleting(true);
          await deleteImportedPack(episodeId);
          navigate("/reader");
        }}
      >
        {deleting ? "Deleting..." : "Delete imported pack"}
      </button>
    </section>
  );
}
