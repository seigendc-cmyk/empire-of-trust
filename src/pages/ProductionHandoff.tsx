import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, LoadingState } from "../components/States";
import { createProductionHandoff, getProductionHandoffStatus } from "../lib/productionRepository";
import { listStoryRecords } from "../lib/storyEngineRepository";
import type { EotEpisodePlan } from "../types";

type HandoffStatus = Awaited<ReturnType<typeof getProductionHandoffStatus>>[number];

export default function ProductionHandoff() {
  const [rows, setRows] = useState<HandoffStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingPlanId, setWorkingPlanId] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const plans = await listStoryRecords<EotEpisodePlan>("episodePlans");
    const statuses = await getProductionHandoffStatus(plans);
    setRows(statuses);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createHandoff(plan: EotEpisodePlan) {
    setWorkingPlanId(plan.id);
    setMessage("");
    try {
      const result = await createProductionHandoff(plan);
      setMessage(`Production handoff created for ${result.episodeId}.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Production handoff failed.");
    } finally {
      setWorkingPlanId("");
    }
  }

  if (loading) return <LoadingState label="Loading production handoff..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow="Production Studio"
        title="Production Handoff"
        subtitle="Convert episode plans into trackable scenes, schedules, assets, and continuity briefs."
        actions={[{ label: "Episode Planner", to: "/studio/story-engine/episode-planner", primary: true }, { label: "Production", to: "/studio/production" }]}
      />
      {message && <p className="border border-signal bg-signal/10 p-3 text-sm font-bold text-signal">{message}</p>}
      {rows.length === 0 ? (
        <EmptyState title="No episode plans" message="Create an episode plan before production handoff." actionLabel="Open planner" actionTo="/studio/story-engine/episode-planner" />
      ) : (
        <section className="panel divide-y divide-white/10">
          {rows.map((row) => (
            <div key={row.plan.id} className="grid gap-4 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">
                    S{row.plan.seasonNumber}E{row.plan.episodeNumber} / {row.episodeId}
                  </p>
                  <h2 className="mt-1 text-xl font-black">{row.plan.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-paper/60">{row.plan.mainConflict}</p>
                </div>
                <button className="btn btn-primary" type="button" disabled={workingPlanId === row.plan.id} onClick={() => createHandoff(row.plan)}>
                  {workingPlanId === row.plan.id ? "Creating..." : row.hasHandoff ? "Refresh handoff" : "Create handoff"}
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Link className="border border-white/10 bg-black/20 p-3 hover:border-signal" to="/studio/production/scenes">
                  <p className="text-2xl font-black text-signal">{row.scenes.length}</p>
                  <p className="mt-1 text-sm font-bold">Scenes</p>
                </Link>
                <Link className="border border-white/10 bg-black/20 p-3 hover:border-signal" to="/studio/production/schedules">
                  <p className="text-2xl font-black text-signal">{row.schedules.length}</p>
                  <p className="mt-1 text-sm font-bold">Schedules</p>
                </Link>
                <Link className="border border-white/10 bg-black/20 p-3 hover:border-signal" to="/studio/production/assets">
                  <p className="text-2xl font-black text-signal">{row.assets.length}</p>
                  <p className="mt-1 text-sm font-bold">Assets</p>
                </Link>
                <Link className="border border-white/10 bg-black/20 p-3 hover:border-signal" to="/studio/production/continuity">
                  <p className="text-2xl font-black text-signal">{row.openContinuity.length}</p>
                  <p className="mt-1 text-sm font-bold">Open continuity</p>
                </Link>
                <div className="border border-white/10 bg-black/20 p-3">
                  <p className="text-2xl font-black text-signal">{row.progress}%</p>
                  <p className="mt-1 text-sm font-bold">Scene progress</p>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </section>
  );
}
