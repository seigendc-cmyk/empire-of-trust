import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, LoadingState } from "../components/States";
import { importVendorPack, listCategories, listProducts, listVendors, validateVendorPack } from "../lib/mallRepository";
import type { EotProduct, EotProductCategory, EotVendor } from "../types";

export default function MallHome() {
  const [vendors, setVendors] = useState<EotVendor[]>([]);
  const [products, setProducts] = useState<EotProduct[]>([]);
  const [categories, setCategories] = useState<EotProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([listVendors(), listProducts(), listCategories()])
      .then(([vendorRows, productRows, categoryRows]) => {
        setVendors(vendorRows);
        setProducts(productRows);
        setCategories(categoryRows);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleImport(file: File | undefined) {
    if (!file) return;
    setError("");
    setStatus("Importing vendor pack...");
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const pack = validateVendorPack(parsed);
      const vendorId = await importVendorPack(pack);
      const [vendorRows, productRows, categoryRows] = await Promise.all([listVendors(), listProducts(), listCategories()]);
      setVendors(vendorRows);
      setProducts(productRows);
      setCategories(categoryRows);
      setStatus(`Vendor pack imported for ${vendorId}.`);
    } catch (importError) {
      setStatus("");
      setError(importError instanceof Error ? importError.message : "Vendor pack import failed.");
    }
  }

  if (loading) return <LoadingState label="Opening iTred Mall..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow="iTred Mall"
        title="Mall"
        subtitle="Offline-ready vendor storefronts and product packs inside the Empire of Trust universe."
        actions={[{ label: "Vendors", to: "/mall/vendors", primary: true }, { label: "Search", to: "/mall/search" }]}
      />

      <section className="panel grid gap-3 p-4">
        <h2 className="text-xl font-black">Import vendor pack</h2>
        <p className="text-sm leading-6 text-paper/60">Import a downloaded vendor JSON pack to browse storefronts and products offline.</p>
        <label className="btn btn-primary w-full cursor-pointer text-center sm:w-fit">
          Import Pack
          <input className="sr-only" type="file" accept="application/json,.json" onChange={(event) => handleImport(event.currentTarget.files?.[0])} />
        </label>
        {status && <p className="border border-signal bg-signal/10 p-3 text-sm font-bold text-signal">{status}</p>}
        {error && <p className="border border-ember bg-ember/10 p-3 text-sm font-bold text-ember">{error}</p>}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="panel p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">Vendors</p>
          <p className="mt-2 text-3xl font-black">{vendors.length}</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">Products</p>
          <p className="mt-2 text-3xl font-black">{products.length}</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">Categories</p>
          <p className="mt-2 text-3xl font-black">{categories.length}</p>
        </div>
      </section>

      {vendors.length === 0 ? (
        <EmptyState title="No storefronts imported" message="Import a vendor pack or connect Firestore records to populate the mall." />
      ) : (
        <section className="panel divide-y divide-white/10">
          {vendors.slice(0, 5).map((vendor) => (
            <Link key={vendor.id} className="grid gap-2 p-4 hover:bg-white/5" to={`/mall/vendors/${vendor.id}`}>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{vendor.sector || "Vendor"}</p>
              <h2 className="text-xl font-black">{vendor.businessName}</h2>
              <p className="text-sm text-paper/60">{vendor.city}{vendor.suburb ? ` / ${vendor.suburb}` : ""}</p>
            </Link>
          ))}
        </section>
      )}
    </section>
  );
}
