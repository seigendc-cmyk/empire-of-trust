import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { OfflineStatusBadge } from "../components/OfflineStatusBadge";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/States";
import { getImportedLibraryPack, getLibraryReadingProgress } from "../lib/libraryRepository";
import { logActivity, type LibraryReadingProgress } from "../lib/offlineDb";
import type { LibraryBookletPack } from "../types";

export default function LibraryChapter() {
  const { bookletId, chapterId } = useParams();
  const [pack, setPack] = useState<LibraryBookletPack | null>(null);
  const [progress, setProgress] = useState<LibraryReadingProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookletId) return;
    Promise.all([getImportedLibraryPack(bookletId), getLibraryReadingProgress(bookletId)])
      .then(([data, savedProgress]) => {
        setPack(data ?? null);
        setProgress(savedProgress ?? null);
        if (data && chapterId) {
          logActivity("library_chapter_opened", { targetType: "libraryChapter", targetId: chapterId, metadata: { bookletId } }).catch(() => undefined);
        }
      })
      .finally(() => setLoading(false));
  }, [bookletId, chapterId]);

  const chapter = useMemo(() => pack?.content.booklet.chapters.find((item) => item.id === chapterId) ?? null, [pack, chapterId]);
  const continueSection = chapter?.sections.find((section) => section.id === progress?.sectionId) ?? chapter?.sections[0] ?? null;

  if (loading) return <LoadingState label="Opening booklet chapter..." />;
  if (!pack || !bookletId || !chapter) return <ErrorState title="Chapter not found" message="Import the booklet pack again or choose another chapter." />;

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow={`${pack.manifest.bookletCode} / Chapter ${chapter.chapterNumber}`}
        title={chapter.title}
        subtitle={chapter.intro || "Independent Library booklet chapter."}
        actions={[
          ...(continueSection ? [{ label: progress?.chapterId === chapter.id ? "Continue" : "Start Chapter", to: `/library/${bookletId}/chapter/${chapter.id}/section/${continueSection.id}`, primary: true }] : []),
          { label: "Booklet", to: `/library/${bookletId}` },
          { label: "Progress", to: `/library/${bookletId}/progress` },
        ]}
      />
      <section className="panel grid gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <OfflineStatusBadge />
          <span className="status-badge border-signal text-signal">Independent Library</span>
          <span className="status-badge border-ledger text-ledger">Available Offline</span>
        </div>
        {progress?.chapterId === chapter.id && <p className="border-l-2 border-signal pl-3 text-sm leading-6 text-muted">Saved section {chapter.sections.find((section) => section.id === progress.sectionId)?.sectionNumber ?? "-"} at {new Date(progress.updatedAt).toLocaleString()}.</p>}
      </section>
      <section className="panel divide-y divide-white/10">
        {chapter.sections.map((section) => (
          <Link key={section.id} className="block p-4 hover:bg-white/5" to={`/library/${bookletId}/chapter/${chapter.id}/section/${section.id}`}>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-signal">Section {section.sectionNumber}</p>
            <h2 className="text-app mt-1 text-lg font-black">{section.heading || "Untitled section"}</h2>
            <p className="text-muted mt-2 line-clamp-2 text-sm leading-6">{section.body}</p>
          </Link>
        ))}
      </section>
    </section>
  );
}
