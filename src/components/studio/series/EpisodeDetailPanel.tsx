import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, ExternalLink, RefreshCw, Save } from 'lucide-react';
import { SeriesEpisode, SeriesSeason } from '../../../types';

interface EpisodeDetailPanelProps {
  episode: SeriesEpisode;
  seasons: SeriesSeason[];
  onSave: (episode: SeriesEpisode) => Promise<void>;
  onOpenBook: (bookId: string, destination: 'content' | 'covers' | 'publish' | 'marketing') => void;
}

const fieldClass = 'w-full rounded-md border border-[#cfd3d7] bg-white px-3 py-2 text-sm outline-none focus:border-[#ff6321]';

export const EpisodeDetailPanel: React.FC<EpisodeDetailPanelProps> = ({ episode, seasons, onSave, onOpenBook }) => {
  const [draft, setDraft] = useState(episode);
  const [state, setState] = useState<'saved' | 'dirty' | 'saving' | 'error'>('saved');
  const [error, setError] = useState('');
  const [lastSaved, setLastSaved] = useState(episode.updatedAt);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(episode);
    setState('saved');
    setError('');
    setLastSaved(episode.updatedAt);
  }, [episode]);

  const save = async (value = draft) => {
    if (timer.current) clearTimeout(timer.current);
    setState('saving');
    setError('');
    try {
      await onSave(value);
      setLastSaved(new Date().toISOString());
      setState('saved');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Autosave failed.');
      setState('error');
    }
  };

  const update = <K extends keyof SeriesEpisode>(key: K, value: SeriesEpisode[K]) => {
    const next = { ...draft, [key]: value, updatedAt: new Date().toISOString() };
    setDraft(next);
    setState('dirty');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(next), 700);
  };

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const fields: Array<[keyof SeriesEpisode, string, number]> = [
    ['logline', 'Logline', 2], ['synopsis', 'Synopsis', 4], ['openingHook', 'Opening hook', 3],
    ['episodeGoal', 'Episode objective', 3], ['centralConflict', 'Central conflict', 3],
    ['stakes', 'Stakes', 3], ['midpointTurn', 'Midpoint reversal', 3], ['climax', 'Climax', 3],
    ['resolution', 'Resolution', 3], ['cliffhanger', 'Cliffhanger', 3],
    ['previousEpisodeRecap', 'Previous episode recap', 4], ['nextEpisodeTeaser', 'Next episode teaser', 4],
  ];

  return (
    <section className="border border-[#d9dde0] bg-white">
      <header className="border-b border-[#d9dde0] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-[10px] font-bold uppercase text-[#ff6321]">Episode Inspector</p><h3 className="font-extrabold">{draft.title}</h3></div>
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${state === 'error' ? 'text-red-700' : state === 'saved' ? 'text-[#376b42]' : 'text-[#8a5b16]'}`}>
            {state === 'saved' && <Check className="h-3.5 w-3.5" />}
            {state === 'saving' && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
            {state === 'error' && <AlertCircle className="h-3.5 w-3.5" />}
            {state === 'dirty' ? 'Unsaved' : state === 'saving' ? 'Saving' : state === 'error' ? 'Save failed' : 'Saved'}
          </span>
        </div>
        <p className="mt-1 text-[10px] text-[#858b90]">Last saved {new Date(lastSaved).toLocaleString()}</p>
      </header>
      <div className="space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold">Title<input className={fieldClass} value={draft.title} onChange={(event) => update('title', event.target.value)} /></label>
          <label className="text-xs font-bold">Subtitle<input className={fieldClass} value={draft.subtitle} onChange={(event) => update('subtitle', event.target.value)} /></label>
          <label className="text-xs font-bold">Season
            <select className={fieldClass} value={draft.seasonId} onChange={(event) => update('seasonId', event.target.value)}>
              {seasons.map((season) => <option key={season.id} value={season.id}>Season {season.seasonNumber}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold">Episode number<input type="number" min={1} className={fieldClass} value={draft.episodeNumber} onChange={(event) => update('episodeNumber', Number(event.target.value))} /></label>
          <label className="text-xs font-bold">Status
            <select className={fieldClass} value={draft.status} onChange={(event) => update('status', event.target.value as SeriesEpisode['status'])}>
              {['planned','outlined','writing','editing','ready','scheduled','published','archived'].map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold">Target words<input type="number" min={0} className={fieldClass} value={draft.wordCountTarget} onChange={(event) => update('wordCountTarget', Number(event.target.value))} /></label>
        </div>
        {fields.map(([key, label, rows]) => (
          <label key={key} className="block text-xs font-bold">{label}
            <textarea rows={rows} className={fieldClass} value={String(draft[key] || '')} onChange={(event) => update(key, event.target.value as never)} />
          </label>
        ))}
        <label className="block text-xs font-bold">Subplots, one per line
          <textarea rows={3} className={fieldClass} value={draft.subplots.join('\n')} onChange={(event) => update('subplots', event.target.value.split('\n').filter(Boolean))} />
        </label>
        <label className="block text-xs font-bold">Continuity obligations, one per line
          <textarea rows={3} className={fieldClass} value={draft.continuityObligations.join('\n')} onChange={(event) => update('continuityObligations', event.target.value.split('\n').filter(Boolean))} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            ['releaseDate','Release date'],['writingDeadline','Writing deadline'],
            ['editingDeadline','Editing deadline'],['coverDeadline','Cover deadline'],
            ['signingDeadline','Signing deadline'],['marketingLaunchDate','Marketing launch'],
          ] as const).map(([key, label]) => <label key={key} className="text-xs font-bold">{label}<input type="date" className={fieldClass} value={draft[key] || ''} onChange={(event) => update(key, event.target.value)} /></label>)}
        </div>
        {error && <div role="alert" className="flex items-center justify-between gap-3 border border-red-300 bg-red-50 p-3 text-xs text-red-800"><span>{error}</span><button onClick={() => void save()} className="inline-flex items-center gap-1 font-bold"><RefreshCw className="h-3.5 w-3.5" /> Retry</button></div>}
      </div>
      <footer className="sticky bottom-0 flex flex-wrap gap-2 border-t border-[#d9dde0] bg-white p-3">
        <button type="button" onClick={() => void save()} className="inline-flex items-center gap-1.5 rounded-md bg-[#24282c] px-3 py-2 text-xs font-bold text-white"><Save className="h-3.5 w-3.5" /> Save</button>
        {draft.linkedBookId && ([
          ['content','Manuscript'],['covers','Covers'],['publish','Pricing'],['marketing','Marketing'],
        ] as const).map(([destination, label]) => (
          <button key={destination} type="button" onClick={() => onOpenBook(draft.linkedBookId!, destination)} className="inline-flex items-center gap-1 rounded-md border border-[#cfd3d7] px-2 py-1.5 text-xs font-bold"><ExternalLink className="h-3 w-3" /> {label}</button>
        ))}
      </footer>
    </section>
  );
};
