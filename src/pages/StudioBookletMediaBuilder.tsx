import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import {
  deleteBookletMedia,
  getBookletContent,
  listBookletMedia,
  saveLocalBookletMedia,
  uploadBookletMedia,
} from "../lib/bookletFoundationRepository";
import { isFirebaseConfigured } from "../lib/firebase";
import type { EotBooklet, EotBookletChapter, EotBookletMedia, EotBookletSection } from "../types";

export default function StudioBookletMediaBuilder() {
  const { bookletId } = useParams();
  const [booklet, setBooklet] = useState<EotBooklet | null>(null);
  const [chapters, setChapters] = useState<EotBookletChapter[]>([]);
  const [sections, setSections] = useState<EotBookletSection[]>([]);
  const [media, setMedia] = useState<EotBookletMedia[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    if (!bookletId) return;
    setLoading(true);
    const [content, mediaRows] = await Promise.all([getBookletContent(bookletId), listBookletMedia(bookletId)]);
    setBooklet(content.booklet);
    setChapters(content.chapters);
    setSections(content.sections);
    setMedia(mediaRows);
    setSelectedChapterId((current) => current || content.chapters[0]?.id || "");
    setLoading(false);
  }

  useEffect(() => {
    load().catch((err) => {
      setError(err instanceof Error ? err.message : "Could not load booklet media.");
      setLoading(false);
    });
  }, [bookletId]);

  const chapterSections = useMemo(() => sections.filter((section) => section.chapterId === selectedChapterId), [sections, selectedChapterId]);
  const chapterTitle = useMemo(() => Object.fromEntries(chapters.map((chapter) => [chapter.id, `${chapter.chapterNumber}. ${chapter.title}`])), [chapters]);
  const sectionTitle = useMemo(() => Object.fromEntries(sections.map((section) => [section.id, `${section.sectionNumber}. ${section.heading || "Untitled section"}`])), [sections]);

  async function submit(formData: FormData, form: HTMLFormElement) {
    if (!bookletId) return;
    const file = (formData.get("imageFile") as File | null) ?? null;
    const imageUrl = String(formData.get("imageUrl") ?? "").trim();
    const input = {
      bookletId,
      chapterId: String(formData.get("chapterId") ?? "").trim(),
      sectionId: String(formData.get("sectionId") ?? "").trim(),
      mediaType: String(formData.get("mediaType") ?? "image") as EotBookletMedia["mediaType"],
      title: String(formData.get("title") ?? "").trim(),
      caption: String(formData.get("caption") ?? "").trim(),
      credit: String(formData.get("credit") ?? "").trim(),
      altText: String(formData.get("altText") ?? "").trim(),
      imagePrompt: String(formData.get("imagePrompt") ?? "").trim(),
      displayMode: String(formData.get("displayMode") ?? "inline") as EotBookletMedia["displayMode"],
    };
    if (!input.title) throw new Error("Image title is required.");
    if (!input.altText) throw new Error("Alt text is required.");
    if (!input.chapterId && !input.sectionId) throw new Error("Assign the media to a chapter or section.");
    setSaving(true);
    setError("");
    try {
      if (file && file.size > 0) {
        await uploadBookletMedia(file, input);
        setMessage("Media uploaded to Firebase Storage.");
      } else if (imageUrl) {
        await saveLocalBookletMedia({
          ...input,
          downloadUrl: imageUrl,
          imageUrl,
          storagePath: "external-url",
          fileName: imageUrl.split("/").pop() || "external-image",
          contentType: "external/url",
          fileSize: 0,
        });
        setMessage("External media reference saved.");
      } else {
        throw new Error("Choose an image file or provide an image URL.");
      }
      form.reset();
      setSelectedChapterId(chapters[0]?.id || "");
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading booklet media..." />;
  if (!booklet || !bookletId) return <ErrorState title="Booklet not found" message="Open media builder from a saved booklet." />;

  return (
    <section className="page grid gap-5">
      <PageHeader
        eyebrow={booklet.bookletCode}
        title="Illustration & Media Builder"
        subtitle="Upload booklet images and illustrations, then assign them to chapters or sections for reader display."
        actions={[
          { label: "Booklet", to: `/studio/booklets/${booklet.id}` },
          { label: "Cover", to: `/studio/booklets/${booklet.id}/cover` },
          { label: "Preview", to: `/studio/booklets/${booklet.id}/preview`, primary: true },
        ]}
      />

      {!isFirebaseConfigured && (
        <div className="border-app surface-muted border p-3 text-sm font-semibold text-warning">
          Firebase config is missing. File uploads require Firebase Storage; external image URLs can be saved as local draft references.
        </div>
      )}
      {message && <div className="border border-ledger bg-ledger/10 p-3 text-sm font-semibold text-ledger">{message}</div>}
      {error && <div className="border border-ember bg-ember/10 p-3 text-sm font-semibold text-ember">{error}</div>}

      <form className="panel grid gap-3 p-4 md:grid-cols-2" onSubmit={(event) => {
        event.preventDefault();
        submit(new FormData(event.currentTarget), event.currentTarget).catch((err) => setError(err instanceof Error ? err.message : "Could not save media."));
      }}>
        <h2 className="text-app md:col-span-2 text-xl font-black">Upload media</h2>
        <label><span className="label">Media type</span><select className="field" name="mediaType"><option value="cover">Cover</option><option value="image">Image</option><option value="illustration">Illustration</option><option value="diagram">Diagram</option><option value="activity">Activity</option><option value="other">Other</option></select></label>
        <label><span className="label">Display mode</span><select className="field" name="displayMode"><option value="inline">Inline</option><option value="full_width">Full width</option><option value="gallery">Gallery</option><option value="background">Background</option><option value="cover">Cover</option></select></label>
        <label><span className="label">Chapter</span><select className="field" name="chapterId" value={selectedChapterId} onChange={(event) => setSelectedChapterId(event.currentTarget.value)}><option value="">Choose chapter</option>{chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.chapterNumber}. {chapter.title}</option>)}</select></label>
        <label><span className="label">Section</span><select className="field" name="sectionId"><option value="">Chapter-level media</option>{chapterSections.map((section) => <option key={section.id} value={section.id}>{section.sectionNumber}. {section.heading || "Untitled section"}</option>)}</select></label>
        <label><span className="label">Image title</span><input className="field" name="title" required placeholder="Opening illustration" /></label>
        <label><span className="label">Caption</span><input className="field" name="caption" placeholder="Shown below the image in Reader" /></label>
        <label><span className="label">Credit</span><input className="field" name="credit" placeholder="Illustrator, source, or rights note" /></label>
        <label className="md:col-span-2"><span className="label">Alt text</span><input className="field" name="altText" required placeholder="Describe the image for accessibility and offline readers" /></label>
        <label className="md:col-span-2"><span className="label">Image prompt</span><textarea className="field min-h-24" name="imagePrompt" placeholder="Optional generation or illustration direction" /></label>
        <label><span className="label">Upload image</span><input className="field" name="imageFile" type="file" accept="image/*" disabled={saving || !isFirebaseConfigured} /></label>
        <label><span className="label">External image URL</span><input className="field" name="imageUrl" placeholder="Optional fallback when Storage is not configured" /></label>
        <button className="btn btn-primary md:col-span-2" type="submit" disabled={saving || chapters.length === 0}>{saving ? "Saving..." : "Save Media"}</button>
      </form>

      <section className="panel divide-y divide-white/10">
        <div className="p-4">
          <h2 className="text-app text-xl font-black">Booklet media library</h2>
          <p className="text-muted mt-2 text-sm leading-6">{media.length} images and illustrations assigned to this booklet.</p>
        </div>
        {media.length === 0 && <div className="p-4"><EmptyState title="No media yet" message="Upload images or illustrations and assign them to chapters or sections." /></div>}
        {media.map((item) => (
          <article key={item.id} className="grid gap-3 p-4 lg:grid-cols-[9rem_1fr_auto] lg:items-center">
            <div className="surface-muted border-app aspect-[4/3] overflow-hidden border">
              <img className="h-full w-full object-cover" src={item.downloadUrl || item.imageUrl || ""} alt={item.altText} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <span className="status-badge border-signal text-signal">{item.mediaType}</span>
                <span className="status-badge border-app text-muted">{item.sectionId ? "Section" : "Chapter"}</span>
              </div>
              <h3 className="text-app mt-2 text-lg font-black">{item.title}</h3>
              <p className="text-muted mt-1 text-sm leading-6">{item.caption || item.altText}</p>
              <p className="text-soft mt-1 break-words text-xs font-semibold uppercase tracking-[0.12em]">
                {chapterTitle[item.chapterId ?? ""] || "No chapter"}{item.sectionId ? ` / ${sectionTitle[item.sectionId]}` : ""}{item.credit || item.credits ? ` / ${item.credit || item.credits}` : ""}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:min-w-36 lg:grid-cols-1">
              <a className="btn" href={item.downloadUrl || item.imageUrl || ""} target="_blank" rel="noreferrer">Open</a>
              <button className="btn border-ember bg-ember/10 text-ember" type="button" onClick={async () => {
                if (!window.confirm("Remove this media record from the booklet?")) return;
                await deleteBookletMedia(item.id);
                setMessage("Media record removed.");
                await load();
              }}>Remove</button>
            </div>
          </article>
        ))}
      </section>
    </section>
  );
}
