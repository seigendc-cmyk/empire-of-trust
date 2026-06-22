import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/States";
import { getImportedLibraryPack, saveLibraryReadingProgress } from "../lib/libraryRepository";
import { logActivity } from "../lib/offlineDb";
import type { LibraryBookletPack } from "../types";

export default function LibraryRead() {
  const { bookletId, chapterId, sectionId } = useParams();
  const [pack, setPack] = useState<LibraryBookletPack | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookletId) return;
    getImportedLibraryPack(bookletId).then((data) => setPack(data ?? null)).finally(() => setLoading(false));
  }, [bookletId]);

  const flat = useMemo(() => {
    const chapters = pack?.content.booklet.chapters ?? [];
    return chapters.flatMap((chapter) => chapter.sections.map((section) => ({ chapter, section })));
  }, [pack]);
  const currentIndex = flat.findIndex((item) => item.chapter.id === chapterId && item.section.id === sectionId);
  const current = currentIndex >= 0 ? flat[currentIndex] : null;
  const previous = currentIndex > 0 ? flat[currentIndex - 1] : null;
  const next = currentIndex >= 0 ? flat[currentIndex + 1] : null;

  useEffect(() => {
    if (!bookletId || !current) return;
    saveLibraryReadingProgress({ bookletId, chapterId: current.chapter.id, sectionId: current.section.id, updatedAt: new Date().toISOString() }).catch(() => undefined);
    logActivity("library_chapter_opened", {
      targetType: "librarySection",
      targetId: current.section.id,
      metadata: { bookletId, chapterId: current.chapter.id, sectionId: current.section.id },
    }).catch(() => undefined);
  }, [bookletId, current]);

  if (loading) return <LoadingState label="Opening booklet section..." />;
  if (!pack || !bookletId || !current) return <ErrorState title="Section not found" message="Import the booklet pack again or choose another section." />;

  return (
    <section className="reader-screen">
      <PageHeader
        eyebrow={`${pack.manifest.bookletCode} / Chapter ${current.chapter.chapterNumber}`}
        title={current.section.heading || current.chapter.title}
        subtitle="Independent Library booklet. Not part of Empire of Trust story continuity."
        actions={[{ label: "Booklet", to: `/library/${bookletId}` }]}
      />
      <article className="panel grid gap-5 p-4 sm:p-6">
        <div className="flex flex-wrap gap-2">
          <span className="status-badge border-signal text-signal">Independent Library</span>
          <span className="status-badge border-white/15 text-paper/60">Not part of EOT story</span>
        </div>
        {current.section.imageUrl && <img className="max-h-[55vh] w-full border border-white/10 object-cover" src={current.section.imageUrl} alt="" />}
        <div className="reader-paragraph whitespace-pre-wrap text-base leading-8 sm:text-lg">{current.section.body}</div>
        {current.section.imagePrompt && (
          <p className="border border-white/10 bg-black/20 p-3 text-sm leading-6 text-paper/55">Image prompt: {current.section.imagePrompt}</p>
        )}
      </article>
      <nav className="sticky-actions mt-4 grid gap-3 sm:grid-cols-3">
        {previous ? <Link className="btn" to={`/library/${bookletId}/chapter/${previous.chapter.id}/section/${previous.section.id}`}>Previous</Link> : <span />}
        <Link className="btn" to={`/library/${bookletId}`}>Contents</Link>
        {next ? <Link className="btn btn-primary" to={`/library/${bookletId}/chapter/${next.chapter.id}/section/${next.section.id}`}>Next</Link> : <Link className="btn btn-primary" to="/library" onClick={() => logActivity("library_booklet_completed", { targetType: "libraryBooklet", targetId: bookletId, metadata: { title: pack.manifest.title } }).catch(() => undefined)}>Complete booklet</Link>}
      </nav>
    </section>
  );
}
