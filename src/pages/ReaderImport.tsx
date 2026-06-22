import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { OfflineStatusBadge } from "../components/OfflineStatusBadge";
import { compareEpisodePackVersions, getImportedPack, importPack, validateEpisodePack } from "../lib/offlineDb";
import type { EpisodePack } from "../types";

type ImportMode = "new" | "same" | "newer" | "older";

interface PendingImport {
  fileName: string;
  pack: EpisodePack;
  existing: EpisodePack | null;
  mode: ImportMode;
}

export default function ReaderImport() {
  const navigate = useNavigate();
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [importing, setImporting] = useState(false);

  async function handleFile(file: File) {
    setError("");
    setSuccess("");
    setPending(null);
    try {
      const text = await file.text();
      const pack = validateEpisodePack(JSON.parse(text));
      const existing = (await getImportedPack(pack.content.episode.id)) ?? null;
      const diff = existing ? compareEpisodePackVersions(pack.manifest.version, existing.manifest.version) : 1;
      const mode: ImportMode = !existing ? "new" : diff === 0 ? "same" : diff > 0 ? "newer" : "older";
      setPending({ fileName: file.name, pack, existing, mode });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read pack file.");
    }
  }

  async function commitImport(replace = false) {
    if (!pending) return;
    setError("");
    setSuccess("");
    setImporting(true);
    try {
      const episodeId = await importPack(pending.pack, { replace });
      setSuccess(`${pending.pack.manifest.title} imported locally. Opening offline episode...`);
      window.setTimeout(() => navigate(`/reader/${episodeId}`), 650);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import pack.");
    } finally {
      setImporting(false);
    }
  }

  const canImportWithoutReplace = pending?.mode === "new" || pending?.mode === "newer";
  const canReplace = pending?.mode === "same" || pending?.mode === "older";

  return (
    <section className="page grid min-h-[calc(100dvh-8rem)] content-center">
      <div className="panel mx-auto grid w-full max-w-2xl gap-5 p-4 sm:p-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-signal">IndexedDB import</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">Import episode pack</h1>
          <p className="mt-3 text-sm leading-6 text-paper/65">Preview the manifest before storing the episode locally for offline reading.</p>
          <div className="mt-4">
            <OfflineStatusBadge />
          </div>
        </header>

        <label className="block">
          <span className="label">Episode pack JSON</span>
          <input
            className="field"
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
            disabled={importing}
          />
        </label>

        {pending && (
          <section className="grid gap-4">
            <div className={`border p-3 text-sm font-semibold ${pending.mode === "newer" || pending.mode === "new" ? "border-ledger bg-ledger/10 text-ledger" : "border-signal bg-signal/10 text-signal"}`}>
              {statusMessage(pending)}
            </div>
            <section className="border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-black">Manifest preview</h2>
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-paper/45">{pending.fileName}</span>
              </div>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <Info label="packId" value={pending.pack.manifest.packId} />
                <Info label="title" value={pending.pack.manifest.title} />
                <Info label="version" value={pending.pack.manifest.version} />
                <Info label="season/episode" value={`S${pending.pack.manifest.seasonNumber}E${pending.pack.manifest.episodeNumber}`} />
                <Info label="episodeId" value={pending.pack.content.episode.id} />
                <Info label="chapters" value={String(pending.pack.content.episode.chapters.length)} />
              </dl>
            </section>
            {pending.existing && (
              <section className="border border-white/10 bg-black/20 p-4 text-sm leading-6 text-paper/65">
                <h3 className="font-black text-paper">Existing local pack</h3>
                <p className="mt-1">Version {pending.existing.manifest.version} is already stored for this episode.</p>
              </section>
            )}
            <div className="grid gap-2 sm:flex">
              {canImportWithoutReplace && (
                <button className="btn btn-primary flex-1" type="button" disabled={importing} onClick={() => void commitImport(false)}>
                  {importing ? "Importing..." : pending.mode === "newer" ? "Upgrade pack" : "Import pack"}
                </button>
              )}
              {canReplace && (
                <button className="btn btn-primary flex-1" type="button" disabled={importing} onClick={() => void commitImport(true)}>
                  {importing ? "Replacing..." : pending.mode === "older" ? "Replace with older version" : "Replace same version"}
                </button>
              )}
              <button className="btn flex-1" type="button" disabled={importing} onClick={() => setPending(null)}>Cancel</button>
            </div>
          </section>
        )}

        {success && <div className="border border-ledger bg-ledger/10 p-3 text-sm font-semibold text-ledger">{success}</div>}
        {error && <div className="border border-ember bg-ember/15 p-3 text-sm font-semibold text-ember">{error}</div>}
      </div>
    </section>
  );
}

function statusMessage(pending: PendingImport) {
  if (pending.mode === "new") return "This is a new offline episode pack.";
  if (pending.mode === "newer") return `Upgrade available: local ${pending.existing?.manifest.version}, file ${pending.pack.manifest.version}.`;
  if (pending.mode === "same") return `Same version detected: ${pending.pack.manifest.version}. Replace or cancel.`;
  return `Older version warning: local ${pending.existing?.manifest.version}, file ${pending.pack.manifest.version}. Replacing may downgrade this episode.`;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border border-white/10 bg-black/20 p-3">
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-paper/45">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-paper/80">{value}</dd>
    </div>
  );
}
