import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, LoadingState } from "../components/States";
import { getLibraryReadingProgress, listImportedLibraryPacks, listLibraryCatalogue, listLibraryCategories } from "../lib/libraryRepository";
import type { LibraryBookletPack, LibraryCatalogueEntry, LibraryCategory } from "../types";

export default function LibraryCatalogue() {
  const [searchParams] = useSearchParams();
  const [catalogue, setCatalogue] = useState<LibraryCatalogueEntry[]>([]);
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [imported, setImported] = useState<LibraryBookletPack[]>([]);
  const [filter, setFilter] = useState(searchParams.get("category") || "All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listLibraryCatalogue(), listLibraryCategories(), listImportedLibraryPacks()])
      .then(([catalogueRows, categoryRows, importedRows]) => {
        setCatalogue(catalogueRows);
        setCategories(categoryRows);
        setImported(importedRows);
      })
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    const importedEntries = imported.map((pack) => ({
      id: pack.content.booklet.id,
      bookletId: pack.content.booklet.id,
      bookletCode: pack.manifest.bookletCode,
      title: pack.manifest.title,
      subtitle: pack.content.booklet.subtitle,
      author: pack.manifest.author,
      category: pack.manifest.category,
      description: pack.content.booklet.description,
      coverImageUrl: pack.content.booklet.coverImageUrl,
      language: pack.content.booklet.language,
      ageRating: pack.content.booklet.ageRating,
      requiredLicencePlan: pack.manifest.requiredLicencePlan,
      isPartOfEotStory: false as const,
      status: "published" as const,
      updatedAt: pack.manifest.createdAt,
    }));
    const merged = [...catalogue, ...importedEntries].filter((entry, index, list) => list.findIndex((item) => item.bookletId === entry.bookletId) === index);
    return filter === "All" ? merged : merged.filter((entry) => entry.category === filter);
  }, [catalogue, filter, imported]);

  if (loading) return <LoadingState label="Loading independent library..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow="Independent Library"
        title="Booklet catalogue"
        subtitle="Small booklets, guides, short stories, children’s, business, faith, education, community, and promotional packs separate from the EOT story."
        actions={[{ label: "Import", to: "/library/import", primary: true }, { label: "Categories", to: "/library/categories" }]}
      />
      <section className="panel flex gap-2 overflow-x-auto p-3">
        {["All", ...categories.map((category) => category.name)].map((category) => (
          <button key={category} className={`btn shrink-0 ${filter === category ? "btn-primary" : ""}`} type="button" onClick={() => setFilter(category)}>
            {category}
          </button>
        ))}
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((entry) => (
          <LibraryCard key={entry.bookletId} entry={entry} imported={imported.some((pack) => pack.content.booklet.id === entry.bookletId)} />
        ))}
        {rows.length === 0 && (
          <div className="sm:col-span-2 xl:col-span-3">
            <EmptyState title="No library booklets" message="Import a library booklet pack or publish one from Studio Library." actionLabel="Import booklet" actionTo="/library/import" />
          </div>
        )}
      </section>
    </section>
  );
}

function LibraryCard({ entry, imported }: { entry: LibraryCatalogueEntry; imported: boolean }) {
  const [progressLabel, setProgressLabel] = useState("Not started");

  useEffect(() => {
    getLibraryReadingProgress(entry.bookletId).then((progress) => {
      if (progress) setProgressLabel(`Saved ${new Date(progress.updatedAt).toLocaleDateString()}`);
    });
  }, [entry.bookletId]);

  return (
    <Link className="panel block overflow-hidden hover:bg-white/5" to={`/library/${entry.bookletId}`}>
      <div className="aspect-[4/3] bg-black/20">
        {entry.coverImageUrl ? <img className="h-full w-full object-cover" src={entry.coverImageUrl} alt="" /> : <div className="grid h-full place-items-center p-6 text-center text-3xl font-black text-signal">{entry.bookletCode}</div>}
      </div>
      <div className="grid gap-2 p-4">
        <div className="flex flex-wrap gap-2">
          <span className="status-badge border-signal text-signal">Independent Library</span>
          <span className="status-badge border-white/15 text-paper/60">Not part of EOT story</span>
          {imported && <span className="status-badge border-ledger text-ledger">Available Offline</span>}
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-signal">{entry.category} / {entry.ageRating}</p>
        <h2 className="text-xl font-black">{entry.title}</h2>
        <p className="line-clamp-3 text-sm leading-6 text-paper/60">{entry.description || entry.subtitle}</p>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-paper/45">{entry.author} / {progressLabel}</p>
      </div>
    </Link>
  );
}
