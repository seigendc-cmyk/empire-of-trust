import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, LoadingState } from "../components/States";
import { assignActorToCharacter, getCastingBoard, listProduction, updateCastingStatus } from "../lib/productionRepository";
import type { EotCasting, ProductionActor } from "../types";

type CastingRow = Awaited<ReturnType<typeof getCastingBoard>>[number];

const castingStatuses: EotCasting["status"][] = ["shortlisted", "auditioned", "selected", "approved", "rejected"];

export default function CastingBoard() {
  const [rows, setRows] = useState<CastingRow[]>([]);
  const [actors, setActors] = useState<ProductionActor[]>([]);
  const [selectedActors, setSelectedActors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const [boardRows, actorRows] = await Promise.all([getCastingBoard(), listProduction<ProductionActor>("actors")]);
    setRows(boardRows);
    setActors(actorRows);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function assign(characterId: string) {
    const actorId = selectedActors[characterId];
    if (!actorId) {
      setMessage("Select an actor before assigning.");
      return;
    }
    setWorkingId(characterId);
    await assignActorToCharacter({ characterId, actorId, status: "shortlisted" });
    setMessage("Actor shortlisted.");
    await load();
    setWorkingId("");
  }

  async function setStatus(casting: EotCasting, status: EotCasting["status"]) {
    setWorkingId(casting.id);
    await updateCastingStatus(casting, status);
    setMessage("Casting status updated.");
    await load();
    setWorkingId("");
  }

  if (loading) return <LoadingState label="Loading casting board..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Production Studio" title="Casting Board" subtitle="Assign actors to production characters and move casting decisions toward approval." actions={[{ label: "Actors", to: "/studio/production/actors" }, { label: "Characters", to: "/studio/production/characters" }, { label: "Production", to: "/studio/production" }]} />
      {message && <p className="border border-signal bg-signal/10 p-3 text-sm font-bold text-signal">{message}</p>}
      {rows.length === 0 ? (
        <EmptyState title="No production characters" message="Create production characters before casting." actionLabel="Create character" actionTo="/studio/production/characters" />
      ) : (
        <section className="panel divide-y divide-white/10">
          {rows.map((row) => (
            <div key={row.character.id} className="grid gap-4 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{row.character.role || "Character"}</p>
                  <h2 className="mt-1 text-xl font-black">{row.character.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-paper/60">{row.character.backstory || row.character.personality || row.character.currentStoryStatus}</p>
                </div>
                <p className={`status-badge ${row.needsCasting ? "border-ember text-ember" : "border-signal text-signal"}`}>{row.needsCasting ? "Needs casting" : "Covered"}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <select className="field" value={selectedActors[row.character.id] ?? ""} onChange={(event) => setSelectedActors((current) => ({ ...current, [row.character.id]: event.currentTarget.value }))}>
                  <option value="">Select actor</option>
                  {actors.map((actor) => <option key={actor.id} value={actor.id}>{actor.fullName || actor.stageName || actor.id}</option>)}
                </select>
                <button className="btn btn-primary" type="button" disabled={workingId === row.character.id} onClick={() => assign(row.character.id)}>Shortlist</button>
              </div>
              {row.assignments.length > 0 && (
                <div className="grid gap-2">
                  {row.assignments.map((casting) => {
                    const actor = actors.find((item) => item.id === casting.actorId);
                    return (
                      <div key={casting.id} className="grid gap-3 border border-white/10 bg-black/20 p-3 lg:grid-cols-[1fr_auto]">
                        <div>
                          <p className="font-bold">{actor?.fullName || actor?.stageName || casting.actorId}</p>
                          <p className="mt-1 text-sm text-paper/60">{casting.status} {casting.notes ? `/ ${casting.notes}` : ""}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {castingStatuses.map((status) => (
                            <button key={status} className={`btn ${casting.status === status ? "btn-primary" : ""}`} type="button" disabled={workingId === casting.id} onClick={() => setStatus(casting, status)}>{status}</button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </section>
      )}
    </section>
  );
}
