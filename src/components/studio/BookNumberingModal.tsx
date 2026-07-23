import React from 'react';
import { 
  X, Hash, Type, Sparkles, Check, Eye, Layout, Sliders, FileText 
} from 'lucide-react';
import { BookNumberingConfig, NumberingStyle, ChapterDesignStyle } from '../../types';
import { formatChapterNumber } from '../../lib/numbering';

interface BookNumberingModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BookNumberingConfig;
  onChangeConfig: (newConfig: BookNumberingConfig) => void;
}

export const BookNumberingModal: React.FC<BookNumberingModalProps> = ({
  isOpen,
  onClose,
  config,
  onChangeConfig,
}) => {
  if (!isOpen) return null;

  const currentConfig: BookNumberingConfig = config || {
    numberingStyle: 'arabic',
    numberingPrefix: 'Chapter',
    numberingSuffix: '',
    chapterDesignStyle: 'classic',
    showChapterNumbersInTOC: true,
    pageNumberPosition: 'bottom-center',
  };

  const update = (updates: Partial<BookNumberingConfig>) => {
    onChangeConfig({ ...currentConfig, ...updates });
  };

  const NUMBERING_STYLES: Array<{ id: NumberingStyle; name: string; example: string }> = [
    { id: 'arabic', name: 'Arabic Numerals', example: '1, 2, 3, 4' },
    { id: 'roman', name: 'Roman Numerals', example: 'I, II, III, IV' },
    { id: 'alphabetic', name: 'Alphabetic Letters', example: 'A, B, C, D' },
    { id: 'spelled', name: 'Spelled Words', example: 'One, Two, Three' },
  ];

  const CHAPTER_DESIGN_STYLES: Array<{ id: ChapterDesignStyle; name: string; desc: string }> = [
    { id: 'classic', name: 'Classic Publisher', desc: 'Elegant typography with subtle orange divider line' },
    { id: 'modern', name: 'Modern Sans', desc: 'Minimalist clean badge heading' },
    { id: 'editorial', name: 'Editorial Serif', desc: 'Centered literary style with italic chapter label' },
    { id: 'bold', name: 'Bold Dark Banner', desc: 'High-contrast dark header block' },
    { id: 'accounting', name: 'Financial & Accounting', desc: 'Clean ledger grid styling for financial books' },
    { id: 'tech_code', name: 'Tech / Code Script', desc: 'Developer style with // comment headers' },
  ];

  const PREFIX_PRESETS = ['Chapter', 'Section', 'Module', 'Ledger', 'Script', 'Unit', 'Part', 'Lecture', 'Case Study'];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-[#e0e0e0] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="bg-[#1e293b] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#ff6321] rounded-lg">
              <Hash className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base">Book Numbering & Header Design</h2>
              <p className="text-xs text-slate-300">Customize chapter numbering formats, prefixes, and visual styles</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Section 1: Numbering Style */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Type className="w-4 h-4 text-[#ff6321]" /> Chapter Numbering Style
            </label>

            <div className="grid grid-cols-2 gap-3">
              {NUMBERING_STYLES.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => update({ numberingStyle: st.id })}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                    currentConfig.numberingStyle === st.id
                      ? 'bg-orange-50/80 border-[#ff6321] text-slate-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs">{st.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">{st.example}</div>
                  </div>
                  {currentConfig.numberingStyle === st.id && (
                    <Check className="w-4 h-4 text-[#ff6321]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Prefix and Suffix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Numbering Prefix
              </label>
              <input
                type="text"
                value={currentConfig.numberingPrefix}
                onChange={(e) => update({ numberingPrefix: e.target.value })}
                placeholder="e.g. Chapter, Module, Ledger"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#ff6321]"
              />

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1 mt-2">
                {PREFIX_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => update({ numberingPrefix: p })}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Numbering Suffix
              </label>
              <input
                type="text"
                value={currentConfig.numberingSuffix || ''}
                onChange={(e) => update({ numberingSuffix: e.target.value })}
                placeholder="e.g. : or . or -"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#ff6321]"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Punctuation appended after the chapter number
              </span>
            </div>
          </div>

          {/* Section 3: Visual Design Style */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Layout className="w-4 h-4 text-[#ff6321]" /> Chapter Header Visual Theme
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CHAPTER_DESIGN_STYLES.map((ds) => (
                <button
                  key={ds.id}
                  type="button"
                  onClick={() => update({ chapterDesignStyle: ds.id })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    currentConfig.chapterDesignStyle === ds.id
                      ? 'bg-orange-50/80 border-[#ff6321] shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800">{ds.name}</span>
                    {currentConfig.chapterDesignStyle === ds.id && (
                      <Check className="w-4 h-4 text-[#ff6321]" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">{ds.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Live Chapter Header Preview Box */}
          <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-[#ff6321]" /> Live Reader & PDF Export Preview
              </span>
            </div>

            <div className="p-5 bg-white rounded-lg border border-slate-200 shadow-xs space-y-2">
              <div className="text-[#ff6321] font-bold text-xs uppercase tracking-wider">
                {formatChapterNumber(1, currentConfig)}
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                Introduction to Principles & Foundations
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-serif">
                This live preview illustrates how your formatted chapter headings will appear in the reading studio, reader PWA, and exported PDF manuscript.
              </p>
            </div>
          </div>

          {/* Page Number Position */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <span className="font-bold text-slate-700">PDF Export Page Number Position:</span>
            <select
              value={currentConfig.pageNumberPosition || 'bottom-center'}
              onChange={(e) => update({ pageNumberPosition: e.target.value as any })}
              className="bg-white border border-slate-300 rounded px-3 py-1 font-bold text-slate-800 focus:outline-none"
            >
              <option value="bottom-center">Bottom Center (- Page 1 -)</option>
              <option value="bottom-right">Bottom Right (- Page 1 -)</option>
              <option value="top-right">Top Right (- Page 1 -)</option>
            </select>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#ff6321] hover:opacity-90 text-white rounded-lg font-bold text-xs transition-opacity shadow-xs"
          >
            Save & Apply Numbering Options
          </button>
        </div>

      </div>
    </div>
  );
};
