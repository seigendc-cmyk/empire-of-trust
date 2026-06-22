import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { LoadingState } from "../components/States";
import { listLibraryCategories } from "../lib/libraryRepository";
import type { LibraryCategory } from "../types";

export default function LibraryCategories() {
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listLibraryCategories().then(setCategories).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Loading library categories..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Independent Library" title="Categories" subtitle="Browse non-EOT booklets by reader need and booklet type." actions={[{ label: "Catalogue", to: "/library", primary: true }, { label: "Import", to: "/library/import" }]} />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => (
          <Link key={category.id} className="panel block p-4 hover:bg-white/5" to={`/library/catalogue?category=${encodeURIComponent(category.name)}`}>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">Library category</p>
            <h2 className="mt-2 text-xl font-black">{category.name}</h2>
            <p className="mt-2 text-sm leading-6 text-paper/60">{category.description}</p>
          </Link>
        ))}
      </section>
    </section>
  );
}
