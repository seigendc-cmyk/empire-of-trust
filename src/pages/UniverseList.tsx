import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, LoadingState } from "../components/States";
import {
  listActors,
  listAssets,
  listBusinesses,
  listCharacters,
  listProperties,
  listVehicles,
  searchUniverse,
} from "../lib/universeRepository";
import type { EotActor, EotAsset, EotBusiness, EotCharacter, EotProperty, EotVehicle } from "../types";

type Entity = EotCharacter | EotActor | EotAsset | EotBusiness | EotProperty | EotVehicle;
type Kind = "characters" | "actors" | "assets" | "businesses" | "properties" | "vehicles" | "search";

const config: Record<Exclude<Kind, "search">, { title: string; eyebrow: string; base: string; load: () => Promise<Entity[]> }> = {
  characters: { title: "Characters", eyebrow: "Universe", base: "/characters", load: listCharacters as () => Promise<Entity[]> },
  actors: { title: "Actors", eyebrow: "Universe", base: "/actors", load: listActors as () => Promise<Entity[]> },
  assets: { title: "Assets", eyebrow: "Universe", base: "/assets", load: listAssets as () => Promise<Entity[]> },
  businesses: { title: "Businesses", eyebrow: "Universe", base: "/businesses", load: listBusinesses as () => Promise<Entity[]> },
  properties: { title: "Properties", eyebrow: "Universe", base: "/properties", load: listProperties as () => Promise<Entity[]> },
  vehicles: { title: "Vehicles", eyebrow: "Universe", base: "/vehicles", load: listVehicles as () => Promise<Entity[]> },
};

function titleOf(item: Entity) {
  return "displayName" in item ? item.displayName || item.name : "stageName" in item ? item.stageName || item.name : item.name;
}

function subtitleOf(item: Entity) {
  if ("role" in item) return `${item.role || "Character"} / ${item.occupation || "Occupation pending"}`;
  if ("sector" in item) return `${item.sector || "Business"} / ${item.city || "City pending"}`;
  if ("type" in item) return item.type;
  return "Empire of Trust";
}

export default function UniverseList({ kind }: { kind: Kind }) {
  const [items, setItems] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    if (kind === "search") {
      searchUniverse(search).then((result) => {
        setItems([...result.characters, ...result.actors, ...result.businesses, ...result.properties, ...result.vehicles]);
        setLoading(false);
      });
      return;
    }
    config[kind].load().then(setItems).finally(() => setLoading(false));
  }, [kind, search]);

  const page = kind === "search" ? { title: "Universe search", eyebrow: "Search", base: "" } : config[kind];
  const filtered = useMemo(() => items.filter((item) => titleOf(item).toLowerCase().includes(search.toLowerCase()) || subtitleOf(item).toLowerCase().includes(search.toLowerCase())), [items, search]);

  if (loading) return <LoadingState label="Loading universe..." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow={page.eyebrow} title={page.title} subtitle="Explore the living Empire of Trust world." actions={[{ label: "Family tree", to: "/family-tree" }, { label: "Corporate", to: "/corporate-network" }]} />
      <input className="field" placeholder="Search universe" value={search} onChange={(event) => setSearch(event.target.value)} />
      {filtered.length === 0 ? (
        <EmptyState title="No universe records" message="No matching records are cached locally or available from Firestore yet." />
      ) : (
        <div className="panel divide-y divide-white/10">
          {filtered.map((item) => {
            const route = "stageName" in item ? `/actors/${item.id}` : "sector" in item ? `/businesses/${item.id}` : "registration" in item ? `/vehicles/${item.id}` : "location" in item ? `/properties/${item.id}` : kind === "assets" ? `/assets/${item.id}` : `/characters/${item.id}`;
            return (
              <Link key={item.id} to={kind === "search" ? route : `${page.base}/${item.id}`} className="grid gap-3 p-4 hover:bg-white/5 sm:grid-cols-[72px_1fr]">
                <div className="h-20 border border-white/10 bg-black/30">
                  {"imageUrl" in item && item.imageUrl ? <img className="h-full w-full object-cover" src={item.imageUrl} alt="" /> : <div className="grid h-full place-items-center text-xs font-black text-signal">EOT</div>}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-signal">{subtitleOf(item)}</p>
                  <h2 className="mt-1 text-xl font-black">{titleOf(item)}</h2>
                  {"biography" in item && item.biography && <p className="mt-2 line-clamp-2 text-sm text-paper/60">{item.biography}</p>}
                  {"description" in item && item.description && <p className="mt-2 line-clamp-2 text-sm text-paper/60">{item.description}</p>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
