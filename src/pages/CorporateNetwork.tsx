import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { LoadingState } from "../components/States";
import { listBusinesses, listCharacters, listRelationships } from "../lib/universeRepository";
import type { EotBusiness, EotCharacter, EotRelationship } from "../types";

const corporateTypes = new Set(["business_partner", "director", "shareholder", "employee", "mentor", "rival"]);

export default function CorporateNetwork() {
  const [businesses, setBusinesses] = useState<EotBusiness[]>([]);
  const [characters, setCharacters] = useState<EotCharacter[]>([]);
  const [relationships, setRelationships] = useState<EotRelationship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listBusinesses(), listCharacters(), listRelationships()]).then(([biz, chars, rels]) => {
      setBusinesses(biz);
      setCharacters(chars);
      setRelationships(rels.filter((rel) => corporateTypes.has(rel.type)));
    }).finally(() => setLoading(false));
  }, []);

  const characterLookup = useMemo(() => new Map(characters.map((item) => [item.id, item.displayName || item.name])), [characters]);

  if (loading) return <LoadingState label="Loading corporate network..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Universe" title="Corporate network" subtitle="Companies, directors, shareholders, alliances, and rivals." actions={[{ label: "Businesses", to: "/businesses" }]} />
      <section className="grid gap-3">
        {businesses.length === 0 && <div className="panel p-4 text-sm text-paper/60">No businesses are cached yet.</div>}
        {businesses.map((business) => (
          <div key={business.id} className="panel p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{business.sector}</p>
            <Link className="mt-2 block text-xl font-black" to={`/businesses/${business.id}`}>{business.name}</Link>
            <p className="mt-2 text-sm text-paper/60">{business.city}, {business.country}</p>
            <div className="mt-3 grid gap-2">
              <div>
                <p className="label">Owners</p>
                <div className="flex flex-wrap gap-2">{business.ownerCharacterIds?.map((id) => <Link key={id} className="border border-white/10 px-2 py-1 text-xs text-paper/70" to={`/characters/${id}`}>{characterLookup.get(id) ?? id}</Link>)}</div>
              </div>
              <div>
                <p className="label">Executives</p>
                <div className="flex flex-wrap gap-2">{business.executiveCharacterIds?.map((id) => <Link key={id} className="border border-white/10 px-2 py-1 text-xs text-paper/70" to={`/characters/${id}`}>{characterLookup.get(id) ?? id}</Link>)}</div>
              </div>
            </div>
          </div>
        ))}
      </section>
      <section className="panel p-4">
        <h2 className="text-xl font-black">Corporate relationships</h2>
        <div className="mt-3 grid gap-2">
          {relationships.length === 0 && <p className="text-sm text-paper/60">No corporate relationship records cached yet.</p>}
          {relationships.map((rel) => (
            <div key={rel.id} className="border border-white/10 bg-black/20 p-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{rel.type}</p>
              <p className="mt-1 text-sm text-paper/70">{rel.label || rel.description || "Corporate relationship"}</p>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
