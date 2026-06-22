import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/States";
import { buildLibraryBookletPack, downloadLibraryPack, getLibraryContent, saveLibraryPackMetadata } from "../lib/libraryRepository";
import type { LibraryBooklet, LibraryBookletPack, LibraryChapter, LibrarySection } from "../types";

export default function StudioLibraryBuildPack() {
  const { bookletId } = useParams();
  const [booklet, setBooklet] = useState<LibraryBooklet | null>(null);
  const [chapters, setChapters] = useState<LibraryChapter[]>([]);
  const [sections, setSections] = useState<LibrarySection[]>([]);
  const [version, setVersion] = useState("1.0.0");
  const [pack, setPack] = useState<LibraryBookletPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bookletId) return;
    getLibraryContent(bookletId).then((content) => {
      setBooklet(content.booklet);
      setChapters(content.chapters);
      setSections(content.sections);
    }).finally(() => setLoading(false));
  }, [bookletId]);

  const issues = useMemo(() => {
    const next: Array<{ level: "error" | "warning"; message: string }> = [];
    if (!booklet?.title) next.push({ level: "error", message: "Booklet title is required." });
    if (!booklet?.bookletCode) next.push({ level: "error", message: "Booklet code is required." });
    if (chapters.length === 0) next.push({ level: "error", message: "Add at least one chapter." });
    if (sections.length === 0) next.push({ level: "error", message: "Add at least one section." });
    if (booklet?.status !== "published") next.push({ level: "warning", message: "Booklet is not marked published yet." });
    if (!booklet?.coverImageUrl) next.push({ level: "warning", message: "Cover image URL is empty." });
    next.push({ level: "warning", message: "Signature is a frontend placeholder." });
    return next;
  }, [booklet, chapters.length, sections.length]);
  const hasErrors = issues.some((issue) => issue.level === "error");
  const fileName = pack ? `${pack.manifest.packId}-v${pack.manifest.version}.json` : `LIB-${booklet?.bookletCode || "BOOKLET"}-v${version}.json`;

  async function build() {
    if (!booklet || hasErrors) return null;
    setBuilding(true);
    setError("");
    setMessage("");
    try {
      const next = await buildLibraryBookletPack(booklet, chapters, sections, version);
      setPack(next);
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build library pack.");
      return null;
    } finally {
      setBuilding(false);
    }
  }

  if (loading) return <LoadingState label="Loading library pack source..." />;
  if (!booklet || !bookletId) return <ErrorState title="Booklet not found" />;

  return (
    <section className="page grid gap-5">
      <PageHeader eyebrow={booklet.bookletCode} title="Build booklet pack" subtitle="Generate independent `library_booklet` JSON for offline Reader Library import." actions={[{ label: "Edit", to: `/studio/library/${bookletId}/edit` }, { label: "Preview", to: `/studio/library/${bookletId}/preview` }]} />
      {message && <div className="border border-ledger bg-ledger/10 p-3 text-sm font-semibold text-ledger">{message}</div>}
      {error && <div className="border border-ember bg-ember/10 p-3 text-sm font-semibold text-ember">{error}</div>}

      <section className="panel grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <label><span className="label">Version</span><input className="field" value={version} onChange={(event) => setVersion(event.currentTarget.value)} /></label>
        <div className="text-sm leading-6 text-paper/60">
          <p>Status: {booklet.status}</p>
          <p>File name: {fileName}</p>
          <p>Pack type: library_booklet</p>
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="text-xl font-black">Validation</h2>
        <div className="mt-4 grid gap-3">
          {issues.map((issue) => (
            <p key={issue.message} className={`border p-3 text-sm font-semibold ${issue.level === "error" ? "border-ember bg-ember/10 text-ember" : "border-signal bg-signal/10 text-signal"}`}>{issue.level === "error" ? "Critical: " : "Warning: "}{issue.message}</p>
          ))}
        </div>
      </section>

      <section className="panel sticky-actions grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <button className="btn btn-primary" type="button" disabled={building || hasErrors} onClick={() => void build()}>{building ? "Building..." : "Build Pack"}</button>
        <button className="btn btn-primary" type="button" disabled={building || hasErrors} onClick={async () => {
          const next = await build();
          if (next) downloadLibraryPack(next);
        }}>Build + Download</button>
        <button className="btn" type="button" disabled={building || hasErrors} onClick={async () => {
          const next = await build();
          if (next) {
            await saveLibraryPackMetadata(next);
            setMessage(`Pack metadata saved to eotLibraryPacks as ${next.manifest.packId}_${next.manifest.version}.`);
          }
        }}>Build + Save Metadata</button>
        <button className="btn" type="button" disabled={!pack} onClick={() => pack && downloadLibraryPack(pack)}>Download JSON</button>
      </section>

      {pack && (
        <section className="panel grid gap-4 p-4">
          <div>
            <h2 className="text-xl font-black">Manifest preview</h2>
            <p className="mt-2 break-all text-sm font-semibold text-paper/60">Checksum: {pack.manifest.checksum}</p>
            <p className="mt-2 border border-signal bg-signal/10 p-3 text-sm font-semibold text-signal">Signature is a frontend placeholder. Replace it with a production signing process before treating packs as tamper-proof.</p>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            {Object.entries(pack.manifest).map(([key, value]) => (
              <div key={key} className="border border-white/10 bg-black/20 p-3">
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-paper/45">{key}</dt>
                <dd className="mt-1 break-all text-sm font-semibold text-paper/80">{String(value)}</dd>
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
