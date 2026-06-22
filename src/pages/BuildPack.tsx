import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/States";
import { useEpisodeContent } from "../hooks/useEpisodeContent";
import { savePackMetadata } from "../lib/firestore";
import { buildEpisodePack, downloadJson, validateEpisodePackSource, type PackValidationIssue } from "../lib/packs";
import type { EpisodePack } from "../types";

function ValidationPanel({ issues }: { issues: PackValidationIssue[] }) {
  const errors = issues.filter((issue) => issue.level === "error");
  const warnings = issues.filter((issue) => issue.level === "warning");
  return (
    <section className="panel p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-black">Pack validation</h2>
        <span className={`border px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] ${errors.length ? "border-ember text-ember" : "border-ledger text-ledger"}`}>
          {errors.length ? `${errors.length} errors` : "Buildable"}
        </span>
      </div>
      {issues.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-paper/65">No critical errors or warnings detected.</p>
      ) : (
        <div className="mt-4 grid gap-2">
          {errors.map((issue) => <p key={issue.message} className="border border-ember bg-ember/10 p-3 text-sm text-paper">{issue.message}</p>)}
          {warnings.map((issue) => <p key={issue.message} className="border border-signal bg-signal/10 p-3 text-sm text-paper">{issue.message}</p>)}
        </div>
      )}
    </section>
  );
}

export default function BuildPack() {
  const { episodeId } = useParams();
  const { episode, chapters, paragraphs, loading, error } = useEpisodeContent(episodeId);
  const [version, setVersion] = useState("1.0.0");
  const [pack, setPack] = useState<EpisodePack | null>(null);
  const [building, setBuilding] = useState(false);
  const [saved, setSaved] = useState(false);
  const [buildError, setBuildError] = useState("");

  const issues = useMemo(() => (episode ? validateEpisodePackSource(episode, chapters, paragraphs) : []), [chapters, episode, paragraphs]);
  const hasCriticalErrors = issues.some((issue) => issue.level === "error");

  async function handleBuild() {
    if (!episode || hasCriticalErrors) return;
    setBuilding(true);
    setBuildError("");
    setSaved(false);
    try {
      const nextPack = await buildEpisodePack(episode, chapters, paragraphs, { version });
      setPack(nextPack);
    } catch (err) {
      setBuildError(err instanceof Error ? err.message : "Could not build pack.");
    } finally {
      setBuilding(false);
    }
  }

  useEffect(() => {
    setPack(null);
    setSaved(false);
  }, [chapters, episode, paragraphs, version]);

  if (loading) return <LoadingState label="Loading pack source..." />;
  if (error) return <ErrorState title="Could not load pack source" message={error} />;
  if (!episode) return <ErrorState title="Episode not found" />;

  return (
    <section className="page grid gap-5">
      <PageHeader eyebrow={pack?.manifest.packId ?? episode.episodeIdentifier} title="Build episode pack" subtitle="Validate Firestore episode data, generate JSON, download, and save pack metadata." actions={[{ label: "Edit", to: `/studio/episodes/${episode.id}/edit` }]} />

      <div className="panel grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <label>
          <span className="label">Version</span>
          <input className="field" value={version} onChange={(event) => setVersion(event.target.value)} placeholder="1.0.0" />
        </label>
        <div className="text-sm leading-6 text-paper/60">
          <p>Status: {episode.status}</p>
          <p>Build timestamp: {pack?.manifest.createdAt ? new Date(pack.manifest.createdAt).toLocaleString() : "Not built yet"}</p>
        </div>
      </div>

      <ValidationPanel issues={issues} />

      {buildError && <div className="border border-ember bg-ember/10 p-3 text-sm font-semibold text-ember">{buildError}</div>}

      <div className="panel sticky-actions grid gap-3 p-4 sm:grid-cols-4">
        <button className="btn btn-primary" onClick={handleBuild} disabled={building || hasCriticalErrors}>
          {building ? "Building..." : "Build Pack"}
        </button>
        <button className="btn" disabled={!pack} onClick={() => pack && downloadJson(`${pack.manifest.packId}-v${pack.manifest.version}.json`, pack)}>
          Download JSON
        </button>
        <button className="btn" disabled={!pack} onClick={() => pack && navigator.clipboard.writeText(pack.manifest.packId)}>
          Copy packId
        </button>
        <button
          className="btn"
          disabled={!pack}
          onClick={async () => {
            if (!pack) return;
            await savePackMetadata(episode.id, pack);
            setSaved(true);
          }}
        >
          Save Metadata
        </button>
        {saved && <p className="text-sm font-semibold text-ledger sm:col-span-4">Pack metadata saved to eotPacks for version {pack?.manifest.version}.</p>}
      </div>

      {pack && (
        <section className="panel p-4">
          <h2 className="text-xl font-black">Manifest preview</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {Object.entries(pack.manifest).map(([key, value]) => (
              <div key={key} className="border border-white/10 bg-black/20 p-3">
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-paper/45">{key}</dt>
                <dd className="mt-1 break-all text-paper/80">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <details className="panel overflow-hidden">
        <summary className="min-h-12 cursor-pointer px-4 py-4 font-black">JSON preview</summary>
        <pre className="max-h-[65vh] overflow-auto border-t border-white/10 p-4 text-xs leading-5 text-paper/75">{pack ? JSON.stringify(pack, null, 2) : "Build the pack to preview JSON."}</pre>
      </details>
    </section>
  );
}
