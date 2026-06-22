import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { LoadingState } from "../components/States";
import { listCharacters, listRelationships } from "../lib/universeRepository";
import type { EotCharacter, EotRelationship } from "../types";

const familyTypes = new Set(["parent", "child", "sibling", "spouse", "ex_spouse", "lover"]);

export default function FamilyTree() {
  const [characters, setCharacters] = useState<EotCharacter[]>([]);
  const [relationships, setRelationships] = useState<EotRelationship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listCharacters(), listRelationships()]).then(([chars, rels]) => {
      setCharacters(chars);
      setRelationships(rels.filter((rel) => familyTypes.has(rel.type)));
    }).finally(() => setLoading(false));
  }, []);

  const lookup = useMemo(() => new Map(characters.map((item) => [item.id, item.displayName || item.name])), [characters]);
  const trust = characters.find((item) => /trust/i.test(`${item.name} ${item.displayName}`));

  if (loading) return <LoadingState label="Loading family tree..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Universe" title="Family tree" subtitle="Explore family, former spouses, current relationships, and extended ties." actions={[{ label: "Characters", to: "/characters" }]} />
      {trust && (
        <section className="panel border-l-4 border-l-signal p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">Root profile</p>
          <Link className="mt-2 block text-2xl font-black" to={`/characters/${trust.id}`}>{trust.displayName || trust.name}</Link>
          <p className="mt-2 text-sm text-paper/60">{trust.role}</p>
        </section>
      )}
      <section className="grid gap-3">
        {relationships.length === 0 && <div className="panel p-4 text-sm text-paper/60">No family relationships are cached yet.</div>}
        {relationships.map((rel) => (
          <div key={rel.id} className="panel p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{rel.type}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              {[rel.fromCharacterId, ...(rel.characterIds ?? [])].filter(Boolean).map((id) => <Link key={id} className="border border-white/10 px-3 py-2 text-paper/80" to={`/characters/${id}`}>{lookup.get(id!) ?? id}</Link>)}
              {rel.toCharacterId && <><span className="text-paper/40">to</span><Link className="border border-white/10 px-3 py-2 text-paper/80" to={`/characters/${rel.toCharacterId}`}>{lookup.get(rel.toCharacterId) ?? rel.toCharacterId}</Link></>}
            </div>
            {rel.description && <p className="mt-3 text-sm text-paper/60">{rel.description}</p>}
          </div>
        ))}
      </section>
    </section>
  );
}
