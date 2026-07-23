import React, { useState } from 'react';
import { Smile, X, Copy, Search, Sparkles, Plus, CheckCircle2, BookOpen, Layers } from 'lucide-react';
import { ContentBlock } from '../../types';

interface EmojiPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  blocks?: ContentBlock[];
  initialTargetBlockId?: string | null;
  onInsertEmojiToBlock?: (blockId: string, emoji: string) => void;
  onCreateNewBlockWithEmoji?: (textWithEmoji: string) => void;
}

export interface EmojiItem {
  emoji: string;
  name: string;
  category: string;
  keywords: string;
}

export const EMOJI_CATEGORIES = [
  'All',
  'Academic & Science',
  'Smileys & Reactions',
  'Symbols & Badges',
  'Objects & Tools',
  'Nature & Universe',
  'Arrows & Numbers',
];

export const EMOJI_DATABASE: EmojiItem[] = [
  // Academic & Science
  { emoji: '📚', name: 'Books / Library', category: 'Academic & Science', keywords: 'books study read literature library' },
  { emoji: '📖', name: 'Open Book', category: 'Academic & Science', keywords: 'book open read chapter manuscript' },
  { emoji: '💡', name: 'Idea / Lightbulb', category: 'Academic & Science', keywords: 'idea lightbulb insight solution thought' },
  { emoji: '🔬', name: 'Microscope', category: 'Academic & Science', keywords: 'microscope biology science research lab' },
  { emoji: '🧪', name: 'Test Tube', category: 'Academic & Science', keywords: 'test tube chemistry experiment science' },
  { emoji: '⚛️', name: 'Atom Symbol', category: 'Academic & Science', keywords: 'atom physics nuclear science quantum' },
  { emoji: '📐', name: 'Triangular Ruler', category: 'Academic & Science', keywords: 'ruler geometry math measurement' },
  { emoji: '💻', name: 'Laptop / Code', category: 'Academic & Science', keywords: 'laptop computer code tech programming' },
  { emoji: '🧠', name: 'Brain / Mind', category: 'Academic & Science', keywords: 'brain mind cognition intelligence psychology' },
  { emoji: '🎓', name: 'Graduation Cap', category: 'Academic & Science', keywords: 'graduation cap degree education academic' },
  { emoji: '📜', name: 'Scroll / Document', category: 'Academic & Science', keywords: 'scroll paper document history theorem' },
  { emoji: '📝', name: 'Memo / Writing', category: 'Academic & Science', keywords: 'memo pencil writing note document' },
  { emoji: '📊', name: 'Bar Chart', category: 'Academic & Science', keywords: 'chart graph statistics data analysis' },
  { emoji: '📈', name: 'Chart Increasing', category: 'Academic & Science', keywords: 'chart growth trend analytics progress' },
  { emoji: '🚀', name: 'Rocket / Launch', category: 'Academic & Science', keywords: 'rocket launch space speed progress' },
  { emoji: '✍️', name: 'Writing Hand', category: 'Academic & Science', keywords: 'write author pen signature drafting' },
  { emoji: '📌', name: 'Pushpin', category: 'Academic & Science', keywords: 'pin note important highlight marker' },
  { emoji: '🔍', name: 'Magnifying Glass', category: 'Academic & Science', keywords: 'search inspect research find zoom' },

  // Smileys & Reactions
  { emoji: '😀', name: 'Grinning Face', category: 'Smileys & Reactions', keywords: 'happy smile grin joyful' },
  { emoji: '😊', name: 'Smiling Face', category: 'Smileys & Reactions', keywords: 'smile pleased happy warmth' },
  { emoji: '😂', name: 'Joy / Laughing', category: 'Smileys & Reactions', keywords: 'laugh tear joy funny' },
  { emoji: '🤔', name: 'Thinking Face', category: 'Smileys & Reactions', keywords: 'thinking wonder consider ponder question' },
  { emoji: '🧐', name: 'Monocle / Inspecting', category: 'Smileys & Reactions', keywords: 'monocle inspect examine curious smart' },
  { emoji: '🎯', name: 'Bullseye / Target', category: 'Smileys & Reactions', keywords: 'target bullseye goal objective precision' },
  { emoji: '😎', name: 'Sunglasses / Cool', category: 'Smileys & Reactions', keywords: 'cool confident awesome smooth' },
  { emoji: '🤩', name: 'Star-Struck', category: 'Smileys & Reactions', keywords: 'star excited amazed impressed' },
  { emoji: '🥳', name: 'Partying Face', category: 'Smileys & Reactions', keywords: 'party celebrate achievement victory' },
  { emoji: '🤯', name: 'Exploding Head', category: 'Smileys & Reactions', keywords: 'mind blown amazed shocked brilliant' },
  { emoji: '😴', name: 'Sleeping / Rest', category: 'Smileys & Reactions', keywords: 'sleep rest quiet break' },
  { emoji: '😇', name: 'Innocent / Halo', category: 'Smileys & Reactions', keywords: 'angel halo good honest truth' },
  { emoji: '🤫', name: 'Shushing Face', category: 'Smileys & Reactions', keywords: 'shh quiet secret spoiler confidential' },
  { emoji: '🤝', name: 'Handshake', category: 'Smileys & Reactions', keywords: 'handshake deal agreement partnership' },
  { emoji: '🙏', name: 'Folded Hands', category: 'Smileys & Reactions', keywords: 'pray thanks appreciation respect' },
  { emoji: '👍', name: 'Thumbs Up', category: 'Smileys & Reactions', keywords: 'thumbs up like approve agree yes' },

  // Symbols & Badges
  { emoji: '⭐', name: 'Star', category: 'Symbols & Badges', keywords: 'star favorite rating highlight key' },
  { emoji: '🌟', name: 'Glowing Star', category: 'Symbols & Badges', keywords: 'glowing star special featured' },
  { emoji: '✨', name: 'Sparkles', category: 'Symbols & Badges', keywords: 'sparkles magic highlight shiny new' },
  { emoji: '🔥', name: 'Fire / Hot', category: 'Symbols & Badges', keywords: 'fire hot important trendy urgent' },
  { emoji: '⚡', name: 'High Voltage', category: 'Symbols & Badges', keywords: 'lightning bolt fast electric energy power' },
  { emoji: '💥', name: 'Collision / Boom', category: 'Symbols & Badges', keywords: 'boom bang impact core break' },
  { emoji: '🏆', name: 'Trophy', category: 'Symbols & Badges', keywords: 'trophy award winner first champion' },
  { emoji: '🥇', name: '1st Place Medal', category: 'Symbols & Badges', keywords: 'gold medal first top rank' },
  { emoji: '🔑', name: 'Key Concept', category: 'Symbols & Badges', keywords: 'key unlock main essential secret' },
  { emoji: '🛡️', name: 'Shield / Security', category: 'Symbols & Badges', keywords: 'shield protect defense security safety' },
  { emoji: '🔒', name: 'Locked', category: 'Symbols & Badges', keywords: 'lock security private restricted' },
  { emoji: '🚩', name: 'Triangular Flag', category: 'Symbols & Badges', keywords: 'flag red flag milestone checkpoint' },
  { emoji: '🚨', name: 'Police Light / Alert', category: 'Symbols & Badges', keywords: 'alert warning emergency critical siren' },
  { emoji: '⚠️', name: 'Warning Sign', category: 'Symbols & Badges', keywords: 'warning caution alert note danger' },
  { emoji: 'ℹ️', name: 'Information Source', category: 'Symbols & Badges', keywords: 'info information detail notice tip' },
  { emoji: '✅', name: 'Check Mark Button', category: 'Symbols & Badges', keywords: 'check verified done correct pass' },
  { emoji: '❌', name: 'Cross Mark', category: 'Symbols & Badges', keywords: 'cross wrong error cancel fail' },
  { emoji: '💯', name: '100 Points', category: 'Symbols & Badges', keywords: 'hundred percent perfect complete' },

  // Objects & Tools
  { emoji: '🖊️', name: 'Pen', category: 'Objects & Tools', keywords: 'pen ink author signature manuscript' },
  { emoji: '✏️', name: 'Pencil', category: 'Objects & Tools', keywords: 'pencil draft edit note draw' },
  { emoji: '📂', name: 'Open Folder', category: 'Objects & Tools', keywords: 'folder archive file directory' },
  { emoji: '📅', name: 'Calendar', category: 'Objects & Tools', keywords: 'calendar date timeline schedule event' },
  { emoji: '⏰', name: 'Alarm Clock', category: 'Objects & Tools', keywords: 'clock time deadline countdown hour' },
  { emoji: '🗺️', name: 'World Map', category: 'Objects & Tools', keywords: 'map globe geography navigation travel' },
  { emoji: '🎨', name: 'Artist Palette', category: 'Objects & Tools', keywords: 'art design palette color creative' },
  { emoji: '🎧', name: 'Headphones', category: 'Objects & Tools', keywords: 'audio podcast listen sound music' },
  { emoji: '💬', name: 'Speech Balloon', category: 'Objects & Tools', keywords: 'chat comment quote dialogue speak' },
  { emoji: '🔔', name: 'Bell / Notification', category: 'Objects & Tools', keywords: 'bell alarm notify alert reminder' },

  // Nature & Universe
  { emoji: '🌱', name: 'Seedling / Growth', category: 'Nature & Universe', keywords: 'seedling plant grow beginner start' },
  { emoji: '🌿', name: 'Herb / Leaf', category: 'Nature & Universe', keywords: 'leaf nature ecology environment green' },
  { emoji: '🌳', name: 'Deciduous Tree', category: 'Nature & Universe', keywords: 'tree nature forest structure growth' },
  { emoji: '🌍', name: 'Globe Europe-Africa', category: 'Nature & Universe', keywords: 'earth world global planet international' },
  { emoji: '🪐', name: 'Ringed Planet', category: 'Nature & Universe', keywords: 'planet saturn astronomy cosmos space' },
  { emoji: '☀️', name: 'Sun', category: 'Nature & Universe', keywords: 'sun light bright warm day' },
  { emoji: '🌙', name: 'Crescent Moon', category: 'Nature & Universe', keywords: 'moon night astronomy quiet dark' },
  { emoji: '🌊', name: 'Water Wave', category: 'Nature & Universe', keywords: 'wave ocean sea water flow motion' },

  // Arrows & Numbers
  { emoji: '➡️', name: 'Right Arrow', category: 'Arrows & Numbers', keywords: 'arrow right forward next direction' },
  { emoji: '⬅️', name: 'Left Arrow', category: 'Arrows & Numbers', keywords: 'arrow left back previous return' },
  { emoji: '⬆️', name: 'Up Arrow', category: 'Arrows & Numbers', keywords: 'arrow up increase top rise' },
  { emoji: '⬇️', name: 'Down Arrow', category: 'Arrows & Numbers', keywords: 'arrow down decrease bottom fall' },
  { emoji: '🔄', name: 'Counterclockwise Arrows', category: 'Arrows & Numbers', keywords: 'refresh repeat cycle reload update' },
  { emoji: '1️⃣', name: 'Keycap 1', category: 'Arrows & Numbers', keywords: 'one 1 step first number' },
  { emoji: '2️⃣', name: 'Keycap 2', category: 'Arrows & Numbers', keywords: 'two 2 step second number' },
  { emoji: '3️⃣', name: 'Keycap 3', category: 'Arrows & Numbers', keywords: 'three 3 step third number' },
  { emoji: '4️⃣', name: 'Keycap 4', category: 'Arrows & Numbers', keywords: 'four 4 step fourth number' },
  { emoji: '5️⃣', name: 'Keycap 5', category: 'Arrows & Numbers', keywords: 'five 5 step fifth number' },
];

export const EmojiPickerModal: React.FC<EmojiPickerModalProps> = ({
  isOpen,
  onClose,
  blocks = [],
  initialTargetBlockId = null,
  onInsertEmojiToBlock,
  onCreateNewBlockWithEmoji,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [bufferText, setBufferText] = useState<string>('');
  const [copiedEmoji, setCopiedEmoji] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string>(
    initialTargetBlockId || (blocks.length > 0 ? blocks[0].id : '')
  );
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddEmojiToBuffer = (emoji: string) => {
    setBufferText((prev) => `${prev}${emoji}`);
  };

  const handleCopyEmoji = (str: string) => {
    navigator.clipboard.writeText(str);
    setCopiedEmoji(str);
    setTimeout(() => setCopiedEmoji(null), 1800);
  };

  const handleInsertToSelectedBlock = (emojiToUse?: string) => {
    const textToInsert = emojiToUse || bufferText;
    if (!textToInsert) return;

    if (selectedBlockId && onInsertEmojiToBlock) {
      onInsertEmojiToBlock(selectedBlockId, textToInsert);
      setFeedbackMsg(`Inserted "${textToInsert}" into target block!`);
      setTimeout(() => setFeedbackMsg(null), 2000);
    } else if (onCreateNewBlockWithEmoji) {
      onCreateNewBlockWithEmoji(textToInsert);
      setFeedbackMsg(`Created new paragraph block with "${textToInsert}"!`);
      setTimeout(() => setFeedbackMsg(null), 2000);
    }
  };

  const filteredEmojis = EMOJI_DATABASE.filter((item) => {
    const matchesCat = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.keywords.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.emoji.includes(searchQuery);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-[#d8d8d8] rounded-2xl max-w-2xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl text-[#2c2c2c]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <Smile className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#1f1f1f]">Book Content Emoji Palette</h3>
              <p className="text-xs text-[#666]">
                Insert emojis directly into your manuscript blocks, headers, or callout notices.
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

        {/* Buffer & Quick Action Bar */}
        <div className="p-3.5 bg-[#f9f9f9] border border-[#e2e2e2] rounded-xl space-y-2.5 shadow-inner">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#666] uppercase">
            <span className="flex items-center gap-1 text-amber-600">
              <Sparkles className="w-3.5 h-3.5" /> Emoji Buffer
            </span>
            {bufferText && (
              <button
                type="button"
                onClick={() => setBufferText('')}
                className="text-red-500 hover:underline text-[10px] lowercase font-bold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={bufferText}
              onChange={(e) => setBufferText(e.target.value)}
              placeholder="Click emojis below to accumulate e.g. 📚💡🔬..."
              className="flex-1 bg-white border border-[#e0e0e0] rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:border-amber-500 font-sans"
            />
            <button
              type="button"
              disabled={!bufferText}
              onClick={() => handleCopyEmoji(bufferText)}
              className="px-3 py-2 rounded-lg bg-white border border-[#e0e0e0] hover:bg-[#f0f0f0] font-bold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-40"
              title="Copy to Clipboard"
            >
              <Copy className="w-3.5 h-3.5 text-amber-600" />
              {copiedEmoji === bufferText ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              disabled={!bufferText}
              onClick={() => handleInsertToSelectedBlock()}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-40"
            >
              <Plus className="w-4 h-4" /> Insert
            </button>
          </div>

          {feedbackMsg && (
            <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-lg flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {feedbackMsg}
            </div>
          )}

          {/* Block Selector */}
          {blocks.length > 0 && onInsertEmojiToBlock && (
            <div className="flex items-center gap-2 pt-1 text-xs">
              <span className="font-bold text-[#666] text-[11px]">Insert Target Block:</span>
              <select
                value={selectedBlockId}
                onChange={(e) => setSelectedBlockId(e.target.value)}
                className="bg-white border border-[#e0e0e0] rounded-lg px-2.5 py-1 text-xs text-[#2c2c2c] focus:outline-none focus:border-amber-500 flex-1"
              >
                {blocks.map((b, idx) => (
                  <option key={b.id} value={b.id}>
                    [{b.type.toUpperCase()}] #{idx + 1}: {b.content ? b.content.slice(0, 30) + '...' : '(Empty)'}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Filter Bar */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#888]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search emojis by name, keyword, or concept..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#e0e0e0] rounded-lg text-xs text-[#2c2c2c] focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
            {EMOJI_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                  activeCategory === cat
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-[#f2f2f2] text-[#555] hover:bg-[#e5e5e5] hover:text-[#1f1f1f]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Emoji Grid */}
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-64 overflow-y-auto p-1 bg-[#fafafa] rounded-xl border border-[#eaeaea]">
          {filteredEmojis.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                handleAddEmojiToBuffer(item.emoji);
                if (selectedBlockId && onInsertEmojiToBlock) {
                  onInsertEmojiToBlock(selectedBlockId, item.emoji);
                  setFeedbackMsg(`Added ${item.emoji} to block!`);
                  setTimeout(() => setFeedbackMsg(null), 1500);
                }
              }}
              className="p-2.5 rounded-xl bg-white border border-[#e0e0e0] hover:border-amber-500 hover:bg-amber-50/50 hover:scale-110 text-2xl flex items-center justify-center transition-all cursor-pointer shadow-2xs group relative"
              title={`${item.emoji} - ${item.name}`}
            >
              <span>{item.emoji}</span>
            </button>
          ))}

          {filteredEmojis.length === 0 && (
            <div className="col-span-full p-6 text-center text-xs text-[#777] font-mono">
              No emojis matching "{searchQuery}"
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[#f0f0f0] text-xs text-[#777]">
          <span>Tip: Click any emoji to insert directly into your active manuscript block</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#f0f0f0] hover:bg-[#e0e0e0] text-[#2c2c2c] font-bold cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
