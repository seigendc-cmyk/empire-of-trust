import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { SeriesEpisode, SeriesSeason, SeriesTimelineEvent } from '../../../types';

interface TimelinePanelProps {
  seriesId: string;
  seasons: SeriesSeason[];
  episodes: SeriesEpisode[];
  events: SeriesTimelineEvent[];
  onSave: (event: SeriesTimelineEvent) => Promise<void>;
}

export const TimelinePanel: React.FC<TimelinePanelProps> = ({ seriesId, seasons, episodes, events, onSave }) => {
  const [mode, setMode] = useState<'story' | 'publication'>('story');
  const ordered = useMemo(() => [...events].sort((left, right) => mode === 'story'
    ? left.sequenceNumber - right.sequenceNumber
    : String(episodes.find((episode) => episode.id === left.episodeId)?.releaseDate || '').localeCompare(String(episodes.find((episode) => episode.id === right.episodeId)?.releaseDate || ''))
  ), [episodes, events, mode]);
  const add = () => void onSave({
    id: `timeline-${crypto.randomUUID()}`, seriesId, title: 'New timeline event',
    description: '', sequenceNumber: events.length + 1, location: '', characterIds: [],
    consequence: '', continuityNotes: '',
  });
  return (
    <section className="border border-[#d9dde0] bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d9dde0] p-4">
        <h3 className="font-extrabold">Timeline</h3>
        <div className="flex gap-1">
          {(['story','publication'] as const).map((value) => <button key={value} onClick={() => setMode(value)} className={`px-3 py-1.5 text-xs font-bold ${mode === value ? 'bg-[#24282c] text-white' : 'border border-[#cfd3d7]'}`}>{value === 'story' ? 'Story order' : 'Publication order'}</button>)}
          <button title="Add timeline event" onClick={add} className="ml-2 border border-[#cfd3d7] p-1.5"><Plus className="h-4 w-4" /></button>
        </div>
      </header>
      <div className="divide-y divide-[#e4e6e8]">
        {ordered.length === 0 ? <p className="p-8 text-center text-sm text-[#777]">No timeline events yet.</p> : ordered.map((event) => {
          const episode = episodes.find((item) => item.id === event.episodeId);
          const season = seasons.find((item) => item.id === event.seasonId);
          return <article key={event.id} className="grid grid-cols-[72px_1fr] gap-3 p-4"><div className="text-xs font-extrabold text-[#ff6321]">{event.storyDate || `#${event.sequenceNumber}`}</div><div><h4 className="font-bold">{event.title}</h4><p className="text-sm text-[#5d6368]">{event.description || 'No description'}</p><p className="mt-1 text-xs text-[#858b90]">{season?.title || 'Series'} {episode ? `· ${episode.title}` : ''} {event.location ? `· ${event.location}` : ''}</p></div></article>;
        })}
      </div>
    </section>
  );
};
