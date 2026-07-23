import React from 'react';
import { Archive, ChevronDown, ChevronUp, Copy, Plus, Trash2 } from 'lucide-react';
import { SeriesEpisode, SeriesSeason } from '../../../types';

interface SeasonManagerProps {
  seasons: SeriesSeason[];
  episodes: SeriesEpisode[];
  selectedSeasonId?: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onArchive: (season: SeriesSeason) => void;
  onDelete: (id: string) => void;
  onReorder: (ids: string[]) => void;
}

export const SeasonManager: React.FC<SeasonManagerProps> = (props) => {
  const move = (index: number, direction: -1 | 1) => {
    const next = [...props.seasons];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    props.onReorder(next.map((season) => season.id));
  };
  return (
    <section className="border border-[#d9dde0] bg-white">
      <header className="flex items-center justify-between border-b border-[#d9dde0] px-4 py-3">
        <h3 className="text-sm font-extrabold">Seasons</h3>
        <button type="button" onClick={props.onAdd} title="Add season" className="rounded-md p-1.5 hover:bg-[#f0f1f2]"><Plus className="h-4 w-4" /></button>
      </header>
      {props.seasons.length === 0 ? <p className="p-5 text-sm text-[#777]">No seasons yet.</p> : (
        <div className="divide-y divide-[#e5e7e9]">
          {props.seasons.map((season, index) => {
            const seasonEpisodes = props.episodes.filter((episode) => episode.seasonId === season.id);
            const complete = seasonEpisodes.filter((episode) => ['ready', 'scheduled', 'published'].includes(episode.status)).length;
            return (
              <article key={season.id} className={props.selectedSeasonId === season.id ? 'bg-[#fff6f1]' : ''}>
                <button type="button" onClick={() => props.onSelect(season.id)} className="w-full px-4 py-3 text-left">
                  <div className="flex items-center justify-between"><strong className="text-sm">S{season.seasonNumber} · {season.title}</strong><span className="text-[10px] font-bold uppercase text-[#777]">{season.status}</span></div>
                  <div className="mt-2 h-1.5 bg-[#e7e9eb]"><div className="h-full bg-[#ff6321]" style={{ width: `${seasonEpisodes.length ? (complete / seasonEpisodes.length) * 100 : 0}%` }} /></div>
                  <p className="mt-1 text-[11px] text-[#777]">{seasonEpisodes.length} episodes · {complete} ready</p>
                </button>
                <div className="flex items-center gap-1 px-3 pb-2">
                  <button title="Move up" onClick={() => move(index, -1)} className="p-1"><ChevronUp className="h-3.5 w-3.5" /></button>
                  <button title="Move down" onClick={() => move(index, 1)} className="p-1"><ChevronDown className="h-3.5 w-3.5" /></button>
                  <button title="Duplicate structure" onClick={() => props.onDuplicate(season.id)} className="p-1"><Copy className="h-3.5 w-3.5" /></button>
                  <button title="Archive" onClick={() => props.onArchive(season)} className="p-1"><Archive className="h-3.5 w-3.5" /></button>
                  <button title="Delete empty season" onClick={() => props.onDelete(season.id)} className="ml-auto p-1 text-red-700"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
