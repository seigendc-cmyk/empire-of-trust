import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import {
  BOOKLET_FOUNDATION_CATEGORIES,
  bookletChapterInputFromForm,
  bookletFoundationInputFromForm,
  bookletSectionInputFromForm,
  deleteBooklet,
  getBookletContent,
  listBooklets,
  saveBooklet,
  saveBookletChapter,
  saveBookletSection,
  validateBookletFoundationInput,
} from "../lib/bookletFoundationRepository";
import type { EotBooklet, EotBookletChapter, EotBookletSection } from "../types";

type Mode = "list" | "form" | "detail";

export default function StudioBooklets({ mode = "list" }: { mode?: Mode }) {
  const { bookletId } = useParams();
  const navigate = useNavigate();
  const [booklets, setBooklets] = useState<EotBooklet[]>([]);
  const [booklet, setBooklet] = useState<EotBooklet | null>(null);
  const [chapters, setChapters] = useState<EotBookletChapter[]>([]);
  const [sections, setSections] = useState<EotBookletSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    if (bookletId) {
      const content = await getBookletContent(bookletId);
      setBooklet(content.booklet);
      setChapters(content.chapters);
      setSections(content.sections);
    } else {
      setBooklets(await listBooklets());
    }
    setLoading(false);
  }

  useEffect(() => {
    load().catch((err) => {
      setError(err instanceof Error ? err.message : "Could not load booklet data.");
      setLoading(false);
    });
  }, [bookletId]);

  async function submitBooklet(formData: FormData) {
    const input = bookletFoundationInputFromForm(formData);
    const errors = validateBookletFoundationInput(input);
    if (errors.length) {
      setError(errors.join(" "));
      return;
    }
    setError("");
    const id = await saveBooklet(input);
    setMessage("Booklet saved.");
    navigate(`/studio/booklets/${id}`);
  }

  if (loading) return <LoadingState label="Loading Booklet Builder..." />;
  if (mode === "list") return <BookletList booklets={booklets} />;
  if (mode === "form") return <BookletForm booklet={booklet} onSubmit={submitBooklet} message={message} error={error} />;
  if (!booklet || !bookletId) return <ErrorState title="Booklet not found" message="Open an existing booklet or create a new one." />;

  return (
    <BookletDetail
      booklet={booklet}
      chapters={chapters}
      sections={sections}
      message={message}
      error={error}
      onReload={load}
      onMessage={setMessage}
      onError={setError}
      onDelete={async () => {
        await deleteBooklet(booklet.id);
        navigate("/studio/booklets");
      }}
    />
  );
}

function BookletList({ booklets }: { booklets: EotBooklet[] }) {
  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow="Booklet Builder"
        title="Booklet Studio"
        subtitle="Create independent booklets for children, business, faith, education, community, marketing, reports, and training."
        actions={[{ label: "New Booklet", to: "/studio/booklets/new", primary: true }, { label: "Library Packs", to: "/studio/library" }]}
      />
      <section className="panel divide-y divide-white/10">
        {booklets.length === 0 && <div className="p-4"><EmptyState title="No booklets yet" message="Create the first independent booklet foundation record." actionLabel="New booklet" actionTo="/studio/booklets/new" /></div>}
        {booklets.map((booklet) => (
          <article key={booklet.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <span className="status-badge border-signal text-signal">{booklet.category}</span>
                <span className="status-badge border-ledger text-ledger">{booklet.status}</span>
              </div>
              <h2 className="text-app mt-2 text-xl font-black">{booklet.title}</h2>
              <p className="text-muted mt-2 line-clamp-2 text-sm leading-6">{booklet.description || booklet.subtitle}</p>
              <p className="text-soft mt-1 break-all text-xs font-semibold uppercase tracking-[0.12em]">{booklet.bookletCode} / {booklet.publisher}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 md:min-w-64">
              <Link className="btn" to={`/studio/booklets/${booklet.id}`}>Open</Link>
              <Link className="btn" to={`/studio/booklets/${booklet.id}/cover`}>Cover</Link>
              <Link className="btn btn-primary" to={`/studio/booklets/${booklet.id}/edit`}>Edit</Link>
            </div>
          </article>
        ))}
      </section>
    </section>
  );
}

function BookletForm({ booklet, onSubmit, message, error }: { booklet: EotBooklet | null; onSubmit: (formData: FormData) => void; message: string; error: string }) {
  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow="Booklet Builder"
        title={booklet ? "Edit booklet" : "New booklet"}
        subtitle="Foundation metadata for an independent non-EOT booklet."
        actions={[{ label: "Booklets", to: "/studio/booklets" }, ...(booklet ? [{ label: "Cover Builder", to: `/studio/booklets/${booklet.id}/cover` }, { label: "Open", to: `/studio/booklets/${booklet.id}`, primary: true }] : [])]}
      />
      {message && <div className="border border-ledger bg-ledger/10 p-3 text-sm font-semibold text-ledger">{message}</div>}
      {error && <div className="border border-ember bg-ember/10 p-3 text-sm font-semibold text-ember">{error}</div>}
      <form className="panel grid gap-3 p-4 md:grid-cols-2" onSubmit={(event) => {
        event.preventDefault();
        onSubmit(new FormData(event.currentTarget));
      }}>
        <input type="hidden" name="id" value={booklet?.id ?? ""} />
        <label><span className="label">Booklet code</span><input className="field" name="bookletCode" defaultValue={booklet?.bookletCode ?? ""} placeholder="BOOKLET-001" /></label>
        <label><span className="label">Status</span><select className="field" name="status" defaultValue={booklet?.status ?? "draft"}><option value="draft">Draft</option><option value="review">Review</option><option value="approved">Approved</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
        <label><span className="label">Title</span><input className="field" name="title" required defaultValue={booklet?.title ?? ""} /></label>
        <label><span className="label">Subtitle</span><input className="field" name="subtitle" defaultValue={booklet?.subtitle ?? ""} /></label>
        <label><span className="label">Author</span><input className="field" name="author" required defaultValue={booklet?.author ?? ""} /></label>
        <label><span className="label">Publisher</span><input className="field" name="publisher" required defaultValue={booklet?.publisher ?? "Empire of Trust Studio"} /></label>
        <label><span className="label">Tagline</span><input className="field" name="tagline" defaultValue={booklet?.tagline ?? ""} /></label>
        <label><span className="label">Edition</span><input className="field" name="edition" defaultValue={booklet?.edition ?? ""} placeholder="First edition" /></label>
        <label><span className="label">Publication date</span><input className="field" name="publicationDate" type="date" defaultValue={booklet?.publicationDate ?? ""} /></label>
        <label><span className="label">Category</span><select className="field" name="category" defaultValue={booklet?.category ?? "Educational Books"}>{BOOKLET_FOUNDATION_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
        <label><span className="label">Language</span><input className="field" name="language" defaultValue={booklet?.language ?? "en"} /></label>
        <label><span className="label">Age rating</span><input className="field" name="ageRating" defaultValue={booklet?.ageRating ?? "General"} /></label>
        <label><span className="label">Required licence plan</span><input className="field" name="requiredLicencePlan" defaultValue={booklet?.requiredLicencePlan ?? "free"} /></label>
        <label><span className="label">Cover image URL</span><input className="field" name="coverImageUrl" defaultValue={booklet?.coverImageUrl ?? ""} /></label>
        <label><span className="label">Back cover image URL</span><input className="field" name="backCoverImageUrl" defaultValue={booklet?.backCoverImageUrl ?? ""} /></label>
        <label><span className="label">Banner image URL</span><input className="field" name="bannerImageUrl" defaultValue={booklet?.bannerImageUrl ?? ""} /></label>
        <label><span className="label">Library thumbnail URL</span><input className="field" name="libraryThumbnailUrl" defaultValue={booklet?.libraryThumbnailUrl ?? ""} /></label>
        <label className="md:col-span-2"><span className="label">Description</span><textarea className="field min-h-32" name="description" defaultValue={booklet?.description ?? ""} /></label>
        <div className="md:col-span-2"><button className="btn btn-primary w-full sm:w-auto" type="submit">Save booklet</button></div>
      </form>
    </section>
  );
}

function BookletDetail({
  booklet,
  chapters,
  sections,
  message,
  error,
  onReload,
  onMessage,
  onError,
  onDelete,
}: {
  booklet: EotBooklet;
  chapters: EotBookletChapter[];
  sections: EotBookletSection[];
  message: string;
  error: string;
  onReload: () => Promise<void>;
  onMessage: (message: string) => void;
  onError: (message: string) => void;
  onDelete: () => Promise<void>;
}) {
  const firstSection = useMemo(() => sections[0], [sections]);
  return (
    <section className="page grid gap-5">
      <PageHeader
        eyebrow={booklet.bookletCode}
        title={booklet.title}
        subtitle={booklet.description || booklet.subtitle}
        actions={[{ label: "Import Manuscript", to: `/studio/booklets/${booklet.id}/import-manuscript`, primary: true }, { label: "Cover Builder", to: `/studio/booklets/${booklet.id}/cover` }, { label: "Media", to: `/studio/booklets/${booklet.id}/media` }, { label: "WhatsApp", to: `/studio/booklets/${booklet.id}/whatsapp` }, { label: "Build Pack", to: `/studio/booklets/${booklet.id}/build-pack` }, { label: "Edit", to: `/studio/booklets/${booklet.id}/edit` }]}
      />
      {message && <div className="border border-ledger bg-ledger/10 p-3 text-sm font-semibold text-ledger">{message}</div>}
      {error && <div className="border border-ember bg-ember/10 p-3 text-sm font-semibold text-ember">{error}</div>}

      <section className="panel overflow-hidden">
        {booklet.bannerImageUrl && <img className="h-44 w-full object-cover sm:h-56" src={booklet.bannerImageUrl} alt="" />}
        <div className="grid gap-4 p-4 lg:grid-cols-[12rem_1fr]">
          <div className="surface-muted border-app grid aspect-[3/4] place-items-center border">
            {booklet.coverImageUrl ? <img className="h-full w-full object-cover" src={booklet.coverImageUrl} alt="" /> : <span className="text-accent p-4 text-center text-2xl font-black">{booklet.bookletCode}</span>}
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Info label="Category" value={booklet.category} />
            <Info label="Status" value={booklet.status} />
            <Info label="Author" value={booklet.author} />
            <Info label="Publisher" value={booklet.publisher} />
            <Info label="Edition" value={booklet.edition ?? ""} />
            <Info label="Publication date" value={booklet.publicationDate ?? ""} />
            <Info label="Language" value={booklet.language} />
            <Info label="Age rating" value={booklet.ageRating ?? "General"} />
            <Info label="Licence" value={booklet.requiredLicencePlan ?? "free"} />
            <Info label="Content" value={`${chapters.length} chapters / ${sections.length} sections`} />
          </dl>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <form className="panel grid gap-3 p-4" onSubmit={async (event) => {
          event.preventDefault();
          try {
            await saveBookletChapter(bookletChapterInputFromForm(new FormData(event.currentTarget), booklet.id));
            event.currentTarget.reset();
            onMessage("Chapter saved.");
            await onReload();
          } catch (err) {
            onError(err instanceof Error ? err.message : "Could not save chapter.");
          }
        }}>
          <h2 className="text-app text-xl font-black">Chapter management</h2>
          <input type="hidden" name="chapterId" />
          <label><span className="label">Chapter number</span><input className="field" name="chapterNumber" type="number" defaultValue={chapters.length + 1} /></label>
          <label><span className="label">Title</span><input className="field" name="chapterTitle" required /></label>
          <label><span className="label">Summary</span><textarea className="field min-h-24" name="chapterSummary" /></label>
          <label><span className="label">Intro</span><textarea className="field min-h-24" name="chapterIntro" /></label>
          <button className="btn btn-primary" type="submit">Save chapter</button>
        </form>

        <form className="panel grid gap-3 p-4" onSubmit={async (event) => {
          event.preventDefault();
          try {
            await saveBookletSection(bookletSectionInputFromForm(new FormData(event.currentTarget), booklet.id));
            event.currentTarget.reset();
            onMessage("Section saved.");
            await onReload();
          } catch (err) {
            onError(err instanceof Error ? err.message : "Could not save section.");
          }
        }}>
          <h2 className="text-app text-xl font-black">Section management</h2>
          <input type="hidden" name="sectionId" />
          <label><span className="label">Chapter</span><select className="field" name="sectionChapterId" required>{chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.chapterNumber}. {chapter.title}</option>)}</select></label>
          <label><span className="label">Section number</span><input className="field" name="sectionNumber" type="number" defaultValue={1} /></label>
          <label><span className="label">Heading</span><input className="field" name="sectionHeading" /></label>
          <label><span className="label">Content</span><textarea className="field min-h-40" name="sectionContent" /></label>
          <label><span className="label">Image prompt</span><textarea className="field min-h-24" name="sectionImagePrompt" /></label>
          <label><span className="label">Image URL</span><input className="field" name="sectionImageUrl" /></label>
          <label><span className="label">Illustration style</span><input className="field" name="sectionIllustrationStyle" /></label>
          <label><span className="label">Interactive links JSON</span><textarea className="field min-h-24" name="sectionInteractiveLinksJson" defaultValue="[]" /></label>
          <button className="btn btn-primary" type="submit" disabled={chapters.length === 0}>Save section</button>
        </form>
      </section>

      <section className="panel divide-y divide-white/10">
        <div className="p-4">
          <h2 className="text-app text-xl font-black">Booklet preview</h2>
          <p className="text-muted mt-2 text-sm leading-6">{firstSection ? "Preview uses saved chapter and section records." : "Add chapters and sections to build the preview."}</p>
        </div>
        {chapters.map((chapter) => (
          <details key={chapter.id} className="p-4" open>
            <summary className="text-app cursor-pointer text-lg font-black">{chapter.chapterNumber}. {chapter.title}</summary>
            <p className="text-muted mt-2 text-sm leading-6">{chapter.summary}</p>
            <div className="mt-3 grid gap-2">
              {sections.filter((section) => section.chapterId === chapter.id).map((section) => (
                <article key={section.id} className="surface-muted border-app border p-3">
                  <p className="text-accent text-xs font-bold uppercase tracking-[0.14em]">Section {section.sectionNumber}</p>
                  <h3 className="text-app mt-1 font-black">{section.heading || "Untitled section"}</h3>
                  <p className="text-muted mt-2 whitespace-pre-wrap text-sm leading-6">{section.content}</p>
                </article>
              ))}
            </div>
          </details>
        ))}
      </section>

      <button className="btn border-ember bg-ember/15 text-ember" type="button" onClick={async () => {
        if (!window.confirm("Delete this booklet, chapters, and sections?")) return;
        await onDelete();
      }}>Delete booklet</button>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-muted border-app min-w-0 border p-3">
      <dt className="text-soft text-xs font-bold uppercase tracking-[0.12em]">{label}</dt>
      <dd className="text-app mt-1 break-words text-sm font-semibold">{value || "Not set"}</dd>
    </div>
  );
}
