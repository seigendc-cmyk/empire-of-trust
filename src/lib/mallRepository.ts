import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "./firebase";
import { getOrCreateReaderIdentity, logActivity, readerDb } from "./offlineDb";
import type { EotProduct, EotProductCategory, EotVendor, EotVendorBranch, EotVendorContact, VendorPack } from "../types";

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
  "General Dealers",
];

function withId<T>(snapshot: { id: string; data: () => unknown }) {
  return { id: snapshot.id, ...(snapshot.data() as object) } as T;
}

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function includesTerm(values: unknown[], term: string) {
  const normalized = normalize(term);
  return !normalized || values.some((value) => normalize(value).includes(normalized));
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

async function firestoreList<T>(collectionName: string, orderField: string) {
  const snapshots = await getDocs(query(collection(db, collectionName), orderBy(orderField)));
  return snapshots.docs.map((item) => withId<T>(item));
}

async function firestoreOne<T>(collectionName: string, id: string) {
  const snapshot = await getDoc(doc(db, collectionName, id));
  if (!snapshot.exists()) return undefined;
  return withId<T>(snapshot);
}

export async function listVendors() {
  try {
    const vendors = await firestoreList<EotVendor>("eotVendors", "businessName");
    await readerDb.vendors.bulkPut(vendors);
    return vendors;
  } catch {
    return readerDb.vendors.toArray();
  }
}

export async function getVendor(vendorId: string) {
  try {
    const vendor = await firestoreOne<EotVendor>("eotVendors", vendorId);
    if (vendor) {
      await readerDb.vendors.put(vendor);
      return vendor;
    }
  } catch {
    return readerDb.vendors.get(vendorId);
  }
  return readerDb.vendors.get(vendorId);
}

export async function listProducts() {
  try {
    const products = await firestoreList<EotProduct>("eotProducts", "name");
    await readerDb.products.bulkPut(products);
    return products;
  } catch {
    return readerDb.products.toArray();
  }
}

export async function getProduct(productId: string) {
  try {
    const product = await firestoreOne<EotProduct>("eotProducts", productId);
    if (product) {
      await readerDb.products.put(product);
      return product;
    }
  } catch {
    return readerDb.products.get(productId);
  }
  return readerDb.products.get(productId);
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
    const categories = await firestoreList<EotProductCategory>("eotCategories", "name");
    await readerDb.productCategories.bulkPut(categories);
    return categories;
  } catch {
    const cached = await readerDb.productCategories.toArray();
    if (cached.length) return cached;
    return mallCategoryExamples.map((name) => ({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""), name }));
  }
}

export async function getCategory(categoryId: string) {
  try {
    const category = await firestoreOne<EotProductCategory>("eotCategories", categoryId);
    if (category) {
      await readerDb.productCategories.put(category);
      return category;
    }
  } catch {
    const cached = await readerDb.productCategories.get(categoryId);
    if (cached) return cached;
  }
  const examples = await listCategories();
  return examples.find((item) => item.id === categoryId || normalize(item.name).replace(/\s+/g, "-") === normalize(categoryId));
}

export async function listVendorBranches(vendorId: string) {
  const cached = await readerDb.vendorBranches.where("vendorId").equals(vendorId).toArray();
  if (cached.length) return cached;
  const vendor = await getVendor(vendorId);
  if (!vendor) return [];
  return [
    {
      id: `${vendor.id}-head-office`,
      vendorId: vendor.id,
      name: vendor.branchCount > 1 ? "Main branch" : "Head office",
      country: vendor.country,
      city: vendor.city,
      district: vendor.district,
      suburb: vendor.suburb,
      address: vendor.address,
      phone: vendor.phone,
      whatsapp: vendor.whatsapp,
    },
  ];
}

export async function listVendorContacts(vendorId: string) {
  const cached = await readerDb.vendorContacts.where("vendorId").equals(vendorId).toArray();
  if (cached.length) return cached;
  const vendor = await getVendor(vendorId);
  if (!vendor) return [];
  const contacts: EotVendorContact[] = [];
  if (vendor.phone || vendor.whatsapp) contacts.push({ id: `${vendor.id}-sales`, vendorId: vendor.id, label: "Sales", phone: vendor.phone, whatsapp: vendor.whatsapp });
  if (vendor.email || vendor.website) contacts.push({ id: `${vendor.id}-digital`, vendorId: vendor.id, label: "Online", email: vendor.email, website: vendor.website });
  return contacts;
}

export async function searchMall(term: string) {
  const [vendors, products, categories] = await Promise.all([listVendors(), listProducts(), listCategories()]);
  return {
    vendors: vendors.filter((vendor) => includesTerm([vendor.businessName, vendor.sector, vendor.description, vendor.city, vendor.suburb], term)),
    products: products.filter((product) => includesTerm([product.name, product.brand, product.category, product.description, ...(product.tags ?? [])], term)),
    categories: categories.filter((category) => includesTerm([category.name, category.sector, category.description], term)),
  };
}

export function validateVendorPack(input: unknown): VendorPack {
  if (!input || typeof input !== "object") throw new Error("Pack file is not a JSON object.");
  const pack = input as Partial<VendorPack>;
  if (!pack.manifest || !pack.content?.vendor || !Array.isArray(pack.content.products)) {
    throw new Error("Vendor pack is missing manifest, vendor, or products.");
  }
  if (pack.manifest.packType !== "vendor") throw new Error("Only vendor packs can be imported here.");
  if (!pack.manifest.packId || !pack.manifest.vendorId || !pack.manifest.version) {
    throw new Error("Vendor pack manifest is missing packId, vendorId, or version.");
  }
  if (!pack.content.vendor.id || !pack.content.vendor.businessName) throw new Error("Vendor record is missing id or businessName.");
  return {
    manifest: {
      packId: pack.manifest.packId,
      packType: "vendor",
      version: pack.manifest.version,
      vendorId: pack.manifest.vendorId,
      vendorName: pack.manifest.vendorName || pack.content.vendor.businessName,
      createdAt: pack.manifest.createdAt || new Date().toISOString(),
    },
    content: {
      vendor: pack.content.vendor,
      products: pack.content.products.map((product) => ({
        ...product,
        vendorId: product.vendorId || pack.content!.vendor.id,
        tags: Array.isArray(product.tags) ? product.tags : [],
      })),
    },
  };
}

export async function importVendorPack(pack: VendorPack) {
  const existing = await readerDb.vendorPacks.get(pack.manifest.packId);
  if (existing && compareVersions(pack.manifest.version, existing.manifest.version) <= 0) {
    throw new Error(`Version ${existing.manifest.version} is already imported. Import a newer vendor pack.`);
  }
  const content = pack.content as VendorPack["content"] & {
    branches?: EotVendorBranch[];
    contacts?: EotVendorContact[];
    categories?: EotProductCategory[];
  };
  await readerDb.transaction("rw", [readerDb.vendorPacks, readerDb.vendors, readerDb.products, readerDb.vendorBranches, readerDb.vendorContacts, readerDb.productCategories], async () => {
    await readerDb.vendorPacks.put(pack);
    await readerDb.vendors.put(pack.content.vendor);
    if (pack.content.products.length) await readerDb.products.bulkPut(pack.content.products);
    if (content.branches?.length) await readerDb.vendorBranches.bulkPut(content.branches);
    if (content.contacts?.length) await readerDb.vendorContacts.bulkPut(content.contacts);
    if (content.categories?.length) await readerDb.productCategories.bulkPut(content.categories);
  });
  const reader = await getOrCreateReaderIdentity();
  await logActivity("pack_imported", { targetType: "vendorPack", targetId: pack.manifest.packId, metadata: { version: pack.manifest.version, vendorId: pack.manifest.vendorId } }, reader);
  return pack.manifest.vendorId;
}
