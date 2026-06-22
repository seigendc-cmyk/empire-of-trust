import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, LoadingState } from "../components/States";
import { getPropertyIntelligence, propertyStatuses, searchProperties } from "../lib/propertyRepository";
import type { EotProperty } from "../types";

export default function PropertyDirectory({ studio = false }: { studio?: boolean }) {
  const [params] = useSearchParams();
  const [properties, setProperties] = useState<EotProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [status, setStatus] = useState("all");
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getPropertyIntelligence>> | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([searchProperties(search, status), getPropertyIntelligence()])
      .then(([rows, data]) => {
        setProperties(rows);
        setSummary(data);
      })
      .finally(() => setLoading(false));
  }, [search, status]);

  if (loading) return <LoadingState label="Loading property register..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow={studio ? "Studio Property Register" : "Real Estate Universe"}
        title="Property & real estate universe"
        subtitle="Land, homes, offices, warehouses, resorts, retail spaces, production locations, ownership, tenants, valuations, and story appearances."
        actions={[{ label: "New Property", to: studio ? "/studio/properties/new" : "/properties/new", primary: true }, { label: "Universe Search", to: "/universe/search" }]}
      />
      <section className="grid gap-3 sm:grid-cols-[1fr_190px]">
        <input className="field" placeholder="Search by name, type, city, suburb, owner, or business" value={search} onChange={(event) => setSearch(event.currentTarget.value)} />
        <select className="field" value={status} onChange={(event) => setStatus(event.currentTarget.value)}>
          <option value="all">All statuses</option>
          {propertyStatuses.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
        </select>
      </section>
      {summary && (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Properties" value={summary.stats.properties} />
          <Metric label="Production" value={summary.stats.productionLocations} />
          <Metric label="Commercial" value={summary.stats.commercial} />
          <Metric label="Appearances" value={summary.stats.appearances} />
        </section>
      )}
      {properties.length === 0 ? (
        <EmptyState title="No property records" message="No matching properties are cached locally or available from Firestore yet." actionLabel="Create property" actionTo={studio ? "/studio/properties/new" : "/properties/new"} />
      ) : (
        <div className="panel divide-y divide-white/10">
          {properties.map((property) => (
            <Link key={property.id} className="grid gap-3 p-4 hover:bg-white/5 sm:grid-cols-[92px_1fr_auto] sm:items-center" to={`/properties/${property.id}`}>
              <div className="h-24 border border-white/10 bg-black/20">
                {property.imageUrl ? <img className="h-full w-full object-cover" src={property.imageUrl} alt="" /> : <div className="grid h-full place-items-center text-xs font-black text-signal">{property.propertyCode || "PROP"}</div>}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <span className="status-badge border-signal text-signal">{property.status || "active"}</span>
                  <span className="status-badge border-white/15 text-paper/60">{(property.propertyType || property.type).replaceAll("_", " ")}</span>
                  {property.isProductionLocation && <span className="status-badge border-ledger text-ledger">production location</span>}
                </div>
                <h2 className="mt-2 text-xl font-black">{property.name}</h2>
                <p className="mt-1 text-sm leading-6 text-paper/60">{property.location || [property.suburb, property.city, property.country].filter(Boolean).join(", ") || "Location pending"}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-paper/45">Owner {ownerSummary(property)}</p>
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-paper/45">{property.propertyCode}</span>
            </Link>
          ))}
        </div>
      )}
      {summary && (
        <section className="grid gap-3 lg:grid-cols-3">
          <Insight title="Production Locations" rows={summary.productionLocations} />
          <Insight title="Most Used In Story" rows={summary.mostUsed} />
          <section className="panel p-4">
            <h2 className="text-base font-black">Top Valuations</h2>
            <div className="mt-3 grid gap-2">
              {summary.topValued.map((valuation) => <p key={valuation.id} className="border border-white/10 bg-black/20 p-2 text-sm font-bold text-paper/75">{valuation.currency} {valuation.estimatedValue} / {valuation.propertyId}</p>)}
              {summary.topValued.length === 0 && <p className="text-sm text-paper/60">No valuation data yet.</p>}
            </div>
          </section>
        </section>
      )}
    </section>
  );
}

function ownerSummary(property: EotProperty) {
  const owners = [...(property.ownerCharacterIds ?? []), ...(property.ownerBusinessIds ?? [])];
  if (owners.length === 0) return "pending";
  if (owners.length === 1) return owners[0];
  return `${owners[0]} +${owners.length - 1}`;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <article className="panel p-4"><p className="text-2xl font-black text-signal">{value}</p><p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-paper/50">{label}</p></article>;
}

function Insight({ title, rows }: { title: string; rows: EotProperty[] }) {
  return (
    <section className="panel p-4">
      <h2 className="text-base font-black">{title}</h2>
      <div className="mt-3 grid gap-2">
        {rows.map((property) => <Link key={property.id} className="border border-white/10 bg-black/20 p-2 text-sm font-bold text-paper/75" to={`/properties/${property.id}`}>{property.name}</Link>)}
        {rows.length === 0 && <p className="text-sm text-paper/60">No data yet.</p>}
      </div>
    </section>
  );
}
