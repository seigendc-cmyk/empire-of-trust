import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, LoadingState } from "../components/States";
import { buildBookPack, bookInputFromForm, downloadBookPack, listBooks, saveBookPackMetadata, upsertBook, validateBookInput } from "../lib/bookRepository";
import { listEpisodes } from "../lib/firestore";
import type { BookPack, EotBook, Episode } from "../types";

export default function BookLibrary() {
  const [books, setBooks] = useState<EotBook[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [editing, setEditing] = useState<EotBook | null>(null);
  const [version, setVersion] = useState("1.0.0");
  const [pack, setPack] = useState<BookPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const [bookRows, episodeRows] = await Promise.all([listBooks(), listEpisodes()]);
    setBooks(bookRows);
    setEpisodes(episodeRows);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveBook(formData: FormData) {
    const input = bookInputFromForm(formData);
    const errors = validateBookInput(input);
    if (errors.length) {
      setMessage(errors.join(" "));
      return;
    }
    await upsertBook(input);
    setEditing(null);
    setMessage("Book saved.");
    await load();
  }

  async function compile(book: EotBook) {
    setWorkingId(book.id);
    setMessage("");
    try {
      const nextPack = await buildBookPack(book, version);
      setPack(nextPack);
      await saveBookPackMetadata(nextPack);
      setMessage(`${book.title} compiled as ${nextPack.manifest.packId}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not compile book.");
    } finally {
      setWorkingId("");
    }
  }

  if (loading) return <LoadingState label="Loading book library..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Library" title="Book Library" subtitle="Add books, collect episode content into book packs, and export deployable data packs." actions={[{ label: "Episodes", to: "/studio/episodes" }, { label: "Packs", to: "/packs" }]} />
      {message && <p className="border border-signal bg-signal/10 p-3 text-sm font-bold text-signal">{message}</p>}

      <form className="panel grid gap-3 p-4 md:grid-cols-2" onSubmit={(event) => {
        event.preventDefault();
        saveBook(new FormData(event.currentTarget));
        if (!editing) event.currentTarget.reset();
      }}>
        <input type="hidden" name="id" value={editing?.id ?? ""} />
        <h2 className="text-xl font-black md:col-span-2">{editing ? "Edit book" : "Add book"}</h2>
        <label><span className="label">Title</span><input className="field" name="title" required defaultValue={editing?.title ?? ""} /></label>
        <label><span className="label">Slug</span><input className="field" name="slug" defaultValue={editing?.slug ?? ""} placeholder="auto-from-title" /></label>
        <label><span className="label">Subtitle</span><input className="field" name="subtitle" defaultValue={editing?.subtitle ?? ""} /></label>
        <label><span className="label">Author</span><input className="field" name="author" required defaultValue={editing?.author ?? "Empire of Trust Studio"} /></label>
        <label><span className="label">Language</span><input className="field" name="language" defaultValue={editing?.language ?? "en"} /></label>
        <label><span className="label">Required licence plan</span><input className="field" name="requiredLicencePlan" defaultValue={editing?.requiredLicencePlan ?? "reader"} /></label>
        <label><span className="label">Status</span><select className="field" name="status" defaultValue={editing?.status ?? "draft"}><option value="draft">Draft</option><option value="review">Review</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
        <label><span className="label">Sort order</span><input className="field" name="sortOrder" type="number" defaultValue={editing?.sortOrder ?? 0} /></label>
        <label className="md:col-span-2"><span className="label">Cover image URL</span><input className="field" name="coverImageUrl" defaultValue={editing?.coverImageUrl ?? ""} /></label>
        <label className="md:col-span-2"><span className="label">Synopsis</span><textarea className="field min-h-24" name="synopsis" defaultValue={editing?.synopsis ?? ""} /></label>
        <label className="md:col-span-2">
          <span className="label">Episode IDs</span>
          <textarea className="field min-h-28" name="episodeIds" defaultValue={editing?.episodeIds.join("\n") ?? ""} placeholder="One episode ID per line" />
        </label>
        <div className="grid gap-2 md:col-span-2 sm:flex">
          <button className="btn btn-primary" type="submit">{editing ? "Save changes" : "Save book"}</button>
          {editing && <button className="btn" type="button" onClick={() => setEditing(null)}>Cancel edit</button>}
        </div>
      </form>

      <section className="panel p-4">
        <h2 className="text-xl font-black">Available episode IDs</h2>
        {episodes.length === 0 ? <p className="mt-2 text-sm text-paper/60">No episodes yet.</p> : (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {episodes.map((episode) => <p key={episode.id} className="border border-white/10 bg-black/20 p-2 text-xs"><span className="font-bold text-signal">{episode.id}</span> / {episode.episodeIdentifier} / {episode.title}</p>)}
          </div>
        )}
      </section>

      <section className="panel divide-y divide-white/10">
        {books.length === 0 ? <div className="p-4"><EmptyState title="No books" message="Add a book and include episode IDs to compile a book pack." /></div> : books.map((book) => (
          <div key={book.id} className="grid gap-4 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{book.slug} / {book.status}</p>
                <h2 className="mt-1 text-xl font-black">{book.title}</h2>
                <p className="mt-2 text-sm leading-6 text-paper/60">{book.synopsis}</p>
                <p className="mt-2 text-xs text-paper/45">{book.episodeIds.length} episodes / {book.requiredLicencePlan}</p>
              </div>
              <div className="grid gap-2 sm:flex">
                <button className="btn" type="button" onClick={() => setEditing(book)}>Edit</button>
                <button className="btn btn-primary" type="button" disabled={workingId === book.id} onClick={() => compile(book)}>{workingId === book.id ? "Compiling..." : "Compile pack"}</button>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="panel grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <label><span className="label">Pack version</span><input className="field" value={version} onChange={(event) => setVersion(event.currentTarget.value)} /></label>
        <button className="btn" type="button" disabled={!pack} onClick={() => pack && downloadBookPack(pack)}>Download book pack</button>
        <button className="btn" type="button" disabled={!pack} onClick={() => pack && navigator.clipboard.writeText(pack.manifest.packId)}>Copy packId</button>
      </section>

      <details className="panel overflow-hidden">
        <summary className="min-h-12 cursor-pointer px-4 py-4 font-black">Book pack preview</summary>
        <pre className="max-h-[65vh] overflow-auto border-t border-white/10 p-4 text-xs leading-5 text-paper/75">{pack ? JSON.stringify(pack, null, 2) : "Compile a book to preview the JSON pack."}</pre>
      </details>
    </section>
  );
}
