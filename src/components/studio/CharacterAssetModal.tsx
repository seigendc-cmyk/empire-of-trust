import React, { useState, useRef } from 'react';
import {
  X, User, Users, Shield, Zap, Plus, Trash2, Image as ImageIcon,
  Check, Sparkles, Link, Tag, Compass, Layers, RefreshCw, Upload
} from 'lucide-react';
import { Character, CharacterAsset } from '../../types';

interface CharacterAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: Character[];
  assets: CharacterAsset[];
  onSaveCharacters: (characters: Character[]) => void;
  onSaveAssets: (assets: CharacterAsset[]) => void;
}

// Preset gallery collections for rapid authoring
const CHARACTER_PRESET_IMAGES = {
  scifi: [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80'
  ],
  fantasy: [
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=600&q=80'
  ],
  cyberpunk: [
    'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80'
  ]
};

const ASSET_PRESET_IMAGES = {
  weapon: [
    'https://images.unsplash.com/photo-1595590424283-b8f17842773f?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80'
  ],
  vehicle: [
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80'
  ],
  gadget: [
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80'
  ],
  relic: [
    'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=600&q=80'
  ]
};

export const CharacterAssetModal: React.FC<CharacterAssetModalProps> = ({
  isOpen,
  onClose,
  characters,
  assets,
  onSaveCharacters,
  onSaveAssets,
}) => {
  const [activeTab, setActiveTab] = useState<'characters' | 'assets'>('characters');
  const [localCharacters, setLocalCharacters] = useState<Character[]>(characters || []);
  const [localAssets, setLocalAssets] = useState<CharacterAsset[]>(assets || []);

  const [selectedCharId, setSelectedCharId] = useState<string | null>(
    characters?.[0]?.id || null
  );
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(
    assets?.[0]?.id || null
  );

  const [newCharImageUrl, setNewCharImageUrl] = useState('');
  const [newAssetImageUrl, setNewAssetImageUrl] = useState('');

  const charAvatarFileRef = useRef<HTMLInputElement | null>(null);
  const charPoseFileRef = useRef<HTMLInputElement | null>(null);
  const assetImageFileRef = useRef<HTMLInputElement | null>(null);

  const handleUploadCharAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        handleUpdateCharacter('avatarUrl', result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadCharPose = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          handleAddCharacterImage(result);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUploadAssetImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          handleAddAssetImage(result);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  if (!isOpen) return null;

  const selectedChar = localCharacters.find((c) => c.id === selectedCharId) || null;
  const selectedAsset = localAssets.find((a) => a.id === selectedAssetId) || null;

  // Character Handlers
  const handleAddCharacter = () => {
    const id = 'char_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const newChar: Character = {
      id,
      name: 'New Character',
      role: 'Protagonist',
      bio: 'Character description and background in the story.',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
      images: [
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80'
      ],
      aliases: ['New Character'],
      assetIds: [],
    };
    const updated = [...localCharacters, newChar];
    setLocalCharacters(updated);
    setSelectedCharId(id);
    onSaveCharacters(updated);
  };

  const handleDeleteCharacter = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this character?')) return;
    const updated = localCharacters.filter((c) => c.id !== id);
    setLocalCharacters(updated);
    if (selectedCharId === id) {
      setSelectedCharId(updated[0]?.id || null);
    }
    // Remove owner reference from assets
    const updatedAssets = localAssets.map((a) =>
      a.ownerCharacterId === id ? { ...a, ownerCharacterId: undefined } : a
    );
    setLocalAssets(updatedAssets);
    onSaveCharacters(updated);
    onSaveAssets(updatedAssets);
  };

  const handleUpdateCharacter = (field: keyof Character, value: any) => {
    if (!selectedCharId) return;
    const updated = localCharacters.map((c) => {
      if (c.id === selectedCharId) {
        return { ...c, [field]: value };
      }
      return c;
    });
    setLocalCharacters(updated);
    onSaveCharacters(updated);
  };

  const handleAddCharacterImage = (url: string) => {
    if (!selectedChar || !url.trim()) return;
    const updatedImages = [...(selectedChar.images || []), url.trim()];
    handleUpdateCharacter('images', updatedImages);
    setNewCharImageUrl('');
  };

  const handleRemoveCharacterImage = (index: number) => {
    if (!selectedChar) return;
    const updatedImages = (selectedChar.images || []).filter((_, i) => i !== index);
    handleUpdateCharacter('images', updatedImages);
  };

  // Asset Handlers
  const handleAddAsset = (ownerId?: string) => {
    const id = 'asset_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const newAsset: CharacterAsset = {
      id,
      name: 'New Asset / Gear',
      type: 'Gadget',
      description: 'Special item or piece of gear owned or featured in the story.',
      images: [
        'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80'
      ],
      keywords: ['New Asset', 'Gadget'],
      ownerCharacterId: ownerId || selectedCharId || undefined,
    };
    const updated = [...localAssets, newAsset];
    setLocalAssets(updated);
    setSelectedAssetId(id);
    onSaveAssets(updated);

    if (ownerId || selectedCharId) {
      const charIdToUpdate = ownerId || selectedCharId;
      const updatedChars = localCharacters.map((c) => {
        if (c.id === charIdToUpdate) {
          return { ...c, assetIds: [...(c.assetIds || []), id] };
        }
        return c;
      });
      setLocalCharacters(updatedChars);
      onSaveCharacters(updatedChars);
    }
  };

  const handleDeleteAsset = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this asset?')) return;
    const updated = localAssets.filter((a) => a.id !== id);
    setLocalAssets(updated);
    if (selectedAssetId === id) {
      setSelectedAssetId(updated[0]?.id || null);
    }
    // Remove asset ID from characters
    const updatedChars = localCharacters.map((c) => ({
      ...c,
      assetIds: (c.assetIds || []).filter((aId) => aId !== id),
    }));
    setLocalCharacters(updatedChars);
    onSaveAssets(updated);
    onSaveCharacters(updatedChars);
  };

  const handleUpdateAsset = (field: keyof CharacterAsset, value: any) => {
    if (!selectedAssetId) return;
    const updated = localAssets.map((a) => {
      if (a.id === selectedAssetId) {
        return { ...a, [field]: value };
      }
      return a;
    });
    setLocalAssets(updated);
    onSaveAssets(updated);
  };

  const handleAddAssetImage = (url: string) => {
    if (!selectedAsset || !url.trim()) return;
    const updatedImages = [...(selectedAsset.images || []), url.trim()];
    handleUpdateAsset('images', updatedImages);
    setNewAssetImageUrl('');
  };

  const handleRemoveAssetImage = (index: number) => {
    if (!selectedAsset) return;
    const updatedImages = (selectedAsset.images || []).filter((_, i) => i !== index);
    handleUpdateAsset('images', updatedImages);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden text-gray-900 dark:text-gray-100">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/80 dark:bg-gray-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Series Cast & Owned Assets Studio</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Create actors and link assets with scene images. Mentioned characters and gear dynamically shift images as story scenes progress.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 px-6 pt-3 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800">
          <button
            type="button"
            onClick={() => setActiveTab('characters')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'characters'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-800 rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Characters & Actors ({localCharacters.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('assets')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'assets'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-800 rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Assets, Gear & Relics ({localAssets.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {activeTab === 'characters' ? (
            /* CHARACTERS VIEW */
            <div className="flex-1 flex overflow-hidden">
              {/* Character Sidebar List */}
              <div className="w-72 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50/30 dark:bg-gray-900/30">
                <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cast Roster</span>
                  <button
                    type="button"
                    onClick={handleAddCharacter}
                    className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Actor</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {localCharacters.map((char) => {
                    const isSelected = char.id === selectedCharId;
                    const charAssetsCount = localAssets.filter((a) => a.ownerCharacterId === char.id).length;

                    return (
                      <div
                        key={char.id}
                        onClick={() => setSelectedCharId(char.id)}
                        className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center gap-3 ${
                          isSelected
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-100 shadow-xs'
                            : 'bg-white dark:bg-gray-800/80 border-gray-200 dark:border-gray-700/80 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <img
                          src={char.avatarUrl || char.images?.[0] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                          alt={char.name}
                          className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700 flex-shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold truncate">{char.name}</h4>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{char.role || 'Character'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-medium">
                              {char.images?.length || 0} Scene Poses
                            </span>
                            {charAssetsCount > 0 && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-medium">
                                {charAssetsCount} Assets
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {localCharacters.length === 0 && (
                    <div className="p-6 text-center text-xs text-gray-400">
                      No characters created yet. Click "+ Add Actor" to start building your cast!
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Character Editor */}
              {selectedChar ? (
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Top Details Header */}
                  <div className="flex items-start justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-4">
                      <img
                        src={selectedChar.avatarUrl || selectedChar.images?.[0]}
                        alt={selectedChar.name}
                        className="w-16 h-16 rounded-xl object-cover border-2 border-indigo-500 shadow-md"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          {selectedChar.name}
                          <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {selectedChar.role || 'Actor'}
                          </span>
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Mention Keywords: {selectedChar.aliases?.join(', ') || selectedChar.name}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteCharacter(selectedChar.id)}
                      className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:hover:bg-red-900/50 dark:text-red-400 border border-red-200 dark:border-red-900 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Actor</span>
                    </button>
                  </div>

                  {/* Character Basic Info Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Actor / Character Name
                      </label>
                      <input
                        type="text"
                        value={selectedChar.name}
                        onChange={(e) => handleUpdateCharacter('name', e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Role / Persona Title
                      </label>
                      <input
                        type="text"
                        list="character-roles-list"
                        value={selectedChar.role || ''}
                        onChange={(e) => handleUpdateCharacter('role', e.target.value)}
                        placeholder="Select or type new custom role..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden font-semibold"
                      />
                      <datalist id="character-roles-list">
                        <option value="Protagonist" />
                        <option value="Antagonist" />
                        <option value="Deuteragonist" />
                        <option value="Mentor" />
                        <option value="Sidekick" />
                        <option value="Lead Detective" />
                        <option value="Chief Cyberneticist" />
                        <option value="Rogue AI" />
                        <option value="Scholar" />
                        <option value="Commander" />
                        <option value="Mercenary" />
                        <option value="Fleet Captain" />
                      </datalist>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Mention Triggers / Aliases (Comma Separated)
                      </label>
                      <input
                        type="text"
                        value={selectedChar.aliases?.join(', ') || ''}
                        onChange={(e) =>
                          handleUpdateCharacter(
                            'aliases',
                            e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                          )
                        }
                        placeholder="e.g. Elena, Vance, Dr. Vance, Doctor"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                      />
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                        When any of these keywords appear in chapter text, the reader highlights the character and displays their changing scene images!
                      </p>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                        <span>Primary Avatar Portrait</span>
                        <span className="text-[10px] text-indigo-500 font-normal">URL or Upload from Device</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={selectedChar.avatarUrl || ''}
                          onChange={(e) => handleUpdateCharacter('avatarUrl', e.target.value)}
                          placeholder="https://images.unsplash.com/... or upload image"
                          className="flex-1 px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden font-mono"
                        />
                        <input
                          type="file"
                          ref={charAvatarFileRef}
                          onChange={handleUploadCharAvatar}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => charAvatarFileRef.current?.click()}
                          className="px-3 py-2 bg-[#1e2023] hover:bg-black text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                        >
                          <Upload className="w-3.5 h-3.5 text-[#ff6321]" />
                          <span>Upload Local Image</span>
                        </button>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Biography & Scene Notes
                      </label>
                      <textarea
                        rows={2}
                        value={selectedChar.bio || ''}
                        onChange={(e) => handleUpdateCharacter('bio', e.target.value)}
                        placeholder="Background summary, personality traits, and key story arc..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                      />
                    </div>
                  </div>

                  {/* SCENE POSE GALLERY (Images that feature randomly in story scenes) */}
                  <div className="border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                          <ImageIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span>Scene Pose & Outfit Gallery ({selectedChar.images?.length || 0})</span>
                        </h4>
                        <p className="text-[11px] text-gray-600 dark:text-gray-400">
                          These images will feature dynamically & change randomly as scenes progress in the story when {selectedChar.name} is mentioned.
                        </p>
                      </div>

                      {/* Quick Presets */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-500 font-bold uppercase">Presets:</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newImgs = [...(selectedChar.images || []), ...CHARACTER_PRESET_IMAGES.scifi];
                            handleUpdateCharacter('images', newImgs);
                          }}
                          className="px-2 py-1 text-[10px] font-bold bg-white dark:bg-gray-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-gray-300 dark:border-gray-700 rounded transition-colors cursor-pointer"
                        >
                          + Scifi
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newImgs = [...(selectedChar.images || []), ...CHARACTER_PRESET_IMAGES.fantasy];
                            handleUpdateCharacter('images', newImgs);
                          }}
                          className="px-2 py-1 text-[10px] font-bold bg-white dark:bg-gray-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-gray-300 dark:border-gray-700 rounded transition-colors cursor-pointer"
                        >
                          + Fantasy
                        </button>
                      </div>
                    </div>

                    {/* Image Thumbnails Grid */}
                    <div className="grid grid-cols-4 gap-3">
                      {(selectedChar.images || []).map((imgUrl, idx) => (
                        <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 aspect-3/4 bg-gray-100 dark:bg-gray-800">
                          <img
                            src={imgUrl}
                            alt={`Pose ${idx + 1}`}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                            <span className="text-[10px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded">
                              Pose #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveCharacterImage(idx)}
                              className="p-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors cursor-pointer"
                              title="Delete pose image"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Image Input */}
                    <div className="flex gap-2 pt-2">
                      <input
                        type="text"
                        value={newCharImageUrl}
                        onChange={(e) => setNewCharImageUrl(e.target.value)}
                        placeholder="Paste image URL (Unsplash, HTTPS link)..."
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddCharacterImage(newCharImageUrl)}
                        className="px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add URL</span>
                      </button>
                      <input
                        type="file"
                        ref={charPoseFileRef}
                        onChange={handleUploadCharPose}
                        accept="image/*"
                        multiple
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => charPoseFileRef.current?.click()}
                        className="px-3 py-1.5 text-xs font-bold bg-[#1e2023] hover:bg-black text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Upload className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Upload Local Pose</span>
                      </button>
                    </div>
                  </div>

                  {/* LINKED ASSETS SECTION */}
                  <div className="border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                          <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Owned Assets & Gear ({localAssets.filter((a) => a.ownerCharacterId === selectedChar.id).length})</span>
                        </h4>
                        <p className="text-[11px] text-gray-600 dark:text-gray-400">
                          Possessions, weapons, armor, relics or vehicles owned by {selectedChar.name}.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddAsset(selectedChar.id)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Owned Asset</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {localAssets
                        .filter((a) => a.ownerCharacterId === selectedChar.id)
                        .map((asset) => (
                          <div
                            key={asset.id}
                            onClick={() => {
                              setSelectedAssetId(asset.id);
                              setActiveTab('assets');
                            }}
                            className="p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800/80 bg-white dark:bg-gray-800 flex items-center gap-3 hover:border-emerald-400 transition-all cursor-pointer"
                          >
                            <img
                              src={asset.images?.[0] || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=200&q=80'}
                              alt={asset.name}
                              className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-gray-700 flex-shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h5 className="text-xs font-bold truncate text-gray-900 dark:text-white">{asset.name}</h5>
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                                  {asset.type || 'Gear'}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{asset.description}</p>
                              <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-medium">
                                {asset.images?.length || 0} Scene Images
                              </span>
                            </div>
                          </div>
                        ))}

                      {localAssets.filter((a) => a.ownerCharacterId === selectedChar.id).length === 0 && (
                        <div className="col-span-2 text-center p-4 text-xs text-gray-400 border border-dashed border-emerald-200 dark:border-emerald-900/40 rounded-lg">
                          No assets linked to {selectedChar.name} yet. Click "+ Create Owned Asset" above!
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-12 text-center text-xs text-gray-400">
                  Select a character on the left or click "+ Add Actor" to manage characters.
                </div>
              )}
            </div>
          ) : (
            /* ASSETS VIEW */
            <div className="flex-1 flex overflow-hidden">
              {/* Assets Sidebar List */}
              <div className="w-72 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50/30 dark:bg-gray-900/30">
                <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Inventory & Relics</span>
                  <button
                    type="button"
                    onClick={() => handleAddAsset()}
                    className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Asset</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {localAssets.map((asset) => {
                    const isSelected = asset.id === selectedAssetId;
                    const ownerChar = localCharacters.find((c) => c.id === asset.ownerCharacterId);

                    return (
                      <div
                        key={asset.id}
                        onClick={() => setSelectedAssetId(asset.id)}
                        className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center gap-3 ${
                          isSelected
                            ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 shadow-xs'
                            : 'bg-white dark:bg-gray-800/80 border-gray-200 dark:border-gray-700/80 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <img
                          src={asset.images?.[0] || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=200&q=80'}
                          alt={asset.name}
                          className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-gray-700 flex-shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold truncate">{asset.name}</h4>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                            {ownerChar ? `Owned by ${ownerChar.name}` : 'Unassigned Gear'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-medium">
                              {asset.type || 'Gear'}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-medium">
                              {asset.images?.length || 0} Scene Angles
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {localAssets.length === 0 && (
                    <div className="p-6 text-center text-xs text-gray-400">
                      No assets created yet. Click "+ Add Asset" to create weapons, vehicles, and relics!
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Asset Editor */}
              {selectedAsset ? (
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Top Details Header */}
                  <div className="flex items-start justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-4">
                      <img
                        src={selectedAsset.images?.[0]}
                        alt={selectedAsset.name}
                        className="w-16 h-16 rounded-xl object-cover border-2 border-emerald-500 shadow-md"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          {selectedAsset.name}
                          <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {selectedAsset.type || 'Item'}
                          </span>
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Mention Triggers: {selectedAsset.keywords?.join(', ') || selectedAsset.name}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteAsset(selectedAsset.id)}
                      className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:hover:bg-red-900/50 dark:text-red-400 border border-red-200 dark:border-red-900 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Asset</span>
                    </button>
                  </div>

                  {/* Asset Fields Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Asset / Item Name
                      </label>
                      <input
                        type="text"
                        value={selectedAsset.name}
                        onChange={(e) => handleUpdateAsset('name', e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Asset Type
                      </label>
                      <input
                        type="text"
                        list="asset-types-list"
                        value={selectedAsset.type || ''}
                        onChange={(e) => handleUpdateAsset('type', e.target.value)}
                        placeholder="Select or type custom asset type..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-semibold"
                      />
                      <datalist id="asset-types-list">
                        <option value="Weapon" />
                        <option value="Vehicle" />
                        <option value="Gadget / Tech" />
                        <option value="Relic / Artifact" />
                        <option value="Clothing / Armor" />
                        <option value="Pet / AI Companion" />
                        <option value="Tool / Instrument" />
                        <option value="Cyberware" />
                        <option value="Spaceship" />
                        <option value="Magical Grimoire" />
                      </datalist>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Linked Owner / Actor
                      </label>
                      <select
                        value={selectedAsset.ownerCharacterId || ''}
                        onChange={(e) => handleUpdateAsset('ownerCharacterId', e.target.value || undefined)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden cursor-pointer"
                      >
                        <option value="">Unassigned / Shared Asset</option>
                        {localCharacters.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.role || 'Actor'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Mention Triggers / Keywords (Comma Separated)
                      </label>
                      <input
                        type="text"
                        value={selectedAsset.keywords?.join(', ') || ''}
                        onChange={(e) =>
                          handleUpdateAsset(
                            'keywords',
                            e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                          )
                        }
                        placeholder="e.g. Plasma Rifle, Aegis, Cyberdeck"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Description & Lore
                      </label>
                      <textarea
                        rows={2}
                        value={selectedAsset.description || ''}
                        onChange={(e) => handleUpdateAsset('description', e.target.value)}
                        placeholder="Item capabilities, appearance details, history..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                      />
                    </div>
                  </div>

                  {/* ASSET IMAGE GALLERY */}
                  <div className="border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                          <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Asset Scene & Angle Gallery ({selectedAsset.images?.length || 0})</span>
                        </h4>
                        <p className="text-[11px] text-gray-600 dark:text-gray-400">
                          These images display when {selectedAsset.name} is mentioned or inspected in scenes.
                        </p>
                      </div>

                      {/* Quick Asset Image Presets */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-500 font-bold uppercase">Presets:</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newImgs = [...(selectedAsset.images || []), ...ASSET_PRESET_IMAGES.weapon];
                            handleUpdateAsset('images', newImgs);
                          }}
                          className="px-2 py-1 text-[10px] font-bold bg-white dark:bg-gray-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-gray-300 dark:border-gray-700 rounded transition-colors cursor-pointer"
                        >
                          + Weapons
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newImgs = [...(selectedAsset.images || []), ...ASSET_PRESET_IMAGES.gadget];
                            handleUpdateAsset('images', newImgs);
                          }}
                          className="px-2 py-1 text-[10px] font-bold bg-white dark:bg-gray-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-gray-300 dark:border-gray-700 rounded transition-colors cursor-pointer"
                        >
                          + Tech / Gadgets
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      {(selectedAsset.images || []).map((imgUrl, idx) => (
                        <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 aspect-3/4 bg-gray-100 dark:bg-gray-800">
                          <img
                            src={imgUrl}
                            alt={`Asset state ${idx + 1}`}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                            <span className="text-[10px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded">
                              Angle #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAssetImage(idx)}
                              className="p-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <input
                        type="text"
                        value={newAssetImageUrl}
                        onChange={(e) => setNewAssetImageUrl(e.target.value)}
                        placeholder="Paste image URL..."
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddAssetImage(newAssetImageUrl)}
                        className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add URL</span>
                      </button>
                      <input
                        type="file"
                        ref={assetImageFileRef}
                        onChange={handleUploadAssetImage}
                        accept="image/*"
                        multiple
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => assetImageFileRef.current?.click()}
                        className="px-3 py-1.5 text-xs font-bold bg-[#1e2023] hover:bg-black text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Upload className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Upload Local Image</span>
                      </button>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-12 text-center text-xs text-gray-400">
                  Select an asset on the left or click "+ Add Asset" to manage equipment and relics.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/80 dark:bg-gray-900/80">
          <span className="text-xs text-gray-500">
            {localCharacters.length} Characters, {localAssets.length} Assets saved in manuscript SQLite payload.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Done & Save Cast</span>
          </button>
        </div>

      </div>
    </div>
  );
};
