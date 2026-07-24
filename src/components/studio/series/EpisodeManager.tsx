import React from 'react';
import { Archive, BookPlus, ChevronDown, ChevronUp, Copy, Link2, Plus, Trash2, Unlink } from 'lucide-react';
import { Book, SeriesEpisode } from '../../../types';

interface EpisodeManagerProps {
  episodes: SeriesEpisode[];
  books: Book[];
  selectedEpisodeId?: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onCreateBook: (id: string) => void;
  onLinkBook: (episodeId: string, bookId: string) => void;
  onUnlink: (id: string) => void;
  onArchive: (episode: SeriesEpisode) => void;
  onDelete: (id: string) => void;
  onReorder: (ids: string[]) => void;
}

export const EpisodeManager: React.FC<EpisodeManagerProps> = (props) => {
  const move = (index: number, direction: -1 | 1) => {
    const next = [...props.episodes];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    props.onReorder(next.map((episode) => episode.id));
  };
  return (
    <section className="border border-[#d9dde0] bg-white">
      <header className="flex items-center justify-between border-b border-[#d9dde0] px-4 py-3">
        <h3 className="text-sm font-extrabold">Episodes</h3>
        <button type="button" onClick={props.onAdd} title="Add episode" className="rounded-md p-1.5 hover:bg-[#f0f1f2]"><Plus className="h-4 w-4" /></button>
      </header>
      {props.episodes.length === 0 ? <p className="p-5 text-sm text-[#777]">Select a season or add its first episode.</p> : (
        <div className="divide-y divide-[#e5e7e9]">
          {props.episodes.map((episode, index) => (
            <article key={episode.id} className={props.selectedEpisodeId === episode.id ? 'bg-[#fff6f1]' : ''}>
              <button type="button" onClick={() => props.onSelect(episode.id)} className="w-full px-4 py-3 text-left">
                <div className="flex items-start justify-between gap-2"><strong className="text-sm">E{episode.episodeNumber} · {episode.title}</strong><span className="shrink-0 text-[10px] font-bold uppercase text-[#777]">{episode.status}</span></div>
                <p className="mt-1 line-clamp-2 text-xs text-[#72777c]">{episode.logline || 'No logline yet'}</p>
                {episode.linkedBookId && <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-[#376b42]"><Link2 className="h-3 w-3" /> Manuscript linked</span>}
              </button>
              <div className="flex flex-wrap items-center gap-1 px-3 pb-2">
                <button title="Move up" onClick={() => move(index, -1)} className="p-1"><ChevronUp className="h-3.5 w-3.5" /></button>
                <button title="Move down" onClick={() => move(index, 1)} className="p-1"><ChevronDown className="h-3.5 w-3.5" /></button>
                <button title="Duplicate outline" onClick={() => props.onDuplicate(episode.id)} className="p-1"><Copy className="h-3.5 w-3.5" /></button>
                {episode.linkedBookId ? (
                  <button title="Unlink book" onClick={() => props.onUnlink(episode.id)} className="p-1"><Unlink className="h-3.5 w-3.5" /></button>
                ) : (
                  <>
                    <button title="Create linked book" onClick={() => props.onCreateBook(episode.id)} className="p-1"><BookPlus className="h-3.5 w-3.5" /></button>
                    <select
                      aria-label={`Link existing book to ${episode.title}`}
                      defaultValue=""
                      onChange={(event) => event.target.value && props.onLinkBook(episode.id, event.target.value)}
                      className="max-w-32 border border-[#cfd3d7] bg-white px-1 py-0.5 text-[10px]"
                    >
                      <option value="">Link existing</option>
                      {props.books.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}
                    </select>
                  </>
                )}
                <button title="Archive" onClick={() => props.onArchive(episode)} className="p-1"><Archive className="h-3.5 w-3.5" /></button>
                <button title="Delete episode" onClick={() => props.onDelete(episode.id)} className="ml-auto p-1 text-red-700"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
