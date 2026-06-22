import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/States";
import { continuityStatuses, getScene, productionStatuses, sceneInputFromForm, sceneTypes, upsertScene } from "../lib/sceneRepository";
import type { EotScene } from "../types";

export default function SceneForm() {
  const { sceneId } = useParams();
  const navigate = useNavigate();
  const [scene, setScene] = useState<EotScene | null>(null);
  const [loading, setLoading] = useState(Boolean(sceneId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sceneId) return;
    getScene(sceneId).then(setScene).finally(() => setLoading(false));
  }, [sceneId]);

  if (loading) return <LoadingState label="Loading scene..." />;
  if (sceneId && !scene) return <ErrorState title="Scene not found" message="This scene is not available from Firestore or the local cache." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Scene Builder" title={scene ? `Edit ${scene.title}` : "Create scene"} subtitle="Link written episode material to production locations, cast, assets, camera direction, and continuity." actions={[{ label: "Scenes", to: "/studio/scenes" }]} />
      <form
        className="panel grid gap-4 p-4 sm:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault();
          const input = sceneInputFromForm(new FormData(event.currentTarget), scene?.id);
          if (!input.title.trim()) {
            setError("Scene title is required.");
            return;
          }
          setSaving(true);
          setError("");
          try {
            const id = await upsertScene(input);
            navigate(`/studio/scenes/${id}`);
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to save scene.");
          } finally {
            setSaving(false);
          }
        }}
      >
        <Field name="sceneCode" label="Scene code" value={scene?.sceneCode} />
        <Field name="title" label="Title" value={scene?.title} required />
        <Field name="episodeId" label="Episode ID" value={scene?.episodeId} />
        <Field name="chapterId" label="Chapter ID" value={scene?.chapterId} />
        <Text name="paragraphIds" label="Paragraph IDs" value={scene?.paragraphIds?.join("\n")} />
        <Field name="seasonNumber" label="Season" value={scene?.seasonNumber?.toString()} type="number" />
        <Field name="episodeNumber" label="Episode" value={scene?.episodeNumber?.toString()} type="number" />
        <Field name="sceneNumber" label="Scene number" value={scene?.sceneNumber?.toString()} type="number" />
        <label><span className="label">Scene type</span><select className="field" name="sceneType" defaultValue={scene?.sceneType || "dialogue"}>{sceneTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label><span className="label">Production status</span><select className="field" name="productionStatus" defaultValue={scene?.productionStatus || "draft"}>{productionStatuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label><span className="label">Continuity status</span><select className="field" name="continuityStatus" defaultValue={scene?.continuityStatus || "unchecked"}>{continuityStatuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <Field name="storyDate" label="Story date" value={scene?.storyDate} type="date" />
        <Field name="storyTimeOfDay" label="Story time of day" value={scene?.storyTimeOfDay} />
        <Field name="locationType" label="Location type" value={scene?.locationType} />
        <Field name="locationId" label="Location ID" value={scene?.locationId} />
        <Field name="propertyId" label="Property ID" value={scene?.propertyId} />
        <Field name="businessId" label="Business ID" value={scene?.businessId} />
        <Field name="estimatedDurationMinutes" label="Duration minutes" value={scene?.estimatedDurationMinutes?.toString()} type="number" />
        <Text name="description" label="Description" value={scene?.description} />
        <Text name="emotionalTone" label="Emotional tone" value={scene?.emotionalTone} />
        <Text name="dramaticPurpose" label="Dramatic purpose" value={scene?.dramaticPurpose} />
        <Text name="cameraDirection" label="Camera direction" value={scene?.cameraDirection} />
        <Text name="visualStyle" label="Visual style" value={scene?.visualStyle} />
        <div className="sticky-actions sm:col-span-2">
          {error && <p className="text-sm font-semibold text-ember">{error}</p>}
          <button className="btn btn-primary w-full" type="submit" disabled={saving}>{saving ? "Saving..." : "Save scene"}</button>
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
