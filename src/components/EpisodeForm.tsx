import type { Episode } from "../types";

interface Props {
  episode?: Episode | null;
  submitLabel: string;
  onSubmit: (formData: FormData) => void;
}

export function EpisodeForm({ episode, submitLabel, onSubmit }: Props) {
  return (
    <form
      className="panel grid gap-4 p-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(new FormData(event.currentTarget));
      }}
    >
      <label>
        <span className="label">Season</span>
        <input className="field" name="seasonNumber" type="number" inputMode="numeric" min="1" defaultValue={episode?.seasonNumber ?? 1} />
      </label>
      <label>
        <span className="label">Episode</span>
        <input className="field" name="episodeNumber" type="number" inputMode="numeric" min="1" defaultValue={episode?.episodeNumber ?? 1} />
      </label>
      <label>
        <span className="label">Release week</span>
        <input className="field" name="releaseWeekNumber" type="number" inputMode="numeric" min="1" defaultValue={episode?.releaseWeekNumber ?? 1} />
      </label>
      <label>
        <span className="label">Identifier</span>
        <input className="field" name="episodeIdentifier" defaultValue={episode?.episodeIdentifier ?? "S01E01"} />
      </label>
      <label className="sm:col-span-2">
        <span className="label">Title</span>
        <input className="field" name="title" required defaultValue={episode?.title ?? ""} />
      </label>
      <label className="sm:col-span-2">
        <span className="label">Synopsis</span>
        <textarea className="field min-h-28" name="synopsis" defaultValue={episode?.synopsis ?? ""} />
      </label>
      <label>
        <span className="label">Story date</span>
        <input className="field" name="storyDate" type="date" defaultValue={episode?.storyDate ?? ""} />
      </label>
      <label>
        <span className="label">Status</span>
        <select className="field" name="status" defaultValue={episode?.status ?? "draft"}>
          <option value="draft">Draft</option>
          <option value="review">Review</option>
          <option value="approved">Approved</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </label>
      <label>
        <span className="label">Required licence plan</span>
        <input className="field" name="requiredLicencePlan" defaultValue={episode?.requiredLicencePlan ?? "reader"} />
      </label>
      <label>
        <span className="label">Previous episode ID</span>
        <input className="field" name="previousEpisodeId" autoCapitalize="none" defaultValue={episode?.previousEpisodeId ?? ""} />
      </label>
      <label>
        <span className="label">Next episode ID</span>
        <input className="field" name="nextEpisodeId" autoCapitalize="none" defaultValue={episode?.nextEpisodeId ?? ""} />
      </label>
      <label className="sm:col-span-2">
        <span className="label">Active characters</span>
        <textarea className="field min-h-24" name="activeCharacters" defaultValue={episode?.activeCharacters ?? ""} placeholder="Names, roles, tensions, or JSON." />
      </label>
      <label className="sm:col-span-2">
        <span className="label">Business continuity notes</span>
        <textarea className="field min-h-24" name="businessContinuityNotes" defaultValue={episode?.businessContinuityNotes ?? ""} />
      </label>
      <label className="sm:col-span-2">
        <span className="label">Cultural continuity notes</span>
        <textarea className="field min-h-24" name="culturalContinuityNotes" defaultValue={episode?.culturalContinuityNotes ?? ""} />
      </label>
      <div className="sticky-actions sm:col-span-2">
        <button className="btn btn-primary w-full" type="submit">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
