import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, LoadingState } from "../components/States";
import { getScheduleBoard, updateScheduleStatus } from "../lib/productionRepository";
import type { EotProductionSchedule } from "../types";

type ScheduleRow = Awaited<ReturnType<typeof getScheduleBoard>>[number];
const scheduleStatuses: EotProductionSchedule["status"][] = ["planned", "scheduled", "in_progress", "completed"];

export default function ScheduleBoard() {
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const boardRows = await getScheduleBoard();
    setRows(boardRows);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(schedule: EotProductionSchedule, status: EotProductionSchedule["status"]) {
    setWorkingId(schedule.id);
    await updateScheduleStatus(schedule, status);
    setMessage("Schedule status updated.");
    await load();
    setWorkingId("");
  }

  if (loading) return <LoadingState label="Loading schedule board..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Production Studio" title="Schedule Board" subtitle="Move shoots from planned to completed and keep scene status in sync." actions={[{ label: "Schedules", to: "/studio/production/schedules" }, { label: "Scenes", to: "/studio/production/scenes" }, { label: "Production", to: "/studio/production" }]} />
      {message && <p className="border border-signal bg-signal/10 p-3 text-sm font-bold text-signal">{message}</p>}
      {rows.length === 0 ? (
        <EmptyState title="No schedules" message="Create schedules manually or from production handoff." actionLabel="Open handoff" actionTo="/studio/production/handoff" />
      ) : (
        <section className="grid gap-4">
          {scheduleStatuses.map((status) => {
            const statusRows = rows.filter((row) => row.schedule.status === status);
            return (
              <section key={status} className="panel divide-y divide-white/10">
                <div className="p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{status}</p>
                  <h2 className="mt-1 text-xl font-black">{statusRows.length} shoots</h2>
                </div>
                {statusRows.length === 0 ? <p className="p-4 text-sm text-paper/60">No shoots in this lane.</p> : statusRows.map((row) => (
                  <div key={row.schedule.id} className="grid gap-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{row.schedule.scheduledDate || "No date"} / {row.schedule.episodeId}</p>
                        <h3 className="mt-1 text-lg font-black">{row.scene?.title || row.schedule.sceneId}</h3>
                        <p className="mt-2 text-sm leading-6 text-paper/60">{row.location?.name || row.schedule.locationId || "No location"} {row.schedule.notes ? `/ ${row.schedule.notes}` : ""}</p>
                      </div>
                      <p className="status-badge border-white/15 text-paper/70">{row.schedule.assignedActors?.length ?? 0} actors</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {scheduleStatuses.map((nextStatus) => (
                        <button key={nextStatus} className={`btn ${row.schedule.status === nextStatus ? "btn-primary" : ""}`} type="button" disabled={workingId === row.schedule.id} onClick={() => setStatus(row.schedule, nextStatus)}>{nextStatus}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            );
          })}
        </section>
      )}
    </section>
  );
}
