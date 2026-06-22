import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, LoadingState } from "../components/States";
import { listProducts, listVendorPacks, listVendors } from "../lib/mallRepository";
import type { EotProduct, EotVendor, VendorPack } from "../types";

export default function StudioCommerce({ view = "dashboard" }: { view?: "dashboard" | "vendors" | "products" | "vendorPacks" }) {
  const [vendors, setVendors] = useState<EotVendor[]>([]);
  const [products, setProducts] = useState<EotProduct[]>([]);
  const [packs, setPacks] = useState<VendorPack[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listVendors(), listProducts(), listVendorPacks()])
      .then(([vendorRows, productRows, packRows]) => {
        setVendors(vendorRows);
        setProducts(productRows);
        setPacks(packRows);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredVendors = useMemo(() => vendors.filter((vendor) => !search || [vendor.businessName, vendor.tradingName, vendor.sector, vendor.city].join(" ").toLowerCase().includes(search.toLowerCase())), [vendors, search]);
  const filteredProducts = useMemo(() => products.filter((product) => !search || [product.name, product.brand, product.category, product.vendorId].join(" ").toLowerCase().includes(search.toLowerCase())), [products, search]);

  if (loading) return <LoadingState label="Loading commerce console..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow="Commerce"
        title={view === "vendors" ? "Vendors" : view === "products" ? "Products" : view === "vendorPacks" ? "Vendor packs" : "Commerce integration"}
        subtitle="Connect story businesses to iTred-style storefronts, products, and offline vendor packs."
        actions={[
          { label: "New Vendor", to: "/studio/commerce/vendors/new", primary: true },
          { label: "New Product", to: "/studio/commerce/products/new" },
          { label: "Build Pack", to: "/studio/commerce/build-vendor-pack" },
        ]}
      />
      <nav className="grid gap-2 sm:grid-cols-4">
        <Link className={`btn ${view === "dashboard" ? "btn-primary" : ""}`} to="/studio/commerce">Dashboard</Link>
        <Link className={`btn ${view === "vendors" ? "btn-primary" : ""}`} to="/studio/commerce/vendors">Vendors</Link>
        <Link className={`btn ${view === "products" ? "btn-primary" : ""}`} to="/studio/commerce/products">Products</Link>
        <Link className={`btn ${view === "vendorPacks" ? "btn-primary" : ""}`} to="/studio/commerce/vendor-packs">Vendor packs</Link>
      </nav>
      {view === "dashboard" && (
        <section className="grid gap-3 sm:grid-cols-3">
          <Metric label="Vendors" value={vendors.length} />
          <Metric label="Products" value={products.length} />
          <Metric label="Offline packs" value={packs.length} />
        </section>
      )}
      {view !== "dashboard" && <input className="field" placeholder="Search commerce records" value={search} onChange={(event) => setSearch(event.currentTarget.value)} />}
      {view === "vendors" && <VendorList rows={filteredVendors} />}
      {view === "products" && <ProductList rows={filteredProducts} vendors={vendors} />}
      {view === "vendorPacks" && <PackList rows={packs} />}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="panel p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>;
}

function VendorList({ rows }: { rows: EotVendor[] }) {
  if (rows.length === 0) return <EmptyState title="No vendors" message="No vendor records found." />;
  return <section className="panel divide-y divide-white/10">{rows.map((vendor) => <Link key={vendor.id} className="block p-4 hover:bg-white/5" to={`/studio/commerce/vendors/${vendor.id}/edit`}><p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{vendor.vendorCode || vendor.sector}</p><h2 className="mt-1 text-xl font-black">{vendor.businessName}</h2><p className="mt-1 text-sm text-muted">{vendor.status} / {vendor.city} / {vendor.isStoryLinked ? "story linked" : "commerce only"}</p></Link>)}</section>;
}

function ProductList({ rows, vendors }: { rows: EotProduct[]; vendors: EotVendor[] }) {
  if (rows.length === 0) return <EmptyState title="No products" message="No product records found." />;
  const lookup = new Map(vendors.map((vendor) => [vendor.id, vendor.businessName]));
  return <section className="panel divide-y divide-white/10">{rows.map((product) => <Link key={product.id} className="block p-4 hover:bg-white/5" to={`/studio/commerce/products/${product.id}/edit`}><p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{product.category}</p><h2 className="mt-1 text-xl font-black">{product.name}</h2><p className="mt-1 text-sm text-muted">{lookup.get(product.vendorId) || product.vendorId} / {product.currency} {Number(product.price || 0).toFixed(2)} / {product.availability}</p></Link>)}</section>;
}

function PackList({ rows }: { rows: VendorPack[] }) {
  if (rows.length === 0) return <EmptyState title="No vendor packs" message="Build or import vendor packs to see them here." />;
  return <section className="panel divide-y divide-white/10">{rows.map((pack) => <Link key={pack.manifest.packId} className="block p-4 hover:bg-white/5" to={`/studio/commerce/vendor-packs/${pack.manifest.packId}`}><p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{pack.manifest.packId} / {pack.manifest.version}</p><h2 className="mt-1 text-xl font-black">{pack.manifest.vendorName}</h2><p className="mt-1 text-sm text-muted">{pack.content.products.length} products / {pack.manifest.createdAt}</p></Link>)}</section>;
}
