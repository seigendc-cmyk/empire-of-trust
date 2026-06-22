import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, LoadingState } from "../components/States";
import { listVendors } from "../lib/mallRepository";
import type { EotVendor } from "../types";

export default function MallVendors() {
  const [vendors, setVendors] = useState<EotVendor[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listVendors().then(setVendors).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return vendors.filter((vendor) =>
      !term || [vendor.businessName, vendor.sector, vendor.city, vendor.suburb, vendor.description].some((value) => String(value ?? "").toLowerCase().includes(term)),
    );
  }, [vendors, search]);

  if (loading) return <LoadingState label="Loading vendors..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="iTred Mall" title="Vendors" subtitle="Browse offline-ready storefronts in the EOT commercial layer." actions={[{ label: "Search", to: "/mall/search" }]} />
      <input className="field" placeholder="Search vendors, sectors, cities" value={search} onChange={(event) => setSearch(event.currentTarget.value)} />
      {filtered.length === 0 ? (
        <EmptyState title="No vendors found" message="No vendor storefronts match this search or cache." actionLabel="Import Pack" actionTo="/mall" />
      ) : (
        <section className="panel divide-y divide-white/10">
          {filtered.map((vendor) => (
            <Link key={vendor.id} to={`/mall/vendors/${vendor.id}`} className="grid gap-3 p-4 hover:bg-white/5 sm:grid-cols-[88px_1fr]">
              <div className="h-20 border border-white/10 bg-black/30">
                {vendor.logoUrl ? <img className="h-full w-full object-cover" src={vendor.logoUrl} alt="" /> : <div className="grid h-full place-items-center text-xs font-black text-signal">ITRED</div>}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{vendor.sector || "Storefront"}</p>
                <h2 className="mt-1 truncate text-xl font-black">{vendor.businessName}</h2>
                <p className="mt-2 line-clamp-2 text-sm text-paper/60">{vendor.description || `${vendor.city} ${vendor.suburb}`}</p>
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-paper/40">{vendor.productCount || 0} products / {vendor.branchCount || 1} branches</p>
              </div>
            </Link>
          ))}
        </section>
      )}
    </section>
  );
}
