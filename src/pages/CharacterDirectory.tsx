import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, LoadingState } from "../components/States";
import { characterStatuses, getCharacterIntelligence, searchCharacters } from "../lib/characterRepository";
import type { EotCharacter } from "../types";

export default function CharacterDirectory() {
  const [characters, setCharacters] = useState<EotCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [intelligence, setIntelligence] = useState<Awaited<ReturnType<typeof getCharacterIntelligence>> | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([searchCharacters(search, status), getCharacterIntelligence()])
      .then(([rows, summary]) => {
        setCharacters(rows);
        setIntelligence(summary);
      })
      .finally(() => setLoading(false));
  }, [search, status]);

  if (loading) return <LoadingState label="Loading character universe..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow="Character Universe"
        title="Master character database"
        subtitle="Reusable character entities for episodes, chapters, paragraphs, actors, businesses, assets, production schedules, and relationship intelligence."
        actions={[{ label: "New Character", to: "/characters/new", primary: true }, { label: "Meet Characters", to: "/characters/meet" }, { label: "Relationships", to: "/characters/relationships" }, { label: "Timeline", to: "/characters/timeline" }]}
      />
      <section className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <input className="field" placeholder="Search by name, nickname, occupation, business, role, or status" value={search} onChange={(event) => setSearch(event.currentTarget.value)} />
        <select className="field" value={status} onChange={(event) => setStatus(event.currentTarget.value)}>
          <option value="all">All statuses</option>
          {characterStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </section>
      {intelligence && (
        <section className="grid grid-cols-3 gap-3">
          <Metric label="Characters" value={intelligence.stats.characters} />
          <Metric label="Relationships" value={intelligence.stats.relationships} />
          <Metric label="Appearances" value={intelligence.stats.appearances} />
        </section>
      )}
      <section className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <div className="panel divide-y divide-white/10">
          {characters.map((character) => <CharacterRow key={character.id} character={character} />)}
          {characters.length === 0 && <div className="p-4"><EmptyState title="No characters" message="No matching character records are cached locally or available from Firestore." actionLabel="Create character" actionTo="/characters/new" /></div>}
        </div>
        {intelligence && (
          <aside className="grid gap-3 content-start">
            <Insight title="Most Active" rows={intelligence.mostActive} />
            <Insight title="Most Connected" rows={intelligence.mostConnected} />
            <Insight title="Most Influential" rows={intelligence.mostInfluential} />
            <Insight title="Most Mentioned" rows={intelligence.mostMentioned} />
          </aside>
        )}
      </section>
    </section>
  );
}

function CharacterRow({ character }: { character: EotCharacter }) {
  return (
    <Link className="grid gap-3 p-4 hover:bg-white/5 sm:grid-cols-[88px_1fr_auto] sm:items-center" to={`/characters/${character.id}`}>
      <div className="h-24 border border-white/10 bg-black/20">
        {character.portraitUrl || character.imageUrl ? <img className="h-full w-full object-cover" src={character.portraitUrl || character.imageUrl} alt="" /> : <div className="grid h-full place-items-center text-xs font-black text-signal">{character.characterCode || "CHAR"}</div>}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <span className="status-badge border-signal text-signal">{character.status || "active"}</span>
          <span className="status-badge border-white/15 text-paper/60">{character.role || "Role pending"}</span>
        </div>
        <h2 className="mt-2 text-xl font-black">{character.displayName || character.name}</h2>
        <p className="mt-1 text-sm leading-6 text-paper/60">{character.occupation || "Occupation pending"} / {character.nationality || "Nationality pending"}</p>
      </div>
      <span className="text-xs font-bold uppercase tracking-[0.14em] text-paper/45">{character.characterCode}</span>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <article className="panel p-4"><p className="text-2xl font-black text-signal">{value}</p><p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-paper/50">{label}</p></article>;
}

function Insight({ title, rows }: { title: string; rows: EotCharacter[] }) {
  return (
    <section className="panel p-4">
      <h2 className="text-base font-black">{title}</h2>
      <div className="mt-3 grid gap-2">
        {rows.map((character) => <Link key={character.id} className="border border-white/10 bg-black/20 p-2 text-sm font-bold text-paper/75" to={`/characters/${character.id}`}>{character.displayName || character.name}</Link>)}
        {rows.length === 0 && <p className="text-sm text-paper/60">No data yet.</p>}
      </div>
    </section>
  );
}
