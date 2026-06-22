import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, LoadingState } from "../components/States";
import { continuityStatuses, getSceneDashboard, productionStatuses, searchScenes } from "../lib/sceneRepository";
import type { EotScene } from "../types";

export default function SceneDirectory() {
  const [scenes, setScenes] = useState<EotScene[]>([]);
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof getSceneDashboard>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [productionStatus, setProductionStatus] = useState("all");
  const [continuityStatus, setContinuityStatus] = useState("all");

  useEffect(() => {
    setLoading(true);
    Promise.all([searchScenes(search, productionStatus, continuityStatus), getSceneDashboard()])
      .then(([rows, data]) => {
        setScenes(rows);
        setDashboard(data);
      })
      .finally(() => setLoading(false));
  }, [search, productionStatus, continuityStatus]);

  if (loading) return <LoadingState label="Loading scene builder..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Scene Builder" title="Scene production planning" subtitle="Turn written episode content into production-ready scenes with cast, assets, continuity, schedule, shots, props, and wardrobe." actions={[{ label: "New Scene", to: "/studio/scenes/new", primary: true }, { label: "Production", to: "/studio/production" }]} />
      <section className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
        <input className="field" placeholder="Search episode, character, actor, property, business, vehicle, status" value={search} onChange={(event) => setSearch(event.currentTarget.value)} />
        <select className="field" value={productionStatus} onChange={(event) => setProductionStatus(event.currentTarget.value)}><option value="all">All production</option>{productionStatuses.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <select className="field" value={continuityStatus} onChange={(event) => setContinuityStatus(event.currentTarget.value)}><option value="all">All continuity</option>{continuityStatuses.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      </section>
      {dashboard && (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Metric label="Scenes" value={dashboard.scenes.length} />
          <Metric label="Missing Cast" value={dashboard.missingCast.length} />
          <Metric label="Missing Location" value={dashboard.missingLocation.length} />
          <Metric label="Warnings" value={dashboard.continuityWarnings.length} />
          <Metric label="Upcoming" value={dashboard.upcoming.length} />
        </section>
      )}
      {scenes.length === 0 ? (
        <EmptyState title="No scenes" message="No scene plans are cached locally or available from Firestore yet." actionLabel="Create scene" actionTo="/studio/scenes/new" />
      ) : (
        <div className="panel divide-y divide-white/10">
          {scenes.map((scene) => (
            <Link key={scene.id} className="grid gap-3 p-4 hover:bg-white/5 lg:grid-cols-[1fr_auto]" to={`/studio/scenes/${scene.id}`}>
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="status-badge border-signal text-signal">{scene.productionStatus}</span>
                  <span className="status-badge border-white/15 text-paper/60">{scene.continuityStatus}</span>
                  <span className="status-badge border-white/15 text-paper/60">{scene.sceneType}</span>
                </div>
                <h2 className="mt-2 text-xl font-black">{scene.sceneNumber}. {scene.title}</h2>
                <p className="mt-1 text-sm text-paper/60">{scene.episodeId} / {scene.locationId || scene.propertyId || "location pending"}</p>
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-paper/45">{scene.sceneCode}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <article className="panel p-4"><p className="text-2xl font-black text-signal">{value}</p><p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-paper/50">{label}</p></article>;
}
