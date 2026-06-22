import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { LoadingState } from "../components/States";
import { getContinuityDashboard, getEntityContinuity, runProductionContinuityChecks, updateWarningStatus } from "../lib/continuityRepository";
import type { EotContinuityWarning, EotTimelineEvent } from "../types";

type View = "dashboard" | "checks" | "warnings" | "rules" | "entity";

export default function ContinuityDashboard({ view = "dashboard", entityType }: { view?: View; entityType?: string }) {
  const params = useParams();
  const entityId = params.episodeId ?? params.characterId ?? params.businessId ?? params.propertyId ?? params.vehicleId ?? "";
  const [data, setData] = useState<Awaited<ReturnType<typeof getContinuityDashboard>> | null>(null);
  const [entity, setEntity] = useState<{ events: EotTimelineEvent[]; warnings: EotContinuityWarning[] } | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const dashboard = await getContinuityDashboard();
    setData(dashboard);
    if (entityType && entityId) setEntity(await getEntityContinuity(entityType, entityId));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [entityId, entityType]);

  const warnings = useMemo(() => data?.warnings ?? [], [data]);

  if (loading || !data) return <LoadingState label="Loading continuity engine..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow="Continuity Engine"
        title={entityType ? `${entityType} continuity` : "Timeline & continuity dashboard"}
        subtitle="Local rule checks for episode logic, timeline order, production readiness, entity status, and unresolved warnings."
        actions={[{ label: "Run Production Checks", onClick: async () => { await runProductionContinuityChecks(); await load(); }, primary: true }, { label: "Timeline", to: "/studio/timeline" }]}
      />
      {view === "dashboard" && (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            <Metric label="Events" value={data.counts.events} />
            <Metric label="Rules" value={data.counts.rules} />
            <Metric label="Checks" value={data.counts.checks} />
            <Metric label="Warnings" value={data.counts.warnings} />
            <Metric label="Open" value={data.counts.openWarnings} />
            <Metric label="Critical" value={data.counts.criticalWarnings} />
          </section>
          <WarningList warnings={warnings.filter((warning) => warning.status === "open").slice(0, 12)} onUpdate={load} />
        </>
      )}
      {view === "checks" && <Records title="Continuity checks" rows={data.checks.map((row) => [row.id, `${row.result} / ${row.severity} / ${row.targetType}`, row.message])} />}
      {view === "warnings" && <WarningList warnings={warnings} onUpdate={load} />}
      {view === "rules" && <Records title="Continuity rules" rows={data.rules.map((row) => [row.id, `${row.ruleCode} / ${row.severity} / ${row.active ? "active" : "inactive"}`, row.title])} />}
      {view === "entity" && entity && (
        <section className="grid gap-4 lg:grid-cols-2">
          <Records title="Timeline events" rows={entity.events.map((row) => [row.id, `${row.storyDate} / ${row.eventType} / ${row.importance}`, row.title])} />
          <WarningList warnings={entity.warnings} onUpdate={load} />
        </section>
      )}
      <section className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Link className="btn" to="/studio/continuity/checks">Checks</Link>
        <Link className="btn" to="/studio/continuity/warnings">Warnings</Link>
        <Link className="btn" to="/studio/continuity/rules">Rules</Link>
        <Link className="btn" to="/studio/timeline/events">Events</Link>
      </section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <article className="panel p-4"><p className="text-2xl font-black text-signal">{value}</p><p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-paper/50">{label}</p></article>;
}

function WarningList({ warnings, onUpdate }: { warnings: EotContinuityWarning[]; onUpdate: () => void }) {
  return (
    <section className="panel p-4">
      <h2 className="text-xl font-black">Continuity warnings</h2>
      <div className="mt-4 grid gap-3">
        {warnings.map((warning) => (
          <article key={warning.id} className="border border-white/10 bg-black/20 p-3">
            <p className={`text-xs font-bold uppercase tracking-[0.14em] ${warning.severity === "critical" ? "text-ember" : "text-signal"}`}>{warning.severity} / {warning.status} / {warning.targetType}</p>
            <h3 className="mt-1 font-black">{warning.title}</h3>
            <p className="mt-2 text-sm text-paper/60">{warning.message}</p>
            <p className="mt-1 text-sm text-paper/60">{warning.recommendation}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["acknowledged", "resolved", "ignored"] as const).map((status) => <button key={status} className="btn" type="button" onClick={async () => { await updateWarningStatus(warning, status); onUpdate(); }}>{status}</button>)}
            </div>
          </article>
        ))}
        {warnings.length === 0 && <p className="text-sm text-paper/60">No warnings in this view.</p>}
      </div>
    </section>
  );
}

function Records({ title, rows }: { title: string; rows: Array<[string, string, string]> }) {
  return <section className="panel p-4"><h2 className="text-xl font-black">{title}</h2><div className="mt-4 grid gap-3">{rows.map(([id, primary, detail]) => <article key={id} className="border border-white/10 bg-black/20 p-3"><h3 className="font-black">{primary}</h3><p className="mt-2 text-sm text-paper/60">{detail}</p></article>)}{rows.length === 0 && <p className="text-sm text-paper/60">No records cached yet.</p>}</div></section>;
}
