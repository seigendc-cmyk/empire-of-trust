import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, LoadingState } from "../components/States";
import { listPublicCharacters } from "../lib/characterRepository";
import type { EotCharacter } from "../types";

export default function MeetCharacters() {
  const [characters, setCharacters] = useState<EotCharacter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPublicCharacters()
      .then(setCharacters)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Loading the Empire of Trust cast..." />;

  return (
    <section className="page meet-characters-page">
      <header className="meet-characters-hero">
        <p className="text-accent text-xs font-bold uppercase tracking-[0.2em]">Empire of Trust Universe</p>
        <h1>MEET THE CHARACTERS</h1>
        <p>The people shaping the future of the John Ekeniah Empire.</p>
      </header>

      {characters.length === 0 ? (
        <EmptyState title="No public characters" message="Enable characters in the EOT Console to publish them here." actionLabel="Open Character Console" actionTo="/characters" />
      ) : (
        <div className="meet-character-rail" aria-label="Meet the Characters">
          {characters.map((character) => (
            <CharacterCard key={character.id} character={character} />
          ))}
        </div>
      )}
    </section>
  );
}

function CharacterCard({ character }: { character: EotCharacter }) {
  const portrait = character.portraitUrl || character.imageUrl;
  const traits = character.coreTraits?.length ? character.coreTraits : character.strengths?.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean) ?? [];
  const initials = (character.displayName || character.name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (
    <article className="meet-character-card">
      <div className="meet-character-portrait">
        {portrait ? (
          <img src={portrait} alt={character.displayName || character.name} />
        ) : (
          <div className="meet-character-placeholder" aria-hidden="true">
            {initials || "EOT"}
          </div>
        )}
      </div>
      <div className="meet-character-body">
        <div className="flex flex-wrap gap-2">
          <span className="status-badge border-signal text-signal">{character.archetype || "Key Player"}</span>
          <span className="status-badge border-white/15 text-muted">Age {character.age || "-"}</span>
        </div>
        <h2>{character.displayName || character.name}</h2>
        <p className="meet-character-position">{character.position || character.role || character.occupation || "Empire of Trust"}</p>
        <p className="meet-character-bio">{character.shortBiography || character.biography || character.backstory || "Profile details are being prepared by the EOT Console."}</p>
        <div className="meet-character-traits">
          {traits.slice(0, 4).map((trait) => (
            <span key={trait}>{trait}</span>
          ))}
        </div>
        {(character.signatureQuote || character.memorableQuotes?.[0]) && (
          <blockquote>{character.signatureQuote || character.memorableQuotes?.[0]}</blockquote>
        )}
        <Link className="btn btn-primary mt-auto w-full" to={`/characters/${character.id}`}>
          View Character
        </Link>
      </div>
    </article>
  );
}
