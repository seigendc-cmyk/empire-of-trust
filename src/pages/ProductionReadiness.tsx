import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, LoadingState } from "../components/States";
import { getProductionReadiness } from "../lib/productionRepository";

type ReadinessRow = Awaited<ReturnType<typeof getProductionReadiness>>[number];

export default function ProductionReadiness() {
  const [rows, setRows] = useState<ReadinessRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProductionReadiness().then((items) => {
      setRows(items);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingState label="Loading readiness checklist..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Production Studio" title="Readiness Checklist" subtitle="See whether each planned episode is ready for filming." actions={[{ label: "Casting", to: "/studio/production/casting-board" }, { label: "Schedule", to: "/studio/production/schedule-board" }, { label: "Production", to: "/studio/production" }]} />
      {rows.length === 0 ? (
        <EmptyState title="No production episodes" message="Create a production handoff or schedule before checking readiness." actionLabel="Open handoff" actionTo="/studio/production/handoff" />
      ) : (
        <section className="panel divide-y divide-white/10">
          {rows.map((row) => (
            <div key={row.episodeId} className="grid gap-4 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{row.episodeId}</p>
                  <h2 className="mt-1 text-xl font-black">{row.ready ? "Ready to film" : "Needs attention"}</h2>
                </div>
                <p className={`status-badge ${row.ready ? "border-signal text-signal" : "border-ember text-ember"}`}>{row.readiness}% ready</p>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {row.checks.map((check) => (
                  <div key={check.label} className="border border-white/10 bg-black/20 p-3">
                    <p className={`text-sm font-black ${check.passed ? "text-signal" : "text-ember"}`}>{check.passed ? "Passed" : "Open"} / {check.label}</p>
                    <p className="mt-1 text-sm text-paper/60">{check.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </section>
  );
}
