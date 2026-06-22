import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { EpisodeForm } from "../components/EpisodeForm";
import { PageHeader } from "../components/PageHeader";
import { createEpisode, findEpisodeByIdentifier } from "../lib/firestore";
import { episodeInputFromForm, validateEpisodeInput } from "../lib/studioValidation";

export default function EpisodeNew() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  return (
    <section className="page">
      <PageHeader eyebrow="Studio" title="Create episode" subtitle="Start with metadata. Chapters and paragraphs are added after saving." />
      {warning && <div className="mb-4 border border-signal bg-signal/10 p-3 text-sm font-semibold text-signal">{warning}</div>}
      {error && <div className="mb-4 border border-ember bg-ember/10 p-3 text-sm font-semibold text-ember">{error}</div>}
      <EpisodeForm
        submitLabel={saving ? "Creating..." : "Create episode"}
        onSubmit={async (formData) => {
          const input = episodeInputFromForm(formData);
          const errors = validateEpisodeInput(input);
          if (errors.length > 0) {
            setError(errors.join(" "));
            return;
          }
          setSaving(true);
          setError("");
          setWarning("");
          try {
            const duplicates = await findEpisodeByIdentifier(input.episodeIdentifier);
            if (duplicates.length > 0) {
              setWarning(`Duplicate episodeIdentifier warning: ${input.episodeIdentifier} already exists.`);
              return;
            }
            const id = await createEpisode(input);
            navigate(`/studio/episodes/${id}/edit`);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not create episode.");
          } finally {
            setSaving(false);
          }
        }}
      />
    </section>
  );
}
