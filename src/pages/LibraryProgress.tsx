import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/States";
import { getImportedLibraryPack, getLibraryReadingProgress } from "../lib/libraryRepository";
import { listLibraryQuizAttempts, listLibraryWhatsappLogs, readerDb, type LibraryQuizAttempt, type LibraryReadingProgress, type LibraryWhatsappLog, type ReaderActivityLog } from "../lib/offlineDb";
import type { LibraryBookletPack } from "../types";

export default function LibraryProgress() {
  const { bookletId } = useParams();
  const [pack, setPack] = useState<LibraryBookletPack | null>(null);
  const [progress, setProgress] = useState<LibraryReadingProgress | null>(null);
  const [quizAttempts, setQuizAttempts] = useState<LibraryQuizAttempt[]>([]);
  const [whatsappLogs, setWhatsappLogs] = useState<LibraryWhatsappLog[]>([]);
  const [activity, setActivity] = useState<ReaderActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookletId) return;
    Promise.all([
      getImportedLibraryPack(bookletId),
      getLibraryReadingProgress(bookletId),
      listLibraryQuizAttempts(bookletId),
      listLibraryWhatsappLogs(bookletId),
      readerDb.readerActivityLog.filter((row) => row.targetId === bookletId || String(row.metadata?.bookletId ?? "") === bookletId).toArray(),
    ])
      .then(([data, savedProgress, attempts, logs, activityRows]) => {
        setPack(data ?? null);
        setProgress(savedProgress ?? null);
        setQuizAttempts(attempts);
        setWhatsappLogs(logs);
        setActivity(activityRows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      })
      .finally(() => setLoading(false));
  }, [bookletId]);

  const sectionCount = useMemo(() => pack?.content.booklet.chapters.reduce((sum, chapter) => sum + chapter.sections.length, 0) ?? 0, [pack]);
  const currentChapter = pack?.content.booklet.chapters.find((chapter) => chapter.id === progress?.chapterId);
  const currentSection = currentChapter?.sections.find((section) => section.id === progress?.sectionId);

  if (loading) return <LoadingState label="Loading booklet progress..." />;
  if (!pack || !bookletId) return <ErrorState title="Booklet progress unavailable" message="Import the booklet pack before viewing local progress." />;

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow={pack.manifest.bookletCode}
        title="Booklet progress"
        subtitle="Local offline progress, quiz attempts, WhatsApp logs, and activity for this imported booklet."
        actions={[{ label: "Booklet", to: `/library/${bookletId}`, primary: true }, { label: "Library", to: "/library" }]}
      />
      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Sections" value={String(sectionCount)} />
        <Metric label="Quiz attempts" value={String(quizAttempts.length)} />
        <Metric label="WhatsApp logs" value={String(whatsappLogs.length)} />
      </section>
      <section className="panel grid gap-3 p-4">
        <h2 className="text-app text-xl font-black">Continue reading</h2>
        {progress && currentChapter && currentSection ? (
          <>
            <p className="text-muted text-sm leading-6">Chapter {currentChapter.chapterNumber}: {currentChapter.title} / Section {currentSection.sectionNumber}: {currentSection.heading || "Untitled section"}</p>
            <p className="text-soft text-xs font-bold uppercase tracking-[0.12em]">Saved {new Date(progress.updatedAt).toLocaleString()}</p>
            <Link className="btn btn-primary w-full sm:w-fit" to={`/library/${bookletId}/chapter/${currentChapter.id}/section/${currentSection.id}`}>Continue</Link>
          </>
        ) : (
          <p className="text-muted text-sm leading-6">No reading progress saved yet.</p>
        )}
      </section>
      <LogPanel title="Quiz attempts" rows={quizAttempts.map((attempt) => [`${attempt.score}/${attempt.maxScore}`, attempt.quizId, attempt.completedAt])} />
      <LogPanel title="WhatsApp responses" rows={whatsappLogs.map((log) => [log.promptId, log.message, log.createdAt])} />
      <LogPanel title="Activity" rows={activity.map((row) => [row.eventType, row.targetType ?? "library", row.createdAt])} />
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-4">
      <p className="text-soft text-xs font-bold uppercase tracking-[0.12em]">{label}</p>
      <p className="text-app mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function LogPanel({ title, rows }: { title: string; rows: Array<[string, string, string]> }) {
  return (
    <section className="panel divide-y divide-white/10">
      <div className="p-4">
        <h2 className="text-app text-xl font-black">{title}</h2>
      </div>
      {rows.length === 0 && <p className="p-4 text-sm text-muted">No local records yet.</p>}
      {rows.map((row, index) => (
        <div key={`${title}-${index}`} className="grid gap-1 p-4">
          <p className="text-app break-words font-bold">{row[0]}</p>
          <p className="text-muted break-words text-sm">{row[1]}</p>
          <p className="text-soft text-xs font-bold uppercase tracking-[0.12em]">{new Date(row[2]).toLocaleString()}</p>
        </div>
      ))}
    </section>
  );
}
