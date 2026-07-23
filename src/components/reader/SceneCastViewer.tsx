import React, { useState, useEffect } from 'react';
import { User, Shield, Sparkles, RefreshCw, Layers, ExternalLink, Image as ImageIcon, Users } from 'lucide-react';
import { Character, CharacterAsset } from '../../types';

interface SceneCastViewerProps {
  characters?: Character[];
  assets?: CharacterAsset[];
  chapterContentText: string;
}

export const SceneCastViewer: React.FC<SceneCastViewerProps> = ({
  characters = [],
  assets = [],
  chapterContentText,
}) => {
  // Track random image index per character and per asset for current scene
  const [characterImageIndices, setCharacterImageIndices] = useState<Record<string, number>>({});
  const [assetImageIndices, setAssetImageIndices] = useState<Record<string, number>>({});
  const [selectedInspectEntity, setSelectedInspectEntity] = useState<{
    type: 'character' | 'asset';
    id: string;
  } | null>(null);

  // Detect mentioned characters
  const mentionedCharacters = characters.filter((c) => {
    if (!c.name) return false;
    const triggers = [c.name, ...(c.aliases || [])].filter(Boolean);
    return triggers.some((trigger) =>
      new RegExp(`\\b${trigger.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}\\b`, 'i').test(
        chapterContentText
      )
    );
  });

  // Detect mentioned assets
  const mentionedAssets = assets.filter((a) => {
    if (!a.name) return false;
    const triggers = [a.name, ...(a.keywords || [])].filter(Boolean);
    return triggers.some((trigger) =>
      new RegExp(`\\b${trigger.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}\\b`, 'i').test(
        chapterContentText
      )
    );
  });

  // Randomize images when scene/chapter text changes or on manual trigger
  const shuffleSceneImages = () => {
    const newCharIndices: Record<string, number> = {};
    characters.forEach((c) => {
      if (c.images && c.images.length > 0) {
        newCharIndices[c.id] = Math.floor(Math.random() * c.images.length);
      }
    });

    const newAssetIndices: Record<string, number> = {};
    assets.forEach((a) => {
      if (a.images && a.images.length > 0) {
        newAssetIndices[a.id] = Math.floor(Math.random() * a.images.length);
      }
    });

    setCharacterImageIndices(newCharIndices);
    setAssetImageIndices(newAssetIndices);
  };

  useEffect(() => {
    shuffleSceneImages();
  }, [chapterContentText, characters.length, assets.length]);

  if (mentionedCharacters.length === 0 && mentionedAssets.length === 0) {
    return null;
  }

  return (
    <div className="my-8 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-gray-900/60 p-5 shadow-xl backdrop-blur-xs space-y-4">
      {/* Spotlight Bar Header */}
      <div className="flex items-center justify-between pb-3 border-b border-indigo-500/20">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold font-mono tracking-wider text-indigo-200 uppercase flex items-center gap-2">
              Featured Scene Cast & Gear
              <span className="px-2 py-0.5 rounded-full text-[9px] bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 font-sans">
                Dynamic Scene Media
              </span>
            </h4>
            <p className="text-[11px] text-gray-400">
              Actors & assets mentioned in this story scene. Images dynamically cycle across scenes!
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={shuffleSceneImages}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-300 bg-indigo-900/50 hover:bg-indigo-800/60 border border-indigo-500/40 rounded-xl transition-all cursor-pointer hover:scale-102"
          title="Randomly change character pose and asset angles for this scene"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Shuffle Scene Angles</span>
        </button>
      </div>

      {/* Grid of Mentioned Characters */}
      {mentionedCharacters.length > 0 && (
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300/80 font-mono flex items-center gap-1.5">
            <User className="w-3 h-3" /> Mentioned Actors ({mentionedCharacters.length})
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {mentionedCharacters.map((char) => {
              const imgIndex = characterImageIndices[char.id] ?? 0;
              const currentImg = char.images?.[imgIndex] || char.avatarUrl;
              const ownedAssets = assets.filter((a) => a.ownerCharacterId === char.id);

              return (
                <div
                  key={char.id}
                  className="group relative rounded-xl border border-indigo-500/20 bg-black/40 p-3 hover:border-indigo-400/50 transition-all space-y-2 overflow-hidden flex flex-col justify-between"
                >
                  <div className="flex gap-3 items-start">
                    {/* Featured Random Image */}
                    <div className="relative w-16 h-20 rounded-lg overflow-hidden border border-indigo-400/30 flex-shrink-0 bg-gray-950">
                      <img
                        src={currentImg}
                        alt={char.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute bottom-1 right-1 text-[8px] font-bold font-mono px-1 py-0.2 rounded bg-black/70 text-indigo-300">
                        Pose #{imgIndex + 1}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-white truncate">{char.name}</h5>
                      </div>
                      <p className="text-[10px] text-indigo-300/90 font-medium truncate">
                        {char.role || 'Actor'}
                      </p>
                      {char.bio && (
                        <p className="text-[10px] text-gray-400 line-clamp-2 leading-tight">
                          {char.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Owned Assets Line */}
                  {ownedAssets.length > 0 && (
                    <div className="pt-1.5 border-t border-indigo-500/10 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-mono text-gray-400">Owns:</span>
                      {ownedAssets.map((asset) => {
                        const assetIdx = assetImageIndices[asset.id] ?? 0;
                        const assetImg = asset.images?.[assetIdx] || asset.images?.[0];

                        return (
                          <div
                            key={asset.id}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-[9px] text-emerald-300"
                            title={`${asset.name} (${asset.type})`}
                          >
                            {assetImg && (
                              <img
                                src={assetImg}
                                alt={asset.name}
                                className="w-3.5 h-3.5 rounded object-cover"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <span className="truncate max-w-[90px]">{asset.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid of Mentioned Assets */}
      {mentionedAssets.length > 0 && (
        <div className="space-y-2 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300/80 font-mono flex items-center gap-1.5">
            <Shield className="w-3 h-3" /> Featured Scene Gear & Relics ({mentionedAssets.length})
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {mentionedAssets.map((asset) => {
              const imgIndex = assetImageIndices[asset.id] ?? 0;
              const currentImg = asset.images?.[imgIndex] || asset.images?.[0];
              const ownerChar = characters.find((c) => c.id === asset.ownerCharacterId);

              return (
                <div
                  key={asset.id}
                  className="rounded-xl border border-emerald-500/20 bg-black/40 p-3 hover:border-emerald-400/50 transition-all space-y-2 flex items-start gap-3"
                >
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-emerald-400/30 flex-shrink-0 bg-gray-950">
                    <img
                      src={currentImg}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute bottom-0.5 right-0.5 text-[8px] font-bold font-mono px-1 py-0.2 rounded bg-black/70 text-emerald-300">
                      Angle #{imgIndex + 1}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-white truncate">{asset.name}</h5>
                      <span className="text-[8px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                        {asset.type || 'Gear'}
                      </span>
                    </div>
                    {ownerChar && (
                      <p className="text-[9.5px] text-indigo-300 truncate">
                        Owned by {ownerChar.name}
                      </p>
                    )}
                    {asset.description && (
                      <p className="text-[10px] text-gray-400 line-clamp-1">
                        {asset.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
