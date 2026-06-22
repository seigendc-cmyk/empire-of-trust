import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LibraryWhatsappButton } from "../components/LibraryWhatsappButton";
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
  const assignedMedia = useMemo(() => {
    if (!pack || !current) return [];
    return [...(pack.content.media ?? []), ...(pack.content.images ?? []), ...(pack.content.illustrations ?? [])].filter((item, index, rows) => {
      if (rows.findIndex((row) => row.id === item.id) !== index) return false;
      if (item.sectionId) return item.sectionId === current.section.id;
      if (item.chapterId) return item.chapterId === current.chapter.id;
      return false;
    });
  }, [pack, current]);
  const prompts = useMemo(() => {
    if (!pack || !current) return [];
    return (pack.content.whatsappPrompts ?? []).filter((prompt) => {
      if (prompt.sectionId) return prompt.sectionId === current.section.id;
      if (prompt.chapterId) return prompt.chapterId === current.chapter.id;
      return !prompt.sectionId && !prompt.chapterId;
    });
  }, [pack, current]);

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
          <span className="status-badge border-app text-muted">Not part of EOT story</span>
        </div>
        {current.section.imageUrl && <img className="border-app max-h-[55vh] w-full border object-cover" src={current.section.imageUrl} alt={current.section.heading} />}
        {assignedMedia.length > 0 && (
          <div className="grid gap-3">
            {assignedMedia.map((item) => (
              <figure key={item.id} className="surface-muted border-app border">
                <img className="max-h-[55vh] w-full object-cover" src={item.imageUrl} alt={item.altText || item.caption || item.label} />
                {(item.caption || item.credits || item.title || item.label) && (
                  <figcaption className="grid gap-1 p-3 text-sm leading-6">
                    <span className="text-app font-bold">{item.title || item.label}</span>
                    {item.caption && <span className="text-muted">{item.caption}</span>}
                    {item.credits && <span className="text-soft text-xs font-semibold uppercase tracking-[0.12em]">{item.credits}</span>}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}
        <div className="reader-paragraph whitespace-pre-wrap text-base leading-8 sm:text-lg">{current.section.body}</div>
        {current.section.imagePrompt && (
          <p className="surface-muted border-app text-muted border p-3 text-sm leading-6">Image prompt: {current.section.imagePrompt}</p>
        )}
        {prompts.length > 0 && (
          <section className="grid gap-3">
            <h2 className="text-app text-xl font-black">Respond</h2>
            {prompts.map((prompt) => (
              <LibraryWhatsappButton
                key={prompt.id}
                pack={pack}
                prompt={prompt}
                bookletId={bookletId}
                chapterId={current.chapter.id}
                chapterTitle={current.chapter.title}
                sectionId={current.section.id}
                sectionTitle={current.section.heading}
              />
            ))}
          </section>
        )}
      </article>
      <nav className="sticky-actions mt-4 grid gap-3 sm:grid-cols-3">
        {previous ? <Link className="btn" to={`/library/${bookletId}/chapter/${previous.chapter.id}/section/${previous.section.id}`}>Previous</Link> : <span />}
        <Link className="btn" to={`/library/${bookletId}`}>Contents</Link>
        {next ? <Link className="btn btn-primary" to={`/library/${bookletId}/chapter/${next.chapter.id}/section/${next.section.id}`}>Next</Link> : <Link className="btn btn-primary" to="/library" onClick={() => logActivity("booklet_completed", { targetType: "libraryBooklet", targetId: bookletId, metadata: { title: pack.manifest.title } }).catch(() => undefined)}>Complete booklet</Link>}
      </nav>
    </section>
  );
}
