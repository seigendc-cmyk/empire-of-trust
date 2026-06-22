import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/States";
import { characterInputFromForm, characterStatuses, getMasterCharacter, upsertMasterCharacter } from "../lib/characterRepository";
import type { EotCharacter } from "../types";

export default function CharacterForm() {
  const { characterId } = useParams();
  const navigate = useNavigate();
  const [character, setCharacter] = useState<EotCharacter | null>(null);
  const [loading, setLoading] = useState(Boolean(characterId));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!characterId) return;
    getMasterCharacter(characterId).then((row) => setCharacter(row ?? null)).finally(() => setLoading(false));
  }, [characterId]);

  if (loading) return <LoadingState label="Loading character editor..." />;
  if (characterId && !character) return <ErrorState title="Character not found" />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Character Universe" title={character ? "Edit character" : "New character"} subtitle="Create a reusable master character entity for story, production, business, family, and asset references." actions={[{ label: "Characters", to: "/characters" }]} />
      {error && <div className="border border-ember bg-ember/10 p-3 text-sm font-semibold text-ember">{error}</div>}
      <form className="panel grid gap-4 p-4 md:grid-cols-2" onSubmit={async (event) => {
        event.preventDefault();
        try {
          const id = await upsertMasterCharacter(characterInputFromForm(new FormData(event.currentTarget)));
          navigate(`/characters/${id}`);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not save character.");
        }
      }}>
        <input type="hidden" name="id" value={character?.id ?? ""} />
        <Field name="characterCode" label="Character code" value={character?.characterCode ?? ""} />
        <label><span className="label">Status</span><select className="field" name="status" defaultValue={character?.status ?? "active"}>{characterStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
        <Field name="firstName" label="First name" value={character?.firstName ?? ""} />
        <Field name="middleName" label="Middle name" value={character?.middleName ?? ""} />
        <Field name="lastName" label="Last name" value={character?.lastName ?? ""} />
        <Field name="displayName" label="Display name" value={character?.displayName ?? ""} required />
        <Field name="nickname" label="Nickname" value={character?.nickname ?? ""} />
        <Field name="gender" label="Gender" value={character?.gender ?? ""} />
        <Field name="dateOfBirth" label="Date of birth" value={character?.dateOfBirth ?? ""} type="date" />
        <Field name="age" label="Age" value={String(character?.age ?? 0)} type="number" />
        <Field name="nationality" label="Nationality" value={character?.nationality ?? ""} />
        <Field name="tribe" label="Tribe" value={character?.tribe ?? ""} />
        <Field name="language" label="Language" value={character?.language ?? ""} />
        <Field name="occupation" label="Occupation" value={character?.occupation ?? ""} />
        <Field name="role" label="Role" value={character?.role ?? ""} />
        <Field name="archetype" label="Archetype" value={character?.archetype ?? ""} />
        <Field name="position" label="Position" value={character?.position ?? ""} />
        <Field name="displayOrder" label="Display order" value={String(character?.displayOrder ?? 999)} type="number" />
        <div className="grid gap-2 border border-white/10 bg-black/20 p-3">
          <label className="flex min-h-10 items-center justify-between gap-3 text-sm font-semibold">
            Public character
            <input name="isPublic" type="checkbox" defaultChecked={character?.isPublic !== false} />
          </label>
          <label className="flex min-h-10 items-center justify-between gap-3 text-sm font-semibold">
            Enabled
            <input name="enabled" type="checkbox" defaultChecked={character?.enabled !== false} />
          </label>
        </div>
        <Area name="physicalDescription" label="Physical description" value={character?.physicalDescription ?? ""} />
        <Field name="height" label="Height" value={character?.height ?? ""} />
        <Field name="build" label="Build" value={character?.build ?? ""} />
        <Field name="complexion" label="Complexion" value={character?.complexion ?? ""} />
        <Field name="hairStyle" label="Hair style" value={character?.hairStyle ?? ""} />
        <Field name="eyeColor" label="Eye color" value={character?.eyeColor ?? ""} />
        <Area name="personality" label="Personality" value={character?.personality ?? ""} />
        <Area name="shortBiography" label="Short biography" value={character?.shortBiography ?? ""} />
        <Area name="coreTraits" label="Core traits" value={(character?.coreTraits ?? []).join("\n") || character?.strengths || ""} />
        <Area name="signatureQuote" label="Signature quote" value={character?.signatureQuote ?? ""} />
        <Area name="memorableQuotes" label="Memorable quotes" value={(character?.memorableQuotes ?? []).join("\n")} />
        <Area name="weaknesses" label="Weaknesses" value={character?.weaknesses ?? ""} />
        <Area name="ambitions" label="Ambitions" value={character?.ambitions ?? ""} />
        <Area name="fears" label="Fears" value={character?.fears ?? ""} />
        <Area name="values" label="Values" value={character?.values ?? ""} />
        <Area name="backstory" label="Backstory" value={character?.backstory ?? character?.biography ?? ""} />
        <Area name="currentStoryStatus" label="Current story status" value={character?.currentStoryStatus ?? character?.currentStatus ?? ""} />
        <Area name="currentConflict" label="Current conflict" value={character?.currentConflict ?? ""} />
        <Area name="currentGoal" label="Current goal" value={character?.currentGoal ?? ""} />
        <Area name="businessesOwned" label="Businesses owned IDs" value={(character?.businessesOwned ?? []).join("\n")} />
        <Area name="executiveRoles" label="Executive roles" value={(character?.executiveRoles ?? []).join("\n")} />
        <Area name="shareholdings" label="Shareholdings" value={(character?.shareholdings ?? []).join("\n")} />
        <Field name="father" label="Father character ID" value={character?.father ?? ""} />
        <Field name="mother" label="Mother character ID" value={character?.mother ?? ""} />
        <Area name="children" label="Children IDs" value={(character?.children ?? []).join("\n")} />
        <Area name="siblings" label="Sibling IDs" value={(character?.siblings ?? []).join("\n")} />
        <Area name="spouses" label="Spouse IDs" value={(character?.spouses ?? []).join("\n")} />
        <Area name="formerSpouses" label="Former spouse IDs" value={(character?.formerSpouses ?? []).join("\n")} />
        <Area name="properties" label="Property IDs" value={(character?.properties ?? character?.propertyIds ?? []).join("\n")} />
        <Area name="vehicles" label="Vehicle IDs" value={(character?.vehicles ?? character?.vehicleIds ?? []).join("\n")} />
        <Field name="portraitUrl" label="Portrait URL" value={character?.portraitUrl ?? character?.imageUrl ?? ""} wide />
        <Area name="galleryUrls" label="Gallery URLs" value={(character?.galleryUrls ?? []).join("\n")} />
        <div className="sticky-actions md:col-span-2"><button className="btn btn-primary w-full" type="submit">Save character</button></div>
      </form>
    </section>
  );
}

function Field({ name, label, value, type = "text", required = false, wide = false }: { name: string; label: string; value: string; type?: string; required?: boolean; wide?: boolean }) {
  return <label className={wide ? "md:col-span-2" : ""}><span className="label">{label}</span><input className="field" name={name} type={type} defaultValue={value} required={required} /></label>;
}

function Area({ name, label, value }: { name: string; label: string; value: string }) {
  return <label className="md:col-span-2"><span className="label">{label}</span><textarea className="field min-h-24" name={name} defaultValue={value} /></label>;
}
