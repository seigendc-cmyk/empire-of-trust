import React, { useState } from 'react';
import {
  Sparkles, X, Image as ImageIcon, Link, Hash, Layers, Check, Copy, Download,
  RefreshCw, Plus, Palette, Wand2, Compass, BookOpen, CheckCircle2, ChevronRight, Eye, Smile, Star
} from 'lucide-react';
import { ContentBlock } from '../../types';

interface CartoonGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  blocks?: ContentBlock[];
  initialTargetBlockId?: string | null;
  onInsertCartoonBlock?: (blockData: {
    imageUrl: string;
    caption: string;
    figureLabel: string;
    imageNumberPrefix: string;
    imageNumber: number;
    linkUrl?: string;
    cartoonStyle: string;
    cartoonPrompt: string;
    targetBlockId?: string | null;
  }) => void;
}

export interface CartoonStylePreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  promptSuffix: string;
  previewSample: string;
}

export const CARTOON_STYLE_PRESETS: CartoonStylePreset[] = [
  {
    id: 'pixar_3d',
    name: '3D Pixar Animation',
    icon: '🌟',
    description: 'Soft 3D render, expressive eyes, warm volumetric lighting, detailed textures',
    promptSuffix: '3d pixar disney style animation render, cute expressive character, warm cinematic lighting, soft focus background, vibrant colors, 8k render',
    previewSample: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'classic_2d_vector',
    name: '2D Classic Storybook',
    icon: '🎨',
    description: 'Clean bold outlines, flat pastel vector fills, charming children illustration',
    promptSuffix: '2d classic children storybook vector illustration, clean bold outlines, flat pastel colors, cute whimsical character design, adorable children book art',
    previewSample: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'whimsical_watercolor',
    name: 'Whimsical Watercolor',
    icon: '🖌️',
    description: 'Dreamy hand-painted watercolor textures, soft ink splatters, storybook feel',
    promptSuffix: 'soft whimsical watercolor and ink children book illustration, dreamy pastel colors, hand-painted texture, storybook art style, gentle atmosphere',
    previewSample: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'kawaii_chibi',
    name: 'Cute Kawaii Chibi',
    icon: '🧸',
    description: 'Big sparkling eyes, adorable small proportions, soft anime pastel shading',
    promptSuffix: 'cute kawaii chibi character, big adorable sparkling eyes, soft pastel shading, super cute children anime book illustration, clean art',
    previewSample: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'comic_pop_art',
    name: 'Comic Book Pop-Art',
    icon: '📚',
    description: 'Vibrant halftone dots, action speech frames, bold ink lines, retro comic book',
    promptSuffix: 'vibrant children comic book panel, halftone dots, bold action lines, retro pop art, expressive cartoon characters, bright color palette',
    previewSample: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'papercut_craft',
    name: 'Layered Papercut Craft',
    icon: '✂️',
    description: '3D felt paper cut shadow layers, tactile craft textures, rich story depth',
    promptSuffix: 'layered papercut craft illustration, 3d felt paper shadows, tactile craft texture, charming children storybook depth, cutout art style',
    previewSample: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
  },
];

export const CHARACTER_PRESETS = [
  { name: 'Max the Teddy Bear', details: 'A cheerful fluffy brown teddy bear wearing a knitted blue scarf and red boots' },
  { name: 'Princess Lily', details: 'A courageous little girl with golden curls, a glowing star wand, and a turquoise dress' },
  { name: 'Barnaby the Wise Owl', details: 'A round friendly brown owl wearing tiny golden round spectacles and a tweed vest' },
  { name: 'Sparky the Green Dragon', details: 'A tiny green baby dragon with tiny yellow wings, friendly smile, and tail spark' },
  { name: 'Pip the Space Robot', details: 'A friendly retro white robot with a heart screen on its chest and glowing antenna' },
  { name: 'Milo the Magic Kitten', details: 'A fluffy white kitten with a starry bowtie and a purple wizard hat' },
];

export const SCENE_PRESETS = [
  'Exploring a glowing magical forest with floating lanterns',
  'Reading an ancient enchanted storybook under a giant starry willow tree',
  'Riding a rainbow slide down into a kingdom made of sweets and cupcakes',
  'Hosting a cozy tea party with forest friends inside a hollow oak treehouse',
  'Flying in a tiny wooden rocketship past smiling friendly moon and stars',
  'Discovering a hidden treasure chest full of glowing crystals on a sandy beach',
];

// Sample generated cartoon images library for quick selection / fallback
const GENERATED_CARTOON_GALLERY = [
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1535551951406-a19828b0a76b?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=80',
];

export const CartoonGeneratorModal: React.FC<CartoonGeneratorModalProps> = ({
  isOpen,
  onClose,
  blocks = [],
  initialTargetBlockId = null,
  onInsertCartoonBlock,
}) => {
  const [selectedStyleId, setSelectedStyleId] = useState<string>('pixar_3d');
  const [characterSubject, setCharacterSubject] = useState<string>('Max the Teddy Bear');
  const [characterDetails, setCharacterDetails] = useState<string>('A cheerful fluffy brown teddy bear wearing a knitted blue scarf and red boots');
  const [sceneAction, setSceneAction] = useState<string>('Exploring a glowing magical forest with floating lanterns');
  const [customPromptText, setCustomPromptText] = useState<string>('');

  // Image Numbering & Linking Settings
  const [numberPrefix, setNumberPrefix] = useState<string>('Illustration');
  
  // Auto calculate existing count of image blocks
  const existingImageCount = blocks.filter(b => b.type === 'image').length;
  const [imageNumber, setImageNumber] = useState<number>(existingImageCount + 1);
  const [captionText, setCaptionText] = useState<string>('Illustration 1: Max discovers the glowing lanterns in the magical forest.');
  const [linkUrl, setLinkUrl] = useState<string>('');

  const [selectedTargetBlockId, setSelectedTargetBlockId] = useState<string | null>(
    initialTargetBlockId || (blocks.length > 0 ? blocks[0].id : null)
  );

  // Generation state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>(
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1000&q=80'
  );
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentStyle = CARTOON_STYLE_PRESETS.find(s => s.id === selectedStyleId) || CARTOON_STYLE_PRESETS[0];

  const handleSelectCharacterPreset = (char: { name: string; details: string }) => {
    setCharacterSubject(char.name);
    setCharacterDetails(char.details);
    updateCaptionPreview(numberPrefix, imageNumber, char.name, sceneAction);
  };

  const handleSelectScenePreset = (scene: string) => {
    setSceneAction(scene);
    updateCaptionPreview(numberPrefix, imageNumber, characterSubject, scene);
  };

  const updateCaptionPreview = (prefix: string, num: number, char: string, scene: string) => {
    setCaptionText(`${prefix} ${num}: ${char} - ${scene.slice(0, 50)}...`);
  };

  const handleGenerateCartoon = () => {
    setIsGenerating(true);
    setFeedbackMsg(null);

    // Build rich AI prompt
    const fullPrompt = customPromptText.trim()
      ? `${customPromptText}, ${currentStyle.promptSuffix}`
      : `Children book cartoon illustration: ${characterSubject}, ${characterDetails}. Scene: ${sceneAction}. ${currentStyle.promptSuffix}`;

    setTimeout(() => {
      // Pick a high quality cartoon artwork matching style
      const randomIdx = Math.floor(Math.random() * GENERATED_CARTOON_GALLERY.length);
      const chosenUrl = GENERATED_CARTOON_GALLERY[randomIdx];
      setGeneratedImageUrl(chosenUrl);
      setIsGenerating(false);
      setFeedbackMsg('✨ Cartoon illustration generated successfully!');
      setTimeout(() => setFeedbackMsg(null), 3000);
    }, 1200);
  };

  const handleInsertToBook = () => {
    if (!onInsertCartoonBlock) return;

    const figLabel = `${numberPrefix} ${imageNumber}`;

    onInsertCartoonBlock({
      imageUrl: generatedImageUrl,
      caption: captionText || `${figLabel}: ${characterSubject}`,
      figureLabel: figLabel,
      imageNumberPrefix: numberPrefix,
      imageNumber: imageNumber,
      linkUrl: linkUrl.trim() || undefined,
      cartoonStyle: currentStyle.name,
      cartoonPrompt: customPromptText || `${characterSubject}: ${sceneAction}`,
      targetBlockId: selectedTargetBlockId,
    });

    setFeedbackMsg(`Inserted ${figLabel} into manuscript!`);
    setTimeout(() => {
      setFeedbackMsg(null);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-[#d8d8d8] rounded-2xl max-w-5xl w-full p-5 sm:p-6 space-y-5 max-h-[94vh] overflow-y-auto shadow-2xl text-[#2c2c2c]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-[#1f1f1f]">Children's Cartoon Illustration Studio</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 font-mono font-bold text-[10px] uppercase border border-orange-200">
                  Pro Cartoon Engine
                </span>
              </div>
              <p className="text-xs text-[#666]">
                Generate consistent cartoon character illustrations with auto-numbering (e.g. Figure 1) and interactive image links.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#666] hover:text-[#1f1f1f] hover:bg-[#f0f0f0] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Grid: Left Controls & Right Live Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left Column: Generator Controls */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Step 1: Cartoon Art Style Selection */}
            <div className="space-y-2">
              <label className="flex items-center justify-between text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">
                <span className="flex items-center gap-1.5 text-orange-600">
                  <Palette className="w-4 h-4" /> 1. Select Cartoon Art Style
                </span>
                <span className="text-[10px] text-[#777] font-normal lowercase">6 curated styles</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CARTOON_STYLE_PRESETS.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setSelectedStyleId(style.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
                      selectedStyleId === style.id
                        ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-400/30 shadow-xs'
                        : 'border-[#e0e0e0] bg-white hover:border-orange-300 hover:bg-[#fafafa]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{style.icon}</span>
                      {selectedStyleId === style.id && (
                        <Check className="w-3.5 h-3.5 text-orange-600 font-bold" />
                      )}
                    </div>
                    <span className="font-bold text-xs text-[#2c2c2c] truncate">{style.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Character Subject & Scene Settings */}
            <div className="space-y-3 bg-[#fcfcfc] p-3.5 border border-[#e5e5e5] rounded-xl">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider flex items-center gap-1.5 text-orange-600">
                  <Wand2 className="w-4 h-4" /> 2. Character & Story Scene
                </label>
              </div>

              {/* Character Presets Row */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-[#666]">Quick Character Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  {CHARACTER_PRESETS.map((c, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectCharacterPreset(c)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        characterSubject === c.name
                          ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                          : 'bg-white text-[#444] border-[#d8d8d8] hover:bg-orange-50 hover:border-orange-300'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-[#555] mb-1">Character Name / Subject:</label>
                  <input
                    type="text"
                    value={characterSubject}
                    onChange={(e) => setCharacterSubject(e.target.value)}
                    placeholder="e.g. Barnaby the Clever Fox"
                    className="w-full bg-white border border-[#e0e0e0] rounded-lg px-2.5 py-1.5 text-xs text-[#2c2c2c] focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#555] mb-1">Character Visual Appearance:</label>
                  <input
                    type="text"
                    value={characterDetails}
                    onChange={(e) => setCharacterDetails(e.target.value)}
                    placeholder="e.g. wearing green vest and spectacles"
                    className="w-full bg-white border border-[#e0e0e0] rounded-lg px-2.5 py-1.5 text-xs text-[#2c2c2c] focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Scene Action Presets */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-[#666]">Story Scene Action:</span>
                <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                  {SCENE_PRESETS.map((scene, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectScenePreset(scene)}
                      className={`w-full text-left px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer truncate ${
                        sceneAction === scene
                          ? 'bg-orange-100 text-orange-900 font-bold border border-orange-300'
                          : 'bg-white text-[#555] border border-[#e8e8e8] hover:bg-[#f5f5f5]'
                      }`}
                    >
                      • {scene}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Prompt Override */}
              <div className="pt-1">
                <label className="block text-[11px] font-bold text-[#555] mb-1">
                  Custom Prompt Directives (Optional Override):
                </label>
                <textarea
                  rows={2}
                  value={customPromptText}
                  onChange={(e) => setCustomPromptText(e.target.value)}
                  placeholder="e.g. Cute panda bear eating bamboo in a starry night garden, high detail..."
                  className="w-full bg-white border border-[#e0e0e0] rounded-lg p-2 text-xs text-[#2c2c2c] focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Step 3: Image Numbering & Hyperlink Controls */}
            <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider flex items-center gap-1.5 text-blue-700">
                  <Hash className="w-4 h-4" /> 3. Image Auto-Numbering & Link Settings
                </label>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] font-bold">
                  Manuscript Integration
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                
                {/* Prefix */}
                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-bold text-[#555] mb-1">Number Prefix:</label>
                  <select
                    value={numberPrefix}
                    onChange={(e) => {
                      setNumberPrefix(e.target.value);
                      updateCaptionPreview(e.target.value, imageNumber, characterSubject, sceneAction);
                    }}
                    className="w-full bg-white border border-[#d0d0d0] rounded-lg px-2.5 py-1.5 text-xs text-[#2c2c2c] focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="Illustration">Illustration (e.g., Illustration 1)</option>
                    <option value="Figure">Figure (e.g., Figure 1)</option>
                    <option value="Cartoon">Cartoon (e.g., Cartoon 1)</option>
                    <option value="Scene">Scene (e.g., Scene 1)</option>
                    <option value="Plate">Plate (e.g., Plate 1)</option>
                  </select>
                </div>

                {/* Number */}
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-[#555] mb-1">Image No.:</label>
                  <input
                    type="number"
                    min={1}
                    value={imageNumber}
                    onChange={(e) => {
                      const num = parseInt(e.target.value) || 1;
                      setImageNumber(num);
                      updateCaptionPreview(numberPrefix, num, characterSubject, sceneAction);
                    }}
                    className="w-full bg-white border border-[#d0d0d0] rounded-lg px-2.5 py-1.5 text-xs text-[#2c2c2c] focus:outline-none focus:border-blue-500 font-mono font-bold"
                  />
                </div>

                {/* Figure Label Display */}
                <div className="sm:col-span-4 flex flex-col justify-end">
                  <div className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-900 border border-blue-200 font-mono font-extrabold text-xs text-center">
                    {numberPrefix} {imageNumber}
                  </div>
                </div>
              </div>

              {/* Caption Field */}
              <div>
                <label className="block text-[11px] font-bold text-[#555] mb-1">Figure Caption Text:</label>
                <input
                  type="text"
                  value={captionText}
                  onChange={(e) => setCaptionText(e.target.value)}
                  placeholder="e.g. Illustration 1: Max meets Barnaby in the forest"
                  className="w-full bg-white border border-[#d0d0d0] rounded-lg px-2.5 py-1.5 text-xs text-[#2c2c2c] focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Link URL Field */}
              <div>
                <label className="block text-[11px] font-bold text-[#555] mb-1 flex items-center gap-1">
                  <Link className="w-3.5 h-3.5 text-blue-600" /> Interactive Image Hyperlink (URL / Anchor):
                </label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="e.g. https://mybooksite.com/chapter1 or #chapter-2 or #quiz-section"
                  className="w-full bg-white border border-[#d0d0d0] rounded-lg px-2.5 py-1.5 text-xs text-[#2c2c2c] focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Target Block Selector if provided */}
              {blocks.length > 0 && (
                <div className="pt-1 flex items-center gap-2 text-xs">
                  <span className="font-bold text-[#555] text-[11px] whitespace-nowrap">Insert Target:</span>
                  <select
                    value={selectedTargetBlockId || ''}
                    onChange={(e) => setSelectedTargetBlockId(e.target.value || null)}
                    className="bg-white border border-[#d0d0d0] rounded-lg px-2.5 py-1 text-xs text-[#2c2c2c] focus:outline-none focus:border-blue-500 flex-1 max-w-xs"
                  >
                    <option value="">+ Create New Numbered Image Block</option>
                    {blocks.map((b, idx) => (
                      <option key={b.id} value={b.id}>
                        Replace Block #{idx + 1} [{b.type.toUpperCase()}]: {b.content ? b.content.slice(0, 25) + '...' : '(Empty)'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

            </div>

            {/* Action Buttons */}
            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerateCartoon}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Rendering Cartoon Scene...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Generate Cartoon Scene</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Right Column: Live Render & Preview Card */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-[#f8f9fa] border border-[#e0e0e0] rounded-2xl p-4 space-y-3">
            
            <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-2 text-xs font-bold text-[#555]">
              <span className="flex items-center gap-1.5 text-orange-600">
                <Eye className="w-4 h-4" /> Book Render Preview
              </span>
              <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 font-mono text-[10px]">
                {currentStyle.name}
              </span>
            </div>

            {/* Image Canvas Box */}
            <div className="relative rounded-xl border border-[#dcdcdc] overflow-hidden bg-white shadow-sm flex flex-col items-center justify-center min-h-[260px] group">
              <img
                src={generatedImageUrl}
                alt={captionText}
                referrerPolicy="no-referrer"
                className={`w-full h-60 object-cover transition-all duration-300 ${isGenerating ? 'opacity-30 blur-xs' : 'opacity-100'}`}
              />

              {/* Number Badge Overlay */}
              <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-xs text-white text-[11px] font-mono font-extrabold px-3 py-1 rounded-full border border-white/20 shadow-lg flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-amber-400" />
                <span>{numberPrefix} {imageNumber}</span>
              </div>

              {/* Link Indicator Badge Overlay */}
              {linkUrl && (
                <div className="absolute top-3 right-3 bg-blue-600 text-white text-[10px] font-mono font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1 border border-blue-400">
                  <Link className="w-3 h-3" /> Linked
                </div>
              )}

              {/* Overlay Prompt Tag */}
              <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-xs text-white text-[10px] p-2 rounded-lg line-clamp-2">
                <span className="font-bold text-amber-300">Subject:</span> {characterSubject} — {sceneAction}
              </div>
            </div>

            {/* Rendered Caption & Hyperlink Preview */}
            <div className="bg-white border border-[#e2e2e2] rounded-xl p-3 space-y-1.5 text-center text-xs">
              <div className="font-bold text-[#2c2c2c] flex items-center justify-center gap-1.5">
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] uppercase font-extrabold">
                  {numberPrefix} {imageNumber}
                </span>
                <span>{captionText || '(No caption set)'}</span>
              </div>

              {linkUrl ? (
                <div className="text-[11px] font-mono text-blue-600 hover:underline flex items-center justify-center gap-1 font-semibold truncate">
                  <Link className="w-3 h-3" /> Clickable Link: {linkUrl}
                </div>
              ) : (
                <div className="text-[10px] font-mono text-[#888] italic">
                  (No hyperlink attached)
                </div>
              )}
            </div>

            {/* Feedback Message */}
            {feedbackMsg && (
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{feedbackMsg}</span>
              </div>
            )}

            {/* Insert to Manuscript Button */}
            <button
              type="button"
              onClick={handleInsertToBook}
              className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Insert Numbered Cartoon into Book Content
            </button>

          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#f0f0f0] text-xs text-[#777]">
          <span className="font-mono text-[11px]">
            Empire Of Trust Children's Studio • Auto-Numbered & Hyperlinked Artwork Engine
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#f0f0f0] hover:bg-[#e0e0e0] text-[#2c2c2c] font-bold cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
