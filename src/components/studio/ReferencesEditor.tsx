import React, { useState } from 'react';
import { Bookmark, Plus, Trash2, ExternalLink, BookOpen, Edit2, Check } from 'lucide-react';
import { ReferenceItem } from '../../types';

interface ReferencesEditorProps {
  references: ReferenceItem[];
  onAddReference: (ref: Omit<ReferenceItem, 'id' | 'bookId'>) => void;
  onDeleteReference: (id: string) => void;
}

export const ReferencesEditor: React.FC<ReferencesEditorProps> = ({
  references,
  onAddReference,
  onDeleteReference,
}) => {
  const [citationKey, setCitationKey] = useState(`[${references.length + 1}]`);
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [publisher, setPublisher] = useState('');
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddReference({
      citationKey: citationKey.trim() || `[${references.length + 1}]`,
      title: title.trim(),
      authors: authors.trim(),
      publicationYear: year.trim(),
      journalOrPublisher: publisher.trim(),
      url: url.trim(),
    });

    setTitle('');
    setAuthors('');
    setPublisher('');
    setUrl('');
    setCitationKey(`[${references.length + 2}]`);
  };

  return (
    <div className="bg-white border border-[#e0e0e0] rounded-xl p-6 shadow-sm space-y-6">
      
      <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-4">
        <div className="flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-[#ff6321]" />
          <h3 className="font-bold text-base text-[#2c2c2c]">References & Bibliography ({references.length})</h3>
        </div>
      </div>

      {/* Add New Reference Form */}
      <form onSubmit={handleSubmit} className="bg-[#f9f9f9] border border-[#e0e0e0] rounded-lg p-4 space-y-3 text-xs">
        <h4 className="font-bold text-xs text-[#2c2c2c]">Add New Citation Entry</h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-3">
            <label className="block text-[10px] uppercase font-bold text-[#666] mb-1">Citation Tag / Key</label>
            <input
              type="text"
              value={citationKey}
              onChange={(e) => setCitationKey(e.target.value)}
              placeholder="[1]"
              className="w-full bg-white border border-[#e0e0e0] rounded-md px-3 py-1.5 text-[#2c2c2c] font-bold focus:border-[#ff6321] focus:outline-none font-mono"
            />
          </div>

          <div className="sm:col-span-9">
            <label className="block text-[10px] uppercase font-bold text-[#666] mb-1">Publication / Book / Paper Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title of referenced work..."
              required
              className="w-full bg-white border border-[#e0e0e0] rounded-md px-3 py-1.5 text-[#2c2c2c] font-medium focus:border-[#ff6321] focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5">
            <label className="block text-[10px] uppercase font-bold text-[#666] mb-1">Authors</label>
            <input
              type="text"
              value={authors}
              onChange={(e) => setAuthors(e.target.value)}
              placeholder="e.g. Doe, J. & Smith, A."
              className="w-full bg-white border border-[#e0e0e0] rounded-md px-3 py-1.5 text-[#2c2c2c] font-medium focus:border-[#ff6321] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[10px] uppercase font-bold text-[#666] mb-1">Year</label>
            <input
              type="text"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2026"
              className="w-full bg-white border border-[#e0e0e0] rounded-md px-3 py-1.5 text-[#2c2c2c] font-medium focus:border-[#ff6321] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block text-[10px] uppercase font-bold text-[#666] mb-1">Publisher / Journal</label>
            <input
              type="text"
              value={publisher}
              onChange={(e) => setPublisher(e.target.value)}
              placeholder="Oxford University Press"
              className="w-full bg-white border border-[#e0e0e0] rounded-md px-3 py-1.5 text-[#2c2c2c] font-medium focus:border-[#ff6321] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL / DOI link (optional)..."
            className="flex-1 bg-white border border-[#e0e0e0] rounded-md px-3 py-1.5 text-[#2c2c2c] font-medium focus:border-[#ff6321] focus:outline-none"
          />

          <button
            type="submit"
            className="px-4 py-1.5 rounded-md bg-[#ff6321] hover:opacity-90 text-white font-bold flex items-center gap-1 shadow-sm transition-opacity shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Add Citation
          </button>
        </div>
      </form>

      {/* Reference List */}
      <div className="space-y-2">
        {references.length === 0 ? (
          <p className="text-xs text-gray-500 italic text-center py-6">
            No bibliographic references added yet. Add entries above to link them inside chapter text.
          </p>
        ) : (
          references.map((ref) => (
            <div
              key={ref.id}
              className="flex items-start justify-between bg-[#f9f9f9] border border-[#e0e0e0] rounded-lg p-3 text-xs"
            >
              <div className="space-y-1 pr-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#ff6321] bg-[#ff6321]/10 px-2 py-0.5 rounded border border-[#ff6321]/20">
                    {ref.citationKey}
                  </span>
                  <span className="font-bold text-[#2c2c2c]">{ref.title}</span>
                </div>
                <p className="text-[#666]">
                  {ref.authors && <span>{ref.authors}. </span>}
                  {ref.journalOrPublisher && <span>{ref.journalOrPublisher}, </span>}
                  {ref.publicationYear && <span>({ref.publicationYear}).</span>}
                </p>
                {ref.url && (
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[#ff6321] font-semibold hover:underline text-[11px]"
                  >
                    <ExternalLink className="w-3 h-3" /> {ref.url}
                  </a>
                )}
              </div>

              <button
                type="button"
                onClick={() => onDeleteReference(ref.id)}
                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
