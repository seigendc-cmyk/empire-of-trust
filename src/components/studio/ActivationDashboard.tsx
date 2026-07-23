import React, { useState, useEffect, useMemo } from 'react';
import { Book, ActivationRequest } from '../../types';
import { formatPublisherReplyMessage } from '../../lib/accessCodes';
import {
  Key,
  MessageSquare,
  Sparkles,
  Check,
  Copy,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ExternalLink,
  Phone,
  Trash2,
  RefreshCw,
  BookOpen,
  X,
  AlertCircle,
  ChevronDown
} from 'lucide-react';

interface ActivationDashboardProps {
  books: Book[];
  onUpdateBook: (updatedBook: Book) => void;
  onClose?: () => void;
}

const LOCAL_STORAGE_ACTIVATIONS_KEY = 'empire_of_trust_activation_requests_v1';

export const ActivationDashboard: React.FC<ActivationDashboardProps> = ({
  books,
  onUpdateBook,
  onClose,
}) => {
  const [requests, setRequests] = useState<ActivationRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'activated'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Active books filter (only non-archived books)
  const activeBooks = useMemo(() => books.filter((b) => !b.isArchived), [books]);
  
  // New manual request state
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [newReaderPhone, setNewReaderPhone] = useState('+263774479121');
  const [newSelectedBookId, setNewSelectedBookId] = useState<string>('');
  const [newNotes, setNewNotes] = useState('Requested via WhatsApp (+263774479121)');
  
  // Book search combo state
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [isBookDropdownOpen, setIsBookDropdownOpen] = useState(false);

  // Set default selected active book
  useEffect(() => {
    if (activeBooks.length > 0 && (!newSelectedBookId || !activeBooks.some(b => b.id === newSelectedBookId))) {
      setNewSelectedBookId(activeBooks[0].id);
    }
  }, [activeBooks, newSelectedBookId]);

  // Notification state
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Load or initialize sample activation requests
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_ACTIVATIONS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRequests(parsed);
          return;
        }
      }
    } catch (e) {
      console.error('Failed to load activation requests:', e);
    }

    // Default seed requests if none in storage
    const initialSeed: ActivationRequest[] = [
      {
        id: 'act_seed_1',
        bookId: books[0]?.id || 'book_seed_1',
        bookTitle: books[0]?.title || 'The Offline Reader PWA Blueprint',
        readerPhone: '+263774479121',
        whatsappNumber: '+263774479121',
        status: 'pending',
        requestedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        notes: 'Attached WhatsApp Proof of Payment (POP receipt)',
      },
      {
        id: 'act_seed_2',
        bookId: books[0]?.id || 'book_seed_1',
        bookTitle: books[0]?.title || 'The Offline Reader PWA Blueprint',
        readerPhone: '+263771234567',
        whatsappNumber: '+263774479121',
        status: 'activated',
        generatedCode: 'POP-263-98A2K1',
        requestedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        activatedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
        notes: 'Verified payment receipt on WhatsApp',
      },
    ];
    setRequests(initialSeed);
    try {
      localStorage.setItem(LOCAL_STORAGE_ACTIVATIONS_KEY, JSON.stringify(initialSeed));
    } catch (e) {}
  }, [books]);

  // Save requests to localStorage whenever updated
  const saveRequestsToStorage = (updatedRequests: ActivationRequest[]) => {
    setRequests(updatedRequests);
    try {
      localStorage.setItem(LOCAL_STORAGE_ACTIVATIONS_KEY, JSON.stringify(updatedRequests));
    } catch (e) {
      console.error('Error saving activation requests:', e);
    }
  };

  const showToast = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Helper to generate a unique activation code
  const generateUniqueKey = (bookId: string): string => {
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `POP-263-${randomHex}`;
  };

  // Action: Generate activation key & update request + book
  const handleGenerateActivationKey = (request: ActivationRequest) => {
    const book = books.find((b) => b.id === request.bookId) || books[0];
    if (!book) return;

    const uniqueCode = generateUniqueKey(book.id);

    // Register code in book's access codes list if not already present
    const existingCodes = book.accessCodes || [];
    if (!existingCodes.includes(uniqueCode)) {
      const updatedBook: Book = {
        ...book,
        accessCodes: [...existingCodes, uniqueCode],
        whatsappNumber: book.whatsappNumber || '+263774479121',
      };
      onUpdateBook(updatedBook);
    }

    // Update request state
    const updatedRequests = requests.map((req) => {
      if (req.id === request.id) {
        return {
          ...req,
          status: 'activated' as const,
          generatedCode: uniqueCode,
          activatedAt: new Date().toISOString(),
        };
      }
      return req;
    });

    saveRequestsToStorage(updatedRequests);

    // Prepare WhatsApp reply message
    const replyText = formatPublisherReplyMessage(book.title, uniqueCode, request.readerPhone);

    // Copy reply to clipboard
    try {
      navigator.clipboard.writeText(replyText);
      showToast(`Key ${uniqueCode} generated! WhatsApp reply copied to clipboard.`);
    } catch (err) {
      showToast(`Key ${uniqueCode} generated! Registered to book.`);
    }
  };

  // Action: Copy WhatsApp reply for an already activated key
  const handleCopyWhatsAppReply = (request: ActivationRequest) => {
    if (!request.generatedCode) return;
    const replyText = formatPublisherReplyMessage(request.bookTitle, request.generatedCode, request.readerPhone);
    try {
      navigator.clipboard.writeText(replyText);
      showToast(`WhatsApp reply message for ${request.generatedCode} copied to clipboard!`);
    } catch (e) {
      showToast('Failed to copy. Please copy manually.');
    }
  };

  // Action: Create manual activation request
  const handleCreateManualRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const targetBook = activeBooks.find((b) => b.id === newSelectedBookId) || activeBooks[0];
    if (!targetBook) {
      alert('Please select an active book.');
      return;
    }

    const newReq: ActivationRequest = {
      id: 'act_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      bookId: targetBook.id,
      bookTitle: targetBook.title,
      readerPhone: newReaderPhone || '+263774479121',
      whatsappNumber: targetBook.whatsappNumber || '+263774479121',
      status: 'pending',
      requestedAt: new Date().toISOString(),
      notes: newNotes,
    };

    const updated = [newReq, ...requests];
    saveRequestsToStorage(updated);
    setIsNewRequestModalOpen(false);
    showToast(`New request added for ${newReq.readerPhone}`);
  };

  // Action: Delete request
  const handleDeleteRequest = (id: string) => {
    const updated = requests.filter((r) => r.id !== id);
    saveRequestsToStorage(updated);
    showToast('Activation request removed.');
  };

  // Filter searched active books for WhatsApp logging combo box (matches terms in ANY order)
  const searchedActiveBooks = useMemo(() => {
    if (!bookSearchQuery.trim()) return activeBooks;
    const terms = bookSearchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return activeBooks.filter((b) => {
      const fullText = `${b.title} ${b.author || ''} ${b.genre || ''} ${b.subGenre || ''} ${b.category || ''} ${b.id} ${b.currency || 'USD'} $${b.price || 0}`.toLowerCase();
      return terms.every((term) => fullText.includes(term));
    });
  }, [activeBooks, bookSearchQuery]);

  // Selected active book object
  const currentSelectedActiveBook = useMemo(() => {
    return activeBooks.find((b) => b.id === newSelectedBookId) || activeBooks[0];
  }, [activeBooks, newSelectedBookId]);

  // Filter requests (matches search terms in ANY order)
  const filteredRequests = requests.filter((req) => {
    const matchesStatus =
      filterStatus === 'all'
        ? true
        : filterStatus === 'pending'
        ? req.status === 'pending'
        : req.status === 'activated';

    const qTerms = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const matchesSearch =
      qTerms.length === 0 ||
      qTerms.every((term) => {
        const reqText = `${req.readerPhone} ${req.bookTitle} ${req.generatedCode || ''} ${req.notes || ''}`.toLowerCase();
        return reqText.includes(term);
      });

    return matchesStatus && matchesSearch;
  });

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const activatedCount = requests.filter((r) => r.status === 'activated').length;

  return (
    <div className="bg-white border border-[#e0e0e0] rounded-xl shadow-sm p-4 sm:p-6 space-y-6">
      
      {/* Toast Notice */}
      {actionNotice && (
        <div className="fixed top-20 right-4 z-[90] bg-[#2c2c2c] text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl border border-emerald-500/50 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Header & WhatsApp Number Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#f0f0f0]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#128C7E]/10 border border-[#128C7E]/20 text-[#128C7E]">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#2c2c2c] flex items-center gap-2">
                WhatsApp Activation Dashboard
              </h2>
              <p className="text-xs text-[#666]">
                Issue book download activation codes for readers requesting access on WhatsApp (<strong className="text-[#128C7E] font-mono">+263774479121</strong>).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNewRequestModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-[#128C7E] hover:bg-[#0e6f64] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Log Incoming Request
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs cursor-pointer"
              title="Close Dashboard"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">Pending Requests</span>
            <p className="text-xl font-extrabold text-amber-900 mt-0.5">{pendingCount}</p>
          </div>
          <Clock className="w-7 h-7 text-amber-600 opacity-80" />
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">Activated Keys</span>
            <p className="text-xl font-extrabold text-emerald-900 mt-0.5">{activatedCount}</p>
          </div>
          <CheckCircle2 className="w-7 h-7 text-emerald-600 opacity-80" />
        </div>

        <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-orange-800 tracking-wider">Studio WhatsApp</span>
            <p className="text-sm font-bold font-mono text-[#ff6321] mt-1">+263774479121</p>
          </div>
          <Phone className="w-6 h-6 text-[#ff6321] opacity-80" />
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200 w-full sm:w-auto">
          <button
            onClick={() => setFilterStatus('all')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-white text-[#2c2c2c] shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            All ({requests.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
              filterStatus === 'pending'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-amber-700 hover:text-amber-900'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus('activated')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
              filterStatus === 'activated'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 hover:text-emerald-900'
            }`}
          >
            Activated ({activatedCount})
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search phone, book title, key..."
            className="w-full bg-white border border-[#e0e0e0] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#2c2c2c] focus:border-[#128C7E] focus:outline-none"
          />
        </div>

      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {filteredRequests.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 space-y-2">
            <MessageSquare className="w-8 h-8 text-gray-400 mx-auto" />
            <p className="text-sm font-bold text-gray-600">No activation requests found</p>
            <p className="text-xs text-gray-400">
              When readers send payment proof to WhatsApp (+263774479121), log them here to generate activation keys.
            </p>
          </div>
        ) : (
          filteredRequests.map((req) => (
            <div
              key={req.id}
              className={`p-4 rounded-xl border transition-all ${
                req.status === 'pending'
                  ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                  : 'bg-white border-gray-200 hover:border-emerald-200'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                
                {/* Request Info */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-sm text-[#2c2c2c]">{req.bookTitle}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        req.status === 'pending'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {req.status === 'pending' ? 'Pending Approval' : 'Activated'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 font-mono">
                    <div className="flex items-center gap-1 text-[#128C7E] font-bold">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{req.readerPhone}</span>
                    </div>
                    <div>Requested: {new Date(req.requestedAt).toLocaleDateString()}</div>
                    {req.activatedAt && <div>Activated: {new Date(req.activatedAt).toLocaleDateString()}</div>}
                  </div>

                  {req.notes && (
                    <p className="text-[11px] text-gray-500 italic">"{req.notes}"</p>
                  )}
                </div>

                {/* Activation Key & Controls */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
                  
                  {req.status === 'pending' ? (
                    <button
                      onClick={() => handleGenerateActivationKey(req)}
                      className="px-4 py-2 rounded-lg bg-[#128C7E] hover:bg-[#0e6f64] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate Key & Copy WhatsApp Reply</span>
                    </button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-mono font-extrabold text-emerald-800 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{req.generatedCode}</span>
                      </div>

                      {/* Copy Raw Code Button */}
                      <button
                        onClick={() => {
                          if (!req.generatedCode) return;
                          navigator.clipboard.writeText(req.generatedCode);
                          showToast(`Activation Code ${req.generatedCode} copied!`);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                        title="Copy activation code string only"
                      >
                        <Copy className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Copy Code</span>
                      </button>

                      {/* Copy Full Message Button */}
                      <button
                        onClick={() => handleCopyWhatsAppReply(req)}
                        className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                        title="Copy full WhatsApp reply message"
                      >
                        <Copy className="w-3.5 h-3.5 text-gray-600" />
                        <span>Copy Reply</span>
                      </button>

                      {/* Send Direct to Reader on WhatsApp */}
                      <a
                        href={`https://wa.me/${req.readerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                          formatPublisherReplyMessage(req.bookTitle, req.generatedCode || '', req.readerPhone)
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#1ebd59] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                        title={`Send WhatsApp activation message directly to ${req.readerPhone}`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Send to {req.readerPhone}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  <button
                    onClick={() => handleDeleteRequest(req.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                    title="Delete Request"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                </div>

              </div>
            </div>
          ))
        )}
      </div>

      {/* Manual Request Modal */}
      {isNewRequestModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-extrabold text-base text-[#2c2c2c] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#128C7E]" /> Log Incoming WhatsApp Request
              </h3>
              <button
                onClick={() => setIsNewRequestModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualRequest} className="space-y-4 text-xs">
              <div className="space-y-1 relative">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-[#666]">Select Book</label>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    Active Books Only ({activeBooks.length})
                  </span>
                </div>

                {/* Selected Active Book Display Trigger */}
                <div
                  onClick={() => setIsBookDropdownOpen(!isBookDropdownOpen)}
                  className="w-full bg-white border border-gray-300 hover:border-[#128C7E] rounded-xl p-2.5 flex items-center justify-between cursor-pointer transition-colors shadow-2xs"
                >
                  {currentSelectedActiveBook ? (
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-7 h-9 rounded bg-gradient-to-br from-orange-500 to-amber-700 flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold shadow-xs">
                        <BookOpen className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="font-bold text-xs text-[#2c2c2c] truncate">
                          {currentSelectedActiveBook.title}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono truncate">
                          {currentSelectedActiveBook.author || 'Publisher Studio'} • {currentSelectedActiveBook.currency || 'USD'} ${currentSelectedActiveBook.price || 0}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400 font-medium text-xs">No active books available</span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isBookDropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                {/* Searchable Combo Box Dropdown */}
                {isBookDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-2 space-y-2 animate-in fade-in zoom-in-95">
                    {/* Search Engine Input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={bookSearchQuery}
                        onChange={(e) => setBookSearchQuery(e.target.value)}
                        placeholder="Search books in any order (e.g. 'trust empire')..."
                        autoFocus
                        className="w-full pl-8 pr-7 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-[#2c2c2c] focus:outline-none focus:border-[#128C7E] focus:bg-white"
                      />
                      {bookSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setBookSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="text-[10px] font-bold text-gray-400 px-1 flex items-center justify-between">
                      <span>MATCHING ACTIVE BOOKS</span>
                      <span>{searchedActiveBooks.length} found</span>
                    </div>

                    {/* Book List */}
                    <div className="max-h-52 overflow-y-auto space-y-1 pr-0.5">
                      {searchedActiveBooks.length === 0 ? (
                        <div className="p-4 text-center text-xs text-gray-500 font-medium">
                          No active books match all query terms in any order.
                        </div>
                      ) : (
                        searchedActiveBooks.map((b) => {
                          const isSelected = b.id === newSelectedBookId;
                          return (
                            <div
                              key={b.id}
                              onClick={() => {
                                setNewSelectedBookId(b.id);
                                setIsBookDropdownOpen(false);
                              }}
                              className={`p-2 rounded-lg cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                                isSelected
                                  ? 'bg-[#128C7E]/10 border border-[#128C7E]/30 text-[#128C7E]'
                                  : 'hover:bg-gray-50 text-[#2c2c2c]'
                              }`}
                            >
                              <div className="min-w-0 text-left">
                                <div className="font-bold text-xs truncate">{b.title}</div>
                                <div className="text-[10px] opacity-75 font-mono truncate">
                                  {b.author ? `By ${b.author} • ` : ''}{b.category || 'Non-Fiction'} • {b.currency || 'USD'} ${b.price || 0}
                                </div>
                              </div>
                              {isSelected && (
                                <Check className="w-4 h-4 text-[#128C7E] flex-shrink-0" />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-[#666] mb-1">Reader Phone Number</label>
                <input
                  type="tel"
                  value={newReaderPhone}
                  onChange={(e) => setNewReaderPhone(e.target.value)}
                  placeholder="e.g. +263774479121"
                  required
                  className="w-full bg-white border border-gray-300 rounded-lg p-2.5 font-mono font-bold text-[#2c2c2c] focus:border-[#128C7E] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#666] mb-1">Notes / POP Status</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Received proof of payment on WhatsApp"
                  className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-[#2c2c2c] focus:border-[#128C7E] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewRequestModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#128C7E] hover:bg-[#0e6f64] text-white font-bold shadow-sm cursor-pointer"
                >
                  Add Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
