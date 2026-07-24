import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { SeriesSeason } from '../../../types';

export const SeasonDetailPanel: React.FC<{
  season: SeriesSeason;
  onSave: (season: SeriesSeason) => Promise<void>;
}> = ({ season, onSave }) => {
  const [draft, setDraft] = useState(season);
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(season), [season]);
  const field = 'w-full border border-[#cfd3d7] px-2 py-1.5 text-xs outline-none focus:border-[#ff6321]';
  return (
    <details className="border border-[#d9dde0] bg-white">
      <summary className="cursor-pointer px-4 py-3 text-sm font-extrabold">
        Season {season.seasonNumber} Overview
      </summary>
      <div className="grid gap-3 border-t border-[#e4e6e8] p-4 sm:grid-cols-2">
        <label className="text-xs font-bold">Title<input className={field} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
        <label className="text-xs font-bold">Status<select className={field} value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as SeriesSeason['status'] })}>{['planned','active','completed','archived'].map((status) => <option key={status}>{status}</option>)}</select></label>
        <label className="text-xs font-bold sm:col-span-2">Synopsis<textarea rows={2} className={field} value={draft.synopsis} onChange={(event) => setDraft({ ...draft, synopsis: event.target.value })} /></label>
        {([
          ['centralConflict','Season conflict'],['openingSituation','Opening situation'],
          ['climax','Climax'],['resolution','Resolution'],['nextSeasonHook','Next-season hook'],
        ] as const).map(([key,label]) => <label key={key} className="text-xs font-bold">{label}<textarea rows={2} className={field} value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} /></label>)}
        <label className="text-xs font-bold">Planned release<input type="date" className={field} value={draft.plannedReleaseDate || ''} onChange={(event) => setDraft({ ...draft, plannedReleaseDate: event.target.value })} /></label>
        <button type="button" onClick={() => { setSaving(true); void onSave(draft).finally(() => setSaving(false)); }} className="inline-flex w-fit items-center gap-2 rounded-md bg-[#24282c] px-3 py-2 text-xs font-bold text-white"><Save className="h-3.5 w-3.5" /> {saving ? 'Saving' : 'Save season'}</button>
      </div>
    </details>
  );
};
