import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/States";
import { assetCategories, assetInputFromForm, assetStatuses, assetTypes, getAsset, saveAssetWithOptionalFile } from "../lib/assetRepository";
import { useAuth } from "../state/AuthContext";
import type { EotAsset } from "../types";

export default function AssetForm() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [asset, setAsset] = useState<EotAsset | null>(null);
  const [loading, setLoading] = useState(Boolean(assetId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!assetId) return;
    getAsset(assetId).then(setAsset).finally(() => setLoading(false));
  }, [assetId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      const input = { ...assetInputFromForm(form, assetId), createdBy: user?.email ?? asset?.createdBy ?? "" };
      const file = form.get("file");
      const saved = await saveAssetWithOptionalFile(input, file instanceof File ? file : null);
      navigate(`/studio/assets/${saved.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Asset could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading asset..." />;
  if (assetId && !asset) return <ErrorState title="Asset not found" message="This media record is not available from Firestore or local cache." />;

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow="Media Library"
        title={assetId ? "Edit asset" : "Upload asset"}
        subtitle="Save asset metadata and optionally upload a file to Firebase Storage."
        actions={[{ label: "Library", to: "/studio/assets/library" }, { label: "Prompts", to: "/studio/assets/prompts" }]}
      />
      <form className="panel grid gap-4 p-4" onSubmit={submit}>
        {error && <p className="border border-ember bg-ember/10 p-3 text-sm font-bold text-ember">{error}</p>}
        <div className="grid gap-3 lg:grid-cols-3">
          <label className="grid gap-1 text-sm font-bold">
            Asset code
            <input className="field" name="assetCode" defaultValue={asset?.assetCode} placeholder="ASSET-001" />
          </label>
          <label className="grid gap-1 text-sm font-bold lg:col-span-2">
            Title
            <input className="field" name="title" defaultValue={asset?.title || asset?.name} required placeholder="Boardroom poster concept" />
          </label>
        </div>
        <label className="grid gap-1 text-sm font-bold">
          Description
          <textarea className="field min-h-28" name="description" defaultValue={asset?.description} placeholder="Purpose, visual direction, licensing notes, or production context." />
        </label>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-sm font-bold">
            Asset type
            <select className="field" name="assetType" defaultValue={asset?.assetType || "other"}>
              {assetTypes.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Category
            <select className="field" name="category" defaultValue={asset?.category || "production"}>
              {assetCategories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Status
            <select className="field" name="status" defaultValue={asset?.status || "draft"}>
              {assetStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <label className="grid gap-1 text-sm font-bold">
            File upload
            <input className="field" name="file" type="file" accept="image/*,video/*" />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Existing download URL
            <input className="field" name="downloadUrl" defaultValue={asset?.downloadUrl || asset?.imageUrl} placeholder="https://..." />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Storage path
            <input className="field" name="storagePath" defaultValue={asset?.storagePath} placeholder="assets/characters/..." />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Mime type
            <input className="field" name="mimeType" defaultValue={asset?.mimeType} placeholder="image/png" />
          </label>
        </div>
        <label className="grid gap-1 text-sm font-bold">
          Tags
          <input className="field" name="tags" defaultValue={(asset?.tags ?? []).join(", ")} placeholder="poster, boardroom, season one" />
        </label>
        <div className="grid gap-3 lg:grid-cols-2">
          <TextList name="relatedCharacterIds" label="Related character IDs" value={asset?.relatedCharacterIds} />
          <TextList name="relatedActorIds" label="Related actor IDs" value={asset?.relatedActorIds} />
          <TextList name="relatedBusinessIds" label="Related business IDs" value={asset?.relatedBusinessIds} />
          <TextList name="relatedPropertyIds" label="Related property IDs" value={asset?.relatedPropertyIds} />
          <TextList name="relatedVehicleIds" label="Related vehicle IDs" value={asset?.relatedVehicleIds} />
          <TextList name="relatedSceneIds" label="Related scene IDs" value={asset?.relatedSceneIds} />
          <TextList name="relatedEpisodeIds" label="Related episode IDs" value={asset?.relatedEpisodeIds} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Save asset"}</button>
          <button className="btn" type="button" onClick={() => navigate("/studio/assets/library")}>Cancel</button>
        </div>
      </form>
    </section>
  );
}

function TextList({ name, label, value }: { name: string; label: string; value?: string[] }) {
  return (
    <label className="grid gap-1 text-sm font-bold">
      {label}
      <textarea className="field min-h-20" name={name} defaultValue={(value ?? []).join("\n")} placeholder="One ID per line or comma separated" />
    </label>
  );
}
