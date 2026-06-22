import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/States";
import { bookletPackFileName, buildBookletFoundationPack, downloadBookletPack, getBookletContent, listBookletBuildHistory, listBookletEngagement, listBookletMedia, listBookletQuizzes, saveBookletBuildHistory } from "../lib/bookletFoundationRepository";
import type { DeployableBookletPack, EotBooklet, EotBookletBuildHistory, EotBookletChapter, EotBookletEngagement, EotBookletMedia, EotBookletQuiz, EotBookletSection } from "../types";

export default function StudioBookletBuildPack() {
  const { bookletId } = useParams();
  const [booklet, setBooklet] = useState<EotBooklet | null>(null);
  const [chapters, setChapters] = useState<EotBookletChapter[]>([]);
  const [sections, setSections] = useState<EotBookletSection[]>([]);
  const [media, setMedia] = useState<EotBookletMedia[]>([]);
  const [quizzes, setQuizzes] = useState<EotBookletQuiz[]>([]);
  const [engagement, setEngagement] = useState<EotBookletEngagement[]>([]);
  const [history, setHistory] = useState<EotBookletBuildHistory[]>([]);
  const [version, setVersion] = useState("1.0.0");
  const [pack, setPack] = useState<DeployableBookletPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bookletId) return;
    Promise.all([getBookletContent(bookletId), listBookletMedia(bookletId), listBookletQuizzes(bookletId), listBookletEngagement(bookletId), listBookletBuildHistory(bookletId)])
      .then(([content, mediaRows, quizRows, engagementRows, historyRows]) => {
        setBooklet(content.booklet);
        setChapters(content.chapters);
        setSections(content.sections);
        setMedia(mediaRows);
        setQuizzes(quizRows);
        setEngagement(engagementRows);
        setHistory(historyRows);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load booklet pack source."))
      .finally(() => setLoading(false));
  }, [bookletId]);

  const issues = useMemo(() => {
    const next: Array<{ level: "error" | "warning"; message: string }> = [];
    if (!booklet?.title) next.push({ level: "error", message: "Booklet title is required." });
    if (!booklet?.bookletCode) next.push({ level: "error", message: "Booklet code is required." });
    if (chapters.length === 0) next.push({ level: "error", message: "Add at least one chapter." });
    if (sections.length === 0) next.push({ level: "error", message: "Add at least one section." });
    if (!booklet?.coverImageUrl && !booklet?.libraryThumbnailUrl) next.push({ level: "error", message: "Cover image is required before export. Add a Cover image URL, Library thumbnail URL, or upload/generate one in Cover Builder." });
    if (media.length === 0) next.push({ level: "warning", message: "No booklet images or illustrations are attached." });
    if (quizzes.length === 0) next.push({ level: "warning", message: "No interactive quizzes are attached." });
    if (engagement.length === 0) next.push({ level: "warning", message: "No WhatsApp engagement CTAs are attached." });
    next.push({ level: "warning", message: "Signature is a frontend placeholder." });
    return next;
  }, [booklet, chapters.length, sections.length, media.length, quizzes.length, engagement.length]);
  const hasErrors = issues.some((issue) => issue.level === "error");
  const fileName = pack ? bookletPackFileName(pack) : `LIB-${booklet?.bookletCode || "BOOKLET"}-v${version}.booklet.json`;

  async function build() {
    if (!booklet || hasErrors) return null;
    setBuilding(true);
    setError("");
    setMessage("");
    try {
      const next = await buildBookletFoundationPack(booklet, chapters, sections, media, version, quizzes, engagement);
      setPack(next);
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build booklet pack.");
      return null;
    } finally {
      setBuilding(false);
    }
  }

  if (loading) return <LoadingState label="Loading booklet pack source..." />;
  if (!booklet || !bookletId) return <ErrorState title="Booklet not found" />;

  return (
    <section className="page grid gap-5">
      <PageHeader
        eyebrow={booklet.bookletCode}
        title="Build booklet pack"
        subtitle="Compile this independent booklet, images, and illustrations into a Reader-importable library_booklet JSON pack."
        actions={[{ label: "Edit", to: `/studio/booklets/${bookletId}/edit` }, { label: "Media", to: `/studio/booklets/${bookletId}/media` }, { label: "Quizzes", to: `/studio/booklets/${bookletId}/quizzes` }, { label: "Engagement", to: `/studio/booklets/${bookletId}/engagement` }, { label: "Cover", to: `/studio/booklets/${bookletId}/cover` }]}
      />
      {message && <div className="border border-ledger bg-ledger/10 p-3 text-sm font-semibold text-ledger">{message}</div>}
      {error && <div className="border border-ember bg-ember/10 p-3 text-sm font-semibold text-ember">{error}</div>}

      <section className="panel grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <label><span className="label">Version</span><input className="field" value={version} onChange={(event) => setVersion(event.currentTarget.value)} /></label>
        <div className="text-muted text-sm leading-6">
          <p>Status: {booklet.status}</p>
          <p>File name: {fileName}</p>
          <p>Pack type: library_booklet</p>
          <p>Media: {media.filter((item) => item.mediaType === "image").length} images / {media.filter((item) => item.mediaType === "illustration").length} illustrations</p>
          <p>Quizzes: {quizzes.length}</p>
          <p>WhatsApp CTAs: {engagement.length}</p>
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="text-app text-xl font-black">Validation</h2>
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
          if (next) downloadBookletPack(next);
        }}>Build + Download</button>
        <button className="btn" type="button" disabled={building || hasErrors} onClick={async () => {
          const next = await build();
          if (next) {
            await saveBookletBuildHistory(next);
            setHistory(await listBookletBuildHistory(bookletId));
            setMessage(`Build history saved as ${bookletPackFileName(next)}.`);
          }
        }}>Build + Save History</button>
        <button className="btn" type="button" disabled={!pack} onClick={() => pack && downloadBookletPack(pack)}>Download .booklet.json</button>
      </section>

      {pack && (
        <section className="panel grid gap-4 p-4">
          <div>
            <h2 className="text-app text-xl font-black">Manifest preview</h2>
            <p className="text-muted mt-2 break-all text-sm font-semibold">Checksum: {pack.manifest.checksum}</p>
            <p className="text-muted mt-1 break-all text-sm font-semibold">File: {bookletPackFileName(pack)}</p>
          </div>
          <pre className="max-h-[65vh] overflow-auto border-app surface-muted border p-4 text-xs leading-5 text-muted">{JSON.stringify(pack, null, 2)}</pre>
        </section>
      )}
      <section className="panel divide-y divide-white/10">
        <div className="p-4">
          <h2 className="text-app text-xl font-black">Build history</h2>
          <p className="text-muted mt-2 text-sm leading-6">{history.length} saved builds for this booklet.</p>
        </div>
        {history.map((row) => (
          <div key={row.id} className="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="min-w-0">
              <p className="text-app break-all font-black">{row.fileName}</p>
              <p className="text-muted mt-1 break-all text-sm">Checksum: {row.checksum}</p>
            </div>
            <p className="text-soft text-xs font-bold uppercase tracking-[0.12em]">{String(row.createdAt)}</p>
          </div>
        ))}
      </section>
    </section>
  );
}
