import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { LoadingState } from "../components/States";
import { getCharacterIntelligence, listCharacterAppearances, listMasterCharacters } from "../lib/characterRepository";
import type { EotCharacter, EotCharacterAppearance } from "../types";

export default function CharacterAppearances() {
  const [appearances, setAppearances] = useState<EotCharacterAppearance[]>([]);
  const [characters, setCharacters] = useState<EotCharacter[]>([]);
  const [intelligence, setIntelligence] = useState<Awaited<ReturnType<typeof getCharacterIntelligence>> | null>(null);
  const [loading, setLoading] = useState(true);
  const lookup = useMemo(() => new Map(characters.map((character) => [character.id, character.displayName || character.name])), [characters]);

  useEffect(() => {
    Promise.all([listCharacterAppearances(), listMasterCharacters(), getCharacterIntelligence()]).then(([appearanceRows, characterRows, summary]) => {
      setAppearances(appearanceRows);
      setCharacters(characterRows);
      setIntelligence(summary);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Loading character appearances..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Story Presence Engine" title="Character appearances" subtitle="Track season, episode, chapter, screen time, importance, and story impact for each character." actions={[{ label: "Characters", to: "/characters" }, { label: "Timeline", to: "/characters/timeline" }]} />
      {intelligence && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Insight title="Most Active" rows={intelligence.mostActive} />
          <Insight title="Most Connected" rows={intelligence.mostConnected} />
          <Insight title="Most Influential" rows={intelligence.mostInfluential} />
          <Insight title="Most Mentioned" rows={intelligence.mostMentioned} />
        </section>
      )}
      <section className="panel divide-y divide-white/10">
        {appearances.map((appearance) => (
          <article key={appearance.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-signal">S{appearance.seasonNumber}E{appearance.episodeNumber} / Chapter {appearance.chapterNumber} / {appearance.importance}</p>
              <h2 className="mt-1 text-lg font-black">{lookup.get(appearance.characterId) ?? appearance.characterId}</h2>
              <p className="mt-1 text-sm text-paper/60">Screen time {appearance.screenTimeEstimate || "pending"} / story impact {appearance.storyImpactScore}</p>
            </div>
            <Link className="btn" to={`/characters/${appearance.characterId}`}>Open profile</Link>
          </article>
        ))}
        {appearances.length === 0 && <p className="p-4 text-sm text-paper/60">No character appearances tracked yet.</p>}
      </section>
    </section>
  );
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
