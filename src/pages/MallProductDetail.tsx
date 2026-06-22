import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/States";
import { getProduct, getVendor, listProductsByCategory } from "../lib/mallRepository";
import type { EotProduct, EotVendor } from "../types";

function whatsAppHref(number: string, message: string) {
  const clean = number.replace(/[^\d+]/g, "");
  return clean ? `https://wa.me/${clean.replace(/^\+/, "")}?text=${encodeURIComponent(message)}` : "";
}

export default function MallProductDetail() {
  const { productId = "" } = useParams();
  const [product, setProduct] = useState<EotProduct | null>(null);
  const [vendor, setVendor] = useState<EotVendor | null>(null);
  const [related, setRelated] = useState<EotProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProduct(productId)
      .then(async (productRow) => {
        setProduct(productRow ?? null);
        if (!productRow) return;
        const [vendorRow, relatedRows] = await Promise.all([getVendor(productRow.vendorId), listProductsByCategory(productRow.category)]);
        setVendor(vendorRow ?? null);
        setRelated(relatedRows.filter((item) => item.id !== productRow.id).slice(0, 4));
      })
      .finally(() => setLoading(false));
  }, [productId]);

  const price = useMemo(() => {
    if (!product) return "";
    return `${product.currency || "USD"} ${Number(product.price || 0).toFixed(2)}`;
  }, [product]);

  if (loading) return <LoadingState label="Loading product..." />;
  if (!product) return <ErrorState title="Product not found" message="This product is not available from Firestore or local vendor packs." />;

  const whatsapp = vendor ? whatsAppHref(vendor.whatsapp || vendor.phone, `Hello ${vendor.businessName}, I am enquiring about ${product.name}.`) : "";

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow={product.category || "Product"} title={product.name} subtitle={vendor ? `Sold by ${vendor.businessName}` : "Vendor pending"} actions={[{ label: "Mall", to: "/mall" }]} />

      <section className="panel grid gap-4 p-4 sm:grid-cols-[minmax(220px,360px)_1fr]">
        <div className="aspect-square border border-white/10 bg-black/30">
          {product.imageUrl ? <img className="h-full w-full object-cover" src={product.imageUrl} alt="" /> : <div className="grid h-full place-items-center text-lg font-black text-signal">PRODUCT</div>}
        </div>
        <div className="grid content-start gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{product.brand || product.category}</p>
            <p className="mt-2 text-3xl font-black">{price}</p>
            <p className="mt-2 text-sm font-bold uppercase tracking-[0.14em] text-paper/45">{product.availability || product.stockStatus || "Availability pending"}</p>
          </div>
          <p className="text-sm leading-6 text-paper/70">{product.description}</p>
          <div className="flex flex-wrap gap-2">
            {product.tags?.map((tag) => <span key={tag} className="border border-white/10 px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-paper/50">{tag}</span>)}
          </div>
          <div className="grid gap-2 sm:flex">
            {whatsapp && <a className="btn btn-primary" href={whatsapp} target="_blank" rel="noreferrer">WhatsApp enquiry</a>}
            {vendor?.phone && <a className="btn" href={`tel:${vendor.phone}`}>Call vendor</a>}
            {vendor && <Link className="btn" to={`/mall/vendors/${vendor.id}`}>Vendor storefront</Link>}
          </div>
        </div>
      </section>

      <section className="panel divide-y divide-white/10">
        <div className="p-4">
          <h2 className="text-xl font-black">Related products</h2>
        </div>
        {related.length === 0 ? <p className="p-4 text-sm text-paper/60">No related products are cached yet.</p> : related.map((item) => (
          <Link key={item.id} className="block p-4 hover:bg-white/5" to={`/mall/products/${item.id}`}>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{item.category}</p>
            <h3 className="mt-1 text-lg font-black">{item.name}</h3>
            <p className="mt-1 text-sm text-paper/60">{item.currency} {Number(item.price || 0).toFixed(2)}</p>
          </Link>
        ))}
      </section>
    </section>
  );
}
