import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/States";
import { getTimelineEvent, timelineEventInputFromForm, timelineEventTypes, upsertTimelineEvent } from "../lib/continuityRepository";
import type { EotTimelineEvent } from "../types";

export default function TimelineForm() {
  const { timelineEventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EotTimelineEvent | null>(null);
  const [loading, setLoading] = useState(Boolean(timelineEventId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!timelineEventId) return;
    getTimelineEvent(timelineEventId).then(setEvent).finally(() => setLoading(false));
  }, [timelineEventId]);

  if (loading) return <LoadingState label="Loading timeline event..." />;
  if (timelineEventId && !event) return <ErrorState title="Timeline event not found" message="This timeline event is not available from Firestore or the local cache." />;

  return (
    <section className="page grid gap-4">
      <PageHeader eyebrow="Timeline" title={event ? `Edit ${event.title}` : "Create timeline event"} subtitle="Preserve story, production, release, entity, and continuity logic across the universe." actions={[{ label: "Timeline", to: "/studio/timeline" }]} />
      <form
        className="panel grid gap-4 p-4 sm:grid-cols-2"
        onSubmit={async (submitEvent) => {
          submitEvent.preventDefault();
          const input = timelineEventInputFromForm(new FormData(submitEvent.currentTarget), event?.id);
          if (!input.title.trim()) {
            setError("Title is required.");
            return;
          }
          setSaving(true);
          setError("");
          try {
            const id = await upsertTimelineEvent(input);
            navigate(`/studio/timeline/${id}`);
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to save timeline event.");
          } finally {
            setSaving(false);
          }
        }}
      >
        <Field name="eventCode" label="Event code" value={event?.eventCode} />
        <Field name="title" label="Title" value={event?.title} required />
        <label><span className="label">Event type</span><select className="field" name="eventType" defaultValue={event?.eventType || "story"}>{timelineEventTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label><span className="label">Importance</span><select className="field" name="importance" defaultValue={event?.importance || "medium"}>{["low", "medium", "high", "critical"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <Field name="seasonNumber" label="Season" value={event?.seasonNumber?.toString()} type="number" />
        <Field name="episodeNumber" label="Episode" value={event?.episodeNumber?.toString()} type="number" />
        <Field name="episodeId" label="Episode ID" value={event?.episodeId} />
        <Field name="chapterId" label="Chapter ID" value={event?.chapterId} />
        <Field name="sceneId" label="Scene ID" value={event?.sceneId} />
        <Field name="paragraphId" label="Paragraph ID" value={event?.paragraphId} />
        <Field name="storyDate" label="Story date" value={event?.storyDate} type="date" />
        <Field name="storyTime" label="Story time" value={event?.storyTime} />
        <Field name="releaseDate" label="Release date" value={event?.releaseDate} type="date" />
        <Text name="description" label="Description" value={event?.description} />
        <Text name="involvedCharacterIds" label="Involved character IDs" value={event?.involvedCharacterIds?.join("\n")} />
        <Text name="involvedBusinessIds" label="Involved business IDs" value={event?.involvedBusinessIds?.join("\n")} />
        <Text name="involvedPropertyIds" label="Involved property IDs" value={event?.involvedPropertyIds?.join("\n")} />
        <Text name="involvedVehicleIds" label="Involved vehicle IDs" value={event?.involvedVehicleIds?.join("\n")} />
        <Text name="involvedRelationshipIds" label="Involved relationship IDs" value={event?.involvedRelationshipIds?.join("\n")} />
        <Text name="consequenceSummary" label="Consequence summary" value={event?.consequenceSummary} />
        <Text name="continuityNotes" label="Continuity notes" value={event?.continuityNotes} />
        <div className="sticky-actions sm:col-span-2">
          {error && <p className="text-sm font-semibold text-ember">{error}</p>}
          <button className="btn btn-primary w-full" type="submit" disabled={saving}>{saving ? "Saving..." : "Save event"}</button>
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
