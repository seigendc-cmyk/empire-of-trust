import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/States";
import { actorInputFromForm, actorStatuses, availabilityStatuses, getActor, uploadActorMedia, upsertActor } from "../lib/actorRepository";
import type { EotActor } from "../types";

const experienceLevels = ["new", "emerging", "experienced", "veteran"] as const;

export default function ActorForm() {
  const { actorId } = useParams();
  const navigate = useNavigate();
  const [actor, setActor] = useState<EotActor | null>(null);
  const [loading, setLoading] = useState(Boolean(actorId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!actorId) return;
    getActor(actorId).then(setActor).finally(() => setLoading(false));
  }, [actorId]);

  if (loading) return <LoadingState label="Loading actor..." />;
  if (actorId && !actor) return <ErrorState title="Actor not found" message="This actor is not available from Firestore or the local cache." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Talent Studio" title={actor ? `Edit ${actor.fullName || actor.name}` : "Create actor"} subtitle="Manage actor profile, headshot, skills, availability status, portfolio links, and casting metadata." actions={[{ label: "Actors", to: "/actors" }]} />
      <form
        className="panel grid gap-4 p-4 sm:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const formData = new FormData(form);
          const input = actorInputFromForm(formData, actor?.id);
          if (!input.fullName?.trim()) {
            setError("Full name is required.");
            return;
          }
          setSaving(true);
          setError("");
          try {
            const file = formData.get("headshotFile");
            if (file instanceof File && file.size > 0) {
              const uploaded = await uploadActorMedia(input.id, file, "headshots");
              input.headshotUrl = uploaded.url;
              input.imageUrl = uploaded.url;
            }
            const id = await upsertActor(input);
            navigate(`/actors/${id}`);
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to save actor.");
          } finally {
            setSaving(false);
          }
        }}
      >
        <Field name="actorCode" label="Actor code" value={actor?.actorCode} />
        <Field name="fullName" label="Full name" value={actor?.fullName || actor?.name} required />
        <Field name="stageName" label="Stage name" value={actor?.stageName} />
        <Field name="gender" label="Gender" value={actor?.gender} />
        <Field name="dateOfBirth" label="Date of birth" value={actor?.dateOfBirth} type="date" />
        <Field name="age" label="Age" value={actor?.age?.toString()} type="number" />
        <Field name="nationality" label="Nationality" value={actor?.nationality} />
        <Field name="tribe" label="Tribe" value={actor?.tribe} />
        <Field name="phone" label="Phone" value={actor?.phone} />
        <Field name="whatsapp" label="WhatsApp" value={actor?.whatsapp} />
        <Field name="email" label="Email" value={actor?.email} type="email" />
        <Field name="city" label="City" value={actor?.city} />
        <Field name="country" label="Country" value={actor?.country} />
        <Field name="address" label="Address" value={actor?.address} />
        <label>
          <span className="label">Experience</span>
          <select className="field" name="experienceLevel" defaultValue={actor?.experienceLevel || "new"}>{experienceLevels.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        </label>
        <label>
          <span className="label">Availability</span>
          <select className="field" name="availabilityStatus" defaultValue={actor?.availabilityStatus || "available"}>{availabilityStatuses.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        </label>
        <label>
          <span className="label">Status</span>
          <select className="field" name="status" defaultValue={actor?.status || "active"}>{actorStatuses.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        </label>
        <Field name="headshotUrl" label="Headshot URL" value={actor?.headshotUrl || actor?.imageUrl} />
        <label className="sm:col-span-2">
          <span className="label">Upload headshot</span>
          <input className="field" name="headshotFile" type="file" accept="image/*" />
        </label>
        <Text name="bio" label="Bio" value={actor?.bio || actor?.biography} />
        <Text name="languages" label="Languages" value={actor?.languages?.join("\n")} />
        <Text name="skills" label="Skills" value={actor?.skills?.join("\n")} />
        <Text name="characterIds" label="Character IDs" value={actor?.characterIds?.join("\n")} />
        <Text name="galleryUrls" label="Gallery URLs" value={actor?.galleryUrls?.join("\n")} />
        <Text name="portfolioLinks" label="Portfolio links" value={actor?.portfolioLinks?.join("\n")} />
        <Text name="socialLinks" label="Social links" value={typeof actor?.socialLinks === "string" ? actor.socialLinks : JSON.stringify(actor?.socialLinks ?? {}, null, 2)} />
        <Text name="notes" label="Talent notes" value={actor?.notes} />
        <div className="sticky-actions sm:col-span-2">
          {error && <p className="text-sm font-semibold text-ember">{error}</p>}
          <button className="btn btn-primary w-full" type="submit" disabled={saving}>{saving ? "Saving..." : "Save actor"}</button>
        </div>
      </form>
    </section>
  );
}

function Field({ name, label, value, required = false, type = "text" }: { name: string; label: string; value?: string; required?: boolean; type?: string }) {
  return <label><span className="label">{label}</span><input className="field" name={name} type={type} defaultValue={value ?? ""} required={required} /></label>;
}

function Text({ name, label, value }: { name: string; label: string; value?: string }) {
  return <label className="sm:col-span-2"><span className="label">{label}</span><textarea className="field min-h-20" name={name} defaultValue={value ?? ""} /></label>;
}
