import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { MediaReferencePanel } from "../components/MediaReferencePanel";
import { ErrorState, LoadingState } from "../components/States";
import { getActorContext } from "../lib/actorRepository";
import type { EotActor, EotActorAvailability, EotActorEpisodeAppearance, EotActorPortfolio, EotActorSceneAssignment, EotCastingAssignment, EotTalentNote } from "../types";

type View = "overview" | "portfolio" | "availability" | "episodes" | "scenes";

export default function ActorProfile({ view = "overview" }: { view?: View }) {
  const { actorId } = useParams();
  const [context, setContext] = useState<Awaited<ReturnType<typeof getActorContext>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!actorId) return;
    getActorContext(actorId).then(setContext).finally(() => setLoading(false));
  }, [actorId]);

  if (loading) return <LoadingState label="Loading actor profile..." />;
  if (!actorId || !context?.actor) return <ErrorState title="Actor not found" message="This actor is not available from Firestore or the local cache." />;
  const actor = context.actor;

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow={actor.actorCode || "Actor"}
        title={actor.fullName || actor.name}
        subtitle={`${actor.stageName || "No stage name"} / ${actor.status || "active"} / ${actor.availabilityStatus || "available"}`}
        actions={[{ label: "Edit", to: `/actors/${actorId}/edit`, primary: true }, { label: "Casting", to: "/studio/casting/board" }, { label: "Actors", to: "/actors" }]}
      />
      <nav className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5" aria-label="Actor sections">
        {[
          ["overview", "Overview"],
          ["portfolio", "Portfolio"],
          ["availability", "Availability"],
          ["episodes", "Episodes"],
          ["scenes", "Scenes"],
        ].map(([key, label]) => <Link key={key} className={`btn ${view === key ? "btn-primary" : ""}`} to={key === "overview" ? `/actors/${actorId}` : `/actors/${actorId}/${key}`}>{label}</Link>)}
      </nav>
      {view === "overview" && <><Overview actor={actor} casting={context.casting} notes={context.notes} /><MediaReferencePanel entityType="actor" entityId={actorId} title="Headshots, portfolio media, and prompts" /></>}
      {view === "portfolio" && <Portfolio rows={context.portfolio} />}
      {view === "availability" && <Availability rows={context.availability} />}
      {view === "episodes" && <Episodes rows={context.episodes} />}
      {view === "scenes" && <Scenes rows={context.scenes} />}
    </section>
  );
}

function Overview({ actor, casting, notes }: { actor: EotActor; casting: EotCastingAssignment[]; notes: EotTalentNote[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <section className="panel p-4">
        <div className="h-72 border border-white/10 bg-black/20">
          {actor.headshotUrl || actor.imageUrl ? <img className="h-full w-full object-cover" src={actor.headshotUrl || actor.imageUrl} alt="" /> : <div className="grid h-full place-items-center text-lg font-black text-signal">{actor.actorCode || "ACT"}</div>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="status-badge border-signal text-signal">{actor.status}</span>
          <span className="status-badge border-white/15 text-paper/65">{actor.availabilityStatus}</span>
          <span className="status-badge border-white/15 text-paper/65">{actor.experienceLevel}</span>
        </div>
      </section>
      <div className="grid gap-4">
        <Info title="Talent profile" rows={[["Bio", actor.bio || actor.biography], ["Languages", actor.languages?.join(", ")], ["Skills", actor.skills?.join(", ")], ["Notes", actor.notes]]} />
        <Info title="Contact" rows={[["Phone", actor.phone], ["WhatsApp", actor.whatsapp], ["Email", actor.email], ["Location", [actor.city, actor.country].filter(Boolean).join(", ")]]} />
      </div>
      <section className="panel p-4 lg:col-span-2">
        <h2 className="text-xl font-black">Characters portrayed</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {[...(actor.characterIds ?? []), ...casting.map((row) => row.characterId)].filter(Boolean).map((id) => <Link key={id} className="border border-signal px-3 py-2 text-sm font-bold text-signal" to={`/characters/${id}`}>{id}</Link>)}
          {(actor.characterIds ?? []).length === 0 && casting.length === 0 && <p className="text-sm text-paper/60">No character assignments cached yet.</p>}
        </div>
      </section>
      <RecordList title="Talent notes" empty="No talent notes cached yet." rows={notes.map((row) => ({ id: row.id, primary: row.noteType, secondary: String(row.createdAt), detail: row.note }))} />
    </div>
  );
}

function Portfolio({ rows }: { rows: EotActorPortfolio[] }) {
  return <RecordList title="Portfolio" empty="No portfolio items cached yet." rows={rows.map((row) => ({ id: row.id, primary: row.title, secondary: row.portfolioType, detail: row.description || row.externalUrl || row.fileUrl }))} />;
}

function Availability({ rows }: { rows: EotActorAvailability[] }) {
  return <RecordList title="Availability" empty="No availability records cached yet." rows={rows.map((row) => ({ id: row.id, primary: `${row.date} / ${row.status}`, secondary: [row.startTime, row.endTime].filter(Boolean).join(" - "), detail: row.reason || row.notes }))} />;
}

function Episodes({ rows }: { rows: EotActorEpisodeAppearance[] }) {
  return <RecordList title="Episode appearances" empty="No episode appearances cached yet." rows={rows.map((row) => ({ id: row.id, primary: `S${row.seasonNumber}E${row.episodeNumber}`, secondary: `${row.appearanceType} / ${row.productionStatus}`, detail: row.episodeId }))} />;
}

function Scenes({ rows }: { rows: EotActorSceneAssignment[] }) {
  return <RecordList title="Scene assignments" empty="No scene assignments cached yet." rows={rows.map((row) => ({ id: row.id, primary: row.sceneId, secondary: `${row.status} / ${row.scheduledDate ?? "unscheduled"}`, detail: [row.callTime, row.wrapTime, row.notes].filter(Boolean).join(" / ") }))} />;
}

function Info({ title, rows }: { title: string; rows: Array<[string, string | undefined]> }) {
  return <section className="panel p-4"><h2 className="text-xl font-black">{title}</h2><dl className="mt-3 grid gap-2">{rows.filter(([, value]) => value).map(([label, value]) => <div key={label} className="border border-white/10 bg-black/20 p-3"><dt className="text-xs font-bold uppercase tracking-[0.12em] text-paper/45">{label}</dt><dd className="mt-1 text-sm leading-6 text-paper/75">{value}</dd></div>)}</dl></section>;
}

function RecordList({ title, empty, rows }: { title: string; empty: string; rows: Array<{ id: string; primary: string; secondary: string; detail?: string }> }) {
  return <section className="panel p-4 lg:col-span-2"><h2 className="text-xl font-black">{title}</h2><div className="mt-4 grid gap-3">{rows.map((row) => <article key={row.id} className="border border-white/10 bg-black/20 p-3"><h3 className="font-black">{row.primary}</h3><p className="mt-1 text-sm font-bold text-signal">{row.secondary}</p>{row.detail && <p className="mt-2 text-sm leading-6 text-paper/65">{row.detail}</p>}</article>)}{rows.length === 0 && <p className="text-sm text-paper/60">{empty}</p>}</div></section>;
}
