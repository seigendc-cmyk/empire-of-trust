import { numberValue, stringValue } from "../lib/forms";
import { deleteParagraph, upsertParagraph } from "../lib/firestore";
import type { Chapter, Paragraph } from "../types";
import { useState } from "react";
import { validateParagraphInput } from "../lib/studioValidation";

interface Props {
  episodeId: string;
  chapters: Chapter[];
  paragraph?: Paragraph | null;
  canDeleteDraft?: boolean;
  onSaved: () => void;
}

export function ParagraphForm({ episodeId, chapters, paragraph, canDeleteDraft = false, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      className="grid gap-3 border border-white/10 bg-black/20 p-3 sm:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const imageSlotsJson = stringValue(formData, "imageSlotsJson", "[]");
        let imageSlots: Paragraph["imageSlots"] = [];
        try {
          const parsed = JSON.parse(imageSlotsJson || "[]");
          imageSlots = Array.isArray(parsed) ? parsed : [];
        } catch {
          setError("Image slots JSON must be valid JSON.");
          return;
        }
        const input = {
          id: paragraph?.id,
          episodeId,
          chapterId: stringValue(formData, "chapterId"),
          paragraphNumber: numberValue(formData, "paragraphNumber"),
          body: stringValue(formData, "body"),
          dialogueJson: stringValue(formData, "dialogueJson", "[]"),
          imagePrompt: stringValue(formData, "imagePrompt"),
          scenePrompt: stringValue(formData, "scenePrompt"),
          cameraDirection: stringValue(formData, "cameraDirection"),
          cinematicDirection: stringValue(formData, "cinematicDirection"),
          emotionalTone: stringValue(formData, "emotionalTone"),
          culturalDetail: stringValue(formData, "culturalDetail"),
          culturalContinuityNote: stringValue(formData, "culturalContinuityNote"),
          businessContinuityNote: stringValue(formData, "businessContinuityNote"),
          interactiveLinksJson: stringValue(formData, "interactiveLinksJson", "[]"),
          imageSlots,
          mentionedCharacterIds: stringValue(formData, "mentionedCharacterIds").split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean),
          mentionedProperties: stringValue(formData, "mentionedProperties").split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean),
          propertyInteractionPrompt: stringValue(formData, "propertyInteractionPrompt"),
          mentionedVehicles: stringValue(formData, "mentionedVehicles").split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean),
          vehicleInteractionPrompt: stringValue(formData, "vehicleInteractionPrompt"),
        };
        const errors = validateParagraphInput(input);
        if (errors.length > 0) {
          setError(errors.join(" "));
          return;
        }
        setSaving(true);
        setError("");
        try {
          await upsertParagraph(input);
          if (!paragraph) event.currentTarget.reset();
          setSaved(true);
          onSaved();
        } finally {
          setSaving(false);
        }
      }}
    >
      <label>
        <span className="label">Chapter</span>
        <select className="field" name="chapterId" defaultValue={paragraph?.chapterId ?? chapters[0]?.id ?? ""} required>
          {chapters.map((chapter) => (
            <option key={chapter.id} value={chapter.id}>
              {chapter.chapterNumber}. {chapter.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="label">Paragraph no.</span>
        <input className="field" name="paragraphNumber" type="number" inputMode="numeric" min="1" defaultValue={paragraph?.paragraphNumber ?? 1} />
      </label>
      <label className="sm:col-span-2">
        <span className="label">Body</span>
        <textarea className="field min-h-28" name="body" defaultValue={paragraph?.body ?? ""} required />
      </label>
      {["dialogueJson", "interactiveLinksJson", "imageSlotsJson", "imagePrompt", "scenePrompt"].map((name) => (
        <label key={name} className="sm:col-span-2">
          <span className="label">{name}</span>
          <textarea className="field min-h-20" name={name} defaultValue={name === "imageSlotsJson" ? JSON.stringify(paragraph?.imageSlots ?? [], null, 2) : (paragraph as unknown as Record<string, string> | undefined)?.[name] ?? (name.endsWith("Json") ? "[]" : "")} />
        </label>
      ))}
      {["cameraDirection", "cinematicDirection", "emotionalTone", "culturalDetail", "culturalContinuityNote", "businessContinuityNote"].map((name) => (
        <label key={name}>
          <span className="label">{name}</span>
          <input className="field" name={name} defaultValue={(paragraph as unknown as Record<string, string> | undefined)?.[name] ?? ""} />
        </label>
      ))}
      <label className="sm:col-span-2">
        <span className="label">Mentioned character IDs</span>
        <textarea className="field min-h-20" name="mentionedCharacterIds" defaultValue={paragraph?.mentionedCharacterIds?.join("\n") ?? ""} placeholder="One master character ID per line." />
      </label>
      <label className="sm:col-span-2">
        <span className="label">Mentioned property IDs</span>
        <textarea className="field min-h-20" name="mentionedProperties" defaultValue={paragraph?.mentionedProperties?.join("\n") ?? ""} placeholder="One property ID per line." />
      </label>
      <label className="sm:col-span-2">
        <span className="label">Property interaction prompt</span>
        <textarea className="field min-h-20" name="propertyInteractionPrompt" defaultValue={paragraph?.propertyInteractionPrompt ?? ""} />
      </label>
      <label className="sm:col-span-2">
        <span className="label">Mentioned vehicle IDs</span>
        <textarea className="field min-h-20" name="mentionedVehicles" defaultValue={paragraph?.mentionedVehicles?.join("\n") ?? ""} placeholder="One vehicle ID per line." />
      </label>
      <label className="sm:col-span-2">
        <span className="label">Vehicle interaction prompt</span>
        <textarea className="field min-h-20" name="vehicleInteractionPrompt" defaultValue={paragraph?.vehicleInteractionPrompt ?? ""} />
      </label>
      <div className="sticky-actions sm:col-span-2">
        {error && <p className="text-sm font-semibold text-ember">{error}</p>}
        {saved && <p className="text-sm font-semibold text-ledger">Paragraph saved.</p>}
        <div className="grid gap-2 sm:flex">
          <button className="btn btn-primary flex-1" type="submit" disabled={chapters.length === 0 || saving || deleting}>
            {saving ? "Saving..." : paragraph ? "Update paragraph" : "Add paragraph"}
          </button>
          {paragraph && canDeleteDraft && (
            <button
              className="btn border-ember bg-ember/20 text-paper hover:bg-ember hover:text-paper"
              type="button"
              disabled={deleting || saving}
              onClick={async () => {
                if (!window.confirm("Delete this draft paragraph?")) return;
                setDeleting(true);
                try {
                  await deleteParagraph(paragraph.id);
                  onSaved();
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? "Deleting..." : "Delete draft"}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
