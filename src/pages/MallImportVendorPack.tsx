import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { importVendorPack, validateVendorPack } from "../lib/mallRepository";
import type { VendorPack } from "../types";

export default function MallImportVendorPack() {
  const [preview, setPreview] = useState<VendorPack | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function load(file: File | undefined) {
    if (!file) return;
    setError("");
    setStatus("");
    try {
      setPreview(validateVendorPack(JSON.parse(await file.text()) as unknown));
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : "Vendor pack preview failed.");
    }
  }

  async function importPack() {
    if (!preview) return;
    setError("");
    try {
      const vendorId = await importVendorPack(preview);
      setStatus(`Vendor pack imported for ${preview.manifest.vendorName}.`);
      setPreview(null);
      return vendorId;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vendor pack import failed.");
    }
  }

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Vendor Pack" title="Import storefront" subtitle="Import a vendor JSON pack for offline storefront and product browsing." actions={[{ label: "Mall", to: "/mall" }, { label: "Vendors", to: "/mall/vendors" }]} />
      <section className="panel grid gap-3 p-4">
        <label className="btn btn-primary w-full cursor-pointer text-center sm:w-fit">
          Select JSON Pack
          <input className="sr-only" type="file" accept="application/json,.json" onChange={(event) => load(event.currentTarget.files?.[0])} />
        </label>
        {error && <p className="border border-ember bg-ember/10 p-3 text-sm font-bold text-ember">{error}</p>}
        {status && <p className="border border-signal bg-signal/10 p-3 text-sm font-bold text-signal">{status}</p>}
      </section>
      {preview && (
        <section className="panel p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{preview.manifest.packId} / {preview.manifest.version}</p>
          <h2 className="mt-2 text-2xl font-black">{preview.manifest.vendorName}</h2>
          <p className="mt-2 text-sm text-muted">{preview.manifest.sector || preview.content.vendor.sector} / {preview.content.products.length} products / {(preview.content.branches ?? []).length} branches</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn btn-primary" type="button" onClick={importPack}>Import for offline use</button>
            <button className="btn" type="button" onClick={() => setPreview(null)}>Cancel</button>
            <Link className="btn" to={`/mall/vendors/${preview.manifest.vendorId}`}>Open vendor</Link>
          </div>
        </section>
      )}
    </section>
  );
}
