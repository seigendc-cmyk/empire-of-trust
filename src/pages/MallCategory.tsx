import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, LoadingState } from "../components/States";
import { getCategory, listProductsByCategory } from "../lib/mallRepository";
import type { EotProduct, EotProductCategory } from "../types";

export default function MallCategory() {
  const { categoryId = "" } = useParams();
  const [category, setCategory] = useState<EotProductCategory | null>(null);
  const [products, setProducts] = useState<EotProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getCategory(categoryId), listProductsByCategory(categoryId)])
      .then(([categoryRow, productRows]) => {
        setCategory(categoryRow ?? null);
        setProducts(productRows);
      })
      .finally(() => setLoading(false));
  }, [categoryId]);

  if (loading) return <LoadingState label="Loading category..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Mall Category" title={category?.name ?? categoryId.replace(/-/g, " ")} subtitle={category?.description ?? "Offline product category."} actions={[{ label: "Search", to: "/mall/search" }]} />
      {products.length === 0 ? (
        <EmptyState title="No products in category" message="No cached or Firestore products are available for this category yet." actionLabel="Mall" actionTo="/mall" />
      ) : (
        <section className="panel divide-y divide-white/10">
          {products.map((product) => (
            <Link key={product.id} to={`/mall/products/${product.id}`} className="grid gap-3 p-4 hover:bg-white/5 sm:grid-cols-[88px_1fr]">
              <div className="h-20 border border-white/10 bg-black/30">
                {product.imageUrl ? <img className="h-full w-full object-cover" src={product.imageUrl} alt="" /> : <div className="grid h-full place-items-center text-xs font-black text-signal">ITEM</div>}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{product.brand || product.category}</p>
                <h2 className="mt-1 text-xl font-black">{product.name}</h2>
                <p className="mt-1 text-sm text-paper/60">{product.currency} {Number(product.price || 0).toFixed(2)} / {product.stockStatus || product.availability}</p>
              </div>
            </Link>
          ))}
        </section>
      )}
    </section>
  );
}
