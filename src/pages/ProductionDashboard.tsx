import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { LoadingState } from "../components/States";
import { getProductionDashboard, searchProduction, summarizeProductionRecord, type ProductionKind, type ProductionRecord } from "../lib/productionRepository";
import { getSceneDashboard } from "../lib/sceneRepository";

const sections: Array<{ to: string; label: string; kind: ProductionKind }> = [
  { to: "/studio/production/actors", label: "Actors", kind: "actors" },
  { to: "/studio/production/casting", label: "Casting", kind: "casting" },
  { to: "/studio/production/characters", label: "Characters", kind: "characters" },
  { to: "/studio/production/scenes", label: "Scenes", kind: "scenes" },
  { to: "/studio/production/locations", label: "Locations", kind: "locations" },
  { to: "/studio/production/properties", label: "Properties", kind: "properties" },
  { to: "/studio/production/vehicles", label: "Vehicles", kind: "vehicles" },
  { to: "/studio/production/assets", label: "AI Assets", kind: "assets" },
  { to: "/studio/production/schedules", label: "Schedules", kind: "schedules" },
  { to: "/studio/production/continuity", label: "Continuity", kind: "continuity" },
];

interface DashboardData {
  counts: Record<string, number>;
  upcomingShoots: Array<{ id: string; scheduledDate: string; status: string; episodeId: string; sceneId: string; locationId: string }>;
  actorsRequired: number;
  locationsRequired: number;
  productionProgress: number;
  continuityWarnings: ProductionRecord[];
  scenePlanning?: Awaited<ReturnType<typeof getSceneDashboard>>;
}

export default function ProductionDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Array<{ kind: ProductionKind; row: ProductionRecord }>>([]);

  useEffect(() => {
    Promise.all([getProductionDashboard(), getSceneDashboard()]).then(([production, scenePlanning]) => setData({ ...production, scenePlanning }));
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    searchProduction(search).then((rows) => setResults(rows.slice(0, 20)));
  }, [search]);

  if (!data) return <LoadingState label="Loading production studio..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="TV Production" title="Production Studio" subtitle="Actors, casting, scenes, locations, assets, schedules, and continuity for Empire of Trust." actions={[{ label: "Handoff", to: "/studio/production/handoff", primary: true }, { label: "Casting", to: "/studio/production/casting-board" }, { label: "Schedule", to: "/studio/production/schedule-board" }, { label: "Readiness", to: "/studio/production/readiness" }]} />
      <section className="grid gap-3 md:grid-cols-4">
        <div className="panel p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">Upcoming shoots</p><p className="mt-2 text-3xl font-black">{data.upcomingShoots.length}</p></div>
        <div className="panel p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">Actors required</p><p className="mt-2 text-3xl font-black">{data.actorsRequired}</p></div>
        <div className="panel p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">Locations required</p><p className="mt-2 text-3xl font-black">{data.locationsRequired}</p></div>
        <div className="panel p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">Progress</p><p className="mt-2 text-3xl font-black">{data.productionProgress}%</p></div>
      </section>
      {data.scenePlanning && (
        <section className="grid gap-3 md:grid-cols-5">
          <Link className="panel p-4 hover:bg-white/5" to="/studio/scenes"><p className="text-2xl font-black text-signal">{data.scenePlanning.scenes.length}</p><p className="mt-1 text-sm font-bold">Scene plans</p></Link>
          <Link className="panel p-4 hover:bg-white/5" to="/studio/scenes"><p className="text-2xl font-black text-ember">{data.scenePlanning.missingCast.length}</p><p className="mt-1 text-sm font-bold">Missing cast</p></Link>
          <Link className="panel p-4 hover:bg-white/5" to="/studio/scenes"><p className="text-2xl font-black text-ember">{data.scenePlanning.missingLocation.length}</p><p className="mt-1 text-sm font-bold">Missing location</p></Link>
          <Link className="panel p-4 hover:bg-white/5" to="/studio/scenes"><p className="text-2xl font-black text-ember">{data.scenePlanning.continuityWarnings.length}</p><p className="mt-1 text-sm font-bold">Scene warnings</p></Link>
          <Link className="panel p-4 hover:bg-white/5" to="/studio/scenes"><p className="text-2xl font-black text-signal">{data.scenePlanning.upcoming.length}</p><p className="mt-1 text-sm font-bold">Upcoming scenes</p></Link>
        </section>
      )}
      <input className="field" placeholder="Search actor, character, scene, location, vehicle, property" value={search} onChange={(event) => setSearch(event.currentTarget.value)} />
      {results.length > 0 && (
        <section className="panel divide-y divide-white/10">
          {results.map(({ kind, row }) => {
            const summary = summarizeProductionRecord(row);
            return <Link key={`${kind}-${row.id}`} className="block p-4 hover:bg-white/5" to={`/studio/production/${kind}`}><p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{kind}</p><h2 className="mt-1 text-lg font-black">{summary.title}</h2><p className="mt-1 text-sm text-paper/60">{summary.subtitle}</p></Link>;
          })}
        </section>
      )}
      <section className="grid gap-3 md:grid-cols-5">
        {sections.map((item) => <Link key={item.kind} className="panel p-4 hover:bg-white/5" to={item.to}><p className="text-2xl font-black text-signal">{data.counts[item.kind] ?? 0}</p><p className="mt-1 text-sm font-bold">{item.label}</p></Link>)}
      </section>
      <section className="grid gap-3 md:grid-cols-3">
        <Link className="panel p-4 hover:bg-white/5" to="/studio/production/casting-board"><h2 className="text-lg font-black">Casting Board</h2><p className="mt-2 text-sm leading-6 text-paper/60">Assign actors to characters and approve casting.</p></Link>
        <Link className="panel p-4 hover:bg-white/5" to="/studio/production/schedule-board"><h2 className="text-lg font-black">Schedule Board</h2><p className="mt-2 text-sm leading-6 text-paper/60">Move shoots through planned, scheduled, in progress, and completed.</p></Link>
        <Link className="panel p-4 hover:bg-white/5" to="/studio/production/readiness"><h2 className="text-lg font-black">Readiness Checklist</h2><p className="mt-2 text-sm leading-6 text-paper/60">Check scenes, casting, locations, assets, and continuity before filming.</p></Link>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel divide-y divide-white/10">
          <div className="p-4"><h2 className="text-xl font-black">Upcoming shoots</h2></div>
          {data.upcomingShoots.length === 0 ? <p className="p-4 text-sm text-paper/60">No scheduled shoots yet.</p> : data.upcomingShoots.map((shoot) => <div key={shoot.id} className="p-4 text-sm text-paper/65"><p className="font-bold text-paper">{shoot.scheduledDate}</p><p>{shoot.episodeId} / {shoot.sceneId} / {shoot.locationId}</p><p>{shoot.status}</p></div>)}
        </div>
        <div className="panel divide-y divide-white/10">
          <div className="p-4"><h2 className="text-xl font-black">Continuity warnings</h2></div>
          {data.continuityWarnings.length === 0 ? <p className="p-4 text-sm text-paper/60">No open continuity warnings.</p> : data.continuityWarnings.map((record) => {
            const summary = summarizeProductionRecord(record);
            return <Link key={record.id} to="/studio/production/continuity" className="block p-4 hover:bg-white/5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-ember">{summary.subtitle}</p><h3 className="mt-1 font-black">{summary.title}</h3><p className="mt-1 text-sm text-paper/60">{summary.body}</p></Link>;
          })}
        </div>
      </section>
    </section>
  );
}
