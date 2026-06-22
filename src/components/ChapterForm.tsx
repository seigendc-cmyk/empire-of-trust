import { numberValue, stringValue } from "../lib/forms";
import { upsertChapter } from "../lib/firestore";
import type { Chapter } from "../types";
import { useState } from "react";
import { validateChapterInput } from "../lib/studioValidation";

interface Props {
  episodeId: string;
  chapter?: Chapter | null;
  onSaved: () => void;
}

export function ChapterForm({ episodeId, chapter, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      className="grid gap-3 border border-white/10 bg-black/20 p-3 sm:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const input = {
          id: chapter?.id,
          episodeId,
          chapterNumber: numberValue(formData, "chapterNumber"),
          title: stringValue(formData, "title"),
          intro: stringValue(formData, "intro"),
          previousEpisodeBridge: stringValue(formData, "previousEpisodeBridge"),
          previousSceneReview: stringValue(formData, "previousSceneReview"),
          emotionalTone: stringValue(formData, "emotionalTone"),
          sceneLocation: stringValue(formData, "sceneLocation"),
          scenePropertyId: stringValue(formData, "scenePropertyId"),
          sceneLocationText: stringValue(formData, "sceneLocationText"),
          sceneVehicleIds: stringValue(formData, "sceneVehicleIds").split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean),
          featuredCharacterIds: stringValue(formData, "featuredCharacterIds").split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean),
        };
        const errors = validateChapterInput(input);
        if (errors.length > 0) {
          setError(errors.join(" "));
          return;
        }
        setSaving(true);
        setError("");
        try {
          await upsertChapter(input);
          if (!chapter) event.currentTarget.reset();
          setSaved(true);
          onSaved();
        } finally {
          setSaving(false);
        }
      }}
    >
      <label>
        <span className="label">Chapter no.</span>
        <input className="field" name="chapterNumber" type="number" inputMode="numeric" min="1" defaultValue={chapter?.chapterNumber ?? 1} />
      </label>
      <label>
        <span className="label">Title</span>
        <input className="field" name="title" defaultValue={chapter?.title ?? ""} required />
      </label>
      <label className="sm:col-span-2">
        <span className="label">Intro</span>
        <textarea className="field min-h-20" name="intro" defaultValue={chapter?.intro ?? ""} />
      </label>
      <label className="sm:col-span-2">
        <span className="label">Previous bridge</span>
        <textarea className="field min-h-20" name="previousEpisodeBridge" defaultValue={chapter?.previousEpisodeBridge ?? ""} />
      </label>
      <label className="sm:col-span-2">
        <span className="label">Previous scene review</span>
        <textarea className="field min-h-20" name="previousSceneReview" defaultValue={chapter?.previousSceneReview ?? ""} />
      </label>
      <label>
        <span className="label">Tone</span>
        <input className="field" name="emotionalTone" defaultValue={chapter?.emotionalTone ?? ""} />
      </label>
      <label>
        <span className="label">Scene location</span>
        <input className="field" name="sceneLocation" defaultValue={chapter?.sceneLocation ?? ""} />
      </label>
      <label>
        <span className="label">Scene property ID</span>
        <input className="field" name="scenePropertyId" defaultValue={chapter?.scenePropertyId ?? ""} />
      </label>
      <label>
        <span className="label">Scene location text</span>
        <input className="field" name="sceneLocationText" defaultValue={chapter?.sceneLocationText ?? ""} />
      </label>
      <label className="sm:col-span-2">
        <span className="label">Scene vehicle IDs</span>
        <textarea className="field min-h-20" name="sceneVehicleIds" defaultValue={chapter?.sceneVehicleIds?.join("\n") ?? ""} placeholder="One scene vehicle ID per line." />
      </label>
      <label className="sm:col-span-2">
        <span className="label">Featured character IDs</span>
        <textarea className="field min-h-20" name="featuredCharacterIds" defaultValue={chapter?.featuredCharacterIds?.join("\n") ?? ""} placeholder="One master character ID per line." />
      </label>
      <div className="sticky-actions sm:col-span-2">
        {error && <p className="text-sm font-semibold text-ember">{error}</p>}
        {saved && <p className="text-sm font-semibold text-ledger">Chapter saved.</p>}
        <button className="btn btn-primary w-full" type="submit" disabled={saving}>
          {saving ? "Saving..." : chapter ? "Update chapter" : "Add chapter"}
        </button>
      </div>
    </form>
  );
}
