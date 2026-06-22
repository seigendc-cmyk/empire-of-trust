import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { SponsoredBadge } from "../components/SponsoredBadge";
import { EmptyState, LoadingState } from "../components/States";
import { listProducts } from "../lib/mallRepository";
import type { EotProduct } from "../types";

export default function MallProducts() {
  const [products, setProducts] = useState<EotProduct[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listProducts().then(setProducts).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => !term || [product.name, product.brand, product.category, product.subcategory, product.description, ...(product.tags ?? [])].some((value) => String(value ?? "").toLowerCase().includes(term)));
  }, [products, search]);

  if (loading) return <LoadingState label="Loading products..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="iTred Mall" title="Products" subtitle="Search offline vendor-pack products without checkout or payment." actions={[{ label: "Categories", to: "/mall/categories" }, { label: "Import Pack", to: "/mall/import-vendor-pack", primary: true }]} />
      <input className="field" placeholder="Search products, brands, tags" value={search} onChange={(event) => setSearch(event.currentTarget.value)} />
      {filtered.length === 0 ? <EmptyState title="No products found" message="No products match this search or local cache." /> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {filtered.map((product, index) => (
            <Link key={product.id} to={`/mall/products/${product.id}`} className="panel block overflow-hidden hover:border-signal">
              <div className="aspect-square border-b border-white/10 bg-black/20">
                {product.imageUrl ? <img className="h-full w-full object-cover" src={product.imageUrl} alt="" /> : <div className="grid h-full place-items-center text-xs font-black text-signal">PRODUCT</div>}
              </div>
              <div className="p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-signal">{product.category}</p>
                  {index < 2 && <SponsoredBadge label={index === 0 ? "Sponsored" : "Featured"} />}
                </div>
                <h2 className="mt-1 line-clamp-2 text-lg font-black">{product.name}</h2>
                <p className="mt-2 text-sm font-bold text-app">{product.currency} {Number(product.price || 0).toFixed(2)}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted">{product.availability}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
