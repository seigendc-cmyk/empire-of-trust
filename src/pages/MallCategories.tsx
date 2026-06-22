import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, LoadingState } from "../components/States";
import { listCategories, logCommerceInterest } from "../lib/mallRepository";
import type { EotProductCategory } from "../types";

export default function MallCategories() {
  const [categories, setCategories] = useState<EotProductCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listCategories().then(setCategories).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Loading categories..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="iTred Mall" title="Categories" subtitle="Browse marketplace-style commerce categories." actions={[{ label: "Products", to: "/mall/products", primary: true }, { label: "Search", to: "/mall/search" }]} />
      {categories.length === 0 ? <EmptyState title="No categories" message="No categories are cached yet." /> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <Link key={category.id} to={`/mall/categories/${category.id}`} onClick={() => logCommerceInterest("category_opened", { metadata: { category: category.name } }).catch(() => undefined)} className="panel p-4 hover:border-signal">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-signal">{category.sector || "Category"}</p>
              <h2 className="mt-2 text-xl font-black">{category.name}</h2>
              {category.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{category.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
