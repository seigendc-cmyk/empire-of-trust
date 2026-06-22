import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { SponsoredBadge } from "../components/SponsoredBadge";
import { EmptyState, LoadingState } from "../components/States";
import { searchMall } from "../lib/mallRepository";
import type { EotProduct, EotProductCategory, EotVendor } from "../types";

export default function MallSearch() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("query") ?? "");
  const [vendors, setVendors] = useState<EotVendor[]>([]);
  const [products, setProducts] = useState<EotProduct[]>([]);
  const [categories, setCategories] = useState<EotProductCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    searchMall(query)
      .then((result) => {
        setVendors(result.vendors);
        setProducts(result.products);
        setCategories(result.categories);
      })
      .finally(() => setLoading(false));
  }, [query]);

  const total = useMemo(() => vendors.length + products.length + categories.length, [vendors, products, categories]);

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="iTred Mall" title="Mall search" subtitle="Search vendors, products, brands, categories, and sectors." actions={[{ label: "Vendors", to: "/mall/vendors" }]} />
      <form
        className="grid gap-2 sm:grid-cols-[1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          setParams(query ? { query } : {});
        }}
      >
        <input className="field" placeholder="Search iTred Mall" value={query} onChange={(event) => setQuery(event.currentTarget.value)} />
        <button className="btn btn-primary" type="submit">Search</button>
      </form>
      {loading ? <LoadingState label="Searching mall..." /> : total === 0 ? (
        <EmptyState title="No mall results" message="No matching vendors, products, brands, categories, or sectors are cached locally." actionLabel="Import Pack" actionTo="/mall" />
      ) : (
        <section className="grid gap-4">
          {vendors.length > 0 && (
            <div className="panel divide-y divide-white/10">
              <div className="p-4"><h2 className="text-xl font-black">Vendors</h2></div>
              {vendors.map((vendor, index) => (
                <Link key={vendor.id} className="block p-4 hover:bg-white/5" to={`/mall/vendors/${vendor.id}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{vendor.sector}</p>
                    {index === 0 && <SponsoredBadge label="Sponsored" />}
                  </div>
                  <h3 className="mt-1 text-lg font-black">{vendor.businessName}</h3>
                  <p className="mt-1 text-sm text-paper/60">{vendor.city} {vendor.suburb}</p>
                </Link>
              ))}
            </div>
          )}
          {products.length > 0 && (
            <div className="panel divide-y divide-white/10">
              <div className="p-4"><h2 className="text-xl font-black">Products</h2></div>
              {products.map((product, index) => (
                <Link key={product.id} className="block p-4 hover:bg-white/5" to={`/mall/products/${product.id}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{product.brand || product.category}</p>
                    {index === 0 && <SponsoredBadge label="Featured" />}
                  </div>
                  <h3 className="mt-1 text-lg font-black">{product.name}</h3>
                  <p className="mt-1 text-sm text-paper/60">{product.currency} {Number(product.price || 0).toFixed(2)}</p>
                </Link>
              ))}
            </div>
          )}
          {categories.length > 0 && (
            <div className="panel divide-y divide-white/10">
              <div className="p-4"><h2 className="text-xl font-black">Categories</h2></div>
              {categories.map((category) => (
                <Link key={category.id} className="block p-4 hover:bg-white/5" to={`/mall/categories/${category.id}`}>
                  <h3 className="text-lg font-black">{category.name}</h3>
                  {category.sector && <p className="mt-1 text-sm text-paper/60">{category.sector}</p>}
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  );
}
