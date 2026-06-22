import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/States";
import { getProperty, propertyInputFromForm, propertyStatuses, propertyTypes, upsertProperty } from "../lib/propertyRepository";
import type { EotProperty } from "../types";

export default function PropertyForm() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState<EotProperty | null>(null);
  const [loading, setLoading] = useState(Boolean(propertyId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!propertyId) return;
    getProperty(propertyId).then(setProperty).finally(() => setLoading(false));
  }, [propertyId]);

  if (loading) return <LoadingState label="Loading property..." />;
  if (propertyId && !property) return <ErrorState title="Property not found" message="This property is not available from Firestore or the local cache." />;

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow="Property Studio"
        title={property ? `Edit ${property.name}` : "Create property"}
        subtitle="Register property identity, location, ownership links, production flags, and story asset metadata."
        actions={[{ label: "Property Directory", to: "/properties" }]}
      />
      <form
        className="panel grid gap-4 p-4 sm:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault();
          const input = propertyInputFromForm(new FormData(event.currentTarget), property?.id);
          if (!input.name.trim()) {
            setError("Property name is required.");
            return;
          }
          setSaving(true);
          setError("");
          try {
            const id = await upsertProperty(input);
            navigate(`/properties/${id}`);
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to save property.");
          } finally {
            setSaving(false);
          }
        }}
      >
        <Field name="propertyCode" label="Property code" value={property?.propertyCode} />
        <Field name="name" label="Name" value={property?.name} required />
        <label>
          <span className="label">Property type</span>
          <select className="field" name="propertyType" defaultValue={property?.propertyType || property?.type || "other"}>
            {propertyTypes.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Status</span>
          <select className="field" name="status" defaultValue={property?.status || "active"}>
            {propertyStatuses.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
          </select>
        </label>
        <label className="sm:col-span-2">
          <span className="label">Description</span>
          <textarea className="field min-h-24" name="description" defaultValue={property?.description ?? ""} />
        </label>
        <Field name="country" label="Country" value={property?.country} />
        <Field name="province" label="Province" value={property?.province} />
        <Field name="city" label="City" value={property?.city} />
        <Field name="district" label="District" value={property?.district} />
        <Field name="suburb" label="Suburb" value={property?.suburb} />
        <Field name="address" label="Address" value={property?.address} />
        <Field name="gpsLatitude" label="GPS latitude" value={property?.gpsLatitude?.toString()} type="number" />
        <Field name="gpsLongitude" label="GPS longitude" value={property?.gpsLongitude?.toString()} type="number" />
        <Field name="sizeValue" label="Size value" value={property?.sizeValue?.toString()} type="number" />
        <Field name="sizeUnit" label="Size unit" value={property?.sizeUnit} />
        <Field name="zoning" label="Zoning" value={property?.zoning} />
        <Field name="storyRole" label="Story role" value={property?.storyRole} />
        <label className="sm:col-span-2">
          <span className="label">Owner character IDs</span>
          <textarea className="field min-h-20" name="ownerCharacterIds" defaultValue={property?.ownerCharacterIds?.join("\n") ?? ""} />
        </label>
        <label className="sm:col-span-2">
          <span className="label">Owner business IDs</span>
          <textarea className="field min-h-20" name="ownerBusinessIds" defaultValue={property?.ownerBusinessIds?.join("\n") ?? ""} />
        </label>
        <label className="sm:col-span-2">
          <span className="label">Linked business IDs</span>
          <textarea className="field min-h-20" name="linkedBusinessIds" defaultValue={property?.linkedBusinessIds?.join("\n") ?? property?.businessIds?.join("\n") ?? ""} />
        </label>
        <label className="sm:col-span-2">
          <span className="label">Linked vehicle IDs</span>
          <textarea className="field min-h-20" name="linkedVehicleIds" defaultValue={property?.linkedVehicleIds?.join("\n") ?? ""} />
        </label>
        <label className="sm:col-span-2">
          <span className="label">Linked asset IDs</span>
          <textarea className="field min-h-20" name="linkedAssetIds" defaultValue={property?.linkedAssetIds?.join("\n") ?? ""} />
        </label>
        <Field name="imageUrl" label="Image URL" value={property?.imageUrl} className="sm:col-span-2" />
        <label className="sm:col-span-2">
          <span className="label">Gallery URLs</span>
          <textarea className="field min-h-20" name="galleryUrls" defaultValue={property?.galleryUrls?.join("\n") ?? ""} />
        </label>
        <div className="grid gap-2 sm:col-span-2 sm:grid-cols-4">
          <Check name="isFictional" label="Fictional" checked={property?.isFictional} />
          <Check name="isCommercial" label="Commercial" checked={property?.isCommercial} />
          <Check name="isResidential" label="Residential" checked={property?.isResidential} />
          <Check name="isProductionLocation" label="Production location" checked={property?.isProductionLocation} />
        </div>
        <div className="sticky-actions sm:col-span-2">
          {error && <p className="text-sm font-semibold text-ember">{error}</p>}
          <button className="btn btn-primary w-full" type="submit" disabled={saving}>{saving ? "Saving..." : "Save property"}</button>
        </div>
      </form>
    </section>
  );
}

function Field({ name, label, value, required = false, type = "text", className = "" }: { name: string; label: string; value?: string; required?: boolean; type?: string; className?: string }) {
  return (
    <label className={className}>
      <span className="label">{label}</span>
      <input className="field" name={name} type={type} step={type === "number" ? "any" : undefined} defaultValue={value ?? ""} required={required} />
    </label>
  );
}

function Check({ name, label, checked }: { name: string; label: string; checked?: boolean }) {
  return <label className="flex items-center gap-2 border border-white/10 bg-black/20 p-3 text-sm font-bold"><input name={name} type="checkbox" defaultChecked={Boolean(checked)} />{label}</label>;
}
