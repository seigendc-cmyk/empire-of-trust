import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, LoadingState } from "../components/States";
import { listTimelineEvents, timelineEventTypes } from "../lib/continuityRepository";
import type { EotTimelineEvent } from "../types";

export default function TimelineDirectory() {
  const [events, setEvents] = useState<EotTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState("all");
  const [season, setSeason] = useState("all");

  useEffect(() => {
    listTimelineEvents().then(setEvents).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const needle = search.toLowerCase();
    return events.filter((event) => {
      const typeOk = eventType === "all" || event.eventType === eventType;
      const seasonOk = season === "all" || String(event.seasonNumber ?? "") === season;
      const haystack = [event.title, event.description, event.eventCode, event.consequenceSummary, event.continuityNotes, event.episodeId, event.sceneId, ...event.involvedCharacterIds, ...event.involvedBusinessIds, ...event.involvedPropertyIds, ...event.involvedVehicleIds].join(" ").toLowerCase();
      return typeOk && seasonOk && (!needle || haystack.includes(needle));
    });
  }, [events, eventType, search, season]);

  if (loading) return <LoadingState label="Loading timeline..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Timeline" title="Episode timeline & continuity" subtitle="Story, family, business, property, vehicle, production, and release events across the Empire of Trust universe." actions={[{ label: "New Event", to: "/studio/timeline/new", primary: true }, { label: "Continuity", to: "/studio/continuity" }]} />
      <section className="grid gap-3 lg:grid-cols-[1fr_180px_140px]">
        <input className="field" placeholder="Search timeline events" value={search} onChange={(event) => setSearch(event.currentTarget.value)} />
        <select className="field" value={eventType} onChange={(event) => setEventType(event.currentTarget.value)}><option value="all">All types</option>{timelineEventTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <input className="field" placeholder="Season" value={season === "all" ? "" : season} onChange={(event) => setSeason(event.currentTarget.value || "all")} />
      </section>
      {filtered.length === 0 ? <EmptyState title="No timeline events" message="No matching timeline events are cached locally or available from Firestore yet." actionLabel="Create event" actionTo="/studio/timeline/new" /> : (
        <div className="panel divide-y divide-white/10">
          {filtered.map((event) => (
            <Link key={event.id} className="grid gap-2 p-4 hover:bg-white/5 lg:grid-cols-[1fr_auto]" to={`/studio/timeline/${event.id}`}>
              <div>
                <div className="flex flex-wrap gap-2"><span className="status-badge border-signal text-signal">{event.importance}</span><span className="status-badge border-white/15 text-paper/60">{event.eventType}</span></div>
                <h2 className="mt-2 text-xl font-black">{event.title}</h2>
                <p className="mt-1 text-sm text-paper/60">{event.storyDate} {event.storyTime || ""} / S{event.seasonNumber ?? "-"}E{event.episodeNumber ?? "-"}</p>
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-paper/45">{event.eventCode}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
