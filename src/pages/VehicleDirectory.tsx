import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, LoadingState } from "../components/States";
import { getVehicleIntelligence, searchVehicles, vehicleStatuses } from "../lib/vehicleRepository";
import type { EotVehicle } from "../types";

export default function VehicleDirectory({ studio = false }: { studio?: boolean }) {
  const [params] = useSearchParams();
  const [vehicles, setVehicles] = useState<EotVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [status, setStatus] = useState("all");
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getVehicleIntelligence>> | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([searchVehicles(search, status), getVehicleIntelligence()])
      .then(([rows, data]) => {
        setVehicles(rows);
        setSummary(data);
      })
      .finally(() => setLoading(false));
  }, [search, status]);

  if (loading) return <LoadingState label="Loading vehicle fleet..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow={studio ? "Studio Fleet Register" : "Vehicle Fleet Universe"}
        title="Vehicle fleet universe"
        subtitle="Executive cars, delivery vehicles, logistics trucks, production transport, ownership, usage, maintenance, and story appearances."
        actions={[{ label: "New Vehicle", to: studio ? "/studio/vehicles/new" : "/vehicles/new", primary: true }, { label: "Universe Search", to: "/universe/search" }]}
      />
      <section className="grid gap-3 sm:grid-cols-[1fr_190px]">
        <input className="field" placeholder="Search by make, model, registration, owner, business, or city" value={search} onChange={(event) => setSearch(event.currentTarget.value)} />
        <select className="field" value={status} onChange={(event) => setStatus(event.currentTarget.value)}>
          <option value="all">All statuses</option>
          {vehicleStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </section>
      {summary && (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Vehicles" value={summary.stats.vehicles} />
          <Metric label="Production" value={summary.stats.productionVehicles} />
          <Metric label="Business Assets" value={summary.stats.businessAssets} />
          <Metric label="Appearances" value={summary.stats.appearances} />
        </section>
      )}
      {vehicles.length === 0 ? (
        <EmptyState title="No vehicle records" message="No matching vehicles are cached locally or available from Firestore yet." actionLabel="Create vehicle" actionTo={studio ? "/studio/vehicles/new" : "/vehicles/new"} />
      ) : (
        <div className="panel divide-y divide-white/10">
          {vehicles.map((vehicle) => (
            <Link key={vehicle.id} className="grid gap-3 p-4 hover:bg-white/5 sm:grid-cols-[92px_1fr_auto] sm:items-center" to={`/vehicles/${vehicle.id}`}>
              <div className="h-24 border border-white/10 bg-black/20">
                {vehicle.imageUrl ? <img className="h-full w-full object-cover" src={vehicle.imageUrl} alt="" /> : <div className="grid h-full place-items-center text-xs font-black text-signal">{vehicle.vehicleCode || "VEH"}</div>}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <span className="status-badge border-signal text-signal">{vehicle.status || "active"}</span>
                  <span className="status-badge border-white/15 text-paper/60">{(vehicle.vehicleType || vehicle.type).replaceAll("_", " ")}</span>
                  {vehicle.isProductionVehicle && <span className="status-badge border-ledger text-ledger">production vehicle</span>}
                </div>
                <h2 className="mt-2 text-xl font-black">{vehicle.name}</h2>
                <p className="mt-1 text-sm leading-6 text-paper/60">{[vehicle.make, vehicle.model, vehicle.registrationNumber || vehicle.registration, vehicle.city].filter(Boolean).join(" / ") || "Vehicle details pending"}</p>
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-paper/45">{vehicle.vehicleCode}</span>
            </Link>
          ))}
        </div>
      )}
      {summary && (
        <section className="grid gap-3 lg:grid-cols-2">
          <Insight title="Production Vehicles" rows={summary.productionVehicles} />
          <Insight title="Most Used In Story" rows={summary.mostUsed} />
        </section>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <article className="panel p-4"><p className="text-2xl font-black text-signal">{value}</p><p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-paper/50">{label}</p></article>;
}

function Insight({ title, rows }: { title: string; rows: EotVehicle[] }) {
  return (
    <section className="panel p-4">
      <h2 className="text-base font-black">{title}</h2>
      <div className="mt-3 grid gap-2">
        {rows.map((vehicle) => <Link key={vehicle.id} className="border border-white/10 bg-black/20 p-2 text-sm font-bold text-paper/75" to={`/vehicles/${vehicle.id}`}>{vehicle.name}</Link>)}
        {rows.length === 0 && <p className="text-sm text-paper/60">No data yet.</p>}
      </div>
    </section>
  );
}
