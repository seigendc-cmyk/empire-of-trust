import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/States";
import { getLibraryContent } from "../lib/libraryRepository";
import type { LibraryBooklet, LibraryChapter, LibrarySection } from "../types";

export default function StudioLibraryPreview() {
  const { bookletId } = useParams();
  const [booklet, setBooklet] = useState<LibraryBooklet | null>(null);
  const [chapters, setChapters] = useState<LibraryChapter[]>([]);
  const [sections, setSections] = useState<LibrarySection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookletId) return;
    getLibraryContent(bookletId).then((content) => {
      setBooklet(content.booklet);
      setChapters(content.chapters);
      setSections(content.sections);
    }).finally(() => setLoading(false));
  }, [bookletId]);

  const ordered = useMemo(() => chapters.slice().sort((a, b) => a.chapterNumber - b.chapterNumber), [chapters]);

  if (loading) return <LoadingState label="Preparing booklet preview..." />;
  if (!booklet || !bookletId) return <ErrorState title="Booklet not found" />;

  return (
    <section className="page grid gap-5">
      <PageHeader
        eyebrow={booklet.bookletCode}
        title={booklet.title}
        subtitle={booklet.description}
        actions={[{ label: "Edit", to: `/studio/library/${bookletId}/edit` }, { label: "Build Pack", to: `/studio/library/${bookletId}/build-pack`, primary: true }]}
      />
      <section className="panel grid gap-3 p-4">
        <div className="flex flex-wrap gap-2">
          <span className="status-badge border-signal text-signal">Independent Library</span>
          <span className="status-badge border-white/15 text-paper/60">Not part of EOT story</span>
          <span className="status-badge border-ledger text-ledger">{booklet.category}</span>
        </div>
        <p className="text-sm leading-6 text-paper/65">{booklet.author} / {booklet.language} / {booklet.ageRating}</p>
      </section>
      {ordered.map((chapter) => (
        <section key={chapter.id} className="panel p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">Chapter {chapter.chapterNumber}</p>
          <h2 className="mt-1 text-2xl font-black">{chapter.title}</h2>
          <p className="mt-2 text-sm leading-6 text-paper/60">{chapter.intro}</p>
          <div className="mt-4 grid gap-3">
            {sections.filter((section) => section.chapterId === chapter.id).sort((a, b) => a.sectionNumber - b.sectionNumber).map((section) => (
              <article key={section.id} className="border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-paper/45">Section {section.sectionNumber}</p>
                <h3 className="mt-1 text-xl font-black">{section.heading}</h3>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-paper/75">{section.body}</p>
              </article>
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}
