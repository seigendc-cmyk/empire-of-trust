import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/States";
import { buildVendorPack, downloadJson, getVendorPack, listVendors } from "../lib/mallRepository";
import type { EotVendor, VendorPack } from "../types";

export default function StudioVendorPack({ mode = "build" }: { mode?: "build" | "detail" }) {
  const { packId = "" } = useParams();
  const [vendors, setVendors] = useState<EotVendor[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [pack, setPack] = useState<VendorPack | null>(null);
  const [loading, setLoading] = useState(mode === "detail");
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode === "detail") {
      getVendorPack(packId).then((row) => setPack(row ?? null)).finally(() => setLoading(false));
      return;
    }
    listVendors().then((rows) => {
      setVendors(rows);
      setVendorId(rows[0]?.id || "");
    });
  }, [mode, packId]);

  async function build() {
    setError("");
    try {
      setPack(await buildVendorPack(vendorId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vendor pack could not be built.");
    }
  }

  if (loading) return <LoadingState label="Loading vendor pack..." />;
  if (mode === "detail" && !pack) return <ErrorState title="Vendor pack not found" />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Commerce Pack" title={mode === "detail" ? "Vendor pack preview" : "Build vendor pack"} subtitle="Frontend JSON pack for offline iTred-style storefront browsing." actions={[{ label: "Commerce", to: "/studio/commerce" }, { label: "Packs", to: "/studio/commerce/vendor-packs" }]} />
      {mode === "build" && (
        <section className="panel grid gap-3 p-4">
          <label className="grid gap-1 text-sm font-bold">Vendor<select className="field" value={vendorId} onChange={(event) => setVendorId(event.target.value)}>{vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.businessName}</option>)}</select></label>
          <button className="btn btn-primary w-full sm:w-fit" type="button" onClick={build} disabled={!vendorId}>Build pack</button>
          {error && <p className="border border-ember bg-ember/10 p-3 text-sm font-bold text-ember">{error}</p>}
        </section>
      )}
      {pack && (
        <section className="panel p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">{pack.manifest.packId} / {pack.manifest.version}</p>
          <h2 className="mt-2 text-2xl font-black">{pack.manifest.vendorName}</h2>
          <p className="mt-2 text-sm text-muted">{pack.manifest.sector} / {pack.content.products.length} products / checksum {pack.manifest.checksum}</p>
          <p className="mt-2 text-sm text-warning">Signature is a frontend placeholder for this phase.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn btn-primary" type="button" onClick={() => downloadJson(`${pack.manifest.packId}.json`, pack)}>Download JSON</button>
          </div>
          <pre className="mt-4 max-h-96 overflow-auto border border-white/10 bg-black/20 p-3 text-xs text-muted">{JSON.stringify(pack, null, 2)}</pre>
        </section>
      )}
    </section>
  );
}
