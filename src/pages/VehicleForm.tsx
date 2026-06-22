import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/States";
import { getVehicle, upsertVehicle, vehicleInputFromForm, vehicleStatuses, vehicleTypes } from "../lib/vehicleRepository";
import type { EotVehicle } from "../types";

export default function VehicleForm() {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<EotVehicle | null>(null);
  const [loading, setLoading] = useState(Boolean(vehicleId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!vehicleId) return;
    getVehicle(vehicleId).then(setVehicle).finally(() => setLoading(false));
  }, [vehicleId]);

  if (loading) return <LoadingState label="Loading vehicle..." />;
  if (vehicleId && !vehicle) return <ErrorState title="Vehicle not found" message="This vehicle is not available from Firestore or the local cache." />;

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow="Fleet Studio"
        title={vehicle ? `Edit ${vehicle.name}` : "Create vehicle"}
        subtitle="Register vehicle identity, ownership links, production flags, and continuity-critical fleet metadata."
        actions={[{ label: "Vehicle Directory", to: "/vehicles" }]}
      />
      <form
        className="panel grid gap-4 p-4 sm:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault();
          const input = vehicleInputFromForm(new FormData(event.currentTarget), vehicle?.id);
          if (!input.name.trim()) {
            setError("Vehicle name is required.");
            return;
          }
          setSaving(true);
          setError("");
          try {
            const id = await upsertVehicle(input);
            navigate(`/vehicles/${id}`);
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to save vehicle.");
          } finally {
            setSaving(false);
          }
        }}
      >
        <Field name="vehicleCode" label="Vehicle code" value={vehicle?.vehicleCode} />
        <Field name="name" label="Name" value={vehicle?.name} required />
        <label>
          <span className="label">Vehicle type</span>
          <select className="field" name="vehicleType" defaultValue={vehicle?.vehicleType || vehicle?.type || "other"}>
            {vehicleTypes.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Status</span>
          <select className="field" name="status" defaultValue={vehicle?.status || "active"}>
            {vehicleStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <Field name="make" label="Make" value={vehicle?.make} />
        <Field name="model" label="Model" value={vehicle?.model} />
        <Field name="year" label="Year" value={vehicle?.year?.toString()} type="number" />
        <Field name="color" label="Color" value={vehicle?.color} />
        <Field name="registrationNumber" label="Registration number" value={vehicle?.registrationNumber || vehicle?.registration} />
        <Field name="vinOrChassisNumber" label="VIN or chassis number" value={vehicle?.vinOrChassisNumber} />
        <Field name="engineNumber" label="Engine number" value={vehicle?.engineNumber} />
        <Field name="country" label="Country" value={vehicle?.country} />
        <Field name="city" label="City" value={vehicle?.city} />
        <Field name="district" label="District" value={vehicle?.district} />
        <Field name="suburb" label="Suburb" value={vehicle?.suburb} />
        <Field name="storyRole" label="Story role" value={vehicle?.storyRole} className="sm:col-span-2" />
        <label className="sm:col-span-2">
          <span className="label">Owner character IDs</span>
          <textarea className="field min-h-20" name="ownerCharacterIds" defaultValue={vehicle?.ownerCharacterIds?.join("\n") ?? ""} />
        </label>
        <label className="sm:col-span-2">
          <span className="label">Owner business IDs</span>
          <textarea className="field min-h-20" name="ownerBusinessIds" defaultValue={vehicle?.ownerBusinessIds?.join("\n") ?? ""} />
        </label>
        <label className="sm:col-span-2">
          <span className="label">Linked property IDs</span>
          <textarea className="field min-h-20" name="linkedPropertyIds" defaultValue={vehicle?.linkedPropertyIds?.join("\n") ?? ""} />
        </label>
        <label className="sm:col-span-2">
          <span className="label">Linked asset IDs</span>
          <textarea className="field min-h-20" name="linkedAssetIds" defaultValue={vehicle?.linkedAssetIds?.join("\n") ?? ""} />
        </label>
        <Field name="imageUrl" label="Image URL" value={vehicle?.imageUrl} className="sm:col-span-2" />
        <label className="sm:col-span-2">
          <span className="label">Gallery URLs</span>
          <textarea className="field min-h-20" name="galleryUrls" defaultValue={vehicle?.galleryUrls?.join("\n") ?? ""} />
        </label>
        <div className="grid gap-2 sm:col-span-2 sm:grid-cols-3">
          <Check name="isFictional" label="Fictional" checked={vehicle?.isFictional} />
          <Check name="isBusinessAsset" label="Business asset" checked={vehicle?.isBusinessAsset} />
          <Check name="isProductionVehicle" label="Production vehicle" checked={vehicle?.isProductionVehicle} />
        </div>
        <div className="sticky-actions sm:col-span-2">
          {error && <p className="text-sm font-semibold text-ember">{error}</p>}
          <button className="btn btn-primary w-full" type="submit" disabled={saving}>{saving ? "Saving..." : "Save vehicle"}</button>
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
