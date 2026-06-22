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
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { numberValue, stringValue } from "./forms";
import { getOrCreateReaderIdentity, logActivity, readerDb } from "./offlineDb";
import type { EotCommerceInterestLog, EotCommerceLink, EotProduct, EotProductCategory, EotVendor, EotVendorBranch, EotVendorContact, VendorPack } from "../types";

export const mallCategoryExamples = [
  "Motor Spares",
  "Agriculture",
  "Grocery",
  "Hardware",
  "Property",
  "Vehicles",
  "Computers & Phones",
  "Education",
  "Hotels",
  "Transport & Logistics",
  "Warehousing",
  "Pharmacy",
  "Professionals",
  "Clothing",
  "Jewelry",
  "Perfumes",
  "Spices",
  "General Dealers",
];

export const vendorStatuses = ["active", "inactive", "pending", "suspended"] as const;
export const productAvailability = ["available", "limited", "out_of_stock", "preorder", "unknown"] as const;
export const commerceInterestEvents = ["vendor_viewed", "product_viewed", "whatsapp_clicked", "call_clicked", "search_performed", "category_opened", "vendor_pack_imported"] as const;

function now() {
  return new Date().toISOString();
}

function withId<T>(snapshot: { id: string; data: () => unknown }) {
  return { id: snapshot.id, ...(snapshot.data() as object) } as T;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function includesTerm(values: unknown[], term: string) {
  const normalized = normalize(term);
  return !normalized || values.some((value) => normalize(value).includes(normalized));
}

function listFromText(value: string) {
  return value.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean);
}

function compareVersions(a: string, b: string) {
  const left = a.split(".").map((part) => Number(part) || 0);
  const right = b.split(".").map((part) => Number(part) || 0);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

async function firestoreList<T>(collectionName: string, orderField: string, fallbackCollection?: string) {
  if (!isFirebaseConfigured) throw new Error("Firebase not configured.");
  try {
    const snapshots = await getDocs(query(collection(db, collectionName), orderBy(orderField)));
    return snapshots.docs.map((item) => withId<T>(item));
  } catch (error) {
    if (!fallbackCollection) throw error;
    const snapshots = await getDocs(query(collection(db, fallbackCollection), orderBy(orderField)));
    return snapshots.docs.map((item) => withId<T>(item));
  }
}

async function firestoreOne<T>(collectionName: string, id: string, fallbackCollection?: string) {
  if (!isFirebaseConfigured) throw new Error("Firebase not configured.");
  const snapshot = await getDoc(doc(db, collectionName, id));
  if (snapshot.exists()) return withId<T>(snapshot);
  if (fallbackCollection) {
    const fallback = await getDoc(doc(db, fallbackCollection, id));
    if (fallback.exists()) return withId<T>(fallback);
  }
  return undefined;
}

export function normalizeVendor(input: Partial<EotVendor> & { id: string }): EotVendor {
  return {
    id: input.id,
    vendorCode: input.vendorCode || "",
    businessId: input.businessId || "",
    businessName: input.businessName || input.tradingName || "Untitled vendor",
    tradingName: input.tradingName || input.businessName || "",
    sector: input.sector || "",
    category: input.category || input.sector || "",
    description: input.description || "",
    logoUrl: input.logoUrl || "",
    bannerUrl: input.bannerUrl || "",
    phone: input.phone || "",
    whatsapp: input.whatsapp || "",
    email: input.email || "",
    website: input.website || "",
    country: input.country || "",
    city: input.city || "",
    district: input.district || "",
    suburb: input.suburb || "",
    address: input.address || "",
    branchCount: input.branchCount || 1,
    productCount: input.productCount || 0,
    status: input.status || "active",
    isStoryLinked: Boolean(input.isStoryLinked),
    linkedCharacterIds: input.linkedCharacterIds || [],
    linkedBusinessIds: input.linkedBusinessIds || (input.businessId ? [input.businessId] : []),
    createdAt: input.createdAt || now(),
    updatedAt: input.updatedAt || now(),
  };
}

export function normalizeProduct(input: Partial<EotProduct> & { id: string }): EotProduct {
  return {
    id: input.id,
    productCode: input.productCode || "",
    vendorId: input.vendorId || "",
    name: input.name || "Untitled product",
    description: input.description || "",
    category: input.category || "General Dealers",
    subcategory: input.subcategory || "",
    brand: input.brand || "",
    price: Number(input.price || 0),
    currency: input.currency || "USD",
    unit: input.unit || "",
    imageUrl: input.imageUrl || "",
    galleryUrls: input.galleryUrls || [],
    availability: input.availability || input.stockStatus || "unknown",
    stockStatus: input.stockStatus || input.availability || "unknown",
    tags: input.tags || [],
    linkedEpisodeIds: input.linkedEpisodeIds || [],
    linkedCharacterIds: input.linkedCharacterIds || [],
    linkedBusinessIds: input.linkedBusinessIds || [],
    createdAt: input.createdAt || now(),
    updatedAt: input.updatedAt || now(),
  };
}

export function normalizeCategory(input: Partial<EotProductCategory> & { id?: string; name: string }): EotProductCategory {
  const id = input.id || input.slug || slug(input.name);
  return {
    id,
    name: input.name,
    slug: input.slug || slug(input.name),
    description: input.description || "",
    sector: input.sector || "",
    parentCategoryId: input.parentCategoryId || "",
    sortOrder: input.sortOrder || 0,
    active: input.active ?? true,
    imageUrl: input.imageUrl || "",
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

export function vendorInputFromForm(formData: FormData, id?: string): EotVendor {
  return normalizeVendor({
    id: id || `local-vendor-${Date.now()}`,
    vendorCode: stringValue(formData, "vendorCode").trim(),
    businessId: stringValue(formData, "businessId").trim(),
    businessName: stringValue(formData, "businessName").trim(),
    tradingName: stringValue(formData, "tradingName").trim(),
    sector: stringValue(formData, "sector").trim(),
    category: stringValue(formData, "category").trim(),
    description: stringValue(formData, "description").trim(),
    logoUrl: stringValue(formData, "logoUrl").trim(),
    bannerUrl: stringValue(formData, "bannerUrl").trim(),
    phone: stringValue(formData, "phone").trim(),
    whatsapp: stringValue(formData, "whatsapp").trim(),
    email: stringValue(formData, "email").trim(),
    website: stringValue(formData, "website").trim(),
    country: stringValue(formData, "country").trim(),
    city: stringValue(formData, "city").trim(),
    district: stringValue(formData, "district").trim(),
    suburb: stringValue(formData, "suburb").trim(),
    address: stringValue(formData, "address").trim(),
    status: stringValue(formData, "status", "active"),
    isStoryLinked: formData.has("isStoryLinked"),
    linkedCharacterIds: listFromText(stringValue(formData, "linkedCharacterIds")),
    linkedBusinessIds: listFromText(stringValue(formData, "linkedBusinessIds")),
  });
}

export function productInputFromForm(formData: FormData, id?: string): EotProduct {
  return normalizeProduct({
    id: id || `local-product-${Date.now()}`,
    productCode: stringValue(formData, "productCode").trim(),
    vendorId: stringValue(formData, "vendorId").trim(),
    name: stringValue(formData, "name").trim(),
    description: stringValue(formData, "description").trim(),
    category: stringValue(formData, "category", "General Dealers").trim(),
    subcategory: stringValue(formData, "subcategory").trim(),
    brand: stringValue(formData, "brand").trim(),
    price: numberValue(formData, "price", 0),
    currency: stringValue(formData, "currency", "USD").trim(),
    unit: stringValue(formData, "unit").trim(),
    imageUrl: stringValue(formData, "imageUrl").trim(),
    galleryUrls: listFromText(stringValue(formData, "galleryUrls")),
    availability: stringValue(formData, "availability", "unknown"),
    stockStatus: stringValue(formData, "stockStatus", "unknown"),
    tags: listFromText(stringValue(formData, "tags")),
    linkedEpisodeIds: listFromText(stringValue(formData, "linkedEpisodeIds")),
    linkedCharacterIds: listFromText(stringValue(formData, "linkedCharacterIds")),
    linkedBusinessIds: listFromText(stringValue(formData, "linkedBusinessIds")),
  });
}

export async function listVendors() {
  try {
    const vendors = (await firestoreList<EotVendor>("eotCommerceVendors", "businessName", "eotVendors")).map(normalizeVendor);
    await readerDb.vendors.bulkPut(vendors);
    return vendors;
  } catch {
    return (await readerDb.vendors.toArray()).map(normalizeVendor);
  }
}

export async function getVendor(vendorId: string) {
  try {
    const vendor = await firestoreOne<EotVendor>("eotCommerceVendors", vendorId, "eotVendors");
    if (vendor) {
      const normalized = normalizeVendor(vendor);
      await readerDb.vendors.put(normalized);
      return normalized;
    }
  } catch {
    return (await readerDb.vendors.get(vendorId)) ?? null;
  }
  return (await readerDb.vendors.get(vendorId)) ?? null;
}

export async function upsertVendor(input: EotVendor) {
  const vendor = normalizeVendor(input);
  if (!isFirebaseConfigured) {
    await readerDb.vendors.put({ ...vendor, updatedAt: now() });
    return vendor.id;
  }
  const { id, ...payload } = vendor;
  if (id && !id.startsWith("local-vendor-")) {
    await updateDoc(doc(db, "eotCommerceVendors", id), { ...payload, updatedAt: serverTimestamp() });
    await readerDb.vendors.put(vendor);
    return id;
  }
  const snapshot = await addDoc(collection(db, "eotCommerceVendors"), { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await readerDb.vendors.put({ ...vendor, id: snapshot.id });
  return snapshot.id;
}

export async function listProducts() {
  try {
    const products = (await firestoreList<EotProduct>("eotCommerceProducts", "name", "eotProducts")).map(normalizeProduct);
    await readerDb.products.bulkPut(products);
    return products;
  } catch {
    return (await readerDb.products.toArray()).map(normalizeProduct);
  }
}

export async function getProduct(productId: string) {
  try {
    const product = await firestoreOne<EotProduct>("eotCommerceProducts", productId, "eotProducts");
    if (product) {
      const normalized = normalizeProduct(product);
      await readerDb.products.put(normalized);
      return normalized;
    }
  } catch {
    return (await readerDb.products.get(productId)) ?? null;
  }
  return (await readerDb.products.get(productId)) ?? null;
}

export async function upsertProduct(input: EotProduct) {
  const product = normalizeProduct(input);
  if (!isFirebaseConfigured) {
    await readerDb.products.put({ ...product, updatedAt: now() });
    return product.id;
  }
  const { id, ...payload } = product;
  if (id && !id.startsWith("local-product-")) {
    await updateDoc(doc(db, "eotCommerceProducts", id), { ...payload, updatedAt: serverTimestamp() });
    await readerDb.products.put(product);
    return id;
  }
  const snapshot = await addDoc(collection(db, "eotCommerceProducts"), { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await readerDb.products.put({ ...product, id: snapshot.id });
  return snapshot.id;
}

export async function listProductsByVendor(vendorId: string) {
  const products = await listProducts();
  return products.filter((product) => product.vendorId === vendorId).sort((a, b) => a.name.localeCompare(b.name));
}

export async function listProductsByCategory(categoryIdOrName: string) {
  const products = await listProducts();
  const normalized = normalize(categoryIdOrName).replace(/-/g, " ");
  return products
    .filter((product) => normalize(product.category) === normalized || normalize(product.category).replace(/\s+/g, "-") === normalize(categoryIdOrName))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listCategories(): Promise<EotProductCategory[]> {
  try {
    const categories = (await firestoreList<EotProductCategory>("eotCommerceCategories", "name", "eotCategories")).map((row) => normalizeCategory({ ...row, name: row.name }));
    await readerDb.productCategories.bulkPut(categories);
    return categories;
  } catch {
    const cached = await readerDb.productCategories.toArray();
    if (cached.length) return cached.map((row) => normalizeCategory({ ...row, name: row.name }));
    return mallCategoryExamples.map((name, index) => normalizeCategory({ id: slug(name), name, sortOrder: index + 1, active: true }));
  }
}

export async function getCategory(categoryId: string) {
  try {
    const category = await firestoreOne<EotProductCategory>("eotCommerceCategories", categoryId, "eotCategories");
    if (category) {
      const normalized = normalizeCategory({ ...category, name: category.name });
      await readerDb.productCategories.put(normalized);
      return normalized;
    }
  } catch {
    const cached = await readerDb.productCategories.get(categoryId);
    if (cached) return cached;
  }
  const examples = await listCategories();
  return examples.find((item) => item.id === categoryId || item.slug === categoryId || normalize(item.name).replace(/\s+/g, "-") === normalize(categoryId));
}

export async function listVendorBranches(vendorId: string) {
  const cached = await readerDb.vendorBranches.where("vendorId").equals(vendorId).toArray();
  if (cached.length) return cached;
  if (isFirebaseConfigured) {
    try {
      const snapshots = await getDocs(query(collection(db, "eotCommerceBranches"), where("vendorId", "==", vendorId)));
      const rows = snapshots.docs.map((row) => ({ ...withId<EotVendorBranch>(row), name: withId<EotVendorBranch>(row).branchName || withId<EotVendorBranch>(row).name || "Branch" }));
      await readerDb.vendorBranches.bulkPut(rows);
      if (rows.length) return rows;
    } catch {
      // fallback below
    }
  }
  const vendor = await getVendor(vendorId);
  if (!vendor) return [];
  return [{ id: `${vendor.id}-head-office`, vendorId: vendor.id, branchName: vendor.branchCount > 1 ? "Main branch" : "Head office", name: vendor.branchCount > 1 ? "Main branch" : "Head office", country: vendor.country, city: vendor.city, district: vendor.district, suburb: vendor.suburb, address: vendor.address, phone: vendor.phone, whatsapp: vendor.whatsapp, active: true }];
}

export async function listVendorContacts(vendorId: string) {
  const cached = await readerDb.vendorContacts.where("vendorId").equals(vendorId).toArray();
  if (cached.length) return cached;
  if (isFirebaseConfigured) {
    try {
      const snapshots = await getDocs(query(collection(db, "eotCommerceContacts"), where("vendorId", "==", vendorId)));
      const rows = snapshots.docs.map((row) => withId<EotVendorContact>(row));
      await readerDb.vendorContacts.bulkPut(rows);
      if (rows.length) return rows;
    } catch {
      // fallback below
    }
  }
  const vendor = await getVendor(vendorId);
  if (!vendor) return [];
  const contacts: EotVendorContact[] = [];
  if (vendor.phone || vendor.whatsapp) contacts.push({ id: `${vendor.id}-sales`, vendorId: vendor.id, label: "Sales", contactType: "phone", value: vendor.phone || vendor.whatsapp, phone: vendor.phone, whatsapp: vendor.whatsapp, active: true });
  if (vendor.email || vendor.website) contacts.push({ id: `${vendor.id}-digital`, vendorId: vendor.id, label: "Online", contactType: vendor.email ? "email" : "website", value: vendor.email || vendor.website, email: vendor.email, website: vendor.website, active: true });
  return contacts;
}

export async function searchMall(term: string) {
  const [vendors, products, categories] = await Promise.all([listVendors(), listProducts(), listCategories()]);
  if (term.trim()) await logCommerceInterest("search_performed", { searchTerm: term });
  return {
    vendors: vendors.filter((vendor) => includesTerm([vendor.businessName, vendor.tradingName, vendor.sector, vendor.category, vendor.description, vendor.city, vendor.suburb], term)),
    products: products.filter((product) => includesTerm([product.name, product.brand, product.category, product.subcategory, product.description, ...(product.tags ?? [])], term)),
    categories: categories.filter((category) => includesTerm([category.name, category.slug, category.sector, category.description], term)),
  };
}

export async function listCommerceLinks() {
  if (!isFirebaseConfigured) return readerDb.commerceLinkCache.toArray();
  const snapshots = await getDocs(query(collection(db, "eotCommerceLinks")));
  const rows = snapshots.docs.map((row) => withId<EotCommerceLink>(row));
  await readerDb.commerceLinkCache.bulkPut(rows);
  return rows;
}

export async function logCommerceInterest(eventType: EotCommerceInterestLog["eventType"], input: Partial<Omit<EotCommerceInterestLog, "id" | "readerId" | "eventType" | "metadata" | "createdAt" | "syncStatus">> & { metadata?: Record<string, unknown> } = {}) {
  const reader = await getOrCreateReaderIdentity();
  const log: EotCommerceInterestLog = {
    id: `commerce-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    readerId: reader.readerId,
    eventType,
    vendorId: input.vendorId,
    productId: input.productId,
    searchTerm: input.searchTerm,
    metadata: input.metadata || {},
    createdAt: now(),
    syncStatus: "pending",
  };
  await readerDb.commerceInterestLog.put(log);
  const activityType = eventType === "vendor_viewed" ? "commerce_vendor_viewed" : eventType === "product_viewed" ? "commerce_product_viewed" : eventType === "whatsapp_clicked" ? "whatsapp_clicked" : "interactive_link_clicked";
  await logActivity(activityType, { targetType: "commerce", targetId: input.productId || input.vendorId || input.searchTerm || eventType, metadata: { eventType, ...input.metadata } }, reader);
  return log;
}

export function validateVendorPack(input: unknown): VendorPack {
  if (!input || typeof input !== "object") throw new Error("Pack file is not a JSON object.");
  const pack = input as Partial<VendorPack>;
  if (!pack.manifest || !pack.content?.vendor || !Array.isArray(pack.content.products)) throw new Error("Vendor pack is missing manifest, vendor, or products.");
  if (pack.manifest.packType !== "vendor") throw new Error("Only vendor packs can be imported here.");
  if (!pack.manifest.packId || !pack.manifest.vendorId || !pack.manifest.version) throw new Error("Vendor pack manifest is missing packId, vendorId, or version.");
  if (!pack.content.vendor.id || !pack.content.vendor.businessName) throw new Error("Vendor record is missing id or businessName.");
  const vendor = normalizeVendor(pack.content.vendor);
  return {
    manifest: {
      packId: pack.manifest.packId,
      packType: "vendor",
      version: pack.manifest.version,
      vendorId: pack.manifest.vendorId,
      vendorName: pack.manifest.vendorName || vendor.businessName,
      sector: pack.manifest.sector || vendor.sector,
      createdAt: pack.manifest.createdAt || now(),
      checksumAlgorithm: pack.manifest.checksumAlgorithm || "SHA-256",
      checksum: pack.manifest.checksum || "frontend-placeholder-checksum",
      signature: pack.manifest.signature || "frontend-placeholder-signature",
    },
    content: {
      vendor,
      branches: pack.content.branches || [],
      contacts: pack.content.contacts || [],
      categories: pack.content.categories || [],
      products: pack.content.products.map((product) => normalizeProduct({ ...product, vendorId: product.vendorId || vendor.id })),
    },
  };
}

export async function importVendorPack(pack: VendorPack) {
  const existing = await readerDb.vendorPacks.get(pack.manifest.packId);
  if (existing && compareVersions(pack.manifest.version, existing.manifest.version) <= 0) {
    throw new Error(`Version ${existing.manifest.version} is already imported. Import a newer vendor pack.`);
  }
  const content = pack.content;
  await readerDb.transaction("rw", [readerDb.vendorPacks, readerDb.vendors, readerDb.products, readerDb.vendorBranches, readerDb.vendorContacts, readerDb.productCategories], async () => {
    await readerDb.vendorPacks.put(pack);
    await readerDb.vendors.put(normalizeVendor(content.vendor));
    if (content.products.length) await readerDb.products.bulkPut(content.products.map(normalizeProduct));
    if (content.branches?.length) await readerDb.vendorBranches.bulkPut(content.branches);
    if (content.contacts?.length) await readerDb.vendorContacts.bulkPut(content.contacts);
    if (content.categories?.length) await readerDb.productCategories.bulkPut(content.categories.map((category) => normalizeCategory({ ...category, name: category.name })));
  });
  await logCommerceInterest("vendor_pack_imported", { vendorId: pack.manifest.vendorId, metadata: { packId: pack.manifest.packId, version: pack.manifest.version } });
  return pack.manifest.vendorId;
}

export async function listVendorPacks() {
  return readerDb.vendorPacks.toArray();
}

export async function getVendorPack(packId: string) {
  return readerDb.vendorPacks.get(packId);
}

export async function buildVendorPack(vendorId: string): Promise<VendorPack> {
  const [vendor, products, branches, contacts, categories] = await Promise.all([
    getVendor(vendorId),
    listProductsByVendor(vendorId),
    listVendorBranches(vendorId),
    listVendorContacts(vendorId),
    listCategories(),
  ]);
  if (!vendor) throw new Error("Vendor not found.");
  return validateVendorPack({
    manifest: {
      packId: `ITRED-${(vendor.vendorCode || vendor.id).toUpperCase()}-${Date.now()}`,
      packType: "vendor",
      version: "1.0.0",
      vendorId: vendor.id,
      vendorName: vendor.businessName,
      sector: vendor.sector,
      createdAt: now(),
      checksumAlgorithm: "SHA-256",
      checksum: "frontend-placeholder-checksum",
      signature: "frontend-placeholder-signature",
    },
    content: { vendor, branches, contacts, categories, products },
  });
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
