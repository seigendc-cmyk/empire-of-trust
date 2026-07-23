import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Plus } from 'lucide-react';
import { Book, Character, SeriesProject } from '../../../types';
import { CreateSeriesStructureInput } from '../../../lib/seriesRepository';

interface SeriesSetupPanelProps {
  characters: Character[];
  books: Book[];
  onCancel: () => void;
  onCreate: (input: CreateSeriesStructureInput) => Promise<void>;
}

const steps = ['Identity', 'Foundation', 'Structure', 'Story Bible', 'Cast', 'Release', 'Review'];
const fieldClass = 'w-full rounded-md border border-[#cfd3d7] bg-white px-3 py-2 text-sm outline-none focus:border-[#ff6321]';
const labelClass = 'space-y-1 text-xs font-semibold text-[#454b50]';

export const SeriesSetupPanel: React.FC<SeriesSetupPanelProps> = ({ characters, books, onCancel, onCreate }) => {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [seasonCount, setSeasonCount] = useState(1);
  const [episodesPerSeason, setEpisodesPerSeason] = useState(3);
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [newCharacterNames, setNewCharacterNames] = useState('');
  const [characterHostBookId, setCharacterHostBookId] = useState(books[0]?.id || '');
  const [project, setProject] = useState<Partial<SeriesProject> & Pick<SeriesProject, 'title'>>({
    title: '',
    subtitle: '',
    genre: '',
    language: 'English (US)',
    targetAudience: '',
    premise: '',
    centralConflict: '',
    seriesPromise: '',
    theme: '',
    intendedReaderValue: '',
    episodeNamingConvention: 'Episode {number}',
    numberingFormat: 'S{season}E{episode}',
    worldDescription: '',
    historicalBackground: '',
    culturalNotes: '',
    organizations: [],
    terminology: [],
    systemRules: [],
    releaseModel: 'weekly',
    pricingStrategy: '',
    status: 'concept',
  });

  const canContinue = useMemo(() => step !== 0 || Boolean(project.title.trim()), [project.title, step]);
  const setText = (key: keyof SeriesProject, value: string) =>
    setProject((current) => ({ ...current, [key]: value }));
  const setList = (key: 'organizations' | 'terminology' | 'systemRules', value: string) =>
    setProject((current) => ({ ...current, [key]: value.split('\n').map((item) => item.trim()).filter(Boolean) }));

  const create = async () => {
    setSaving(true);
    setError('');
    try {
      await onCreate({
        project: {
          ...project,
          plannedSeasonCount: seasonCount,
          plannedEpisodeCount: seasonCount * episodesPerSeason,
        },
        seasonCount,
        episodesPerSeason,
        characterIds: selectedCharacters,
        newCharacterNames: newCharacterNames.split('\n').map((name) => name.trim()).filter(Boolean),
        characterHostBook: books.find((book) => book.id === characterHostBookId),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create the series.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="min-h-[620px] bg-white border border-[#d9dde0]">
      <header className="flex items-center justify-between border-b border-[#d9dde0] px-5 py-4">
        <div>
          <p className="text-xs font-bold uppercase text-[#ff6321]">Create Series</p>
          <h2 className="text-xl font-extrabold text-[#24282c]">{steps[step]}</h2>
        </div>
        <button type="button" onClick={onCancel} className="text-sm font-semibold text-[#5d6368] hover:text-black">
          Cancel
        </button>
      </header>
      <div className="grid grid-cols-2 border-b border-[#d9dde0] sm:grid-cols-4 lg:grid-cols-7">
        {steps.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => index <= step && setStep(index)}
            className={`min-h-12 border-r border-[#e4e6e8] px-2 text-xs font-bold ${
              index === step ? 'bg-[#24282c] text-white' : index < step ? 'bg-[#eef7ef] text-[#2e6b38]' : 'text-[#8a9095]'
            }`}
          >
            {index + 1}. {label}
          </button>
        ))}
      </div>
      <div className="mx-auto max-w-4xl p-5 sm:p-8">
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>Series title<input className={fieldClass} value={project.title} onChange={(event) => setText('title', event.target.value)} /></label>
            <label className={labelClass}>Subtitle<input className={fieldClass} value={project.subtitle} onChange={(event) => setText('subtitle', event.target.value)} /></label>
            <label className={labelClass}>Genre<input className={fieldClass} value={project.genre} onChange={(event) => setText('genre', event.target.value)} /></label>
            <label className={labelClass}>Language<input className={fieldClass} value={project.language} onChange={(event) => setText('language', event.target.value)} /></label>
            <label className={`${labelClass} sm:col-span-2`}>Target audience<input className={fieldClass} value={project.targetAudience} onChange={(event) => setText('targetAudience', event.target.value)} /></label>
          </div>
        )}
        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {([
              ['premise', 'Premise'], ['centralConflict', 'Central conflict'],
              ['seriesPromise', 'Series promise'], ['theme', 'Theme'],
              ['intendedReaderValue', 'Intended lesson or reader value'],
            ] as const).map(([key, label]) => (
              <label key={key} className={`${labelClass} ${key === 'intendedReaderValue' ? 'sm:col-span-2' : ''}`}>
                {label}<textarea rows={4} className={fieldClass} value={project[key]} onChange={(event) => setText(key, event.target.value)} />
              </label>
            ))}
          </div>
        )}
        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>Number of seasons<input type="number" min={1} className={fieldClass} value={seasonCount} onChange={(event) => setSeasonCount(Math.max(1, Number(event.target.value)))} /></label>
            <label className={labelClass}>Episodes per season<input type="number" min={0} className={fieldClass} value={episodesPerSeason} onChange={(event) => setEpisodesPerSeason(Math.max(0, Number(event.target.value)))} /></label>
            <label className={labelClass}>Episode naming convention<input className={fieldClass} value={project.episodeNamingConvention} onChange={(event) => setText('episodeNamingConvention', event.target.value)} /></label>
            <label className={labelClass}>Numbering format<input className={fieldClass} value={project.numberingFormat} onChange={(event) => setText('numberingFormat', event.target.value)} /></label>
          </div>
        )}
        {step === 3 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={`${labelClass} sm:col-span-2`}>World<textarea rows={4} className={fieldClass} value={project.worldDescription} onChange={(event) => setText('worldDescription', event.target.value)} /></label>
            <label className={labelClass}>Historical background<textarea rows={4} className={fieldClass} value={project.historicalBackground} onChange={(event) => setText('historicalBackground', event.target.value)} /></label>
            <label className={labelClass}>Culture<textarea rows={4} className={fieldClass} value={project.culturalNotes} onChange={(event) => setText('culturalNotes', event.target.value)} /></label>
            <label className={labelClass}>World and continuity rules<textarea rows={5} className={fieldClass} value={(project.systemRules || []).join('\n')} onChange={(event) => setList('systemRules', event.target.value)} /></label>
            <label className={labelClass}>Organizations<textarea rows={5} className={fieldClass} value={(project.organizations || []).join('\n')} onChange={(event) => setList('organizations', event.target.value)} /></label>
          </div>
        )}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-[#5d6368]">Select existing Book Studio characters. Participation and arcs are stored at series level without duplicating character records.</p>
            {characters.length === 0 ? (
              <div className="border border-dashed border-[#cfd3d7] p-8 text-center text-sm text-[#6d7378]">
                Create characters in a Book Studio manuscript, then return here to assign them.
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {characters.map((character) => (
                  <label key={character.id} className="flex items-center gap-3 border border-[#d9dde0] p-3 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedCharacters.includes(character.id)}
                      onChange={() => setSelectedCharacters((current) =>
                        current.includes(character.id)
                          ? current.filter((id) => id !== character.id)
                          : [...current, character.id]
                      )}
                    />
                    <span><strong>{character.name}</strong><br /><span className="text-xs text-[#72777c]">{character.role || 'Unassigned role'}</span></span>
                  </label>
                ))}
              </div>
            )}
            <div className="grid gap-4 border-t border-[#d9dde0] pt-4 sm:grid-cols-2">
              <label className={labelClass}>Create characters, one name per line
                <textarea rows={4} className={fieldClass} value={newCharacterNames} onChange={(event) => setNewCharacterNames(event.target.value)} />
              </label>
              <label className={labelClass}>Owning Book Studio manuscript
                <select className={fieldClass} value={characterHostBookId} onChange={(event) => setCharacterHostBookId(event.target.value)}>
                  <option value="">Select manuscript</option>
                  {books.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}
                </select>
                <span className="block font-normal text-[#777]">New character records live with this book and are referenced by the series.</span>
              </label>
            </div>
          </div>
        )}
        {step === 5 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>Release model
              <select className={fieldClass} value={project.releaseModel} onChange={(event) => setProject((current) => ({ ...current, releaseModel: event.target.value as SeriesProject['releaseModel'] }))}>
                <option value="full-season">Full season</option><option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option><option value="irregular">Irregular</option>
              </select>
            </label>
            <label className={labelClass}>Pricing strategy<textarea rows={4} className={fieldClass} value={project.pricingStrategy} onChange={(event) => setText('pricingStrategy', event.target.value)} /></label>
          </div>
        )}
        {step === 6 && (
          <div className="space-y-5">
            <div className="border border-[#d9dde0] bg-[#f8f9fa] p-5">
              <h3 className="text-lg font-extrabold">{project.title || 'Untitled series'}</h3>
              <p className="text-sm text-[#5d6368]">{project.genre || 'No genre'} · {project.language} · {project.targetAudience || 'No audience specified'}</p>
              <p className="mt-4 text-sm">{project.premise || 'No premise entered.'}</p>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><dt className="text-xs text-[#777]">Seasons</dt><dd className="font-bold">{seasonCount}</dd></div>
              <div><dt className="text-xs text-[#777]">Episodes</dt><dd className="font-bold">{seasonCount * episodesPerSeason}</dd></div>
              <div><dt className="text-xs text-[#777]">Release</dt><dd className="font-bold capitalize">{project.releaseModel}</dd></div>
              <div><dt className="text-xs text-[#777]">Cast links</dt><dd className="font-bold">{selectedCharacters.length + newCharacterNames.split('\n').filter(Boolean).length}</dd></div>
            </dl>
          </div>
        )}
        {error && <p role="alert" className="mt-5 border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      </div>
      <footer className="sticky bottom-0 flex items-center justify-between border-t border-[#d9dde0] bg-white px-5 py-4">
        <button type="button" onClick={() => step === 0 ? onCancel() : setStep((value) => value - 1)} className="inline-flex items-center gap-2 rounded-md border border-[#cfd3d7] px-4 py-2 text-sm font-bold">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {step < steps.length - 1 ? (
          <button type="button" disabled={!canContinue} onClick={() => setStep((value) => value + 1)} className="inline-flex items-center gap-2 rounded-md bg-[#24282c] px-4 py-2 text-sm font-bold text-white disabled:opacity-40">
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button type="button" disabled={saving || !project.title.trim()} onClick={() => void create()} className="inline-flex items-center gap-2 rounded-md bg-[#ff6321] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {saving ? <Plus className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Create Series
          </button>
        )}
      </footer>
    </section>
  );
};
