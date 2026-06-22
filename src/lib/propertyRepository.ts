import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { numberValue, stringValue } from "./forms";
import { readerDb } from "./offlineDb";
import type {
  EotProperty,
  EotPropertyAppearance,
  EotPropertyAssetRecord,
  EotPropertyOwnership,
  EotPropertyRelationship,
  EotPropertyTenant,
  EotPropertyValuation,
} from "../types";

const withId = <T>(snapshot: QueryDocumentSnapshot<DocumentData> | { id: string; data: () => DocumentData }) =>
  ({ id: snapshot.id, ...snapshot.data() }) as T;

export const propertyTypes = [
  "family_home",
  "mansion",
  "apartment",
  "office",
  "headquarters",
  "warehouse",
  "retail_space",
  "shopping_mall",
  "hotel",
  "resort",
  "lodge",
  "farm",
  "factory",
  "workshop",
  "land",
  "school",
  "hospital",
  "clinic",
  "church",
  "event_venue",
  "other",
] as const;

export const propertyStatuses = ["active", "inactive", "sold", "leased", "under_development", "damaged", "fictional"] as const;

function listFromText(value: string) {
  return value.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean);
}

function now() {
  return new Date().toISOString();
}

export function normalizeProperty(input: Partial<EotProperty> & { id: string }): EotProperty {
  const propertyType = input.propertyType || input.type || "other";
  const location = input.location || [input.suburb, input.city, input.country].filter(Boolean).join(", ");
  return {
    id: input.id,
    propertyCode: input.propertyCode || "",
    name: input.name || "Untitled property",
    type: propertyType,
    propertyType,
    location,
    description: input.description || "",
    country: input.country || "",
    province: input.province || "",
    city: input.city || "",
    district: input.district || "",
    suburb: input.suburb || "",
    address: input.address || "",
    gpsLatitude: input.gpsLatitude,
    gpsLongitude: input.gpsLongitude,
    sizeValue: input.sizeValue,
    sizeUnit: input.sizeUnit || "",
    zoning: input.zoning || "",
    status: input.status || "active",
    storyRole: input.storyRole || "",
    isFictional: Boolean(input.isFictional),
    isCommercial: Boolean(input.isCommercial),
    isResidential: Boolean(input.isResidential),
    isProductionLocation: Boolean(input.isProductionLocation),
    ownerCharacterIds: input.ownerCharacterIds || [],
    ownerBusinessIds: input.ownerBusinessIds || input.businessIds || [],
    linkedBusinessIds: input.linkedBusinessIds || input.businessIds || [],
    linkedVehicleIds: input.linkedVehicleIds || [],
    linkedAssetIds: input.linkedAssetIds || [],
    businessIds: input.businessIds || input.linkedBusinessIds || input.ownerBusinessIds || [],
    imageUrl: input.imageUrl || "",
    galleryUrls: input.galleryUrls || [],
    createdAt: input.createdAt || now(),
    updatedAt: input.updatedAt || now(),
  };
}

export function propertyInputFromForm(formData: FormData, id?: string): EotProperty {
  const propertyType = stringValue(formData, "propertyType", "other");
  const linkedBusinessIds = listFromText(stringValue(formData, "linkedBusinessIds"));
  const ownerBusinessIds = listFromText(stringValue(formData, "ownerBusinessIds"));
  return normalizeProperty({
    id: id || `local-property-${Date.now()}`,
    propertyCode: stringValue(formData, "propertyCode").trim(),
    name: stringValue(formData, "name").trim(),
    type: propertyType,
    propertyType,
    description: stringValue(formData, "description").trim(),
    country: stringValue(formData, "country").trim(),
    province: stringValue(formData, "province").trim(),
    city: stringValue(formData, "city").trim(),
    district: stringValue(formData, "district").trim(),
    suburb: stringValue(formData, "suburb").trim(),
    address: stringValue(formData, "address").trim(),
    gpsLatitude: numberValue(formData, "gpsLatitude"),
    gpsLongitude: numberValue(formData, "gpsLongitude"),
    sizeValue: numberValue(formData, "sizeValue"),
    sizeUnit: stringValue(formData, "sizeUnit").trim(),
    zoning: stringValue(formData, "zoning").trim(),
    status: stringValue(formData, "status", "active"),
    storyRole: stringValue(formData, "storyRole").trim(),
    isFictional: formData.has("isFictional"),
    isCommercial: formData.has("isCommercial"),
    isResidential: formData.has("isResidential"),
    isProductionLocation: formData.has("isProductionLocation"),
    ownerCharacterIds: listFromText(stringValue(formData, "ownerCharacterIds")),
    ownerBusinessIds,
    linkedBusinessIds,
    linkedVehicleIds: listFromText(stringValue(formData, "linkedVehicleIds")),
    linkedAssetIds: listFromText(stringValue(formData, "linkedAssetIds")),
    businessIds: [...new Set([...ownerBusinessIds, ...linkedBusinessIds])],
    imageUrl: stringValue(formData, "imageUrl").trim(),
    galleryUrls: listFromText(stringValue(formData, "galleryUrls")),
  });
}

export async function listProperties() {
  if (!isFirebaseConfigured) return readerDb.propertyCache.toArray();
  const snapshots = await getDocs(query(collection(db, "eotProperties"), orderBy("name")));
  const rows = snapshots.docs.map((snapshot) => normalizeProperty(withId<EotProperty>(snapshot)));
  await readerDb.propertyCache.bulkPut(rows);
  await readerDb.assetCache.bulkPut(rows);
  return rows;
}

export async function getProperty(propertyId: string) {
  const cached = await readerDb.propertyCache.get(propertyId);
  if (!isFirebaseConfigured) return cached ?? null;
  const snapshot = await getDoc(doc(db, "eotProperties", propertyId));
  if (!snapshot.exists()) return cached ?? null;
  const property = normalizeProperty(withId<EotProperty>(snapshot));
  await readerDb.propertyCache.put(property);
  await readerDb.assetCache.put(property);
  return property;
}

export async function upsertProperty(input: EotProperty) {
  const property = normalizeProperty(input);
  if (!isFirebaseConfigured) {
    await readerDb.propertyCache.put({ ...property, updatedAt: now() });
    await readerDb.assetCache.put({ ...property, updatedAt: now() });
    return property.id;
  }
  const { id, ...payload } = property;
  if (id && !id.startsWith("local-property-")) {
    await updateDoc(doc(db, "eotProperties", id), { ...payload, updatedAt: serverTimestamp() });
    await readerDb.propertyCache.put(property);
    await readerDb.assetCache.put(property);
    return id;
  }
  const snapshot = await addDoc(collection(db, "eotProperties"), { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  const created = { ...property, id: snapshot.id };
  await readerDb.propertyCache.put(created);
  await readerDb.assetCache.put(created);
  return snapshot.id;
}

export async function searchProperties(term = "", status = "all") {
  const rows = await listProperties();
  const needle = term.trim().toLowerCase();
  return rows.filter((property) => {
    const statusOk = status === "all" || property.status === status;
    const haystack = [
      property.name,
      property.propertyCode,
      property.propertyType,
      property.type,
      property.location,
      property.city,
      property.suburb,
      property.address,
      property.storyRole,
      ...(property.ownerCharacterIds ?? []),
      ...(property.ownerBusinessIds ?? []),
      ...(property.linkedBusinessIds ?? []),
    ].join(" ").toLowerCase();
    return statusOk && (!needle || haystack.includes(needle));
  });
}

async function listRelated<T>(collectionName: string, table: { bulkPut: (rows: T[]) => Promise<unknown>; toArray: () => Promise<T[]> }, propertyId?: string) {
  if (!isFirebaseConfigured) {
    const rows = await table.toArray();
    return propertyId ? rows.filter((row) => (row as { propertyId?: string }).propertyId === propertyId) : rows;
  }
  const source = propertyId ? query(collection(db, collectionName), where("propertyId", "==", propertyId)) : query(collection(db, collectionName));
  const snapshots = await getDocs(source);
  const rows = snapshots.docs.map((snapshot) => withId<T>(snapshot));
  await table.bulkPut(rows);
  return rows;
}

export const listPropertyOwnership = (propertyId?: string) => listRelated<EotPropertyOwnership>("eotPropertyOwnership", readerDb.propertyOwnershipCache, propertyId);
export const listPropertyTenants = (propertyId?: string) => listRelated<EotPropertyTenant>("eotPropertyTenants", readerDb.propertyTenantCache, propertyId);
export const listPropertyValuations = (propertyId?: string) => listRelated<EotPropertyValuation>("eotPropertyValuations", readerDb.propertyValuationCache, propertyId);
export const listPropertyAssets = (propertyId?: string) => listRelated<EotPropertyAssetRecord>("eotPropertyAssets", readerDb.propertyAssetCache, propertyId);
export const listPropertyAppearances = (propertyId?: string) => listRelated<EotPropertyAppearance>("eotPropertyAppearances", readerDb.propertyAppearanceCache, propertyId);

export async function listPropertyRelationships(propertyId?: string) {
  const rows = await listRelated<EotPropertyRelationship>("eotPropertyRelationships", readerDb.propertyRelationshipCache);
  return propertyId ? rows.filter((row) => row.propertyA === propertyId || row.propertyB === propertyId) : rows;
}

export async function getPropertyContext(propertyId: string) {
  const [property, ownership, tenants, valuations, assets, appearances, relationships] = await Promise.all([
    getProperty(propertyId),
    listPropertyOwnership(propertyId),
    listPropertyTenants(propertyId),
    listPropertyValuations(propertyId),
    listPropertyAssets(propertyId),
    listPropertyAppearances(propertyId),
    listPropertyRelationships(propertyId),
  ]);
  return { property, ownership, tenants, valuations, assets, appearances, relationships };
}

export async function getPropertyIntelligence() {
  const [properties, ownership, tenants, valuations, appearances] = await Promise.all([
    listProperties(),
    listPropertyOwnership(),
    listPropertyTenants(),
    listPropertyValuations(),
    listPropertyAppearances(),
  ]);
  const productionLocations = properties.filter((property) => property.isProductionLocation);
  const commercial = properties.filter((property) => property.isCommercial);
  const topValued = [...valuations].sort((a, b) => (b.estimatedValue || 0) - (a.estimatedValue || 0)).slice(0, 5);
  return {
    stats: {
      properties: properties.length,
      ownership: ownership.length,
      tenants: tenants.length,
      appearances: appearances.length,
      productionLocations: productionLocations.length,
      commercial: commercial.length,
    },
    productionLocations,
    topValued,
    mostUsed: properties
      .map((property) => ({ property, count: appearances.filter((row) => row.propertyId === property.id).length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((row) => row.property),
  };
}
