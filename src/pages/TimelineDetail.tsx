import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/States";
import { getTimelineEvent } from "../lib/continuityRepository";
import type { EotTimelineEvent } from "../types";

export default function TimelineDetail() {
  const { timelineEventId } = useParams();
  const [event, setEvent] = useState<EotTimelineEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!timelineEventId) return;
    getTimelineEvent(timelineEventId).then(setEvent).finally(() => setLoading(false));
  }, [timelineEventId]);

  if (loading) return <LoadingState label="Loading timeline event..." />;
  if (!event || !timelineEventId) return <ErrorState title="Timeline event not found" />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow={event.eventCode || "Timeline"} title={event.title} subtitle={`${event.eventType} / ${event.importance} / ${event.storyDate}`} actions={[{ label: "Edit", to: `/studio/timeline/${timelineEventId}/edit`, primary: true }, { label: "Timeline", to: "/studio/timeline" }]} />
      <section className="grid gap-4 lg:grid-cols-2">
        <Info title="Event" rows={[["Description", event.description], ["Consequence", event.consequenceSummary], ["Continuity", event.continuityNotes], ["Episode", event.episodeId], ["Scene", event.sceneId], ["Release", event.releaseDate]]} />
        <section className="panel p-4">
          <h2 className="text-xl font-black">Linked entities</h2>
          <div className="mt-3 grid gap-3">
            <LinkList title="Characters" ids={event.involvedCharacterIds} base="/characters" />
            <LinkList title="Businesses" ids={event.involvedBusinessIds} base="/businesses" />
            <LinkList title="Properties" ids={event.involvedPropertyIds} base="/properties" />
            <LinkList title="Vehicles" ids={event.involvedVehicleIds} base="/vehicles" />
          </div>
        </section>
      </section>
    </section>
  );
}

function Info({ title, rows }: { title: string; rows: Array<[string, string | undefined]> }) {
  return <section className="panel p-4"><h2 className="text-xl font-black">{title}</h2><dl className="mt-3 grid gap-2">{rows.filter(([, value]) => value).map(([label, value]) => <div key={label} className="border border-white/10 bg-black/20 p-3"><dt className="text-xs font-bold uppercase tracking-[0.12em] text-paper/45">{label}</dt><dd className="mt-1 text-sm leading-6 text-paper/75">{value}</dd></div>)}</dl></section>;
}

function LinkList({ title, ids, base }: { title: string; ids: string[]; base: string }) {
  return <div><h3 className="text-sm font-black">{title}</h3><div className="mt-2 flex flex-wrap gap-2">{ids.map((id) => <Link key={id} className="border border-signal px-2 py-1 text-xs font-bold text-signal" to={`${base}/${id}`}>{id}</Link>)}{ids.length === 0 && <p className="text-xs text-paper/60">No links.</p>}</div></div>;
}
