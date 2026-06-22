import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "./firebase";
import { readerDb } from "./offlineDb";
import type { EotActor, EotAsset, EotBusiness, EotCharacter, EotProperty, EotRelationship, EotVehicle } from "../types";

type CollectionName = "eotCharacters" | "eotActors" | "eotAssets" | "eotBusinesses" | "eotProperties" | "eotVehicles" | "eotRelationships";
type UniverseEntity = EotCharacter | EotActor | EotAsset | EotBusiness | EotProperty | EotVehicle | EotRelationship;
type UniverseKind = "characters" | "actors" | "assets" | "businesses" | "properties" | "vehicles" | "relationships";

const collectionByKind: Record<UniverseKind, CollectionName> = {
  characters: "eotCharacters",
  actors: "eotActors",
  assets: "eotAssets",
  businesses: "eotBusinesses",
  properties: "eotProperties",
  vehicles: "eotVehicles",
  relationships: "eotRelationships",
};

function withId<T>(snapshot: { id: string; data: () => unknown }) {
  return { id: snapshot.id, ...(snapshot.data() as object) } as T;
}

async function cacheEntities(kind: UniverseKind, values: UniverseEntity[]) {
  if (kind === "characters") await readerDb.characterCache.bulkPut(values as EotCharacter[]);
  if (kind === "actors" || kind === "assets" || kind === "businesses" || kind === "properties" || kind === "vehicles") {
    await readerDb.assetCache.bulkPut(values as (EotActor | EotAsset | EotBusiness | EotProperty | EotVehicle)[]);
  }
  if (kind === "relationships") await readerDb.relationshipCache.bulkPut(values as EotRelationship[]);
}

async function getCachedList<T extends UniverseEntity>(kind: UniverseKind) {
  if (kind === "characters") return (await readerDb.characterCache.toArray()) as T[];
  if (kind === "assets") return (await readerDb.assetCache.filter((item) => "type" in item && !("registration" in item) && !("location" in item)).toArray()) as T[];
  if (kind === "actors") return (await readerDb.assetCache.filter((item) => "stageName" in item).toArray()) as T[];
  if (kind === "businesses") return (await readerDb.assetCache.filter((item) => "sector" in item).toArray()) as T[];
  if (kind === "properties") return (await readerDb.assetCache.filter((item) => "location" in item).toArray()) as T[];
  if (kind === "vehicles") return (await readerDb.assetCache.filter((item) => "registration" in item).toArray()) as T[];
  if (kind === "relationships") return (await readerDb.relationshipCache.toArray()) as T[];
  return [] as T[];
}

async function getCachedOne<T extends UniverseEntity>(kind: UniverseKind, id: string) {
  if (kind === "characters") return readerDb.characterCache.get(id) as Promise<T | undefined>;
  if (kind === "actors" || kind === "assets" || kind === "businesses" || kind === "properties" || kind === "vehicles") return readerDb.assetCache.get(id) as Promise<T | undefined>;
  if (kind === "relationships") return readerDb.relationshipCache.get(id) as Promise<T | undefined>;
  return undefined;
}

export async function listUniverse<T extends UniverseEntity>(kind: UniverseKind) {
  try {
    const snapshots = await getDocs(query(collection(db, collectionByKind[kind]), orderBy(kind === "relationships" ? "type" : "name")));
    const values = snapshots.docs.map((item) => withId<T>(item));
    await cacheEntities(kind, values);
    return values;
  } catch {
    return getCachedList<T>(kind);
  }
}

export async function getUniverse<T extends UniverseEntity>(kind: UniverseKind, id: string) {
  try {
    const snapshot = await getDoc(doc(db, collectionByKind[kind], id));
    if (!snapshot.exists()) return getCachedOne<T>(kind, id);
    const value = withId<T>(snapshot);
    await cacheEntities(kind, [value]);
    return value;
  } catch {
    return getCachedOne<T>(kind, id);
  }
}

export async function listCharacters() {
  return listUniverse<EotCharacter>("characters");
}

export async function listActors() {
  return listUniverse<EotActor>("actors");
}

export async function listAssets() {
  return listUniverse<EotAsset>("assets");
}

export async function listBusinesses() {
  return listUniverse<EotBusiness>("businesses");
}

export async function listProperties() {
  return listUniverse<EotProperty>("properties");
}

export async function listVehicles() {
  return listUniverse<EotVehicle>("vehicles");
}

export async function listRelationships() {
  return listUniverse<EotRelationship>("relationships");
}

export async function searchUniverse(term: string) {
  const normalized = term.trim().toLowerCase();
  const [characters, actors, businesses, properties, vehicles] = await Promise.all([
    listCharacters(),
    listActors(),
    listBusinesses(),
    listProperties(),
    listVehicles(),
  ]);
  const match = (value: { id: string; name?: string; displayName?: string; stageName?: string; description?: string }) =>
    !normalized || [value.name, value.displayName, value.stageName, value.description].some((item) => String(item ?? "").toLowerCase().includes(normalized));
  return {
    characters: characters.filter(match),
    actors: actors.filter(match),
    businesses: businesses.filter(match),
    properties: properties.filter(match),
    vehicles: vehicles.filter(match),
  };
}
