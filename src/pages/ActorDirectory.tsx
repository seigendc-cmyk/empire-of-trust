import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, LoadingState } from "../components/States";
import { actorStatuses, availabilityStatuses, searchActors } from "../lib/actorRepository";
import type { EotActor } from "../types";

export default function ActorDirectory({ studio = false }: { studio?: boolean }) {
  const [params] = useSearchParams();
  const [actors, setActors] = useState<EotActor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [status, setStatus] = useState("all");
  const [availability, setAvailability] = useState("all");

  useEffect(() => {
    setLoading(true);
    searchActors(search, status, availability).then(setActors).finally(() => setLoading(false));
  }, [search, status, availability]);

  if (loading) return <LoadingState label="Loading actors..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow={studio ? "Talent Studio" : "Actor Universe"}
        title="Actor casting & talent management"
        subtitle="Actors, headshots, portfolios, availability, auditions, casting assignments, episode appearances, scenes, and talent notes."
        actions={[{ label: "New Actor", to: studio ? "/studio/actors/new" : "/actors/new", primary: true }, { label: "Casting Board", to: "/studio/casting/board" }]}
      />
      <section className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
        <input className="field" placeholder="Search by actor, character, language, status, role, city" value={search} onChange={(event) => setSearch(event.currentTarget.value)} />
        <select className="field" value={status} onChange={(event) => setStatus(event.currentTarget.value)}>
          <option value="all">All casting statuses</option>
          {actorStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select className="field" value={availability} onChange={(event) => setAvailability(event.currentTarget.value)}>
          <option value="all">All availability</option>
          {availabilityStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </section>
      {actors.length === 0 ? (
        <EmptyState title="No actors" message="No matching actors are cached locally or available from Firestore yet." actionLabel="Create actor" actionTo={studio ? "/studio/actors/new" : "/actors/new"} />
      ) : (
        <div className="panel divide-y divide-white/10">
          {actors.map((actor) => (
            <Link key={actor.id} className="grid gap-3 p-4 hover:bg-white/5 sm:grid-cols-[92px_1fr_auto] sm:items-center" to={`/actors/${actor.id}`}>
              <div className="h-24 border border-white/10 bg-black/20">
                {actor.headshotUrl || actor.imageUrl ? <img className="h-full w-full object-cover" src={actor.headshotUrl || actor.imageUrl} alt="" /> : <div className="grid h-full place-items-center text-xs font-black text-signal">{actor.actorCode || "ACT"}</div>}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <span className="status-badge border-signal text-signal">{actor.status || "active"}</span>
                  <span className="status-badge border-white/15 text-paper/60">{actor.availabilityStatus || "available"}</span>
                  <span className="status-badge border-white/15 text-paper/60">{actor.experienceLevel || "new"}</span>
                </div>
                <h2 className="mt-2 text-xl font-black">{actor.fullName || actor.name}</h2>
                <p className="mt-1 text-sm leading-6 text-paper/60">{[actor.stageName, actor.city, actor.country].filter(Boolean).join(" / ") || "Talent details pending"}</p>
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-paper/45">{actor.actorCode}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
