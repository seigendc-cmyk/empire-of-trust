import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { PageHeader } from "../components/PageHeader";
import {
  deleteInstalledMarketplacePack,
  formatBytes,
  getInstalledPack,
  importMarketplacePack,
  listInstalledPacks,
  listStudioPackCatalogue,
  openRouteForPack,
  previewPackFile,
  publishPackMetadata,
  type PackPreview,
} from "../lib/packMarketplaceRepository";
import type { EotPublishedPack } from "../types";
import type { InstalledPackRecord, PackType } from "../lib/offlineDb";

type View = "home" | "import" | "installed" | "catalogue" | "detail" | "studioCatalogue" | "studioPublish" | "studioHistory";
type ManifestLike = {
  packId?: unknown;
  packType?: unknown;
  version?: unknown;
  requiredLicencePlan?: unknown;
  checksum?: unknown;
  signature?: unknown;
};

export default function Packs({ view = "home" }: { view?: View }) {
  const { packId = "" } = useParams();
  const navigate = useNavigate();
  const [installed, setInstalled] = useState<InstalledPackRecord[]>([]);
  const [catalogue, setCatalogue] = useState<EotPublishedPack[]>([]);
  const [detail, setDetail] = useState<InstalledPackRecord | null>(null);
  const [preview, setPreview] = useState<PackPreview | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const resolvedView = packId ? "detail" : view;
  const totals = useMemo(() => installed.reduce((sum, pack) => sum + pack.storageBytes, 0), [installed]);

  async function load() {
    setLoading(true);
    try {
      const [localRows, catalogueRows] = await Promise.all([listInstalledPacks(), listStudioPackCatalogue()]);
      setInstalled(localRows);
      setCatalogue(catalogueRows);
      if (packId) setDetail((await getInstalledPack(packId)) ?? null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch((err) => {
      setError(err instanceof Error ? err.message : "Could not load pack centre.");
      setLoading(false);
    });
  }, [packId]);

  async function handleFile(file: File) {
    setError("");
    setMessage("");
    setPreview(null);
    try {
      setPreview(await previewPackFile(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read JSON pack.");
    }
  }

  async function commitImport(replace = false) {
    if (!preview) return;
    setWorking(true);
    setError("");
    setMessage("");
    try {
      const record = await importMarketplacePack(preview, { replace });
      setMessage(`${record.title} installed as ${record.packType}.`);
      setPreview(null);
      await load();
      window.setTimeout(() => navigate(`/packs/${record.packId}`), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import pack.");
    } finally {
      setWorking(false);
    }
  }

  async function removePack(record: InstalledPackRecord) {
    if (!window.confirm(`Delete ${record.title} from this device?`)) return;
    setWorking(true);
    try {
      await deleteInstalledMarketplacePack(record);
      setMessage(`${record.title} deleted from local pack registry.`);
      await load();
      if (packId) navigate("/packs/installed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete pack.");
    } finally {
      setWorking(false);
    }
  }

  async function publish(record: InstalledPackRecord, status: "published" | "archived") {
    setWorking(true);
    try {
      await publishPackMetadata(record, status);
      setMessage(`${record.packId} ${status}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update pack catalogue.");
    } finally {
      setWorking(false);
    }
  }

  if (loading) return <LoadingState label="Loading pack marketplace..." />;
  if (resolvedView === "detail" && !detail) return <ErrorState title="Pack not found" message="This pack is not installed on this device." />;

  return (
    <section className="page grid gap-5">
      <PageHeader
        eyebrow={resolvedView.startsWith("studio") ? "Studio Packs" : "Pack Marketplace"}
        title={titleFor(resolvedView)}
        subtitle="Manage deployable JSON packs for episodes, independent booklets, vendors, assets, and quizzes."
        actions={[
          { label: "Import", to: "/packs/import", primary: resolvedView === "import" },
          { label: "Installed", to: "/packs/installed" },
          { label: "Catalogue", to: "/packs/catalogue" },
          { label: "Studio", to: "/studio/packs" },
        ]}
      />

      {message && <div className="border border-ledger bg-ledger/10 p-3 text-sm font-semibold text-ledger">{message}</div>}
      {error && <div className="border border-ember bg-ember/15 p-3 text-sm font-semibold text-ember">{error}</div>}

      {resolvedView === "home" && (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <Metric label="Installed packs" value={installed.length} />
            <Metric label="Catalogue records" value={catalogue.length} />
            <Metric label="Local footprint" value={formatBytes(totals)} />
          </section>
          <section className="grid gap-3 md:grid-cols-2">
            <ActionPanel title="Upload Centre" detail="Drop a deployable JSON pack and the shell will detect the pack type." to="/packs/import" />
            <ActionPanel title="Installed Packs" detail="Review offline packs, open supported content, delete local installs, and inspect manifests." to="/packs/installed" />
          </section>
        </>
      )}

      {resolvedView === "import" && (
        <section className="grid gap-4">
          <DropZone disabled={working} onFile={handleFile} />
          {preview && (
            <section className="panel grid gap-4 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-accent text-xs font-bold uppercase tracking-[0.14em]">{packLabel(preview.manifest.packType)} / {preview.mode}</p>
                  <h2 className="mt-1 text-2xl font-black">{preview.manifest.title}</h2>
                  <p className="text-muted mt-2 break-all text-sm">{preview.fileName}</p>
                </div>
                <PackIcon type={preview.manifest.packType} />
              </div>
              <ManifestGrid manifest={preview.manifest} entityCount={preview.entityCount} storageBytes={preview.storageBytes} />
              {preview.warnings.length > 0 && (
                <div className="border border-signal bg-signal/10 p-3 text-sm font-semibold text-signal">
                  {preview.warnings.map((warning) => <p key={warning}>{warning}</p>)}
                </div>
              )}
              {preview.existing && <p className="text-muted border-app surface-muted border p-3 text-sm">Existing local version: {preview.existing.version}. {statusMessage(preview)}</p>}
              <div className="grid gap-2 sm:flex">
                {(preview.mode === "new" || preview.mode === "newer") && <button className="btn btn-primary flex-1" type="button" disabled={working} onClick={() => void commitImport(false)}>{working ? "Importing..." : preview.mode === "newer" ? "Upgrade pack" : "Import pack"}</button>}
                {(preview.mode === "same" || preview.mode === "older") && <button className="btn btn-primary flex-1" type="button" disabled={working} onClick={() => void commitImport(true)}>{working ? "Replacing..." : preview.mode === "older" ? "Replace older" : "Replace same version"}</button>}
                <button className="btn flex-1" type="button" disabled={working} onClick={() => setPreview(null)}>Cancel</button>
              </div>
            </section>
          )}
        </section>
      )}

      {resolvedView === "installed" && <InstalledList rows={installed} onDelete={removePack} working={working} />}
      {resolvedView === "catalogue" && <CatalogueList rows={catalogue} />}

      {resolvedView === "detail" && detail && (
        <section className="grid gap-4">
          <section className="panel grid gap-4 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-accent text-xs font-bold uppercase tracking-[0.14em]">{packLabel(detail.packType)} / {detail.packId}</p>
                <h2 className="mt-1 text-2xl font-black">{detail.title}</h2>
                <p className="text-muted mt-2">Version {detail.version} / installed {new Date(detail.installedAt).toLocaleString()}</p>
              </div>
              <PackIcon type={detail.packType} />
            </div>
            <ManifestGrid manifest={detail} entityCount={detail.entityCount} storageBytes={detail.storageBytes} />
            <div className="grid gap-2 sm:flex">
              <Link className="btn btn-primary flex-1" to={openRouteForPack(detail)}>Open</Link>
              <button className="btn flex-1" type="button" onClick={() => navigator.clipboard.writeText(detail.packId)}>Copy packId</button>
              <button className="btn flex-1 border-ember bg-ember/10 text-ember" type="button" disabled={working} onClick={() => void removePack(detail)}>Delete local pack</button>
            </div>
          </section>
        </section>
      )}

      {(resolvedView === "studioCatalogue" || resolvedView === "studioPublish" || resolvedView === "studioHistory") && (
        <section className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            <Link className="btn" to="/studio/packs/catalogue">Catalogue</Link>
            <Link className="btn" to="/studio/packs/publish">Publish</Link>
            <Link className="btn" to="/studio/packs/history">History</Link>
          </div>
          {resolvedView === "studioPublish" ? <StudioPublish rows={installed} working={working} onPublish={publish} /> : <CatalogueList rows={catalogue} studio />}
        </section>
      )}
    </section>
  );
}

function DropZone({ disabled, onFile }: { disabled: boolean; onFile: (file: File) => void | Promise<void> }) {
  return (
    <label
      className="surface border-app grid min-h-52 cursor-pointer place-items-center border border-dashed p-5 text-center"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const file = event.dataTransfer.files?.[0];
        if (file) void onFile(file);
      }}
    >
      <span>
        <span className="text-app block text-2xl font-black">Drop JSON pack here</span>
        <span className="text-muted mt-2 block text-sm">or choose a file. Supported: episode, library_booklet, vendor, asset, quiz.</span>
        <input className="sr-only" type="file" accept="application/json,.json,.booklet.json" disabled={disabled} onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void onFile(file);
        }} />
        <span className="btn btn-primary mt-5 inline-flex">Choose JSON Pack</span>
      </span>
    </label>
  );
}

function InstalledList({ rows, working, onDelete }: { rows: InstalledPackRecord[]; working: boolean; onDelete: (record: InstalledPackRecord) => void | Promise<void> }) {
  if (rows.length === 0) return <EmptyState title="No packs installed" message="Import a deployable JSON pack to make it available offline." actionLabel="Import pack" actionTo="/packs/import" />;
  return (
    <section className="panel divide-y divide-white/10">
      {rows.map((row) => (
        <div key={row.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
          <Link to={`/packs/${row.packId}`} className="min-w-0">
            <p className="text-accent text-xs font-bold uppercase tracking-[0.14em]">{packLabel(row.packType)} / {row.version}</p>
            <h2 className="mt-1 break-words text-xl font-black">{row.title}</h2>
            <p className="text-muted mt-2 text-sm">{row.entityCount} records / {formatBytes(row.storageBytes)} / {new Date(row.installedAt).toLocaleString()}</p>
          </Link>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Link className="btn btn-primary" to={openRouteForPack(row)}>Open</Link>
            <button className="btn border-ember bg-ember/10 text-ember" type="button" disabled={working} onClick={() => void onDelete(row)}>Delete</button>
          </div>
        </div>
      ))}
    </section>
  );
}

function CatalogueList({ rows, studio = false }: { rows: EotPublishedPack[]; studio?: boolean }) {
  if (rows.length === 0) return <EmptyState title="No catalogue records" message="Published pack metadata will appear here when saved locally or to Firestore." />;
  return (
    <section className="panel divide-y divide-white/10">
      {rows.map((row) => (
        <div key={row.id} className="p-4">
          <p className="text-accent text-xs font-bold uppercase tracking-[0.14em]">{packLabel(row.packType as PackType)} / {row.status}</p>
          <h2 className="mt-1 text-xl font-black">{row.title}</h2>
          <p className="text-muted mt-2 text-sm">PackID {row.packId} / version {row.version} / plan {row.requiredLicencePlan}</p>
          {studio && <p className="text-soft mt-2 text-xs">Firestore source: eotPackCatalogue</p>}
        </div>
      ))}
    </section>
  );
}

function StudioPublish({ rows, working, onPublish }: { rows: InstalledPackRecord[]; working: boolean; onPublish: (record: InstalledPackRecord, status: "published" | "archived") => void | Promise<void> }) {
  if (rows.length === 0) return <EmptyState title="No local packs to publish" message="Import or build packs first, then publish their metadata to the catalogue." />;
  return (
    <section className="panel divide-y divide-white/10">
      {rows.map((row) => (
        <div key={row.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-accent text-xs font-bold uppercase tracking-[0.14em]">{packLabel(row.packType)} / {row.version}</p>
            <h2 className="mt-1 text-xl font-black">{row.title}</h2>
            <p className="text-muted mt-2 text-sm break-all">{row.packId}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button className="btn btn-primary" type="button" disabled={working} onClick={() => void onPublish(row, "published")}>Publish</button>
            <button className="btn" type="button" disabled={working} onClick={() => void onPublish(row, "archived")}>Archive</button>
          </div>
        </div>
      ))}
    </section>
  );
}

function ManifestGrid({ manifest, entityCount, storageBytes }: { manifest: ManifestLike; entityCount: number; storageBytes: number }) {
  const fields = [
    ["packId", String(manifest.packId ?? "")],
    ["packType", String(manifest.packType ?? "")],
    ["version", String(manifest.version ?? "")],
    ["requiredLicencePlan", String(manifest.requiredLicencePlan ?? "free")],
    ["checksum", String(manifest.checksum ?? "")],
    ["signature", String(manifest.signature ?? "")],
    ["records", String(entityCount)],
    ["footprint", formatBytes(storageBytes)],
  ];
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {fields.map(([label, value]) => (
        <div key={label} className="surface-muted border-app min-w-0 border p-3">
          <dt className="text-soft text-xs font-bold uppercase tracking-[0.12em]">{label}</dt>
          <dd className="text-app mt-1 break-words text-sm font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ActionPanel({ title, detail, to }: { title: string; detail: string; to: string }) {
  return (
    <Link className="panel block p-4 hover:border-signal" to={to}>
      <h2 className="text-xl font-black">{title}</h2>
      <p className="text-muted mt-2 text-sm leading-6">{detail}</p>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="panel p-4">
      <p className="text-accent text-2xl font-black">{value}</p>
      <p className="text-muted mt-1 text-xs font-bold uppercase tracking-[0.12em]">{label}</p>
    </div>
  );
}

function PackIcon({ type }: { type: PackType }) {
  return <span className="border-app surface-muted grid size-12 place-items-center border text-sm font-black">{iconFor(type)}</span>;
}

function iconFor(type: PackType) {
  return type === "episode" ? "EP" : type === "library_booklet" ? "LB" : type === "vendor" ? "VN" : type === "asset" ? "AS" : "QZ";
}

function packLabel(type: PackType) {
  return type.replace(/_/g, " ");
}

function statusMessage(preview: PackPreview) {
  if (preview.mode === "newer") return `Upgrade available: installed ${preview.existing?.version}, file ${preview.manifest.version}.`;
  if (preview.mode === "same") return `Same version detected: ${preview.manifest.version}. Replace or cancel.`;
  if (preview.mode === "older") return `Older version warning: installed ${preview.existing?.version}, file ${preview.manifest.version}.`;
  return "This is a new pack.";
}

function titleFor(view: View) {
  if (view === "import") return "Upload Centre";
  if (view === "installed") return "Installed Packs";
  if (view === "catalogue" || view === "studioCatalogue") return "Pack Catalogue";
  if (view === "studioPublish") return "Publish Packs";
  if (view === "studioHistory") return "Pack History";
  if (view === "detail") return "Pack Manifest";
  return "Pack Marketplace";
}
