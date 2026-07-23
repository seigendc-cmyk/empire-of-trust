import React, { useState, useRef } from 'react';
import { 
  X, User, Users, Plus, Trash2, Globe, Mail, Twitter, Linkedin, Github, 
  Sparkles, Check, Edit2, Shield, Heart, Award, Upload, Image as ImageIcon
} from 'lucide-react';
import { Book, AuthorDetails, Contributor, ContributorRole } from '../../types';

interface AuthorContributorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book;
  onUpdateBook: (updatedFields: Partial<Book>) => void;
}

const CONTRIBUTOR_ROLES: { value: ContributorRole; label: string }[] = [
  { value: 'Co-Author', label: 'Co-Author' },
  { value: 'Editor', label: 'Editor' },
  { value: 'Technical Reviewer', label: 'Technical Reviewer' },
  { value: 'Illustrator', label: 'Illustrator' },
  { value: 'Translator', label: 'Translator' },
  { value: 'Foreword By', label: 'Foreword By' },
  { value: 'Researcher', label: 'Researcher' },
  { value: 'Designer', label: 'Cover / Layout Designer' },
  { value: 'Proofreader', label: 'Proofreader' },
  { value: 'Custom', label: 'Custom Role' },
];

const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
];

export const AuthorContributorsModal: React.FC<AuthorContributorsModalProps> = ({
  isOpen,
  onClose,
  book,
  onUpdateBook,
}) => {
  const [activeTab, setActiveTab] = useState<'author' | 'contributors'>('author');
  const authorFileRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const authorDetails: AuthorDetails = book.authorDetails || {};
  const contributors: Contributor[] = book.contributors || [];

  const updateAuthorField = <K extends keyof AuthorDetails>(field: K, value: AuthorDetails[K]) => {
    onUpdateBook({
      authorDetails: {
        ...authorDetails,
        [field]: value,
      },
    });
  };

  const handleAuthorFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        updateAuthorField('avatarUrl', result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleContributorFileUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        handleUpdateContributor(id, { avatarUrl: result });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddContributor = () => {
    const newContrib: Contributor = {
      id: 'contrib_' + Math.random().toString(36).substring(2, 9),
      name: '',
      role: 'Co-Author',
      bio: '',
      avatarUrl: '',
      email: '',
      website: '',
    };

    onUpdateBook({
      contributors: [...contributors, newContrib],
    });
    setActiveTab('contributors');
  };

  const handleUpdateContributor = (id: string, updatedFields: Partial<Contributor>) => {
    const updated = contributors.map((c) => (c.id === id ? { ...c, ...updatedFields } : c));
    onUpdateBook({ contributors: updated });
  };

  const handleDeleteContributor = (id: string) => {
    const updated = contributors.filter((c) => c.id !== id);
    onUpdateBook({ contributors: updated });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-[#e0e0e0] rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="bg-[#1e2023] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#ff6321] rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base">About the Author & Contributors</h2>
              <p className="text-xs text-gray-300">Manage Author Bio, Avatars, Local Uploads, Co-Authors & Editorial Staff</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="bg-gray-100 border-b border-gray-200 px-6 pt-3 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('author')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-bold text-xs transition-all border-t border-x ${
              activeTab === 'author'
                ? 'bg-white border-gray-200 text-[#ff6321] shadow-xs'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <User className="w-4 h-4" /> About the Primary Author
          </button>

          <button
            onClick={() => setActiveTab('contributors')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-bold text-xs transition-all border-t border-x ${
              activeTab === 'contributors'
                ? 'bg-white border-gray-200 text-[#ff6321] shadow-xs'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4" /> Contributors & Staff ({contributors.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">

          {/* TAB 1: ABOUT THE AUTHOR */}
          {activeTab === 'author' && (
            <div className="space-y-6">
              
              {/* Primary Author Name Sync Banner */}
              <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 border-2 border-[#ff6321] shrink-0 flex items-center justify-center font-bold text-gray-700 text-lg">
                    {authorDetails.avatarUrl ? (
                      <img src={authorDetails.avatarUrl} alt={book.author} className="w-full h-full object-cover" />
                    ) : (
                      book.author.charAt(0) || 'A'
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase font-bold text-[#ff6321]">
                      Book Author Name
                    </label>
                    <input
                      type="text"
                      value={book.author}
                      onChange={(e) => onUpdateBook({ author: e.target.value })}
                      placeholder="Author Full Name"
                      className="w-full bg-white border border-gray-300 rounded-md px-2.5 py-1 text-sm font-bold text-gray-900 focus:border-[#ff6321] focus:outline-none mt-0.5"
                    />
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono text-gray-500 uppercase block font-bold">Contact Email</span>
                  <input
                    type="email"
                    value={book.authorEmail || ''}
                    onChange={(e) => onUpdateBook({ authorEmail: e.target.value })}
                    placeholder="author@domain.com"
                    className="bg-white border border-gray-300 rounded-md px-2 py-1 text-xs text-gray-800 font-mono focus:border-[#ff6321] focus:outline-none"
                  />
                </div>
              </div>

              {/* Author Photo / Upload from Device */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <label className="block text-xs font-bold text-gray-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#ff6321]" /> Author Portrait / Photo
                  </span>
                  <span className="text-[10px] text-gray-500 font-normal">Supports PNG, JPG, WebP from Local Device</span>
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {/* Avatar Preview */}
                  <div className="w-16 h-16 rounded-xl border border-gray-300 overflow-hidden bg-gray-200 shrink-0 flex items-center justify-center">
                    {authorDetails.avatarUrl ? (
                      <img src={authorDetails.avatarUrl} alt="Author" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-gray-400" />
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={authorDetails.avatarUrl || ''}
                        onChange={(e) => updateAuthorField('avatarUrl', e.target.value)}
                        placeholder="Image URL or upload from device..."
                        className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-900 font-mono focus:border-[#ff6321] focus:outline-none"
                      />
                      <input
                        type="file"
                        ref={authorFileRef}
                        onChange={handleAuthorFileUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => authorFileRef.current?.click()}
                        className="px-3 py-1.5 bg-[#1e2023] hover:bg-black text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#ff6321]" /> Upload Image
                      </button>
                    </div>

                    {/* Quick Avatar Samples */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] text-gray-500 font-medium">Sample photos:</span>
                      {DEFAULT_AVATARS.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => updateAuthorField('avatarUrl', url)}
                          className="w-6 h-6 rounded-full overflow-hidden border border-gray-300 hover:border-[#ff6321] hover:scale-110 transition-all"
                        >
                          <img src={url} alt="sample avatar" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Author Biography */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                  <span>Author Biography & Profile</span>
                  <span className="text-[10px] text-gray-400 font-normal">Appears in PWA Reader Front Matter and PDF Export</span>
                </label>
                <textarea
                  rows={4}
                  value={authorDetails.bio || ''}
                  onChange={(e) => updateAuthorField('bio', e.target.value)}
                  placeholder="Write a brief biography introducing the author's background, expertise, published works, and achievements..."
                  className="w-full bg-white border border-gray-300 rounded-lg p-3 text-xs text-gray-900 font-medium leading-relaxed focus:border-[#ff6321] focus:outline-none"
                />
              </div>

              {/* Web & Social Links */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <h4 className="font-bold text-xs text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#ff6321]" /> Author Website & Social Handles
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] text-gray-600 font-bold mb-1 flex items-center gap-1">
                      <Globe className="w-3 h-3 text-gray-400" /> Website / Portfolio
                    </label>
                    <input
                      type="url"
                      value={authorDetails.website || ''}
                      onChange={(e) => updateAuthorField('website', e.target.value)}
                      placeholder="https://authorwebsite.com"
                      className="w-full bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-xs text-gray-900 focus:border-[#ff6321] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-600 font-bold mb-1 flex items-center gap-1">
                      <Twitter className="w-3 h-3 text-blue-400" /> Twitter / X Handle
                    </label>
                    <input
                      type="text"
                      value={authorDetails.socialTwitter || ''}
                      onChange={(e) => updateAuthorField('socialTwitter', e.target.value)}
                      placeholder="@authorhandle"
                      className="w-full bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-xs text-gray-900 focus:border-[#ff6321] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-600 font-bold mb-1 flex items-center gap-1">
                      <Linkedin className="w-3 h-3 text-blue-600" /> LinkedIn Profile
                    </label>
                    <input
                      type="url"
                      value={authorDetails.socialLinkedin || ''}
                      onChange={(e) => updateAuthorField('socialLinkedin', e.target.value)}
                      placeholder="https://linkedin.com/in/author"
                      className="w-full bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-xs text-gray-900 focus:border-[#ff6321] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-600 font-bold mb-1 flex items-center gap-1">
                      <Github className="w-3 h-3 text-gray-700" /> GitHub Profile
                    </label>
                    <input
                      type="url"
                      value={authorDetails.socialGithub || ''}
                      onChange={(e) => updateAuthorField('socialGithub', e.target.value)}
                      placeholder="https://github.com/author"
                      className="w-full bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-xs text-gray-900 focus:border-[#ff6321] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Activated CTA to Add Contributors */}
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-[#ff6321] shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gray-900">Co-Authors, Technical Reviewers or Editors?</p>
                    <p className="text-[11px] text-gray-600">Credit your editorial team and contributors with custom roles and avatars.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddContributor}
                  className="px-4 py-2 bg-[#ff6321] hover:bg-[#e55315] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Add Contributor Now
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: CONTRIBUTORS */}
          {activeTab === 'contributors' && (
            <div className="space-y-6">
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-gray-900">Co-Authors, Editors & Staff</h3>
                  <p className="text-xs text-gray-500">Acknowledge co-authors, editors, illustrators, translators, and technical reviewers.</p>
                </div>

                <button
                  type="button"
                  onClick={handleAddContributor}
                  className="px-3.5 py-2 bg-[#ff6321] hover:bg-[#e55315] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Plus className="w-4 h-4" /> Add Contributor
                </button>
              </div>

              {contributors.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-xl space-y-3">
                  <Users className="w-10 h-10 text-gray-400 mx-auto" />
                  <p className="text-xs font-bold text-gray-700">No contributors added yet.</p>
                  <p className="text-[11px] text-gray-500 max-w-md mx-auto">
                    Include co-authors, editors, illustrators, translators, cover designers, or technical reviewers with local image uploads and role badges.
                  </p>
                  
                  {/* Active CTA Button in Empty State */}
                  <button
                    type="button"
                    onClick={handleAddContributor}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#ff6321] hover:bg-[#e55315] text-white font-bold text-xs rounded-xl transition-colors shadow-md mt-2"
                  >
                    <Plus className="w-4 h-4" /> Add First Contributor
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {contributors.map((contrib) => (
                    <div key={contrib.id} className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3 relative group">
                      
                      {/* Delete Contributor Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteContributor(contrib.id)}
                        className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-600 rounded hover:bg-gray-200 transition-colors"
                        title="Remove Contributor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* Contributor Header & Local Image Upload */}
                      <div className="flex flex-col sm:flex-row items-center gap-3 border-b border-gray-200 pb-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 border border-gray-300 shrink-0 flex items-center justify-center">
                          {contrib.avatarUrl ? (
                            <img src={contrib.avatarUrl} alt={contrib.name || 'Contributor'} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-6 h-6 text-gray-400" />
                          )}
                        </div>

                        <div className="flex-1 w-full space-y-1">
                          <label className="block text-[10px] font-bold text-gray-600 uppercase">
                            Contributor Photo / Avatar
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              value={contrib.avatarUrl || ''}
                              onChange={(e) => handleUpdateContributor(contrib.id, { avatarUrl: e.target.value })}
                              placeholder="Photo URL or upload local image..."
                              className="flex-1 bg-white border border-gray-300 rounded-md px-2.5 py-1 text-xs text-gray-900 font-mono focus:border-[#ff6321] focus:outline-none"
                            />
                            <label className="px-2.5 py-1 bg-[#1e2023] hover:bg-black text-white rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shrink-0">
                              <Upload className="w-3 h-3 text-[#ff6321]" /> Upload Local Image
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleContributorFileUpload(contrib.id, e)}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        
                        {/* Name */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 mb-1">Contributor Name</label>
                          <input
                            type="text"
                            value={contrib.name}
                            onChange={(e) => handleUpdateContributor(contrib.id, { name: e.target.value })}
                            placeholder="e.g. Dr. Jane Smith"
                            className="w-full bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-xs font-bold text-gray-900 focus:border-[#ff6321] focus:outline-none"
                          />
                        </div>

                        {/* Role */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 mb-1">Role / Capacity</label>
                          <select
                            value={contrib.role}
                            onChange={(e) => handleUpdateContributor(contrib.id, { role: e.target.value as ContributorRole })}
                            className="w-full bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-xs font-semibold text-gray-900 focus:border-[#ff6321] focus:outline-none"
                          >
                            {CONTRIBUTOR_ROLES.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Email / Website */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 mb-1">Email / Website</label>
                          <input
                            type="text"
                            value={contrib.website || contrib.email || ''}
                            onChange={(e) => handleUpdateContributor(contrib.id, { website: e.target.value })}
                            placeholder="https://contrib-site.com"
                            className="w-full bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-xs text-gray-800 focus:border-[#ff6321] focus:outline-none"
                          />
                        </div>

                      </div>

                      {/* Bio Note */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">Bio / Role Notes</label>
                        <input
                          type="text"
                          value={contrib.bio || ''}
                          onChange={(e) => handleUpdateContributor(contrib.id, { bio: e.target.value })}
                          placeholder="e.g. Lead Technical Editor specializing in distributed systems and SQLite WASM compilation."
                          className="w-full bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-xs text-gray-800 focus:border-[#ff6321] focus:outline-none"
                        />
                      </div>

                    </div>
                  ))}

                  {/* Additional CTA button under list */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddContributor}
                      className="px-4 py-2 bg-[#ff6321] hover:bg-[#e55315] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Plus className="w-4 h-4" /> Add Another Contributor
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 border-t border-gray-200 p-4 flex items-center justify-between">
          <div className="text-xs text-gray-500 font-medium">
            Saved to local PWA SQLite storage.
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

