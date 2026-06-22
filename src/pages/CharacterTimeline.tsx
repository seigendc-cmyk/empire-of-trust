import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { LoadingState } from "../components/States";
import { listCharacterTimeline, listMasterCharacters } from "../lib/characterRepository";
import type { EotCharacter, EotCharacterTimelineEvent } from "../types";

export default function CharacterTimeline() {
  const [events, setEvents] = useState<EotCharacterTimelineEvent[]>([]);
  const [characters, setCharacters] = useState<EotCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const lookup = useMemo(() => new Map(characters.map((character) => [character.id, character.displayName || character.name])), [characters]);

  useEffect(() => {
    Promise.all([listCharacterTimeline(), listMasterCharacters()]).then(([eventRows, characterRows]) => {
      setEvents(eventRows);
      setCharacters(characterRows);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Loading character timeline..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Character Universe" title="Character timeline" subtitle="Major life, family, legal, property, and business events across the Empire of Trust cast." actions={[{ label: "Characters", to: "/characters" }, { label: "Relationships", to: "/characters/relationships" }]} />
      <section className="panel divide-y divide-white/10">
        {events.map((event) => (
          <article key={event.id} className="grid gap-3 p-4 sm:grid-cols-[140px_1fr_auto] sm:items-center">
            <p className="text-sm font-black text-signal">{event.eventDate || "Date pending"}</p>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-paper/45">{event.eventType}</p>
              <h2 className="mt-1 text-lg font-black">{event.title}</h2>
              <p className="mt-1 text-sm leading-6 text-paper/60">{event.description}</p>
            </div>
            <Link className="btn" to={`/characters/${event.characterId}`}>{lookup.get(event.characterId) ?? event.characterId}</Link>
          </article>
        ))}
        {events.length === 0 && <p className="p-4 text-sm text-paper/60">No cached timeline events yet.</p>}
      </section>
    </section>
  );
}
