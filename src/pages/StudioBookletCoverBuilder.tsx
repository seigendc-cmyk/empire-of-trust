import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/States";
import {
  getBooklet,
  listBookletCoverImages,
  saveBookletCoverDetails,
  uploadBookletCoverImage,
  uploadGeneratedBookletCover,
} from "../lib/bookletFoundationRepository";
import { isFirebaseConfigured } from "../lib/firebase";
import type { EotBooklet, EotBookletCoverImage, EotBookletCoverImageKind } from "../types";

type CoverForm = Pick<EotBooklet, "title" | "subtitle" | "author" | "publisher" | "tagline" | "edition" | "publicationDate" | "description" | "coverImageUrl" | "backCoverImageUrl" | "bannerImageUrl" | "libraryThumbnailUrl">;

const imageLabels: Record<EotBookletCoverImageKind, string> = {
  front_cover: "Cover Image",
  back_cover: "Back Cover Image",
  banner: "Banner Image",
  library_thumbnail: "Library Thumbnail",
};

export default function StudioBookletCoverBuilder() {
  const { bookletId } = useParams();
  const [booklet, setBooklet] = useState<EotBooklet | null>(null);
  const [metadata, setMetadata] = useState<EotBookletCoverImage[]>([]);
  const [form, setForm] = useState<CoverForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    if (!bookletId) return;
    setLoading(true);
    const [bookletRecord, coverImages] = await Promise.all([getBooklet(bookletId), listBookletCoverImages(bookletId)]);
    setBooklet(bookletRecord);
    setMetadata(coverImages);
    if (bookletRecord) setForm(formFromBooklet(bookletRecord));
    setLoading(false);
  }

  useEffect(() => {
    load().catch((err) => {
      setError(err instanceof Error ? err.message : "Could not load cover builder.");
      setLoading(false);
    });
  }, [bookletId]);

  const draftBooklet = useMemo(() => (booklet && form ? { ...booklet, ...form } : null), [booklet, form]);

  async function saveDetails(nextForm = form) {
    if (!bookletId || !nextForm) return;
    await saveBookletCoverDetails(bookletId, nextForm);
    setMessage("Cover details saved.");
  }

  async function uploadImage(imageKind: EotBookletCoverImageKind, file: File | undefined) {
    if (!bookletId || !file) return;
    setWorking(imageKind);
    setError("");
    try {
      await saveDetails();
      await uploadBookletCoverImage(bookletId, file, imageKind);
      setMessage(`${imageLabels[imageKind]} uploaded to Firebase Storage.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload image.");
    } finally {
      setWorking("");
    }
  }

  async function generateCover(imageKind: EotBookletCoverImageKind) {
    if (!draftBooklet) return;
    setWorking(`generate-${imageKind}`);
    setError("");
    try {
      await saveDetails();
      await uploadGeneratedBookletCover(draftBooklet, imageKind);
      setMessage(`${imageLabels[imageKind]} generated and stored in Firebase Storage.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate cover asset.");
    } finally {
      setWorking("");
    }
  }

  function updateField(field: keyof CoverForm, value: string) {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  }

  if (loading) return <LoadingState label="Loading cover builder..." />;
  if (!booklet || !form || !draftBooklet) return <ErrorState title="Booklet not found" message="Create or select a saved booklet before building cover assets." />;

  return (
    <section className="page grid gap-5">
      <PageHeader
        eyebrow={booklet.bookletCode}
        title="Booklet Cover Builder"
        subtitle="Create front cover, back cover, banner, and Library thumbnail assets for an independent booklet."
        actions={[
          { label: "Booklet", to: `/studio/booklets/${booklet.id}` },
          { label: "Manuscript", to: `/studio/booklets/${booklet.id}/import-manuscript` },
          { label: "Build Pack", to: `/studio/booklets/${booklet.id}/build-pack`, primary: true },
        ]}
      />

      {!isFirebaseConfigured && (
        <div className="border-app surface-muted border p-3 text-sm font-semibold text-warning">
          Firebase config is missing. Cover details can be saved locally, but Storage uploads and generated cover files require Firebase.
        </div>
      )}
      {message && <div className="border border-ledger bg-ledger/10 p-3 text-sm font-semibold text-ledger">{message}</div>}
      {error && <div className="border border-ember bg-ember/10 p-3 text-sm font-semibold text-ember">{error}</div>}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,34rem)]">
        <form className="panel grid gap-3 p-4 md:grid-cols-2" onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          try {
            await saveDetails();
            await load();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save cover details.");
          }
        }}>
          <h2 className="text-app md:col-span-2 text-xl font-black">Cover details</h2>
          <label><span className="label">Title</span><input className="field" value={form.title} onChange={(event) => updateField("title", event.currentTarget.value)} /></label>
          <label><span className="label">Subtitle</span><input className="field" value={form.subtitle} onChange={(event) => updateField("subtitle", event.currentTarget.value)} /></label>
          <label><span className="label">Author</span><input className="field" value={form.author} onChange={(event) => updateField("author", event.currentTarget.value)} /></label>
          <label><span className="label">Publisher</span><input className="field" value={form.publisher} onChange={(event) => updateField("publisher", event.currentTarget.value)} /></label>
          <label><span className="label">Tagline</span><input className="field" value={form.tagline} onChange={(event) => updateField("tagline", event.currentTarget.value)} placeholder="A practical guide for..." /></label>
          <label><span className="label">Edition</span><input className="field" value={form.edition} onChange={(event) => updateField("edition", event.currentTarget.value)} placeholder="First edition" /></label>
          <label><span className="label">Publication date</span><input className="field" type="date" value={form.publicationDate} onChange={(event) => updateField("publicationDate", event.currentTarget.value)} /></label>
          <label className="md:col-span-2"><span className="label">Back cover description</span><textarea className="field min-h-28" value={form.description} onChange={(event) => updateField("description", event.currentTarget.value)} /></label>
          <label><span className="label">Cover image URL</span><input className="field" value={form.coverImageUrl} onChange={(event) => updateField("coverImageUrl", event.currentTarget.value)} /></label>
          <label><span className="label">Back cover image URL</span><input className="field" value={form.backCoverImageUrl} onChange={(event) => updateField("backCoverImageUrl", event.currentTarget.value)} /></label>
          <label><span className="label">Banner image URL</span><input className="field" value={form.bannerImageUrl} onChange={(event) => updateField("bannerImageUrl", event.currentTarget.value)} /></label>
          <label><span className="label">Library thumbnail URL</span><input className="field" value={form.libraryThumbnailUrl} onChange={(event) => updateField("libraryThumbnailUrl", event.currentTarget.value)} /></label>
          <button className="btn btn-primary md:col-span-2" type="submit">Save Cover Details</button>
        </form>

        <aside className="panel grid gap-3 p-4">
          <h2 className="text-app text-xl font-black">Firebase Storage images</h2>
          {(["front_cover", "back_cover", "banner", "library_thumbnail"] as EotBookletCoverImageKind[]).map((kind) => (
            <div key={kind} className="surface-muted border-app grid gap-2 border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-app text-sm font-black">{imageLabels[kind]}</p>
                <button className="btn text-xs" type="button" disabled={Boolean(working)} onClick={() => generateCover(kind)}>
                  {working === `generate-${kind}` ? "Generating..." : `Generate ${shortLabel(kind)}`}
                </button>
              </div>
              <input className="field" type="file" accept="image/*" disabled={Boolean(working)} onChange={(event) => void uploadImage(kind, event.currentTarget.files?.[0])} />
            </div>
          ))}
        </aside>
      </section>

      <section className="grid gap-4">
        <div>
          <h2 className="text-app text-xl font-black">Live preview</h2>
          <p className="text-muted mt-2 text-sm leading-6">Preview updates as cover details and image URLs change.</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_18rem]">
          <CoverPreview kind="front" booklet={draftBooklet} imageUrl={form.coverImageUrl} />
          <CoverPreview kind="back" booklet={draftBooklet} imageUrl={form.backCoverImageUrl} />
          <CoverPreview kind="thumbnail" booklet={draftBooklet} imageUrl={form.libraryThumbnailUrl || form.coverImageUrl} />
        </div>
      </section>

      <section className="panel divide-y divide-white/10">
        <div className="p-4">
          <h2 className="text-app text-xl font-black">Stored image metadata</h2>
          <p className="text-muted mt-2 text-sm leading-6">Uploaded and generated files are tracked in Firestore collection eotBookletCoverImages.</p>
        </div>
        {metadata.length === 0 && <p className="text-muted p-4 text-sm">No Storage-backed cover images yet.</p>}
        {metadata.map((image) => (
          <article key={image.id} className="grid gap-3 p-4 lg:grid-cols-[8rem_1fr_auto] lg:items-center">
            <div className="surface-muted border-app aspect-[4/3] overflow-hidden border">
              <img className="h-full w-full object-cover" src={image.imageUrl} alt="" />
            </div>
            <div className="min-w-0">
              <p className="text-app font-black">{imageLabels[image.imageKind]}</p>
              <p className="text-muted mt-1 break-all text-sm">{image.storagePath}</p>
              <p className="text-soft mt-1 text-xs font-semibold uppercase tracking-[0.12em]">{image.source} / {image.contentType} / {Math.max(1, Math.round(image.fileSize / 1024))} KB</p>
            </div>
            <a className="btn" href={image.imageUrl} target="_blank" rel="noreferrer">Open</a>
          </article>
        ))}
      </section>
    </section>
  );
}

function formFromBooklet(booklet: EotBooklet): CoverForm {
  return {
    title: booklet.title ?? "",
    subtitle: booklet.subtitle ?? "",
    author: booklet.author ?? "",
    publisher: booklet.publisher ?? "",
    tagline: booklet.tagline ?? "",
    edition: booklet.edition ?? "",
    publicationDate: booklet.publicationDate ?? "",
    description: booklet.description ?? "",
    coverImageUrl: booklet.coverImageUrl ?? "",
    backCoverImageUrl: booklet.backCoverImageUrl ?? "",
    bannerImageUrl: booklet.bannerImageUrl ?? "",
    libraryThumbnailUrl: booklet.libraryThumbnailUrl ?? "",
  };
}

function shortLabel(kind: EotBookletCoverImageKind) {
  if (kind === "front_cover") return "Front Cover";
  if (kind === "back_cover") return "Back Cover";
  if (kind === "library_thumbnail") return "Thumbnail";
  return "Banner";
}

function CoverPreview({ kind, booklet, imageUrl }: { kind: "front" | "back" | "thumbnail"; booklet: EotBooklet; imageUrl: string }) {
  const isBack = kind === "back";
  const isThumbnail = kind === "thumbnail";
  return (
    <article className={`panel overflow-hidden ${isThumbnail ? "max-w-sm" : ""}`}>
      <div
        className={`grid ${isThumbnail ? "aspect-[3/4]" : "min-h-[34rem]"} content-between bg-cover bg-center p-5`}
        style={imageUrl ? { backgroundImage: `linear-gradient(180deg, rgba(247,245,239,0.86), rgba(247,245,239,0.94)), url(${imageUrl})` } : undefined}
      >
        <div>
          <p className="text-accent text-xs font-black uppercase tracking-[0.16em]">{isBack ? "Back Cover" : isThumbnail ? "Library Thumbnail" : booklet.publisher || "Booklet Studio"}</p>
          <h2 className={`${isThumbnail ? "text-2xl" : "text-4xl"} text-app mt-5 font-black leading-tight`}>{isBack ? "About this booklet" : booklet.title || "Untitled Booklet"}</h2>
          {!isBack && <p className="text-muted mt-3 text-lg font-semibold leading-7">{booklet.subtitle}</p>}
          {isBack && <p className="text-muted mt-5 whitespace-pre-wrap text-sm leading-7">{booklet.description || booklet.tagline || "Add the back cover description in the form."}</p>}
        </div>
        <div className="border-t border-[#b89445] pt-4">
          <p className="text-app text-sm font-black">{isBack ? booklet.publisher : booklet.author}</p>
          <p className="text-soft mt-1 text-xs font-semibold uppercase tracking-[0.12em]">{[booklet.tagline, booklet.edition, booklet.publicationDate].filter(Boolean).join(" / ")}</p>
        </div>
      </div>
    </article>
  );
}
