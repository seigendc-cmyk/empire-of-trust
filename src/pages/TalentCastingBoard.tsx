import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, LoadingState } from "../components/States";
import { getCastingBoard } from "../lib/actorRepository";

type Board = Awaited<ReturnType<typeof getCastingBoard>>;

export default function TalentCastingBoard() {
  const [board, setBoard] = useState<Board>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCastingBoard().then(setBoard).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Loading casting board..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow="Casting Workflow"
        title="Actor casting board"
        subtitle="Move actor-character assignments from proposed through shortlisted, approved, confirmed, rejected, and replaced."
        actions={[{ label: "New Casting", to: "/studio/casting/new", primary: true }, { label: "Actors", to: "/studio/actors" }, { label: "Auditions", to: "/studio/casting/auditions" }]}
      />
      <section className="grid gap-3 xl:grid-cols-6">
        {board.map((column) => (
          <div key={column.status} className="panel min-w-0 p-3">
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-signal">{column.status}</h2>
            <div className="mt-3 grid gap-2">
              {column.assignments.map(({ assignment, actor, latestNote }) => (
                <Link key={assignment.id} className="border border-white/10 bg-black/20 p-3 hover:bg-white/5" to={`/studio/casting/${assignment.id}`}>
                  <h3 className="font-black">{actor?.fullName || actor?.name || assignment.actorId}</h3>
                  <p className="mt-1 text-sm font-bold text-paper/70">Character {assignment.characterId}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-paper/45">{assignment.roleType} / {assignment.status}</p>
                  {latestNote && <p className="mt-2 line-clamp-2 text-sm text-paper/60">{latestNote.note}</p>}
                </Link>
              ))}
              {column.assignments.length === 0 && <p className="border border-white/10 bg-black/20 p-3 text-sm text-paper/60">No cards.</p>}
            </div>
          </div>
        ))}
      </section>
      {board.every((column) => column.assignments.length === 0) && <EmptyState title="No casting assignments" message="Create casting assignments in Firestore or from the production casting tools." />}
    </section>
  );
}
