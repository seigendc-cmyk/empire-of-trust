import React, { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { Character, SeriesRelationship, SeriesStoryArc } from '../../../types';

interface CharacterArcPanelProps {
  seriesId: string;
  characters: Character[];
  arcs: SeriesStoryArc[];
  relationships: SeriesRelationship[];
  onSaveArc: (arc: SeriesStoryArc) => Promise<void>;
  onSaveRelationship: (relationship: SeriesRelationship) => Promise<void>;
}

export const CharacterArcPanel: React.FC<CharacterArcPanelProps> = ({ seriesId, characters, arcs, relationships, onSaveArc, onSaveRelationship }) => {
  const [selectedCharacterId, setSelectedCharacterId] = useState(characters[0]?.id || '');
  const addArc = () => {
    if (!selectedCharacterId) return;
    const character = characters.find((item) => item.id === selectedCharacterId);
    void onSaveArc({
      id: `arc-${crypto.randomUUID()}`, seriesId, characterId: selectedCharacterId,
      title: `${character?.name || 'Character'} Arc`, description: '', arcType: 'character',
      status: 'planned', milestones: [], seriesRole: character?.role || '',
      startingCondition: '', desire: '', need: '', fear: '', secret: '',
      transformation: '', endCondition: '', unresolvedThread: '',
    });
  };
  const addRelationship = () => {
    if (characters.length < 2) return;
    void onSaveRelationship({
      id: `relationship-${crypto.randomUUID()}`, seriesId,
      sourceCharacterId: characters[0].id, targetCharacterId: characters[1].id,
      relationshipType: 'alliance', status: 'active', description: '',
      trustLevel: 50, conflict: '', changesByEpisode: [],
    });
  };
  return (
    <section className="border border-[#d9dde0] bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d9dde0] p-4"><div className="flex items-center gap-2"><Users className="h-5 w-5" /><h3 className="font-extrabold">Character Arcs & Relationships</h3></div><div className="flex gap-2"><select value={selectedCharacterId} onChange={(event) => setSelectedCharacterId(event.target.value)} className="border border-[#cfd3d7] px-2 py-1.5 text-xs"><option value="">Select character</option>{characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}</select><button onClick={addArc} className="inline-flex items-center gap-1 border border-[#cfd3d7] px-2 py-1.5 text-xs font-bold"><Plus className="h-3.5 w-3.5" /> Arc</button><button onClick={addRelationship} className="inline-flex items-center gap-1 border border-[#cfd3d7] px-2 py-1.5 text-xs font-bold"><Plus className="h-3.5 w-3.5" /> Relationship</button></div></header>
      {characters.length === 0 && <p className="p-8 text-center text-sm text-[#777]">Add characters to a Book Studio manuscript to link them here without duplication.</p>}
      <div className="grid gap-px bg-[#e4e6e8] lg:grid-cols-2">
        <div className="space-y-3 bg-white p-4"><h4 className="text-xs font-extrabold uppercase text-[#6d7378]">Arc records</h4>{arcs.map((arc) => <article key={arc.id} className="border border-[#d9dde0] p-3"><div className="flex justify-between"><strong className="text-sm">{arc.title}</strong><span className="text-[10px] uppercase">{arc.status}</span></div><p className="mt-1 text-xs text-[#666]">{arc.description || arc.transformation || 'Define the starting condition, desire, need, fear, secret, transformation, and unresolved thread.'}</p><p className="mt-2 text-[10px] font-bold text-[#777]">{characters.find((character) => character.id === arc.characterId)?.name || 'Series-level arc'}</p></article>)}</div>
        <div className="space-y-3 bg-white p-4"><h4 className="text-xs font-extrabold uppercase text-[#6d7378]">Relationship timeline</h4>{relationships.map((relationship) => <article key={relationship.id} className="border border-[#d9dde0] p-3"><strong className="text-sm">{characters.find((item) => item.id === relationship.sourceCharacterId)?.name || 'Character'} → {characters.find((item) => item.id === relationship.targetCharacterId)?.name || 'Character'}</strong><p className="text-xs capitalize text-[#666]">{relationship.relationshipType} · {relationship.status} · Trust {relationship.trustLevel ?? 'unrated'}</p><p className="mt-1 text-xs">{relationship.conflict || relationship.description || 'No conflict recorded.'}</p></article>)}</div>
      </div>
    </section>
  );
};
