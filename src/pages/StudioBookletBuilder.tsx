import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import {
  extrasInputFromForm,
  getLibraryContent,
  importManuscriptIntoBooklet,
  listLibraryBooklets,
  splitBookletManuscript,
  uploadLibraryBookletMedia,
  upsertLibraryBookletExtras,
} from "../lib/libraryRepository";
import type { LibraryBooklet, LibraryBookletExtras, LibraryChapter, LibrarySection } from "../types";

type View = "list" | "manuscript" | "chapters" | "media" | "quizzes" | "whatsapp";

const sampleImages = `[{"id":"cover-1","label":"Cover","imageUrl":"","altText":"Booklet cover","prompt":"Warm professional booklet cover"}]`;
const sampleQuiz = `[{"id":"quiz-1","scope":"booklet","title":"Booklet check","passScore":70,"questions":[{"id":"q1","question":"What is the main lesson?","options":["A","B","C"],"answer":"A","explanation":"Explain the correct answer."}]}]`;
const sampleWhatsapp = `[{"id":"wa-1","scope":"booklet","prompt":"What did you learn from this booklet?","responseTemplate":"Hi, I read {{title}} and my answer is..."}]`;

export default function StudioBookletBuilder({ view = "list" }: { view?: View }) {
  const { bookletId } = useParams();
  const [booklets, setBooklets] = useState<LibraryBooklet[]>([]);
  const [booklet, setBooklet] = useState<LibraryBooklet | null>(null);
  const [chapters, setChapters] = useState<LibraryChapter[]>([]);
  const [sections, setSections] = useState<LibrarySection[]>([]);
  const [extras, setExtras] = useState<LibraryBookletExtras | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    if (bookletId) {
      const content = await getLibraryContent(bookletId);
      setBooklet(content.booklet);
      setChapters(content.chapters);
      setSections(content.sections);
      setExtras(content.extras);
    } else {
      setBooklets(await listLibraryBooklets());
    }
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [bookletId]);

  const nav = booklet ? [
    { label: "Edit", to: `/studio/booklets/${booklet.id}/edit` },
    { label: "Cover", to: `/studio/booklets/${booklet.id}/cover` },
    { label: "Manuscript", to: `/studio/booklets/${booklet.id}/manuscript` },
    { label: "Chapters", to: `/studio/booklets/${booklet.id}/chapters` },
    { label: "Media", to: `/studio/booklets/${booklet.id}/media` },
    { label: "Quizzes", to: `/studio/booklets/${booklet.id}/quizzes` },
    { label: "WhatsApp", to: `/studio/booklets/${booklet.id}/whatsapp` },
    { label: "Build Pack", to: `/studio/booklets/${booklet.id}/build-pack`, primary: true },
  ] : [];

  if (loading) return <LoadingState label="Loading booklet builder..." />;
  if (!bookletId && view === "list") return <BookletList booklets={booklets} />;
  if (bookletId && !booklet) return <ErrorState title="Booklet not found" message="Create or select an independent booklet first." />;
  if (!booklet || !extras) return <ErrorState title="Booklet required" message="Open this tool from a saved booklet." />;

  return (
    <section className="page grid gap-5">
      <PageHeader
        eyebrow="Booklet Builder"
        title={titleFor(view)}
        subtitle={`${booklet.title} remains separate from EOT episodes and exports as packType library_booklet.`}
        actions={nav}
      />
      {message && <div className="border border-ledger bg-ledger/10 p-3 text-sm font-semibold text-ledger">{message}</div>}
      {error && <div className="border border-ember bg-ember/10 p-3 text-sm font-semibold text-ember">{error}</div>}
      {view === "manuscript" && <ManuscriptPanel bookletId={booklet.id} extras={extras} onSaved={async (msg) => { setMessage(msg); await load(); }} onError={setError} />}
      {view === "chapters" && <ChaptersPanel chapters={chapters} sections={sections} />}
      {view === "media" && <ExtrasJsonPanel title="Images and illustrations" bookletId={booklet.id} extras={extras} fields={["images", "illustrations", "metadata", "settings"]} onSaved={async () => { setMessage("Media and metadata saved."); await load(); }} />}
      {view === "quizzes" && <ExtrasJsonPanel title="Chapter and booklet quizzes" bookletId={booklet.id} extras={extras} fields={["quizzes"]} onSaved={async () => { setMessage("Quiz data saved."); await load(); }} />}
      {view === "whatsapp" && <ExtrasJsonPanel title="WhatsApp response prompts" bookletId={booklet.id} extras={extras} fields={["whatsappPrompts"]} onSaved={async () => { setMessage("WhatsApp prompts saved."); await load(); }} />}
    </section>
  );
}

function BookletList({ booklets }: { booklets: LibraryBooklet[] }) {
  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow="Booklet Builder"
        title="Deployable booklet packs"
        subtitle="Build independent booklet JSON packs for Library import and offline reading."
        actions={[{ label: "New Booklet", to: "/studio/booklets/new", primary: true }, { label: "Reader Library", to: "/library" }]}
      />
      <section className="panel divide-y divide-white/10">
        {booklets.length === 0 && <div className="p-4"><EmptyState title="No booklets" message="Create the first independent booklet, paste a manuscript, then compile a JSON pack." actionLabel="New booklet" actionTo="/studio/booklets/new" /></div>}
        {booklets.map((booklet) => (
          <article key={booklet.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <span className="status-badge border-signal text-signal">library_booklet</span>
                <span className="status-badge border-white/15 text-muted">Not EOT story</span>
                <span className="status-badge border-ledger text-ledger">{booklet.status}</span>
              </div>
              <h2 className="text-app mt-2 text-xl font-black">{booklet.title}</h2>
              <p className="text-muted mt-2 text-sm leading-6">{booklet.description || booklet.subtitle}</p>
              <p className="text-soft mt-1 break-all text-xs font-semibold uppercase tracking-[0.12em]">{booklet.bookletCode} / {booklet.category}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[28rem]">
              <Link className="btn" to={`/studio/booklets/${booklet.id}/cover`}>Cover</Link>
              <Link className="btn" to={`/studio/booklets/${booklet.id}/manuscript`}>Manuscript</Link>
              <Link className="btn" to={`/studio/booklets/${booklet.id}/media`}>Media</Link>
              <Link className="btn" to={`/studio/booklets/${booklet.id}/quizzes`}>Quizzes</Link>
              <Link className="btn" to={`/studio/booklets/${booklet.id}/whatsapp`}>WhatsApp</Link>
              <Link className="btn btn-primary" to={`/studio/booklets/${booklet.id}/build-pack`}>Build JSON</Link>
            </div>
          </article>
        ))}
      </section>
    </section>
  );
}

function ManuscriptPanel({ bookletId, extras, onSaved, onError }: { bookletId: string; extras: LibraryBookletExtras; onSaved: (message: string) => void; onError: (message: string) => void }) {
  const [manuscript, setManuscript] = useState(extras.manuscript);
  const preview = useMemo(() => splitBookletManuscript(manuscript), [manuscript]);
  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_24rem]">
      <form className="panel grid gap-3 p-4" onSubmit={async (event) => {
        event.preventDefault();
        try {
          await upsertLibraryBookletExtras({ bookletId, manuscript });
          onSaved("Manuscript saved.");
        } catch (err) {
          onError(err instanceof Error ? err.message : "Could not save manuscript.");
        }
      }}>
        <label><span className="label">Paste ChatGPT-created manuscript</span><textarea className="field min-h-[55vh]" value={manuscript} onChange={(event) => setManuscript(event.currentTarget.value)} placeholder="Chapter 1: Title&#10;&#10;SECTION HEADER&#10;Body text..." /></label>
        <div className="grid gap-2 sm:grid-cols-2">
          <button className="btn" type="submit">Save Manuscript</button>
          <button className="btn btn-primary" type="button" disabled={!manuscript.trim()} onClick={async () => {
            try {
              const result = await importManuscriptIntoBooklet(bookletId, manuscript);
              onSaved(`Imported ${result.chapters.length} chapters and ${result.sections.length} sections.`);
            } catch (err) {
              onError(err instanceof Error ? err.message : "Could not split manuscript.");
            }
          }}>Split Into Chapters</button>
        </div>
      </form>
      <aside className="panel p-4">
        <h2 className="text-app text-lg font-black">Split preview</h2>
        <p className="text-muted mt-2 text-sm leading-6">{preview.length} chapters detected. Headers become sections.</p>
        <div className="mt-4 grid gap-3">
          {preview.slice(0, 8).map((chapter, index) => (
            <div key={`${chapter.title}-${index}`} className="surface-muted border-app border p-3">
              <p className="text-accent text-xs font-bold uppercase tracking-[0.12em]">Chapter {index + 1}</p>
              <h3 className="text-app mt-1 font-black">{chapter.title}</h3>
              <p className="text-muted mt-1 text-xs">{chapter.sections.length} sections</p>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}

function ChaptersPanel({ chapters, sections }: { chapters: LibraryChapter[]; sections: LibrarySection[] }) {
  return (
    <section className="panel divide-y divide-white/10">
      {chapters.length === 0 && <div className="p-4"><EmptyState title="No chapters yet" message="Use the manuscript splitter or the cover editor to add booklet chapters." /></div>}
      {chapters.map((chapter) => (
        <details key={chapter.id} className="p-4" open>
          <summary className="text-app cursor-pointer text-lg font-black">{chapter.chapterNumber}. {chapter.title}</summary>
          <p className="text-muted mt-2 text-sm leading-6">{chapter.intro}</p>
          <div className="mt-3 grid gap-2">
            {sections.filter((section) => section.chapterId === chapter.id).map((section) => (
              <article key={section.id} className="surface-muted border-app border p-3">
                <p className="text-accent text-xs font-bold uppercase tracking-[0.14em]">Section {section.sectionNumber}</p>
                <h3 className="text-app mt-1 font-black">{section.heading || "Untitled section"}</h3>
                <p className="text-muted mt-2 line-clamp-3 text-sm leading-6">{section.body}</p>
              </article>
            ))}
          </div>
        </details>
      ))}
    </section>
  );
}

function ExtrasJsonPanel({ title, bookletId, extras, fields, onSaved }: { title: string; bookletId: string; extras: LibraryBookletExtras; fields: string[]; onSaved: () => void }) {
  const [uploading, setUploading] = useState("");
  const [uploadError, setUploadError] = useState("");
  return (
    <form className="panel grid gap-4 p-4" onSubmit={async (event) => {
      event.preventDefault();
      await upsertLibraryBookletExtras(extrasInputFromForm(new FormData(event.currentTarget), bookletId));
      onSaved();
    }}>
      <h2 className="text-app text-xl font-black">{title}</h2>
      {fields.includes("images") && (
        <section className="surface-muted border-app grid gap-3 border p-3 sm:grid-cols-2">
          <label><span className="label">Upload image to Firebase Storage</span><input className="field" type="file" accept="image/*" disabled={Boolean(uploading)} onChange={async (event) => {
            const file = event.currentTarget.files?.[0];
            if (!file) return;
            setUploading("image");
            setUploadError("");
            try {
              const uploaded = await uploadLibraryBookletMedia(bookletId, file, "image");
              await upsertLibraryBookletExtras({ bookletId, images: [...extras.images, { id: `image-${Date.now()}`, label: file.name, imageUrl: uploaded.url, altText: file.name }] });
              onSaved();
            } catch (err) {
              setUploadError(err instanceof Error ? err.message : "Could not upload image.");
            } finally {
              setUploading("");
            }
          }} /></label>
          <label><span className="label">Upload illustration to Firebase Storage</span><input className="field" type="file" accept="image/*" disabled={Boolean(uploading)} onChange={async (event) => {
            const file = event.currentTarget.files?.[0];
            if (!file) return;
            setUploading("illustration");
            setUploadError("");
            try {
              const uploaded = await uploadLibraryBookletMedia(bookletId, file, "illustration");
              await upsertLibraryBookletExtras({ bookletId, illustrations: [...extras.illustrations, { id: `illustration-${Date.now()}`, label: file.name, imageUrl: uploaded.url, altText: file.name }] });
              onSaved();
            } catch (err) {
              setUploadError(err instanceof Error ? err.message : "Could not upload illustration.");
            } finally {
              setUploading("");
            }
          }} /></label>
          {uploading && <p className="text-muted text-sm font-semibold">Uploading {uploading}...</p>}
          {uploadError && <p className="text-danger text-sm font-semibold">{uploadError}</p>}
        </section>
      )}
      {fields.includes("images") && <label><span className="label">Images JSON</span><textarea className="field min-h-36 font-mono text-xs" name="imagesJson" defaultValue={JSON.stringify(extras.images.length ? extras.images : JSON.parse(sampleImages), null, 2)} /></label>}
      {fields.includes("illustrations") && <label><span className="label">Illustrations JSON</span><textarea className="field min-h-36 font-mono text-xs" name="illustrationsJson" defaultValue={JSON.stringify(extras.illustrations, null, 2)} /></label>}
      {fields.includes("quizzes") && <label><span className="label">Quizzes JSON</span><textarea className="field min-h-[45vh] font-mono text-xs" name="quizzesJson" defaultValue={JSON.stringify(extras.quizzes.length ? extras.quizzes : JSON.parse(sampleQuiz), null, 2)} /></label>}
      {fields.includes("whatsappPrompts") && <label><span className="label">WhatsApp prompts JSON</span><textarea className="field min-h-[45vh] font-mono text-xs" name="whatsappPromptsJson" defaultValue={JSON.stringify(extras.whatsappPrompts.length ? extras.whatsappPrompts : JSON.parse(sampleWhatsapp), null, 2)} /></label>}
      {fields.includes("metadata") && <label><span className="label">Metadata JSON</span><textarea className="field min-h-28 font-mono text-xs" name="metadataJson" defaultValue={JSON.stringify(extras.metadata, null, 2)} /></label>}
      {fields.includes("settings") && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label><span className="label">Font scale</span><select className="field" name="fontScale" defaultValue={extras.readingSettings.fontScale}><option value="standard">Standard</option><option value="large">Large</option></select></label>
          <label><span className="label">Estimated minutes</span><input className="field" name="estimatedMinutes" type="number" defaultValue={extras.readingSettings.estimatedMinutes} /></label>
          <label className="flex items-center gap-2 text-sm font-semibold"><input name="allowOffline" type="checkbox" defaultChecked={extras.readingSettings.allowOffline} /> Available offline</label>
          <label className="flex items-center gap-2 text-sm font-semibold"><input name="showImages" type="checkbox" defaultChecked={extras.readingSettings.showImages} /> Show images</label>
        </div>
      )}
      <button className="btn btn-primary" type="submit">Save Builder Data</button>
    </form>
  );
}

function titleFor(view: View) {
  if (view === "manuscript") return "Manuscript import";
  if (view === "chapters") return "Chapters and sections";
  if (view === "media") return "Cover media and illustrations";
  if (view === "quizzes") return "Booklet quizzes";
  if (view === "whatsapp") return "WhatsApp response prompts";
  return "Booklet Builder";
}
