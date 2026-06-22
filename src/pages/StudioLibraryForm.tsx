import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/States";
import {
  DEFAULT_LIBRARY_CATEGORIES,
  bookletInputFromForm,
  chapterInputFromForm,
  getLibraryContent,
  sectionInputFromForm,
  upsertLibraryBooklet,
  upsertLibraryChapter,
  upsertLibrarySection,
  validateBookletInput,
} from "../lib/libraryRepository";
import type { LibraryBooklet, LibraryChapter, LibrarySection } from "../types";

export default function StudioLibraryForm() {
  const { bookletId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/studio/booklets") ? "/studio/booklets" : "/studio/library";
  const [booklet, setBooklet] = useState<LibraryBooklet | null>(null);
  const [chapters, setChapters] = useState<LibraryChapter[]>([]);
  const [sections, setSections] = useState<LibrarySection[]>([]);
  const [loading, setLoading] = useState(Boolean(bookletId));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load(id = bookletId) {
    if (!id) return;
    const content = await getLibraryContent(id);
    setBooklet(content.booklet);
    setChapters(content.chapters);
    setSections(content.sections);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [bookletId]);

  async function saveBooklet(formData: FormData) {
    const input = bookletInputFromForm(formData);
    const errors = validateBookletInput(input);
    if (errors.length) {
      setError(errors.join(" "));
      return;
    }
    setError("");
    const id = await upsertLibraryBooklet(input);
    setMessage("Booklet saved.");
    if (!bookletId) navigate(`${basePath}/${id}/edit`);
    else await load(id);
  }

  if (loading) return <LoadingState label="Loading booklet editor..." />;
  if (bookletId && !booklet) return <ErrorState title="Booklet not found" message="The requested independent booklet is not available." />;

  return (
    <section className="page grid gap-5">
      <PageHeader
        eyebrow="Studio Library"
        title={booklet ? "Edit booklet" : "New independent booklet"}
        subtitle="Author non-EOT booklet content with its own chapters, sections, pack, and reader progress."
        actions={[{ label: "Booklets", to: basePath }, ...(booklet ? [{ label: "Manuscript", to: `/studio/booklets/${booklet.id}/manuscript` }, { label: "Preview", to: `${basePath}/${booklet.id}/preview` }, { label: "Build Pack", to: `${basePath}/${booklet.id}/build-pack`, primary: true }] : [])]}
      />
      {message && <div className="border border-ledger bg-ledger/10 p-3 text-sm font-semibold text-ledger">{message}</div>}
      {error && <div className="border border-ember bg-ember/10 p-3 text-sm font-semibold text-ember">{error}</div>}

      <form className="panel grid gap-3 p-4 md:grid-cols-2" onSubmit={(event) => {
        event.preventDefault();
        void saveBooklet(new FormData(event.currentTarget));
      }}>
        <input type="hidden" name="id" value={booklet?.id ?? ""} />
        <label><span className="label">Booklet code</span><input className="field" name="bookletCode" defaultValue={booklet?.bookletCode ?? ""} placeholder="LIB-BOOKLET-001" /></label>
        <label><span className="label">Title</span><input className="field" name="title" required defaultValue={booklet?.title ?? ""} /></label>
        <label><span className="label">Subtitle</span><input className="field" name="subtitle" defaultValue={booklet?.subtitle ?? ""} /></label>
        <label><span className="label">Author</span><input className="field" name="author" required defaultValue={booklet?.author ?? "Empire of Trust Studio"} /></label>
        <label><span className="label">Category</span><select className="field" name="category" defaultValue={booklet?.category ?? "General"}>{DEFAULT_LIBRARY_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
        <label><span className="label">Language</span><input className="field" name="language" defaultValue={booklet?.language ?? "en"} /></label>
        <label><span className="label">Age rating</span><input className="field" name="ageRating" defaultValue={booklet?.ageRating ?? "General"} /></label>
        <label><span className="label">Required licence plan</span><input className="field" name="requiredLicencePlan" defaultValue={booklet?.requiredLicencePlan ?? "free"} /></label>
        <label><span className="label">Status</span><select className="field" name="status" defaultValue={booklet?.status ?? "draft"}><option value="draft">Draft</option><option value="review">Review</option><option value="approved">Approved</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
        <label className="md:col-span-2"><span className="label">Cover image URL</span><input className="field" name="coverImageUrl" defaultValue={booklet?.coverImageUrl ?? ""} /></label>
        <label className="md:col-span-2"><span className="label">Description</span><textarea className="field min-h-28" name="description" defaultValue={booklet?.description ?? ""} /></label>
        <div className="md:col-span-2"><button className="btn btn-primary w-full sm:w-auto" type="submit">Save booklet</button></div>
      </form>

      {booklet && (
        <section className="grid gap-4 xl:grid-cols-2">
          <form className="panel grid gap-3 p-4" onSubmit={async (event) => {
            event.preventDefault();
            await upsertLibraryChapter(chapterInputFromForm(new FormData(event.currentTarget), booklet.id));
            event.currentTarget.reset();
            setMessage("Chapter saved.");
            await load(booklet.id);
          }}>
            <h2 className="text-xl font-black">Add chapter</h2>
            <input type="hidden" name="chapterId" />
            <label><span className="label">Chapter number</span><input className="field" name="chapterNumber" type="number" defaultValue={chapters.length + 1} /></label>
            <label><span className="label">Title</span><input className="field" name="chapterTitle" required /></label>
            <label><span className="label">Intro</span><textarea className="field min-h-24" name="chapterIntro" /></label>
            <button className="btn btn-primary" type="submit">Save chapter</button>
          </form>

          <form className="panel grid gap-3 p-4" onSubmit={async (event) => {
            event.preventDefault();
            await upsertLibrarySection(sectionInputFromForm(new FormData(event.currentTarget), booklet.id));
            event.currentTarget.reset();
            setMessage("Section saved.");
            await load(booklet.id);
          }}>
            <h2 className="text-xl font-black">Add section</h2>
            <input type="hidden" name="sectionId" />
            <label><span className="label">Chapter</span><select className="field" name="sectionChapterId" required>{chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.chapterNumber}. {chapter.title}</option>)}</select></label>
            <label><span className="label">Section number</span><input className="field" name="sectionNumber" type="number" defaultValue={1} /></label>
            <label><span className="label">Heading</span><input className="field" name="sectionHeading" /></label>
            <label><span className="label">Image URL</span><input className="field" name="imageUrl" /></label>
            <label><span className="label">Image prompt</span><textarea className="field min-h-20" name="imagePrompt" /></label>
            <label><span className="label">Body</span><textarea className="field min-h-40" name="sectionBody" /></label>
            <label><span className="label">Interactive links JSON</span><textarea className="field min-h-20" name="interactiveLinksJson" defaultValue="[]" /></label>
            <button className="btn btn-primary" type="submit" disabled={chapters.length === 0}>Save section</button>
          </form>
        </section>
      )}

      {booklet && (
        <section className="panel divide-y divide-white/10">
          {chapters.map((chapter) => (
            <details key={chapter.id} className="p-4">
              <summary className="cursor-pointer font-black">{chapter.chapterNumber}. {chapter.title}</summary>
              <p className="mt-2 text-sm leading-6 text-paper/60">{chapter.intro}</p>
              <div className="mt-3 grid gap-2">
                {sections.filter((section) => section.chapterId === chapter.id).map((section) => (
                  <div key={section.id} className="border border-white/10 bg-black/20 p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-signal">Section {section.sectionNumber}</p>
                    <h3 className="mt-1 font-black">{section.heading || "Untitled section"}</h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-paper/60">{section.body}</p>
                  </div>
                ))}
              </div>
            </details>
          ))}
          {chapters.length === 0 && <div className="p-4 text-sm text-paper/65">Save the booklet, then add chapters and sections.</div>}
        </section>
      )}
    </section>
  );
}
