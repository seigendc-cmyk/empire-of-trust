import React from 'react';
import { BookOpen } from 'lucide-react';
import { SeriesEpisode, SeriesProject, SeriesSeason } from '../../../types';

export const SeriesPreviewPanel: React.FC<{ project: SeriesProject; season?: SeriesSeason; episode?: SeriesEpisode }> = ({ project, season, episode }) => (
  <section className="overflow-hidden border border-[#d9dde0] bg-white">
    <div className="bg-[#24282c] p-6 text-white">
      <p className="text-xs font-bold uppercase text-[#ff8b59]">Reader Preview</p>
      <h3 className="mt-2 text-2xl font-extrabold">{project.title}</h3>
      {project.subtitle && <p className="text-sm text-[#d3d6d8]">{project.subtitle}</p>}
    </div>
    <div className="p-5">
      {episode ? <><div className="flex items-center gap-2 text-xs font-bold uppercase text-[#ff6321]"><BookOpen className="h-4 w-4" /> Season {season?.seasonNumber} · Episode {episode.episodeNumber}</div><h4 className="mt-2 text-xl font-extrabold">{episode.title}</h4>{episode.previousEpisodeRecap && <div className="mt-5 border-l-4 border-[#ff6321] bg-[#fff6f1] p-4"><p className="text-xs font-extrabold uppercase">Previously On</p><p className="mt-1 text-sm">{episode.previousEpisodeRecap}</p></div>}<p className="mt-4 text-sm">{episode.synopsis || 'No public synopsis yet.'}</p>{episode.nextEpisodeTeaser && <div className="mt-5 border-t border-[#d9dde0] pt-4"><p className="text-xs font-extrabold uppercase">Next Episode</p><p className="mt-1 text-sm">{episode.nextEpisodeTeaser}</p></div>}</> : <p className="text-sm text-[#777]">Select an episode to preview safe Reader metadata.</p>}
    </div>
  </section>
);
