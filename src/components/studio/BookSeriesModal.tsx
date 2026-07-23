import React from 'react';
import { 
  X, Tv, Film, Sparkles, ArrowRight, RotateCcw, Calendar, PlayCircle, Eye, Check, FastForward, Bookmark, HelpCircle 
} from 'lucide-react';
import { BookSeriesConfig } from '../../types';

interface BookSeriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  seriesConfig: BookSeriesConfig;
  bookTitle: string;
  onChangeSeriesConfig: (updated: BookSeriesConfig) => void;
}

export const BookSeriesModal: React.FC<BookSeriesModalProps> = ({
  isOpen,
  onClose,
  seriesConfig,
  bookTitle,
  onChangeSeriesConfig,
}) => {
  if (!isOpen) return null;

  const current: BookSeriesConfig = seriesConfig || {
    isSeries: false,
    showSeriesBannerInReader: true,
  };

  const updateField = <K extends keyof BookSeriesConfig>(field: K, value: BookSeriesConfig[K]) => {
    onChangeSeriesConfig({
      ...current,
      [field]: value,
    });
  };

  const handleGenerateRecapTemplate = () => {
    const recap = `PREVIOUSLY IN ${current.seriesName ? current.seriesName.toUpperCase() : 'THE SERIES'} (SEASON ${current.seasonNumber || 1}):
----------------------------------------------------------------------
• In Episode ${Math.max(1, (current.episodeNumber || 2) - 1)}, the core architecture was established, but unexpected regulatory audits placed equity distribution under scrutiny.
• Key characters & financial ledgers revealed hidden liabilities that threatened the venture.
• As the previous episode concluded, a critical decision was made to execute an emergency restructuring plan.`;

    updateField('previousEpisodeRecap', current.previousEpisodeRecap || recap);
  };

  const handleGenerateTeaserTemplate = () => {
    const teaser = `COMING UP IN EPISODE ${(current.episodeNumber || 1) + 1}${current.nextEpisodeTitle ? `: "${current.nextEpisodeTitle}"` : ''}:
----------------------------------------------------------------------
• Will the new equity terms hold during international expansion?
• A surprise inspection tests the resilience of the local SQLite database architecture.
• Don't miss the next release—featuring interactive financial models and expert commentary!`;

    updateField('nextEpisodeTeaser', current.nextEpisodeTeaser || teaser);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-[#e0e0e0] rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="bg-[#1e293b] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#ff6321] rounded-lg">
              <Tv className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base">Book Series, Seasons & Episodic Previews</h2>
              <p className="text-xs text-slate-300">Configure Seasons, Episode Recaps ("Previously On...") and Upcoming Teasers</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">

          {/* Enable Series Switch */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#ff6321]/10 rounded-lg text-[#ff6321]">
                <Film className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800">Is this book part of a Series or Episodic Release?</h3>
                <p className="text-xs text-slate-500">Enables Season/Episode badges, "Previously On" recaps, and "Next Episode" teasers</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={current.isSeries || false}
                onChange={(e) => updateField('isSeries', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff6321]"></div>
            </label>
          </div>

          {current.isSeries && (
            <>
              {/* Series, Season & Episode Metadata */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Bookmark className="w-3.5 h-3.5 text-[#ff6321]" /> Series Hierarchy Metadata
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Series Collection Name
                    </label>
                    <input
                      type="text"
                      value={current.seriesName || ''}
                      onChange={(e) => updateField('seriesName', e.target.value)}
                      placeholder="e.g. The Silicon Valley Founder Chronicles"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#ff6321]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Season Number
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={current.seasonNumber || 1}
                      onChange={(e) => updateField('seasonNumber', parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#ff6321]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Episode / Volume Number
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={current.episodeNumber || 1}
                      onChange={(e) => updateField('episodeNumber', parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#ff6321]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Episode Subtitle
                    </label>
                    <input
                      type="text"
                      value={current.episodeTitle || ''}
                      onChange={(e) => updateField('episodeTitle', e.target.value)}
                      placeholder="e.g. The First Audit"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#ff6321]"
                    />
                  </div>
                </div>

                {/* Badge Preview */}
                <div className="bg-slate-900 text-white p-3 rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#ff6321] text-white font-mono font-bold text-[10px] uppercase">
                      SEASON {current.seasonNumber || 1} • EPISODE {current.episodeNumber || 1}
                    </span>
                    <span className="font-bold text-slate-200">
                      {current.seriesName || 'Series Name'}: {current.episodeTitle || bookTitle || 'Episode Title'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 italic">Reader Header Preview</span>
                </div>
              </div>

              {/* Previously On... / Previous Episode Recap */}
              <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <RotateCcw className="w-4 h-4 text-[#ff6321]" />
                    <span>Previous Episode Recap ("Previously On...")</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleGenerateRecapTemplate}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#ff6321] hover:underline"
                  >
                    <Sparkles className="w-3 h-3" /> Auto-Fill Recap Outline
                  </button>
                </div>

                <p className="text-[11px] text-slate-500">
                  Summarize key developments from previous episodes so new or returning readers get caught up immediately before Chapter 1.
                </p>

                <textarea
                  value={current.previousEpisodeRecap || ''}
                  onChange={(e) => updateField('previousEpisodeRecap', e.target.value)}
                  placeholder="Previously in Season 1, Episode 1..."
                  rows={4}
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-[#ff6321] leading-relaxed font-serif"
                />
              </div>

              {/* What to Expect / Next Episode Teaser */}
              <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FastForward className="w-4 h-4 text-[#ff6321]" />
                    <span>Next Episode Sneak Peek & Teaser ("What to Expect Next")</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleGenerateTeaserTemplate}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#ff6321] hover:underline"
                  >
                    <Sparkles className="w-3 h-3" /> Auto-Fill Teaser Outline
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Next Episode Title
                    </label>
                    <input
                      type="text"
                      value={current.nextEpisodeTitle || ''}
                      onChange={(e) => updateField('nextEpisodeTitle', e.target.value)}
                      placeholder={`e.g. Episode ${(current.episodeNumber || 1) + 1}: The Boardroom Showdown`}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#ff6321]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Expected Release Schedule / Date
                    </label>
                    <input
                      type="text"
                      value={current.nextEpisodeReleaseDate || ''}
                      onChange={(e) => updateField('nextEpisodeReleaseDate', e.target.value)}
                      placeholder="e.g. Releasing August 2026 / Coming Next Week"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#ff6321]"
                    />
                  </div>
                </div>

                <textarea
                  value={current.nextEpisodeTeaser || ''}
                  onChange={(e) => updateField('nextEpisodeTeaser', e.target.value)}
                  placeholder="In the next episode of this series..."
                  rows={4}
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-[#ff6321] leading-relaxed font-serif"
                />
              </div>

            </>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#ff6321] hover:opacity-90 text-white rounded-lg font-bold text-xs transition-opacity shadow-xs"
          >
            Save Series Settings & Previews
          </button>
        </div>

      </div>
    </div>
  );
};
