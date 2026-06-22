import { collection, doc, getDocs, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import {
  compareEpisodePackVersions,
  deleteImportedPack,
  importPack,
  listImportedPacks,
  readerDb,
  validateEpisodePack,
  type InstalledPackRecord,
  type PackType,
} from "./offlineDb";
import { deleteImportedLibraryPack, importLibraryPack, listImportedLibraryPacks, validateLibraryPack } from "./libraryRepository";
import { importVendorPack, validateVendorPack } from "./mallRepository";
import type { EotAsset, EotPublishedPack, EotQuiz, EpisodePack, LibraryBookletPack, VendorPack } from "../types";

export type ImportMode = "new" | "same" | "newer" | "older";

export interface PackManifestStandard {
  packId: string;
  packType: PackType;
  version: string;
  title: string;
  createdAt: string;
  requiredLicencePlan: string;
  checksumAlgorithm: string;
  checksum: string;
  signature: string;
  [key: string]: unknown;
}

export interface PackPreview {
  fileName: string;
  raw: unknown;
  manifest: PackManifestStandard;
  mode: ImportMode;
  existing: InstalledPackRecord | null;
  warnings: string[];
  entityCount: number;
  storageBytes: number;
}

type AssetPack = { manifest: PackManifestStandard; content?: { assets?: EotAsset[] } };
type QuizPack = { manifest: PackManifestStandard; content?: { quizzes?: EotQuiz[] } };

const supportedPackTypes: PackType[] = ["episode", "library_booklet", "vendor", "asset", "quiz"];

function now() {
  return new Date().toISOString();
}

function bytesFor(value: unknown) {
  return new Blob([JSON.stringify(value)]).size;
}

function normalizeManifest(input: unknown): { manifest: PackManifestStandard; warnings: string[] } {
  if (!input || typeof input !== "object") throw new Error("Pack file is not a JSON object.");
  const manifest = (input as { manifest?: Record<string, unknown> }).manifest;
  if (!manifest || typeof manifest !== "object") throw new Error("Pack is missing manifest.");
  const packType = String(manifest.packType ?? "") as PackType;
  if (!supportedPackTypes.includes(packType)) throw new Error(`Unsupported pack type: ${String(manifest.packType ?? "missing")}.`);
  const warnings: string[] = [];
  for (const field of ["packId", "version", "createdAt", "checksumAlgorithm", "checksum", "signature"]) {
    if (!manifest[field]) warnings.push(`Manifest field ${field} is missing or empty.`);
  }
  if (!manifest.title && !manifest.vendorName && !manifest.bookletCode) warnings.push("Manifest title is missing; using a fallback title.");
  if (!manifest.requiredLicencePlan) warnings.push("Manifest requiredLicencePlan is missing; defaulting to free.");
  return {
    warnings,
    manifest: {
      ...manifest,
      packId: String(manifest.packId ?? ""),
      packType,
      version: String(manifest.version ?? "0.0.0"),
      title: String(manifest.title ?? manifest.vendorName ?? manifest.bookletCode ?? manifest.packId ?? "Untitled pack"),
      createdAt: String(manifest.createdAt ?? now()),
      requiredLicencePlan: String(manifest.requiredLicencePlan ?? "free"),
      checksumAlgorithm: String(manifest.checksumAlgorithm ?? "SHA-256"),
      checksum: String(manifest.checksum ?? "frontend-placeholder-checksum"),
      signature: String(manifest.signature ?? "frontend-placeholder-signature"),
    },
  };
}

function entityCountFor(pack: unknown, packType: PackType) {
  const content = (pack as { content?: Record<string, unknown> }).content ?? {};
  if (packType === "episode") return ((content.episode as EpisodePack["content"]["episode"] | undefined)?.chapters ?? []).length;
  if (packType === "library_booklet") return ((content.booklet as LibraryBookletPack["content"]["booklet"] | undefined)?.chapters ?? []).length;
  if (packType === "vendor") return Array.isArray(content.products) ? content.products.length : 0;
  if (packType === "asset") return Array.isArray(content.assets) ? content.assets.length : 0;
  if (packType === "quiz") return Array.isArray(content.quizzes) ? content.quizzes.length : 0;
  return 0;
}

function recordFromPack(input: {
  manifest: PackManifestStandard;
  sourceFileName?: string;
  entityId?: string;
  entityIds?: string[];
  entityCount: number;
  storageBytes: number;
}): InstalledPackRecord {
  return {
    id: input.manifest.packId,
    packId: input.manifest.packId,
    packType: input.manifest.packType,
    version: input.manifest.version,
    title: input.manifest.title,
    createdAt: input.manifest.createdAt,
    installedAt: now(),
    updatedAt: now(),
    requiredLicencePlan: input.manifest.requiredLicencePlan,
    checksumAlgorithm: input.manifest.checksumAlgorithm,
    checksum: input.manifest.checksum,
    signature: input.manifest.signature,
    sourceFileName: input.sourceFileName,
    entityId: input.entityId,
    entityIds: input.entityIds,
    entityCount: input.entityCount,
    storageBytes: input.storageBytes,
    status: "installed",
  };
}

async function upsertInstalledRecord(record: InstalledPackRecord) {
  const existing = await readerDb.packRegistry.get(record.id);
  await readerDb.packRegistry.put({ ...record, installedAt: existing?.installedAt ?? record.installedAt, updatedAt: now() });
}

export async function rebuildPackRegistry() {
  const [episodes, booklets, vendors] = await Promise.all([
    listImportedPacks(),
    listImportedLibraryPacks(),
    readerDb.vendorPacks.toArray(),
  ]);
  for (const pack of episodes) {
    await upsertInstalledRecord(recordFromPack({
      manifest: normalizeManifest(pack).manifest,
      entityId: pack.content.episode.id,
      entityCount: pack.content.episode.chapters.length,
      storageBytes: bytesFor(pack),
    }));
  }
  for (const pack of booklets) {
    await upsertInstalledRecord(recordFromPack({
      manifest: normalizeManifest(pack).manifest,
      entityId: pack.content.booklet.id,
      entityCount: pack.content.booklet.chapters.length,
      storageBytes: bytesFor(pack),
    }));
  }
  for (const pack of vendors) {
    await upsertInstalledRecord(recordFromPack({
      manifest: normalizeManifest(pack).manifest,
      entityId: pack.manifest.vendorId,
      entityCount: pack.content.products.length,
      storageBytes: bytesFor(pack),
    }));
  }
}

export async function listInstalledPacks() {
  await rebuildPackRegistry();
  return (await readerDb.packRegistry.toArray()).sort((a, b) => b.installedAt.localeCompare(a.installedAt));
}

export async function getInstalledPack(packId: string) {
  await rebuildPackRegistry();
  return readerDb.packRegistry.get(packId);
}

export async function previewPackFile(file: File): Promise<PackPreview> {
  const raw = JSON.parse(await file.text());
  const { manifest, warnings } = normalizeManifest(raw);
  await rebuildPackRegistry();
  const existing = await readerDb.packRegistry.get(manifest.packId) ?? null;
  const diff = existing ? compareEpisodePackVersions(manifest.version, existing.version) : 1;
  return {
    fileName: file.name,
    raw,
    manifest,
    warnings,
    existing,
    mode: !existing ? "new" : diff === 0 ? "same" : diff > 0 ? "newer" : "older",
    entityCount: entityCountFor(raw, manifest.packType),
    storageBytes: bytesFor(raw),
  };
}

export async function importMarketplacePack(preview: PackPreview, options: { replace?: boolean } = {}) {
  const { raw, manifest } = preview;
  if (preview.existing && !options.replace && compareEpisodePackVersions(manifest.version, preview.existing.version) <= 0) {
    throw new Error(`Version ${preview.existing.version} is already installed. Choose replace to overwrite it.`);
  }
  let entityId = "";
  let entityIds: string[] = [];
  if (manifest.packType === "episode") {
    const pack = validateEpisodePack(raw);
    entityId = await importPack(pack, { replace: options.replace });
  } else if (manifest.packType === "library_booklet") {
    const pack = validateLibraryPack(raw);
    entityId = await importLibraryPack(pack, { replace: options.replace });
  } else if (manifest.packType === "vendor") {
    const pack = validateVendorPack(raw);
    if (options.replace) await readerDb.vendorPacks.delete(pack.manifest.packId);
    entityId = await importVendorPack(pack);
  } else if (manifest.packType === "asset") {
    const pack = raw as AssetPack;
    const assets = pack.content?.assets ?? [];
    if (!Array.isArray(assets) || assets.length === 0) throw new Error("Asset pack must include content.assets.");
    await readerDb.assetCache.bulkPut(assets);
    entityIds = assets.map((asset) => asset.id);
    entityId = entityIds[0] ?? manifest.packId;
  } else if (manifest.packType === "quiz") {
    const pack = raw as QuizPack;
    const quizzes = pack.content?.quizzes ?? [];
    if (!Array.isArray(quizzes) || quizzes.length === 0) throw new Error("Quiz pack must include content.quizzes.");
    await readerDb.quizCache.bulkPut(quizzes);
    entityIds = quizzes.map((quiz) => quiz.id);
    entityId = entityIds[0] ?? manifest.packId;
  }
  const record = recordFromPack({
    manifest,
    sourceFileName: preview.fileName,
    entityId,
    entityIds,
    entityCount: preview.entityCount,
    storageBytes: preview.storageBytes,
  });
  await upsertInstalledRecord(record);
  return record;
}

export async function deleteInstalledMarketplacePack(record: InstalledPackRecord) {
  if (record.packType === "episode" && record.entityId) await deleteImportedPack(record.entityId);
  if (record.packType === "library_booklet" && record.entityId) await deleteImportedLibraryPack(record.entityId);
  if (record.packType === "vendor") await readerDb.vendorPacks.delete(record.packId);
  if (record.packType === "asset" && record.entityIds?.length) await readerDb.assetCache.bulkDelete(record.entityIds);
  if (record.packType === "quiz" && record.entityIds?.length) await readerDb.quizCache.bulkDelete(record.entityIds);
  await readerDb.packRegistry.delete(record.id);
}

export async function listStudioPackCatalogue() {
  if (isFirebaseConfigured) {
    try {
      const snapshots = await getDocs(query(collection(db, "eotPackCatalogue"), orderBy("updatedAt")));
      const rows = snapshots.docs.map((snapshot) => ({ id: snapshot.id, ...(snapshot.data() as object) }) as EotPublishedPack);
      if (rows.length) {
        await readerDb.publishedPackCache.bulkPut(rows);
        return rows;
      }
    } catch {
      // local cache below
    }
  }
  return readerDb.publishedPackCache.toArray();
}

export async function publishPackMetadata(record: InstalledPackRecord, status: "published" | "archived" = "published") {
  const row: EotPublishedPack = {
    id: record.packId,
    episodeId: record.packType === "episode" ? record.entityId : undefined,
    packId: record.packId,
    packType: record.packType,
    version: record.version,
    title: record.title,
    requiredLicencePlan: record.requiredLicencePlan,
    status,
    checksum: record.checksum,
    releaseDate: record.createdAt,
    createdAt: record.createdAt,
    updatedAt: now(),
  };
  await readerDb.publishedPackCache.put(row);
  if (isFirebaseConfigured) {
    await setDoc(doc(db, "eotPackCatalogue", record.packId), { ...row, updatedAt: serverTimestamp() }, { merge: true });
  }
  return row;
}

export function openRouteForPack(record: InstalledPackRecord) {
  if (record.packType === "episode" && record.entityId) return `/reader/${record.entityId}`;
  if (record.packType === "library_booklet" && record.entityId) return `/library/${record.entityId}`;
  if (record.packType === "vendor" && record.entityId) return `/mall/vendors/${record.entityId}`;
  return `/packs/${record.packId}`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10} KB`;
  return `${Math.round(bytes / 1024 / 102.4) / 10} MB`;
}
