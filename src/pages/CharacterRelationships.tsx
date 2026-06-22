import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { LoadingState } from "../components/States";
import { getRelationshipGraph, relationshipTypes, upsertCharacterRelationship } from "../lib/characterRepository";
import type { EotCharacter, EotRelationship } from "../types";

export default function CharacterRelationships() {
  const [characters, setCharacters] = useState<EotCharacter[]>([]);
  const [relationships, setRelationships] = useState<EotRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState("");

  async function load() {
    const graph = await getRelationshipGraph();
    setCharacters(graph.characters);
    setRelationships(graph.relationships);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => selected ? relationships.filter((rel) => [rel.characterA, rel.characterB, rel.fromCharacterId, rel.toCharacterId].includes(selected)) : relationships, [relationships, selected]);
  const lookup = useMemo(() => new Map(characters.map((character) => [character.id, character.displayName || character.name])), [characters]);

  if (loading) return <LoadingState label="Loading relationship graph..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Character Universe" title="Relationship graph" subtitle="Family, friends, rivals, and business links between reusable character entities." actions={[{ label: "Characters", to: "/characters" }, { label: "New Character", to: "/characters/new", primary: true }]} />
      <section className="panel grid gap-3 p-4 lg:grid-cols-[280px_1fr]">
        <div className="grid gap-2 content-start">
          <button className={`btn ${!selected ? "btn-primary" : ""}`} onClick={() => setSelected("")}>All relationships</button>
          {characters.map((character) => <button key={character.id} className={`btn justify-start ${selected === character.id ? "btn-primary" : ""}`} onClick={() => setSelected(character.id)}>{character.displayName || character.name}</button>)}
        </div>
        <div className="min-h-[420px] border border-white/10 bg-black/20 p-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((rel) => (
              <article key={rel.id} className="border border-white/10 bg-black/20 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-signal">{rel.relationshipType || rel.type}</p>
                <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center text-sm font-bold">
                  <Link className="border border-white/10 p-2 hover:border-signal" to={`/characters/${rel.characterA || rel.fromCharacterId}`}>{lookup.get(rel.characterA || rel.fromCharacterId || "") ?? rel.characterA ?? rel.fromCharacterId}</Link>
                  <span className="text-signal">→</span>
                  <Link className="border border-white/10 p-2 hover:border-signal" to={`/characters/${rel.characterB || rel.toCharacterId}`}>{lookup.get(rel.characterB || rel.toCharacterId || "") ?? rel.characterB ?? rel.toCharacterId}</Link>
                </div>
                <p className="mt-3 text-xs text-paper/55">Strength {rel.relationshipStrength ?? 50} / Trust {rel.trustLevel ?? 50} / Conflict {rel.conflictLevel ?? 0}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <form className="panel grid gap-3 p-4 md:grid-cols-3" onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        await upsertCharacterRelationship({
          characterA: String(form.get("characterA") ?? ""),
          characterB: String(form.get("characterB") ?? ""),
          relationshipType: String(form.get("relationshipType") ?? "friend"),
          type: String(form.get("relationshipType") ?? "friend") as EotRelationship["type"],
          relationshipStrength: Number(form.get("relationshipStrength") ?? 50),
          trustLevel: Number(form.get("trustLevel") ?? 50),
          conflictLevel: Number(form.get("conflictLevel") ?? 0),
          notes: String(form.get("notes") ?? ""),
        });
        event.currentTarget.reset();
        await load();
      }}>
        <div className="md:col-span-3"><h2 className="text-xl font-black">Add relationship</h2></div>
        <SelectCharacter name="characterA" characters={characters} />
        <SelectCharacter name="characterB" characters={characters} />
        <label><span className="label">Relationship type</span><select className="field" name="relationshipType">{relationshipTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
        <label><span className="label">Strength</span><input className="field" name="relationshipStrength" type="number" min="1" max="100" defaultValue="50" /></label>
        <label><span className="label">Trust</span><input className="field" name="trustLevel" type="number" min="1" max="100" defaultValue="50" /></label>
        <label><span className="label">Conflict</span><input className="field" name="conflictLevel" type="number" min="1" max="100" defaultValue="0" /></label>
        <label className="md:col-span-3"><span className="label">Notes</span><textarea className="field min-h-20" name="notes" /></label>
        <button className="btn btn-primary md:col-span-3" type="submit">Save relationship</button>
      </form>
    </section>
  );
}

function SelectCharacter({ name, characters }: { name: string; characters: EotCharacter[] }) {
  return <label><span className="label">{name}</span><select className="field" name={name} required>{characters.map((character) => <option key={character.id} value={character.id}>{character.displayName || character.name}</option>)}</select></label>;
}
