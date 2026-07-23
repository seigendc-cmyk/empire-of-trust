import React, { useState } from 'react';
import { 
  X, Layers, Tag, Globe, Users, Sparkles, Check, Plus, Trash2, BookOpen, Compass
} from 'lucide-react';
import { Book, DEFAULT_BOOK_CATEGORIES } from '../../types';

interface BookStructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book;
  onUpdateBook: (updatedFields: Partial<Book>) => void;
}

const COMMON_GENRES = [
  'Non-Fiction',
  'Technical & Engineering',
  'Business & Management',
  'Economics & Finance',
  'Academic & Textbooks',
  'Education & Reference',
  'Science & Technology',
  'Biography & Memoir',
  'Self-Help & Personal Growth',
  'Fiction & Literature',
  'Science Fiction & Fantasy',
  'Mystery & Thriller',
  'History & Politics',
];

const COMMON_LANGUAGES = [
  'English (US)',
  'English (UK)',
  'Spanish',
  'French',
  'German',
  'Portuguese',
  'Italian',
  'Japanese',
  'Chinese (Mandarin)',
  'Arabic',
  'Swahili',
];

export const BookStructureModal: React.FC<BookStructureModalProps> = ({
  isOpen,
  onClose,
  book,
  onUpdateBook,
}) => {
  const [tagInput, setTagInput] = useState('');
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false);
  const [showCustomGenreInput, setShowCustomGenreInput] = useState(false);
  const [showCustomLanguageInput, setShowCustomLanguageInput] = useState(false);

  const [newCategoryText, setNewCategoryText] = useState('');
  const [newGenreText, setNewGenreText] = useState('');
  const [newLanguageText, setNewLanguageText] = useState('');

  if (!isOpen) return null;

  const currentCategory = book.category || 'General Non-Fiction';
  const currentGenre = book.genre || '';
  const currentSubGenre = book.subGenre || '';
  const currentTags = book.tags || [];
  const currentAudience = book.targetAudience || '';
  const currentLanguage = book.language || 'English (US)';

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, '');
    if (!trimmed) return;
    if (!currentTags.includes(trimmed)) {
      onUpdateBook({ tags: [...currentTags, trimmed] });
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateBook({ tags: currentTags.filter((t) => t !== tagToRemove) });
  };

  const handleKeyDownTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSaveCustomCategory = () => {
    if (!newCategoryText.trim()) return;
    onUpdateBook({ category: newCategoryText.trim() });
    setNewCategoryText('');
    setShowCustomCategoryInput(false);
  };

  const handleSaveCustomGenre = () => {
    if (!newGenreText.trim()) return;
    onUpdateBook({ genre: newGenreText.trim() });
    setNewGenreText('');
    setShowCustomGenreInput(false);
  };

  const handleSaveCustomLanguage = () => {
    if (!newLanguageText.trim()) return;
    onUpdateBook({ language: newLanguageText.trim() });
    setNewLanguageText('');
    setShowCustomLanguageInput(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-[#e0e0e0] rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="bg-[#1e2023] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#ff6321] rounded-lg">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base">Book Structure, Classification & Metadata</h2>
              <p className="text-xs text-gray-300">Set Category, Genre, Sub-Genre, Keywords, Target Audience & Language</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">

          {/* Book Title & Subtitle Preview Box */}
          <div className="p-4 rounded-xl bg-orange-50/60 border border-orange-200/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#ff6321] block">
                Active Title
              </span>
              <h3 className="text-sm font-bold text-gray-900">{book.title}</h3>
              {book.subtitle && <p className="text-xs text-gray-600 italic">{book.subtitle}</p>}
            </div>
            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold font-mono bg-[#ff6321] text-white">
              PWA METADATA
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Primary Category */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#ff6321]" /> Primary Category
                </label>
                <button
                  type="button"
                  onClick={() => setShowCustomCategoryInput(!showCustomCategoryInput)}
                  className="text-[10px] font-bold text-[#ff6321] hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> {showCustomCategoryInput ? 'Select Standard' : '+ Add New Category'}
                </button>
              </div>

              {showCustomCategoryInput ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryText}
                    onChange={(e) => setNewCategoryText(e.target.value)}
                    placeholder="Enter new custom category..."
                    className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 font-semibold focus:border-[#ff6321] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveCustomCategory}
                    className="px-3 py-2 bg-[#ff6321] text-white rounded-lg text-xs font-bold hover:bg-[#e55315] transition-colors"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <select
                  value={DEFAULT_BOOK_CATEGORIES.includes(currentCategory as any) ? currentCategory : currentCategory}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__add_custom__') {
                      setShowCustomCategoryInput(true);
                    } else {
                      onUpdateBook({ category: val });
                    }
                  }}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 font-semibold focus:border-[#ff6321] focus:outline-none"
                >
                  {DEFAULT_BOOK_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  {!DEFAULT_BOOK_CATEGORIES.includes(currentCategory as any) && (
                    <option value={currentCategory}>
                      {currentCategory} (Custom)
                    </option>
                  )}
                  <option value="__add_custom__">+ Add Custom Category...</option>
                </select>
              )}
            </div>

            {/* Main Genre */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#ff6321]" /> Main Genre
                </label>
                <button
                  type="button"
                  onClick={() => setShowCustomGenreInput(!showCustomGenreInput)}
                  className="text-[10px] font-bold text-[#ff6321] hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> {showCustomGenreInput ? 'Select Standard' : '+ Add New Genre'}
                </button>
              </div>

              {showCustomGenreInput ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newGenreText}
                    onChange={(e) => setNewGenreText(e.target.value)}
                    placeholder="Enter new genre..."
                    className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 font-semibold focus:border-[#ff6321] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveCustomGenre}
                    className="px-3 py-2 bg-[#ff6321] text-white rounded-lg text-xs font-bold hover:bg-[#e55315] transition-colors"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    list="common-genres"
                    value={currentGenre}
                    onChange={(e) => onUpdateBook({ genre: e.target.value })}
                    placeholder="Select or type new genre..."
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 font-semibold focus:border-[#ff6321] focus:outline-none"
                  />
                  <datalist id="common-genres">
                    {COMMON_GENRES.map((g) => (
                      <option key={g} value={g} />
                    ))}
                  </datalist>
                </div>
              )}
            </div>

            {/* Sub-Genre */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#ff6321]" /> Sub-Genre / Niche Focus
              </label>
              <input
                type="text"
                value={currentSubGenre}
                onChange={(e) => onUpdateBook({ subGenre: e.target.value })}
                placeholder="e.g. Cloud Computing, Financial Accounting"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 font-medium focus:border-[#ff6321] focus:outline-none"
              />
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#ff6321]" /> Target Audience / Readers
              </label>
              <input
                type="text"
                value={currentAudience}
                onChange={(e) => onUpdateBook({ targetAudience: e.target.value })}
                placeholder="e.g. Software Engineers, Accounting Students"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 font-medium focus:border-[#ff6321] focus:outline-none"
              />
            </div>

            {/* Language */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#ff6321]" /> Language of Publication
                </label>
                <button
                  type="button"
                  onClick={() => setShowCustomLanguageInput(!showCustomLanguageInput)}
                  className="text-[10px] font-bold text-[#ff6321] hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> {showCustomLanguageInput ? 'Select Standard' : '+ Add New Language'}
                </button>
              </div>

              {showCustomLanguageInput ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLanguageText}
                    onChange={(e) => setNewLanguageText(e.target.value)}
                    placeholder="Enter new language..."
                    className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 font-semibold focus:border-[#ff6321] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveCustomLanguage}
                    className="px-3 py-2 bg-[#ff6321] text-white rounded-lg text-xs font-bold hover:bg-[#e55315] transition-colors"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <select
                  value={COMMON_LANGUAGES.includes(currentLanguage) ? currentLanguage : currentLanguage}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__add_custom_lang__') {
                      setShowCustomLanguageInput(true);
                    } else {
                      onUpdateBook({ language: val });
                    }
                  }}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 font-semibold focus:border-[#ff6321] focus:outline-none"
                >
                  {COMMON_LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                  {!COMMON_LANGUAGES.includes(currentLanguage) && (
                    <option value={currentLanguage}>
                      {currentLanguage} (Custom)
                    </option>
                  )}
                  <option value="__add_custom_lang__">+ Add Custom Language...</option>
                </select>
              )}
            </div>

            {/* Keywords & Search Tags */}
            <div className="md:col-span-2 space-y-2">
              <label className="block text-xs font-bold text-gray-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#ff6321]" /> Keywords & Search Tags
                </span>
                <span className="text-[10px] text-gray-500 font-normal">
                  Type a tag and press Enter or comma
                </span>
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyDownTag}
                  placeholder="e.g. SQLite, PWA, React, Accounting, Finance"
                  className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 font-medium focus:border-[#ff6321] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-[#ff6321] hover:bg-[#e55315] text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Tag
                </button>
              </div>

              {/* Tag Pills Display */}
              <div className="flex flex-wrap gap-2 pt-2 min-h-[40px] p-3 rounded-lg bg-gray-50 border border-gray-200">
                {currentTags.length === 0 ? (
                  <span className="text-xs text-gray-400 italic">No search tags added yet.</span>
                ) : (
                  currentTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium font-mono bg-orange-100 text-orange-800 border border-orange-300/60"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="p-0.5 hover:bg-orange-200 rounded-full transition-colors text-orange-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 border-t border-gray-200 p-4 flex items-center justify-between">
          <div className="text-xs text-gray-500 font-medium">
            Changes auto-save directly to your offline SQLite database.
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#1e2023] hover:bg-black text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Check className="w-4 h-4 text-[#ff6321]" /> Save & Close
          </button>
        </div>

      </div>
    </div>
  );
};

