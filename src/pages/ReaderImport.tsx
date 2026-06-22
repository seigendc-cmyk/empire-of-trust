import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { importPack, validateEpisodePack } from "../lib/offlineDb";
import { OfflineStatusBadge } from "../components/OfflineStatusBadge";

export default function ReaderImport() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [importing, setImporting] = useState(false);

  async function handleFile(file: File) {
    setError("");
    setSuccess("");
    setImporting(true);
    try {
      const text = await file.text();
      const pack = validateEpisodePack(JSON.parse(text));
      const episodeId = await importPack(pack);
      setSuccess(`${pack.manifest.title} imported. Opening offline episode...`);
      window.setTimeout(() => navigate(`/reader/${episodeId}`), 450);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import pack.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <section className="page grid min-h-[calc(100dvh-8rem)] content-center">
      <div className="panel mx-auto w-full max-w-xl p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-signal">IndexedDB import</p>
        <h1 className="mt-2 text-3xl font-black">Import episode pack</h1>
        <p className="mt-3 text-sm leading-6 text-paper/65">Select a JSON pack built by Studio. The content is stored locally for offline reading.</p>
        <div className="mt-4">
          <OfflineStatusBadge />
        </div>
        <label className="mt-6 block">
          <span className="label">Episode pack JSON</span>
          <input
            className="field"
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleFile(file);
            }}
            disabled={importing}
          />
        </label>
        {importing && <div className="mt-4 border border-signal bg-signal/10 p-3 text-sm font-semibold text-signal">Importing pack...</div>}
        {success && <div className="mt-4 border border-ledger bg-ledger/10 p-3 text-sm font-semibold text-ledger">{success}</div>}
        {error && <div className="mt-4 border border-ember bg-ember/15 p-3 text-sm">{error}</div>}
      </div>
    </section>
  );
}
