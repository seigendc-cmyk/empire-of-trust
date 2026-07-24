import React from 'react';
import { AlertTriangle, BookOpen, CalendarClock, CheckCircle2, CircleDashed, Layers3 } from 'lucide-react';
import { Book, SeriesEpisode, SeriesProject, SeriesSeason } from '../../../types';
import { SeriesContinuityWarning } from '../../../lib/seriesRepository';

interface SeriesDashboardProps {
  project: SeriesProject;
  seasons: SeriesSeason[];
  episodes: SeriesEpisode[];
  books: Book[];
  warnings: SeriesContinuityWarning[];
}

const pipeline = ['Concept', 'Story Bible', 'Season Planning', 'Episode Planning', 'Writing', 'Editing', 'Packaging', 'Signing', 'Publishing', 'Marketing'];

export const SeriesDashboard: React.FC<SeriesDashboardProps> = ({ project, seasons, episodes, books, warnings }) => {
  const linkedBooks = episodes.filter((episode) => episode.linkedBookId);
  const completed = episodes.filter((episode) => ['ready', 'scheduled', 'published'].includes(episode.status));
  const nextRelease = episodes.filter((episode) => episode.releaseDate && episode.status !== 'published')
    .sort((left, right) => String(left.releaseDate).localeCompare(String(right.releaseDate)))[0];
  const missingCovers = linkedBooks.filter((episode) => {
    const book = books.find((candidate) => candidate.id === episode.linkedBookId);
    return !book?.coverFront?.title;
  }).length;
  const missingPricing = linkedBooks.filter((episode) => {
    const book = books.find((candidate) => candidate.id === episode.linkedBookId);
    return book?.price === undefined;
  }).length;
  const progress = episodes.length ? Math.round((completed.length / episodes.length) * 100) : 0;
  const metrics = [
    ['Seasons', seasons.length, Layers3], ['Episodes', episodes.length, BookOpen],
    ['Linked books', linkedBooks.length, BookOpen], ['Completed', completed.length, CheckCircle2],
    ['Draft', episodes.filter((episode) => ['outlined', 'writing', 'editing'].includes(episode.status)).length, CircleDashed],
    ['Planned', episodes.filter((episode) => episode.status === 'planned').length, CalendarClock],
    ['Warnings', warnings.length, AlertTriangle], ['Readiness', `${progress}%`, CheckCircle2],
  ] as const;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-px border border-[#d9dde0] bg-[#d9dde0] lg:grid-cols-4">
        {metrics.map(([label, value, Icon]) => (
          <div key={label} className="bg-white p-4">
            <div className="flex items-center justify-between text-[#747a80]"><span className="text-xs font-bold uppercase">{label}</span><Icon className="h-4 w-4" /></div>
            <p className="mt-2 text-2xl font-extrabold text-[#24282c]">{value}</p>
          </div>
        ))}
      </div>
      <section className="border border-[#d9dde0] bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-extrabold">Production Pipeline</h3>
          <span className="text-xs font-bold uppercase text-[#6d7378]">{project.status}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {pipeline.map((stage, index) => {
            const reached = index <= Math.floor((progress / 100) * (pipeline.length - 1));
            return <div key={stage} className={`border px-3 py-3 text-xs font-bold ${reached ? 'border-[#376b42] bg-[#eef7ef] text-[#285331]' : 'border-[#d9dde0] text-[#858b90]'}`}>{index + 1}. {stage}</div>;
          })}
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="border border-[#d9dde0] bg-white p-4"><p className="text-xs font-bold uppercase text-[#777]">Next scheduled release</p><p className="mt-2 font-bold">{nextRelease ? `${nextRelease.title} · ${nextRelease.releaseDate}` : 'No release scheduled'}</p></div>
        <div className="border border-[#d9dde0] bg-white p-4"><p className="text-xs font-bold uppercase text-[#777]">Commercial gaps</p><p className="mt-2 font-bold">{missingCovers} missing covers · {missingPricing} missing pricing</p></div>
        <div className="border border-[#d9dde0] bg-white p-4"><p className="text-xs font-bold uppercase text-[#777]">Signing</p><p className="mt-2 font-bold">{linkedBooks.length} data packs awaiting issuance checks</p></div>
      </div>
    </div>
  );
};
