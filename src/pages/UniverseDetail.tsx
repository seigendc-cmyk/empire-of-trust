import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { MediaReferencePanel } from "../components/MediaReferencePanel";
import { ErrorState, LoadingState } from "../components/States";
import { logActivity } from "../lib/offlineDb";
import { listProducts, listVendors } from "../lib/mallRepository";
import {
  getUniverse,
  listActors,
  listBusinesses,
  listCharacters,
  listProperties,
  listRelationships,
  listVehicles,
} from "../lib/universeRepository";
import type { EotActor, EotAsset, EotBusiness, EotCharacter, EotProduct, EotProperty, EotRelationship, EotVehicle, EotVendor } from "../types";

type Kind = "characters" | "actors" | "assets" | "businesses" | "properties" | "vehicles";
type Entity = EotCharacter | EotActor | EotAsset | EotBusiness | EotProperty | EotVehicle;

const routeByKind: Record<Kind, string> = {
  characters: "/characters",
  actors: "/actors",
  assets: "/assets",
  businesses: "/businesses",
  properties: "/properties",
  vehicles: "/vehicles",
};

function entityTitle(entity: Entity) {
  return "displayName" in entity ? entity.displayName || entity.name : "stageName" in entity ? entity.stageName || entity.name : entity.name;
}

function RelationLinks({ title, ids, base, lookup }: { title: string; ids?: string[]; base: string; lookup: Map<string, string> }) {
  if (!ids || ids.length === 0) return null;
  return (
    <section className="panel p-4">
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {ids.map((id) => <Link key={id} className="border border-signal px-3 py-2 text-sm font-bold text-signal" to={`${base}/${id}`}>{lookup.get(id) ?? id}</Link>)}
      </div>
    </section>
  );
}

export default function UniverseDetail({ kind }: { kind: Kind }) {
  const params = useParams();
  const id = params.characterId ?? params.actorId ?? params.assetId ?? params.businessId ?? params.propertyId ?? params.vehicleId ?? "";
  const [entity, setEntity] = useState<Entity | null>(null);
  const [relationships, setRelationships] = useState<EotRelationship[]>([]);
  const [characters, setCharacters] = useState<EotCharacter[]>([]);
  const [businesses, setBusinesses] = useState<EotBusiness[]>([]);
  const [properties, setProperties] = useState<EotProperty[]>([]);
  const [vehicles, setVehicles] = useState<EotVehicle[]>([]);
  const [commerceVendors, setCommerceVendors] = useState<EotVendor[]>([]);
  const [commerceProducts, setCommerceProducts] = useState<EotProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getUniverse<Entity>(kind, id),
      listRelationships(),
      listCharacters(),
      listBusinesses(),
      listProperties(),
      listVehicles(),
      listVendors(),
      listProducts(),
    ]).then(([value, rels, chars, biz, props, cars, vendorRows, productRows]) => {
      setEntity(value ?? null);
      setRelationships(rels);
      setCharacters(chars);
      setBusinesses(biz);
      setProperties(props);
      setVehicles(cars);
      setCommerceVendors(vendorRows);
      setCommerceProducts(productRows);
      if (kind === "characters" && id) logActivity("character_profile_opened", { targetType: "character", targetId: id }).catch(() => undefined);
    }).finally(() => setLoading(false));
  }, [id, kind]);

  const characterLookup = useMemo(() => new Map(characters.map((item) => [item.id, item.displayName || item.name])), [characters]);
  const businessLookup = useMemo(() => new Map(businesses.map((item) => [item.id, item.name])), [businesses]);
  const propertyLookup = useMemo(() => new Map(properties.map((item) => [item.id, item.name])), [properties]);
  const vehicleLookup = useMemo(() => new Map(vehicles.map((item) => [item.id, item.name])), [vehicles]);

  if (loading) return <LoadingState label="Loading universe record..." />;
  if (!entity) return <ErrorState title="Universe record not found" message="This record is not available from Firestore or the local cache." />;

  const relatedRelationships = relationships.filter((rel) => [rel.fromCharacterId, rel.toCharacterId, rel.businessId, rel.assetId, ...(rel.characterIds ?? [])].includes(entity.id));
  const commerceLinks = "sector" in entity ? [...(entity.vendorIds ?? []), ...(entity.vendorId ? [entity.vendorId] : [])] : [];
  const linkedCommerceVendors = "sector" in entity ? commerceVendors.filter((vendor) => vendor.businessId === entity.id || vendor.linkedBusinessIds?.includes(entity.id) || commerceLinks.includes(vendor.id)) : [];
  const linkedCommerceProducts = "sector" in entity ? commerceProducts.filter((product) => product.linkedBusinessIds?.includes(entity.id) || linkedCommerceVendors.some((vendor) => vendor.id === product.vendorId)) : [];

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Universe" title={entityTitle(entity)} subtitle={"role" in entity ? entity.role : "sector" in entity ? entity.sector : "type" in entity ? entity.type : "Empire of Trust"} actions={[{ label: "Search", to: "/universe/search" }]} />
      <section className="panel grid gap-4 p-4 sm:grid-cols-[160px_1fr]">
        <div className="h-48 border border-white/10 bg-black/30">
          {"imageUrl" in entity && entity.imageUrl ? <img className="h-full w-full object-cover" src={entity.imageUrl} alt="" /> : <div className="grid h-full place-items-center text-lg font-black text-signal">EOT</div>}
        </div>
        <div className="grid gap-3 text-sm leading-6 text-paper/70">
          {"biography" in entity && entity.biography && <p>{entity.biography}</p>}
          {"description" in entity && entity.description && <p>{entity.description}</p>}
          {"personality" in entity && entity.personality && <p><span className="font-bold text-paper">Personality:</span> {entity.personality}</p>}
          {"currentStatus" in entity && entity.currentStatus && <p><span className="font-bold text-paper">Status:</span> {entity.currentStatus}</p>}
          {"country" in entity && <p>{entity.city}, {entity.country}</p>}
          {"registration" in entity && entity.registration && <p>Registration: {entity.registration}</p>}
        </div>
      </section>

      {"businessIds" in entity && <RelationLinks title="Businesses" ids={entity.businessIds} base="/businesses" lookup={businessLookup} />}
      {"propertyIds" in entity && <RelationLinks title="Properties" ids={entity.propertyIds} base="/properties" lookup={propertyLookup} />}
      {"vehicleIds" in entity && <RelationLinks title="Vehicles" ids={entity.vehicleIds} base="/vehicles" lookup={vehicleLookup} />}
      {"episodeAppearances" in entity && <RelationLinks title="Episodes" ids={entity.episodeAppearances} base="/reader" lookup={new Map()} />}
      {"characterIds" in entity && <RelationLinks title="Characters portrayed" ids={entity.characterIds} base="/characters" lookup={characterLookup} />}
      {"ownerCharacterIds" in entity && <RelationLinks title="Owners" ids={entity.ownerCharacterIds} base="/characters" lookup={characterLookup} />}
      {"executiveCharacterIds" in entity && <RelationLinks title="Executives" ids={entity.executiveCharacterIds} base="/characters" lookup={characterLookup} />}
      {commerceLinks.length > 0 && <RelationLinks title="Vendor storefronts" ids={commerceLinks} base="/mall/vendors" lookup={new Map()} />}
      {"sector" in entity && (
        <section className="panel p-4">
          <h2 className="text-xl font-black">Commercial layer</h2>
          <p className="mt-2 text-sm leading-6 text-paper/60">Search iTred Mall for storefronts and products related to this business.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="btn btn-primary" to={linkedCommerceVendors[0] ? `/mall/vendors/${linkedCommerceVendors[0].id}` : `/mall/search?query=${encodeURIComponent(entity.name)}`}>Open storefront</Link>
            <Link className="btn" to={`/mall/search?query=${encodeURIComponent(entity.name)}`}>Search mall</Link>
          </div>
          {linkedCommerceProducts.length > 0 && (
            <div className="mt-4 grid gap-2">
              {linkedCommerceProducts.slice(0, 5).map((product) => <Link key={product.id} className="border border-white/10 bg-black/20 p-3 text-sm font-bold text-paper/75" to={`/mall/products/${product.id}`}>{product.name} / {product.currency} {Number(product.price || 0).toFixed(2)}</Link>)}
            </div>
          )}
        </section>
      )}
      {"sector" in entity && <MediaReferencePanel entityType="business" entityId={entity.id} title="Logo, banner, marketing assets, and references" />}

      <section className="panel p-4">
        <h2 className="text-xl font-black">Relationships</h2>
        {relatedRelationships.length === 0 ? <p className="mt-3 text-sm text-paper/60">No cached relationships yet.</p> : (
          <div className="mt-3 grid gap-2">
            {relatedRelationships.map((rel) => (
              <div key={rel.id} className="border border-white/10 bg-black/20 p-3 text-sm">
                <p className="font-bold uppercase tracking-[0.14em] text-signal">{rel.type}</p>
                <p className="mt-1 text-paper/70">{rel.label || rel.description || "Relationship record"}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[rel.fromCharacterId, rel.toCharacterId, ...(rel.characterIds ?? [])].filter(Boolean).map((charId) => <Link key={charId} className="border border-white/10 px-2 py-1 text-xs text-paper/70" to={`/characters/${charId}`}>{characterLookup.get(charId!) ?? charId}</Link>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
