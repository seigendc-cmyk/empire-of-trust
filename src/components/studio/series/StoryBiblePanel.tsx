import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { SeriesContinuityRule, SeriesLocation, SeriesObject, SeriesProject } from '../../../types';

interface StoryBiblePanelProps {
  project: SeriesProject;
  onSave: (update: Partial<SeriesProject>) => Promise<void>;
  locations: SeriesLocation[];
  objects: SeriesObject[];
  rules: SeriesContinuityRule[];
  onAddLocation: (location: SeriesLocation) => Promise<void>;
  onAddObject: (object: SeriesObject) => Promise<void>;
  onAddRule: (rule: SeriesContinuityRule) => Promise<void>;
}

const field = 'w-full border border-[#cfd3d7] bg-white px-3 py-2 text-sm focus:border-[#ff6321] focus:outline-none';

export const StoryBiblePanel: React.FC<StoryBiblePanelProps> = ({ project, onSave, locations, objects, rules, onAddLocation, onAddObject, onAddRule }) => {
  const [draft, setDraft] = useState(project);
  const [saving, setSaving] = useState(false);
  const update = (key: keyof SeriesProject, value: string | string[]) => setDraft((current) => ({ ...current, [key]: value }));
  const areas: Array<[keyof SeriesProject, string]> = [
    ['premise','Series premise'],['worldDescription','World and geography'],
    ['historicalBackground','Major historical events'],['culturalNotes','Culture, tradition, social and political structures'],
  ];
  return (
    <section className="border border-[#d9dde0] bg-white">
      <header className="flex items-center justify-between border-b border-[#d9dde0] p-4"><h3 className="font-extrabold">Story Bible</h3><button onClick={() => { setSaving(true); void onSave(draft).finally(() => setSaving(false)); }} className="inline-flex items-center gap-2 rounded-md bg-[#24282c] px-3 py-2 text-xs font-bold text-white"><Save className="h-3.5 w-3.5" /> {saving ? 'Saving' : 'Save Bible'}</button></header>
      <div className="grid gap-4 p-4 lg:grid-cols-2">
        {areas.map(([key,label]) => <label key={key} className="text-xs font-bold">{label}<textarea rows={5} className={field} value={String(draft[key] || '')} onChange={(event) => update(key,event.target.value)} /></label>)}
        {([
          ['systemRules','Technology, magic, world rules and prohibited contradictions'],
          ['organizations','Organizations'],['terminology','Terminology'],
        ] as const).map(([key,label]) => <label key={key} className="text-xs font-bold">{label}<textarea rows={5} className={field} value={draft[key].join('\n')} onChange={(event) => update(key,event.target.value.split('\n').map((item) => item.trim()).filter(Boolean))} /></label>)}
      </div>
      <div className="grid gap-px border-t border-[#d9dde0] bg-[#d9dde0] lg:grid-cols-3">
        <div className="bg-white p-4"><div className="flex items-center justify-between"><h4 className="text-xs font-extrabold uppercase">Locations</h4><button onClick={() => void onAddLocation({id:`location-${crypto.randomUUID()}`,seriesId:project.id,name:'New Location',description:'',geography:'',culturalNotes:'',visualNotes:'',assetIds:[]})} className="text-xs font-bold text-[#ff6321]">+ Add</button></div>{locations.map((location) => <div key={location.id} className="mt-2 border border-[#e0e3e5] p-2"><strong className="text-sm">{location.name}</strong><p className="text-xs text-[#777]">{location.geography || location.description || 'Add geography and visual notes.'}</p></div>)}</div>
        <div className="bg-white p-4"><div className="flex items-center justify-between"><h4 className="text-xs font-extrabold uppercase">Important Objects</h4><button onClick={() => void onAddObject({id:`object-${crypto.randomUUID()}`,seriesId:project.id,name:'New Object',type:'artifact',description:'',importance:'',assetIds:[]})} className="text-xs font-bold text-[#ff6321]">+ Add</button></div>{objects.map((object) => <div key={object.id} className="mt-2 border border-[#e0e3e5] p-2"><strong className="text-sm">{object.name}</strong><p className="text-xs text-[#777]">{object.type} · {object.importance || 'importance not set'}</p></div>)}</div>
        <div className="bg-white p-4"><div className="flex items-center justify-between"><h4 className="text-xs font-extrabold uppercase">Prohibited Contradictions</h4><button onClick={() => void onAddRule({id:`rule-${crypto.randomUUID()}`,seriesId:project.id,category:'world-rule',statement:'New continuity rule',severity:'warning',active:true})} className="text-xs font-bold text-[#ff6321]">+ Add</button></div>{rules.map((rule) => <div key={rule.id} className="mt-2 border border-[#e0e3e5] p-2"><strong className="text-xs uppercase">{rule.category}</strong><p className="text-xs text-[#555]">{rule.statement}</p></div>)}</div>
      </div>
      <p className="border-t border-[#e4e6e8] p-4 text-xs text-[#71777c]">Locations, important objects, continuity rules, episodes, characters, and assets are linked through their normalized records and IDs.</p>
    </section>
  );
};
