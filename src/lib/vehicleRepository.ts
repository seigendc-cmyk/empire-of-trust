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
  EotVehicle,
  EotVehicleAppearance,
  EotVehicleMaintenance,
  EotVehicleOwnership,
  EotVehicleRelationship,
  EotVehicleUsage,
} from "../types";

const withId = <T>(snapshot: QueryDocumentSnapshot<DocumentData> | { id: string; data: () => DocumentData }) =>
  ({ id: snapshot.id, ...snapshot.data() }) as T;

export const vehicleTypes = [
  "sedan",
  "suv",
  "pickup",
  "van",
  "bus",
  "minibus",
  "truck",
  "lorry",
  "motorcycle",
  "delivery_bike",
  "luxury_car",
  "executive_car",
  "sports_car",
  "tractor",
  "trailer",
  "boat",
  "aircraft",
  "production_vehicle",
  "other",
] as const;

export const vehicleStatuses = ["active", "inactive", "sold", "damaged", "stolen", "destroyed", "fictional"] as const;

function now() {
  return new Date().toISOString();
}

function listFromText(value: string) {
  return value.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean);
}

export function normalizeVehicle(input: Partial<EotVehicle> & { id: string }): EotVehicle {
  const vehicleType = input.vehicleType || input.type || "other";
  const registrationNumber = input.registrationNumber || input.registration || "";
  return {
    id: input.id,
    vehicleCode: input.vehicleCode || "",
    name: input.name || [input.make, input.model, registrationNumber].filter(Boolean).join(" ") || "Untitled vehicle",
    type: vehicleType,
    vehicleType,
    make: input.make || "",
    model: input.model || "",
    year: input.year,
    color: input.color || "",
    registration: registrationNumber,
    registrationNumber,
    vinOrChassisNumber: input.vinOrChassisNumber || "",
    engineNumber: input.engineNumber || "",
    country: input.country || "",
    city: input.city || "",
    district: input.district || "",
    suburb: input.suburb || "",
    status: input.status || "active",
    storyRole: input.storyRole || "",
    isFictional: Boolean(input.isFictional),
    isBusinessAsset: Boolean(input.isBusinessAsset),
    isProductionVehicle: Boolean(input.isProductionVehicle),
    ownerCharacterIds: input.ownerCharacterIds || [],
    ownerBusinessIds: input.ownerBusinessIds || [],
    linkedPropertyIds: input.linkedPropertyIds || [],
    linkedAssetIds: input.linkedAssetIds || [],
    imageUrl: input.imageUrl || "",
    galleryUrls: input.galleryUrls || [],
    createdAt: input.createdAt || now(),
    updatedAt: input.updatedAt || now(),
  };
}

export function vehicleInputFromForm(formData: FormData, id?: string): EotVehicle {
  const vehicleType = stringValue(formData, "vehicleType", "other");
  return normalizeVehicle({
    id: id || `local-vehicle-${Date.now()}`,
    vehicleCode: stringValue(formData, "vehicleCode").trim(),
    name: stringValue(formData, "name").trim(),
    type: vehicleType,
    vehicleType,
    make: stringValue(formData, "make").trim(),
    model: stringValue(formData, "model").trim(),
    year: numberValue(formData, "year"),
    color: stringValue(formData, "color").trim(),
    registrationNumber: stringValue(formData, "registrationNumber").trim(),
    vinOrChassisNumber: stringValue(formData, "vinOrChassisNumber").trim(),
    engineNumber: stringValue(formData, "engineNumber").trim(),
    country: stringValue(formData, "country").trim(),
    city: stringValue(formData, "city").trim(),
    district: stringValue(formData, "district").trim(),
    suburb: stringValue(formData, "suburb").trim(),
    status: stringValue(formData, "status", "active"),
    storyRole: stringValue(formData, "storyRole").trim(),
    isFictional: formData.has("isFictional"),
    isBusinessAsset: formData.has("isBusinessAsset"),
    isProductionVehicle: formData.has("isProductionVehicle"),
    ownerCharacterIds: listFromText(stringValue(formData, "ownerCharacterIds")),
    ownerBusinessIds: listFromText(stringValue(formData, "ownerBusinessIds")),
    linkedPropertyIds: listFromText(stringValue(formData, "linkedPropertyIds")),
    linkedAssetIds: listFromText(stringValue(formData, "linkedAssetIds")),
    imageUrl: stringValue(formData, "imageUrl").trim(),
    galleryUrls: listFromText(stringValue(formData, "galleryUrls")),
  });
}

export async function listVehicles() {
  if (!isFirebaseConfigured) return readerDb.vehicleCache.toArray();
  const snapshots = await getDocs(query(collection(db, "eotVehicles"), orderBy("name")));
  const rows = snapshots.docs.map((snapshot) => normalizeVehicle(withId<EotVehicle>(snapshot)));
  await readerDb.vehicleCache.bulkPut(rows);
  await readerDb.assetCache.bulkPut(rows);
  return rows;
}

export async function getVehicle(vehicleId: string) {
  const cached = await readerDb.vehicleCache.get(vehicleId);
  if (!isFirebaseConfigured) return cached ?? null;
  const snapshot = await getDoc(doc(db, "eotVehicles", vehicleId));
  if (!snapshot.exists()) return cached ?? null;
  const vehicle = normalizeVehicle(withId<EotVehicle>(snapshot));
  await readerDb.vehicleCache.put(vehicle);
  await readerDb.assetCache.put(vehicle);
  return vehicle;
}

export async function upsertVehicle(input: EotVehicle) {
  const vehicle = normalizeVehicle(input);
  if (!isFirebaseConfigured) {
    await readerDb.vehicleCache.put({ ...vehicle, updatedAt: now() });
    await readerDb.assetCache.put({ ...vehicle, updatedAt: now() });
    return vehicle.id;
  }
  const { id, ...payload } = vehicle;
  if (id && !id.startsWith("local-vehicle-")) {
    await updateDoc(doc(db, "eotVehicles", id), { ...payload, updatedAt: serverTimestamp() });
    await readerDb.vehicleCache.put(vehicle);
    await readerDb.assetCache.put(vehicle);
    return id;
  }
  const snapshot = await addDoc(collection(db, "eotVehicles"), { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  const created = { ...vehicle, id: snapshot.id };
  await readerDb.vehicleCache.put(created);
  await readerDb.assetCache.put(created);
  return snapshot.id;
}

export async function searchVehicles(term = "", status = "all") {
  const rows = await listVehicles();
  const needle = term.trim().toLowerCase();
  return rows.filter((vehicle) => {
    const statusOk = status === "all" || vehicle.status === status;
    const haystack = [
      vehicle.name,
      vehicle.vehicleCode,
      vehicle.vehicleType,
      vehicle.make,
      vehicle.model,
      vehicle.registrationNumber,
      vehicle.color,
      vehicle.city,
      vehicle.storyRole,
      ...(vehicle.ownerCharacterIds ?? []),
      ...(vehicle.ownerBusinessIds ?? []),
      ...(vehicle.linkedPropertyIds ?? []),
    ].join(" ").toLowerCase();
    return statusOk && (!needle || haystack.includes(needle));
  });
}

async function listRelated<T>(collectionName: string, table: { bulkPut: (rows: T[]) => Promise<unknown>; toArray: () => Promise<T[]> }, vehicleId?: string) {
  if (!isFirebaseConfigured) {
    const rows = await table.toArray();
    return vehicleId ? rows.filter((row) => (row as { vehicleId?: string }).vehicleId === vehicleId) : rows;
  }
  const source = vehicleId ? query(collection(db, collectionName), where("vehicleId", "==", vehicleId)) : query(collection(db, collectionName));
  const snapshots = await getDocs(source);
  const rows = snapshots.docs.map((snapshot) => withId<T>(snapshot));
  await table.bulkPut(rows);
  return rows;
}

export const listVehicleOwnership = (vehicleId?: string) => listRelated<EotVehicleOwnership>("eotVehicleOwnership", readerDb.vehicleOwnershipCache, vehicleId);
export const listVehicleUsage = (vehicleId?: string) => listRelated<EotVehicleUsage>("eotVehicleUsage", readerDb.vehicleUsageCache, vehicleId);
export const listVehicleMaintenance = (vehicleId?: string) => listRelated<EotVehicleMaintenance>("eotVehicleMaintenance", readerDb.vehicleMaintenanceCache, vehicleId);
export const listVehicleAppearances = (vehicleId?: string) => listRelated<EotVehicleAppearance>("eotVehicleAppearances", readerDb.vehicleAppearanceCache, vehicleId);

export async function listVehicleRelationships(vehicleId?: string) {
  const rows = await listRelated<EotVehicleRelationship>("eotVehicleRelationships", readerDb.vehicleRelationshipCache);
  return vehicleId ? rows.filter((row) => row.vehicleA === vehicleId || row.vehicleB === vehicleId) : rows;
}

export async function getVehicleContext(vehicleId: string) {
  const [vehicle, ownership, usage, maintenance, appearances, relationships] = await Promise.all([
    getVehicle(vehicleId),
    listVehicleOwnership(vehicleId),
    listVehicleUsage(vehicleId),
    listVehicleMaintenance(vehicleId),
    listVehicleAppearances(vehicleId),
    listVehicleRelationships(vehicleId),
  ]);
  return { vehicle, ownership, usage, maintenance, appearances, relationships };
}

export async function getVehicleIntelligence() {
  const [vehicles, ownership, usage, maintenance, appearances] = await Promise.all([
    listVehicles(),
    listVehicleOwnership(),
    listVehicleUsage(),
    listVehicleMaintenance(),
    listVehicleAppearances(),
  ]);
  const productionVehicles = vehicles.filter((vehicle) => vehicle.isProductionVehicle);
  const businessAssets = vehicles.filter((vehicle) => vehicle.isBusinessAsset);
  return {
    stats: {
      vehicles: vehicles.length,
      ownership: ownership.length,
      usage: usage.length,
      maintenance: maintenance.length,
      appearances: appearances.length,
      productionVehicles: productionVehicles.length,
      businessAssets: businessAssets.length,
    },
    productionVehicles,
    businessAssets,
    mostUsed: vehicles
      .map((vehicle) => ({ vehicle, count: appearances.filter((row) => row.vehicleId === vehicle.id).length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((row) => row.vehicle),
  };
}
