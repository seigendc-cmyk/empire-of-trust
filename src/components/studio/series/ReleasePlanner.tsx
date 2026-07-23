import React from 'react';
import { CalendarDays } from 'lucide-react';
import { SeriesEpisode } from '../../../types';

interface ReleasePlannerProps {
  episodes: SeriesEpisode[];
  onSave: (episode: SeriesEpisode) => Promise<void>;
}

export const ReleasePlanner: React.FC<ReleasePlannerProps> = ({ episodes, onSave }) => {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <section className="border border-[#d9dde0] bg-white">
      <header className="flex items-center gap-2 border-b border-[#d9dde0] p-4"><CalendarDays className="h-5 w-5" /><h3 className="font-extrabold">Release Planner</h3></header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-xs">
          <thead className="bg-[#f3f4f5] uppercase text-[#666c71]"><tr>{['Episode','Writing','Editing','Cover','Signing','Marketing','Release','Status'].map((label) => <th key={label} className="px-3 py-2">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#e4e6e8]">{episodes.map((episode) => {
            const overdue = episode.releaseDate && episode.releaseDate < today && !['published','archived'].includes(episode.status);
            const dateField = (key: keyof SeriesEpisode) => <input type="date" className="w-28 border border-[#d5d8db] px-1 py-1" value={String(episode[key] || '')} onChange={(event) => void onSave({ ...episode, [key]: event.target.value })} />;
            return <tr key={episode.id} className={overdue ? 'bg-red-50' : ''}><td className="px-3 py-2 font-bold">{episode.title}{overdue && <span className="ml-2 text-[9px] text-red-700">OVERDUE</span>}</td><td>{dateField('writingDeadline')}</td><td>{dateField('editingDeadline')}</td><td>{dateField('coverDeadline')}</td><td>{dateField('signingDeadline')}</td><td>{dateField('marketingLaunchDate')}</td><td>{dateField('releaseDate')}</td><td><select value={episode.status} onChange={(event) => void onSave({ ...episode, status: event.target.value as SeriesEpisode['status'] })} className="border border-[#d5d8db] px-1 py-1">{['planned','outlined','writing','editing','ready','scheduled','published','archived'].map((status) => <option key={status}>{status}</option>)}</select></td></tr>;
          })}</tbody>
        </table>
      </div>
    </section>
  );
};
