import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { OfflineStatusBadge } from "../components/OfflineStatusBadge";
import { compareEpisodePackVersions } from "../lib/offlineDb";
import { getImportedLibraryPack, importLibraryPack, validateLibraryPack } from "../lib/libraryRepository";
import type { LibraryBookletPack } from "../types";

type ImportMode = "new" | "same" | "newer" | "older";

interface PendingImport {
  fileName: string;
  pack: LibraryBookletPack;
  existing: LibraryBookletPack | null;
  mode: ImportMode;
}

export default function LibraryImport() {
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
      const pack = validateLibraryPack(JSON.parse(await file.text()));
      const existing = (await getImportedLibraryPack(pack.content.booklet.id)) ?? null;
      const diff = existing ? compareEpisodePackVersions(pack.manifest.version, existing.manifest.version) : 1;
      const mode: ImportMode = !existing ? "new" : diff === 0 ? "same" : diff > 0 ? "newer" : "older";
      setPending({ fileName: file.name, pack, existing, mode });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read library pack file.");
    }
  }

  async function commitImport(replace = false) {
    if (!pending) return;
    setImporting(true);
    setError("");
    setSuccess("");
    try {
      const bookletId = await importLibraryPack(pending.pack, { replace });
      setSuccess(`${pending.pack.manifest.title} imported to the independent Library.`);
      window.setTimeout(() => navigate(`/library/${bookletId}`), 650);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import booklet pack.");
    } finally {
      setImporting(false);
    }
  }

  const canImport = pending?.mode === "new" || pending?.mode === "newer";
  const canReplace = pending?.mode === "same" || pending?.mode === "older";

  return (
    <section className="page grid min-h-[calc(100dvh-8rem)] content-center">
      <div className="panel mx-auto grid w-full max-w-2xl gap-5 p-4 sm:p-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-signal">Independent Library</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">Import booklet pack</h1>
          <p className="mt-3 text-sm leading-6 text-paper/65">Import `library_booklet` JSON packs for offline reading. EOT episode packs stay separate in the Reader import flow.</p>
          <div className="mt-4"><OfflineStatusBadge /></div>
        </header>

        <label>
          <span className="label">Library booklet JSON</span>
          <input className="field" type="file" accept="application/json,.json" disabled={importing} onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }} />
        </label>

        {pending && (
          <section className="grid gap-4">
            <div className={`border p-3 text-sm font-semibold ${pending.mode === "new" || pending.mode === "newer" ? "border-ledger bg-ledger/10 text-ledger" : "border-signal bg-signal/10 text-signal"}`}>
              {statusMessage(pending)}
            </div>
            <section className="border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-black">Manifest preview</h2>
                <span className="break-all text-xs font-bold uppercase tracking-[0.14em] text-paper/45">{pending.fileName}</span>
              </div>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <Info label="packId" value={pending.pack.manifest.packId} />
                <Info label="title" value={pending.pack.manifest.title} />
                <Info label="version" value={pending.pack.manifest.version} />
                <Info label="bookletCode" value={pending.pack.manifest.bookletCode} />
                <Info label="category" value={pending.pack.manifest.category} />
                <Info label="chapters" value={String(pending.pack.content.booklet.chapters.length)} />
                <Info label="quizzes" value={String(pending.pack.content.quizzes?.length ?? 0)} />
                <Info label="WhatsApp prompts" value={String(pending.pack.content.whatsappPrompts?.length ?? 0)} />
              </dl>
            </section>
            <div className="flex flex-wrap gap-2">
              <span className="status-badge border-signal text-signal">Independent Library</span>
              <span className="status-badge border-white/15 text-paper/60">Not part of EOT story</span>
            </div>
            <div className="grid gap-2 sm:flex">
              {canImport && <button className="btn btn-primary flex-1" type="button" disabled={importing} onClick={() => void commitImport(false)}>{importing ? "Importing..." : pending.mode === "newer" ? "Upgrade booklet" : "Import booklet"}</button>}
              {canReplace && <button className="btn btn-primary flex-1" type="button" disabled={importing} onClick={() => void commitImport(true)}>{importing ? "Replacing..." : pending.mode === "older" ? "Replace with older version" : "Replace same version"}</button>}
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
  if (pending.mode === "new") return "This is a new independent booklet pack.";
  if (pending.mode === "newer") return `Upgrade available: local ${pending.existing?.manifest.version}, file ${pending.pack.manifest.version}.`;
  if (pending.mode === "same") return `Same version detected: ${pending.pack.manifest.version}. Replace or cancel.`;
  return `Older version warning: local ${pending.existing?.manifest.version}, file ${pending.pack.manifest.version}. Replacing may downgrade this booklet.`;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border border-white/10 bg-black/20 p-3">
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-paper/45">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-paper/80">{value}</dd>
    </div>
  );
}
