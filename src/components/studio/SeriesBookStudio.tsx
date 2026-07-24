import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, BookCopy, CalendarDays, Database, Image, LayoutDashboard,
  ListChecks, Plus, RefreshCw, ScrollText, ShieldCheck, Users, Globe2,
} from 'lucide-react';
import {
  Book, EpisodeProductionChecklist, SeriesContinuityRule, SeriesEpisode, SeriesLocation,
  SeriesObject, SeriesProject, SeriesRelationship, SeriesSeason, SeriesStoryArc, SeriesTimelineEvent,
} from '../../types';
import {
  calculateEpisodeReadiness, convertLegacyBookSeries, createEpisode, createLinkedBookFromEpisode,
  createSeason, createSeriesWithStructure, deleteEpisode, deleteSeason, duplicateEpisodeOutline,
  duplicateSeasonStructure, generateContinuityWarnings, getAllSeriesProjects, getContinuityRules,
  getEpisodeChecklist, getEpisodesForSeries, getSeasonsForSeries, getSeriesRelationships,
  getSeriesLocations, getSeriesObjects, getStoryArcs, getTimelineEvents, linkEpisodeToBook,
  reorderEpisodes, reorderSeasons, saveContinuityRule, saveEpisodeChecklist, saveSeriesLocation,
  saveSeriesObject, saveSeriesRelationship, saveStoryArc, saveTimelineEvent,
  updateEpisode, updateSeason, updateSeriesProject, unlinkEpisodeFromBook,
} from '../../lib/seriesRepository';
import {
  getSQLiteEngineState, retrySQLiteInitialization, subscribeSQLiteEngineState,
} from '../../lib/sqlite';
import { SeriesSetupPanel } from './series/SeriesSetupPanel';
import { SeriesDashboard } from './series/SeriesDashboard';
import { SeasonManager } from './series/SeasonManager';
import { EpisodeManager } from './series/EpisodeManager';
import { EpisodeDetailPanel } from './series/EpisodeDetailPanel';
import { StoryBiblePanel } from './series/StoryBiblePanel';
import { CharacterArcPanel } from './series/CharacterArcPanel';
import { TimelinePanel } from './series/TimelinePanel';
import { ContinuityPanel } from './series/ContinuityPanel';
import { ReleasePlanner } from './series/ReleasePlanner';
import { SeriesAssetsPanel } from './series/SeriesAssetsPanel';
import { SeriesReadinessPanel } from './series/SeriesReadinessPanel';
import { SeriesPreviewPanel } from './series/SeriesPreviewPanel';
import { SeasonDetailPanel } from './series/SeasonDetailPanel';
import { SeriesDistributionPanel } from './series/SeriesDistributionPanel';

type Workspace = 'dashboard' | 'structure' | 'bible' | 'cast' | 'timeline' | 'continuity' | 'release' | 'assets' | 'preview' | 'distribution';
type BookDestination = 'content' | 'covers' | 'publish' | 'marketing';

interface SeriesBookStudioProps {
  books: Book[];
  onBackToBooks: () => void;
  onBooksChanged: () => Promise<Book[]>;
  onOpenBook: (book: Book, destination: BookDestination) => void;
}

const navigation: Array<[Workspace, string, React.ComponentType<{ className?: string }>]> = [
  ['dashboard','Dashboard',LayoutDashboard],['structure','Seasons & Episodes',BookCopy],
  ['bible','Story Bible',ScrollText],['cast','Characters & Arcs',Users],
  ['timeline','Timeline',CalendarDays],['continuity','Continuity',ShieldCheck],
  ['release','Release Planner',ListChecks],['assets','Assets',Image],['preview','Reader Preview',BookCopy],
  ['distribution','Publish & POP',Globe2],
];

export const SeriesBookStudio: React.FC<SeriesBookStudioProps> = ({ books, onBackToBooks, onBooksChanged, onOpenBook }) => {
  const [projects, setProjects] = useState<SeriesProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>();
  const [seasons, setSeasons] = useState<SeriesSeason[]>([]);
  const [episodes, setEpisodes] = useState<SeriesEpisode[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>();
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string>();
  const [workspace, setWorkspace] = useState<Workspace>('dashboard');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [storageState, setStorageState] = useState(getSQLiteEngineState);
  const [arcs, setArcs] = useState<SeriesStoryArc[]>([]);
  const [relationships, setRelationships] = useState<SeriesRelationship[]>([]);
  const [timeline, setTimeline] = useState<SeriesTimelineEvent[]>([]);
  const [rules, setRules] = useState<SeriesContinuityRule[]>([]);
  const [locations, setLocations] = useState<SeriesLocation[]>([]);
  const [objects, setObjects] = useState<SeriesObject[]>([]);
  const [checklist, setChecklist] = useState<EpisodeProductionChecklist>();

  const project = projects.find((item) => item.id === selectedProjectId);
  const selectedSeason = seasons.find((item) => item.id === selectedSeasonId);
  const selectedEpisode = episodes.find((item) => item.id === selectedEpisodeId);
  const seasonEpisodes = episodes.filter((episode) => episode.seasonId === selectedSeasonId);
  const characters = useMemo(() => {
    const unique = new Map<string, NonNullable<Book['characters']>[number]>();
    books.flatMap((book) => book.characters || []).forEach((character) => unique.set(character.id, character));
    return [...unique.values()];
  }, [books]);
  const warnings = useMemo(
    () => generateContinuityWarnings(seasons, episodes, timeline, relationships),
    [episodes, relationships, seasons, timeline]
  );
  const legacyBooks = books.filter((book) =>
    book.seriesConfig?.isSeries && !book.seriesConfig.seriesProjectId
  );

  useEffect(() => subscribeSQLiteEngineState(setStorageState), []);

  const loadProjects = useCallback(async (preferId?: string) => {
    setLoading(true);
    setError('');
    try {
      const next = await getAllSeriesProjects();
      setProjects(next);
      setSelectedProjectId((current) =>
        preferId && next.some((item) => item.id === preferId)
          ? preferId
          : current && next.some((item) => item.id === current) ? current : next[0]?.id
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load series projects.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProjectData = useCallback(async (seriesId: string) => {
    setError('');
    try {
      const [nextSeasons, nextEpisodes, nextArcs, nextRelationships, nextTimeline, nextRules, nextLocations, nextObjects] = await Promise.all([
        getSeasonsForSeries(seriesId), getEpisodesForSeries(seriesId), getStoryArcs(seriesId),
        getSeriesRelationships(seriesId), getTimelineEvents(seriesId), getContinuityRules(seriesId),
        getSeriesLocations(seriesId), getSeriesObjects(seriesId),
      ]);
      setSeasons(nextSeasons);
      setEpisodes(nextEpisodes);
      setArcs(nextArcs);
      setRelationships(nextRelationships);
      setTimeline(nextTimeline);
      setRules(nextRules);
      setLocations(nextLocations);
      setObjects(nextObjects);
      setSelectedSeasonId((current) => nextSeasons.some((item) => item.id === current) ? current : nextSeasons[0]?.id);
      setSelectedEpisodeId((current) => nextEpisodes.some((item) => item.id === current) ? current : nextEpisodes[0]?.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load series structure.');
    }
  }, []);

  useEffect(() => { void loadProjects(); }, [loadProjects]);
  useEffect(() => { if (selectedProjectId) void loadProjectData(selectedProjectId); }, [loadProjectData, selectedProjectId]);
  useEffect(() => {
    if (!selectedEpisodeId) return setChecklist(undefined);
    void getEpisodeChecklist(selectedEpisodeId).then(setChecklist).catch(() => setChecklist(undefined));
  }, [selectedEpisodeId]);

  const run = async (operation: () => Promise<void>) => {
    setError('');
    try {
      await operation();
      if (selectedProjectId) await loadProjectData(selectedProjectId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Series operation failed.');
    }
  };

  const addSeason = () => {
    if (!project) return;
    const seasonNumber = Math.max(0, ...seasons.map((item) => item.seasonNumber)) + 1;
    void run(async () => {
      const season = await createSeason({ seriesId: project.id, seasonNumber, title: `Season ${seasonNumber}`, orderIndex: seasons.length });
      setSelectedSeasonId(season.id);
    });
  };
  const addEpisode = () => {
    if (!project || !selectedSeason) return;
    const episodeNumber = Math.max(0, ...seasonEpisodes.map((item) => item.episodeNumber)) + 1;
    void run(async () => {
      const episode = await createEpisode({ seriesId: project.id, seasonId: selectedSeason.id, episodeNumber, title: `Episode ${episodeNumber}`, orderIndex: seasonEpisodes.length });
      setSelectedEpisodeId(episode.id);
    });
  };
  const saveEpisode = async (episode: SeriesEpisode) => {
    const updated = await updateEpisode(episode.id, episode);
    setEpisodes((current) => current.map((item) => item.id === updated.id ? updated : item));
  };
  const saveProject = async (update: Partial<SeriesProject>) => {
    if (!project) return;
    const updated = await updateSeriesProject(project.id, update);
    setProjects((current) => current.map((item) => item.id === updated.id ? updated : item));
  };

  const readiness = selectedEpisode && checklist ? calculateEpisodeReadiness(
    selectedEpisode,
    books.find((book) => book.id === selectedEpisode.linkedBookId),
    checklist,
    episodes.some((episode) => episode.seasonId === selectedEpisode.seasonId && episode.episodeNumber === selectedEpisode.episodeNumber + 1),
    false
  ) : undefined;

  if (creating) {
    return <div className="mx-auto max-w-7xl px-3 py-5 sm:px-6"><SeriesSetupPanel characters={characters} books={books} onCancel={() => setCreating(false)} onCreate={async (input) => {
      const created = await createSeriesWithStructure(input);
      await onBooksChanged();
      await loadProjects(created.id);
      setCreating(false);
    }} /></div>;
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#eef0f1]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#cfd3d7] bg-white px-3 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBackToBooks} title="Back to books" className="rounded-md border border-[#cfd3d7] p-2"><ArrowLeft className="h-4 w-4" /></button>
          <div><p className="text-[10px] font-bold uppercase text-[#ff6321]">Book Publishing Studio</p><h1 className="text-lg font-extrabold">Series Book Studio</h1></div>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-md bg-[#ff6321] px-4 py-2 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Create Series</button>
      </header>

      {(error || storageState.status === 'unavailable') && (
        <div role="alert" className="mx-3 mt-3 flex flex-wrap items-center justify-between gap-3 border border-red-300 bg-red-50 p-3 text-sm text-red-900 sm:mx-6">
          <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {error || storageState.error || 'Series storage is unavailable.'}</span>
          <button onClick={() => void retrySQLiteInitialization().then(() => loadProjects())} className="inline-flex items-center gap-1 font-bold"><RefreshCw className="h-4 w-4" /> Retry storage</button>
        </div>
      )}

      <div className="grid min-h-[calc(100vh-125px)] grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border-b border-[#cfd3d7] bg-[#24282c] text-white lg:border-b-0 lg:border-r">
          <div className="border-b border-[#44494e] p-3">
            <label className="text-[10px] font-bold uppercase text-[#adb2b6]">Current series
              <select value={selectedProjectId || ''} onChange={(event) => setSelectedProjectId(event.target.value)} className="mt-1 w-full border border-[#555b60] bg-[#30353a] px-2 py-2 text-sm text-white">
                <option value="">Select series</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
            </label>
          </div>
          <nav className="grid grid-cols-2 p-2 sm:grid-cols-3 lg:grid-cols-1">
            {navigation.map(([value,label,Icon]) => <button key={value} onClick={() => setWorkspace(value)} className={`flex items-center gap-2 px-3 py-2.5 text-left text-xs font-bold ${workspace === value ? 'bg-[#ff6321] text-white' : 'text-[#d6d9db] hover:bg-[#34393e]'}`}><Icon className="h-4 w-4" /> {label}</button>)}
          </nav>
          {legacyBooks.length > 0 && <div className="border-t border-[#44494e] p-3"><p className="text-[10px] font-bold uppercase text-[#adb2b6]">Legacy settings</p>{legacyBooks.map((book) => <button key={book.id} onClick={() => {
            if (!window.confirm(`Convert series settings for "${book.title}"? The legacy metadata will be preserved.`)) return;
            void convertLegacyBookSeries(book, project?.id).then(async (result) => {
              await onBooksChanged();
              await loadProjects(result.project.id);
            }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Conversion failed.'));
          }} className="mt-2 w-full border border-[#555b60] px-2 py-2 text-left text-xs hover:bg-[#34393e]">Convert {book.title}</button>)}</div>}
        </aside>

        <main className="min-w-0 p-3 sm:p-5">
          {loading ? <div className="flex min-h-80 items-center justify-center text-sm text-[#666]"><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading Series Studio</div> : !project ? (
            <div className="flex min-h-96 flex-col items-center justify-center border border-dashed border-[#bfc4c8] bg-white p-8 text-center"><Database className="h-9 w-9 text-[#858b90]" /><h2 className="mt-3 text-xl font-extrabold">No series projects yet</h2><p className="mt-1 max-w-md text-sm text-[#666]">Create a normalized series project or convert confirmed legacy Book Series settings.</p><button onClick={() => setCreating(true)} className="mt-5 rounded-md bg-[#ff6321] px-4 py-2 text-sm font-bold text-white">Create Series</button></div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h2 className="text-2xl font-extrabold">{project.title}</h2><span className="border border-[#bfc4c8] px-2 py-0.5 text-[10px] font-bold uppercase">{project.status}</span></div><p className="text-sm text-[#666]">{project.subtitle || project.seriesPromise || 'Series planning workspace'}</p></div></div>
              {workspace === 'dashboard' && <SeriesDashboard project={project} seasons={seasons} episodes={episodes} books={books} warnings={warnings} />}
              {workspace === 'structure' && (
                <div className="grid min-w-0 gap-4 xl:grid-cols-[240px_300px_minmax(340px,1fr)]">
                  <SeasonManager seasons={seasons} episodes={episodes} selectedSeasonId={selectedSeasonId} onSelect={setSelectedSeasonId} onAdd={addSeason} onDuplicate={(id) => void run(async () => { await duplicateSeasonStructure(id); })} onArchive={(season) => void run(async () => { await updateSeason(season.id,{status:'archived'}); })} onDelete={(id) => { if (window.confirm('Delete this empty season?')) void run(async () => deleteSeason(id,true)); }} onReorder={(ids) => void run(async () => reorderSeasons(project.id,ids))} />
                  <EpisodeManager episodes={seasonEpisodes} books={books} selectedEpisodeId={selectedEpisodeId} onSelect={setSelectedEpisodeId} onAdd={addEpisode} onDuplicate={(id) => void run(async () => { await duplicateEpisodeOutline(id); })} onCreateBook={(id) => void createLinkedBookFromEpisode(id).then(async (book) => { await onBooksChanged(); onOpenBook(book,'content'); }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to create linked book.'))} onLinkBook={(episodeId,bookId) => void run(async () => { await linkEpisodeToBook(episodeId,bookId); await onBooksChanged(); })} onUnlink={(id) => { if (window.confirm('Unlink this manuscript? The book will not be deleted.')) void run(async () => unlinkEpisodeFromBook(id)); }} onArchive={(episode) => void run(async () => { await updateEpisode(episode.id,{status:'archived'}); })} onDelete={(id) => { if (window.confirm('Delete this unlinked episode?')) void run(async () => deleteEpisode(id,true)); }} onReorder={(ids) => selectedSeasonId && void run(async () => reorderEpisodes(selectedSeasonId,ids))} />
                  <div className="min-w-0 space-y-4">{selectedSeason && <SeasonDetailPanel season={selectedSeason} onSave={async (season) => { await updateSeason(season.id, season); await loadProjectData(project.id); }} />}{selectedEpisode ? <><EpisodeDetailPanel episode={selectedEpisode} seasons={seasons} onSave={saveEpisode} onOpenBook={(bookId,destination) => { const book = books.find((item) => item.id === bookId); if (book) onOpenBook(book,destination); }} /><SeriesReadinessPanel readiness={readiness} checklist={checklist} onChecklistChange={async (next) => { await saveEpisodeChecklist(next); setChecklist(next); }} /></> : <div className="border border-dashed border-[#bfc4c8] bg-white p-8 text-center text-sm text-[#777]">Select an episode to open its planning inspector.</div>}</div>
                </div>
              )}
              {workspace === 'bible' && <StoryBiblePanel project={project} onSave={saveProject} locations={locations} objects={objects} rules={rules} onAddLocation={async (location) => { await saveSeriesLocation(location); setLocations(await getSeriesLocations(project.id)); }} onAddObject={async (object) => { await saveSeriesObject(object); setObjects(await getSeriesObjects(project.id)); }} onAddRule={async (rule) => { await saveContinuityRule(rule); setRules(await getContinuityRules(project.id)); }} />}
              {workspace === 'cast' && <CharacterArcPanel seriesId={project.id} characters={characters} arcs={arcs} relationships={relationships} onSaveArc={async (arc) => { await saveStoryArc(arc); setArcs(await getStoryArcs(project.id)); }} onSaveRelationship={async (relationship) => { await saveSeriesRelationship(relationship); setRelationships(await getSeriesRelationships(project.id)); }} />}
              {workspace === 'timeline' && <TimelinePanel seriesId={project.id} seasons={seasons} episodes={episodes} events={timeline} onSave={async (event) => { await saveTimelineEvent(event); setTimeline(await getTimelineEvents(project.id)); }} />}
              {workspace === 'continuity' && <ContinuityPanel warnings={[...warnings,...rules.filter((rule) => rule.active).map((rule) => ({code:`rule-${rule.category}`,severity:rule.severity === 'error' ? 'error' as const : 'warning' as const,message:rule.statement,episodeId:rule.sourceEpisodeId}))]} />}
              {workspace === 'release' && <ReleasePlanner episodes={episodes} onSave={saveEpisode} />}
              {workspace === 'assets' && <SeriesAssetsPanel project={project} onSave={saveProject} />}
              {workspace === 'preview' && <SeriesPreviewPanel project={project} season={selectedSeason} episode={selectedEpisode} />}
              {workspace === 'distribution' && <SeriesDistributionPanel project={project} seasons={seasons} episodes={episodes} books={books} />}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
