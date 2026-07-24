import React, { useState, useEffect } from 'react';
import { 
  Globe, Search, BookOpen, Download, Smartphone, CheckCircle2, ShieldCheck, 
  Sparkles, DollarSign, Lock, Eye, Tag, Phone, AlertCircle, MessageSquare,
  Copy, ExternalLink, Check, Key, Archive, Filter, Store
} from 'lucide-react';
import { Book, ReaderProfile, BookDataPack, DEFAULT_BOOK_CATEGORIES, VendorProfile } from '../../types';
import { fetchPublishedBooksFromFirestore } from '../../lib/firebase';
import { getOrCreateDeviceId, savePhoneNumber, getSavedPhoneNumber } from '../../lib/dataPack';
import { formatWhatsAppPopUrl, verifyAccessCode } from '../../lib/accessCodes';
import { VendorTimedSlidesCard } from './VendorTimedSlidesCard';
import { VendorStorefrontModal } from './VendorStorefrontModal';
import { getVendorProfile, getVendorProducts } from '../../lib/vendorStorage';
import { PublicSeriesCatalogue } from './PublicSeriesCatalogue';

interface PublicPortalProps {
  initialBookId?: string;
  user: ReaderProfile | null;
  onOpenAuth: () => void;
  onOpenReaderWithBook: (book: Book, dataPackJson?: string) => void;
}

export const PublicPortal: React.FC<PublicPortalProps> = ({
  initialBookId,
  user,
  onOpenAuth,
  onOpenReaderWithBook,
}) => {
  const [publishedBooks, setPublishedBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'date_newest' | 'title_asc' | 'title_desc' | 'price_asc' | 'price_desc' | 'vendor'>('date_newest');
  const [portalView, setPortalView] = useState<'active' | 'archived'>('active');

  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isPackModalOpen, setIsPackModalOpen] = useState(false);
  const [previewModalBook, setPreviewModalBook] = useState<Book | null>(null);

  // Phone & Device binding state
  const [readerPhone, setReaderPhone] = useState(getSavedPhoneNumber() || user?.phoneNumber || '');
  const [deviceId, setDeviceId] = useState(getOrCreateDeviceId());
  const [isGeneratingPack, setIsGeneratingPack] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<BookDataPack | null>(null);

  // Access Code & Proof of Payment (POP) state
  const [enteredAccessCode, setEnteredAccessCode] = useState('');
  const [codeValidationStatus, setCodeValidationStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedWhatsappMsg, setCopiedWhatsappMsg] = useState(false);

  // Vendor Storefront Modal State
  const [isVendorStorefrontOpen, setIsVendorStorefrontOpen] = useState(false);
  const [storefrontVendorProfile, setStorefrontVendorProfile] = useState<VendorProfile>(getVendorProfile());
  const [initialSelectedProdId, setInitialSelectedProdId] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadPortalBooks();
  }, []);

  const loadPortalBooks = async () => {
    try {
      const cloudBooks = await fetchPublishedBooksFromFirestore();
      setPublishedBooks(cloudBooks);
      if (initialBookId) {
        setPreviewModalBook(cloudBooks.find((book) => book.id === initialBookId) || null);
      }
    } catch (err) {
      console.warn('Portal books load error:', err);
    }
  };

  const filteredBooks = publishedBooks
    .filter((b) => {
      // Portal Archive View Filter
      if (portalView === 'archived' && !b.isArchived) return false;
      if (portalView === 'active' && b.isArchived) return false;

      // Category Filter
      if (selectedCategory !== 'ALL' && (b.category || 'Accounting & Finance') !== selectedCategory) {
        return false;
      }

      // Search Query across Books, Products, and Vendors
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = b.title.toLowerCase().includes(q);
        const matchSubtitle = (b.subtitle || '').toLowerCase().includes(q);
        const matchAuthor = b.author.toLowerCase().includes(q);
        const matchDesc = b.description.toLowerCase().includes(q);
        const matchCat = (b.category || '').toLowerCase().includes(q);
        const matchGenre = (b.genre || '').toLowerCase().includes(q);
        const matchPublisher = (b.coverBack?.publisherName || '').toLowerCase().includes(q) || (b.publisherId || '').toLowerCase().includes(q);
        const matchTags = (b.tags || []).some((t) => t.toLowerCase().includes(q));
        const matchPrice = b.price.toString().includes(q);

        return (
          matchTitle ||
          matchSubtitle ||
          matchAuthor ||
          matchDesc ||
          matchCat ||
          matchGenre ||
          matchPublisher ||
          matchTags ||
          matchPrice
        );
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'title_asc') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'title_desc') {
        return b.title.localeCompare(a.title);
      }
      if (sortBy === 'price_asc') {
        return (a.price || 0) - (b.price || 0);
      }
      if (sortBy === 'price_desc') {
        return (b.price || 0) - (a.price || 0);
      }
      if (sortBy === 'vendor') {
        const vendorA = a.coverBack?.publisherName || a.author || '';
        const vendorB = b.coverBack?.publisherName || b.author || '';
        return vendorA.localeCompare(vendorB);
      }
      // Default: date_newest
      const dateA = new Date(a.createdAt || a.publishedAt || 0).getTime();
      const dateB = new Date(b.createdAt || b.publishedAt || 0).getTime();
      return dateB - dateA;
    });

  const handleOpenDownloadPack = (book: Book) => {
    setSelectedBook(book);
    setDownloadSuccess(null);
    setEnteredAccessCode('');
    setCodeValidationStatus(null);
    setCopiedWhatsappMsg(false);
    setIsPackModalOpen(true);
  };

  const handleGenerateAndDownloadPack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) return;
    if (!readerPhone.trim()) {
      alert('Please enter a valid reader phone number for device binding.');
      return;
    }

    // Validate POP Access Code
    const verification = verifyAccessCode(selectedBook, enteredAccessCode);
    if (!verification.isValid) {
      setCodeValidationStatus({
        success: false,
        message: verification.message,
      });
      return;
    }

    setCodeValidationStatus({
      success: true,
      message: verification.message,
    });

    setIsGeneratingPack(true);
    savePhoneNumber(readerPhone);
    alert('Signed v3.0.0 packages must be issued by the publisher signing service. Browser-side package generation is disabled because the private signing key must remain outside the frontend.');
    setIsGeneratingPack(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <PublicSeriesCatalogue readerId={user?.uid} readerPhone={user?.phoneNumber} />
      
      {/* Portal Hero Banner */}
      <div className="relative rounded-xl bg-[#2c2c2c] text-white border border-[#1a1a1a] p-8 shadow-sm overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#ff6321]/20 to-transparent pointer-events-none" />

        <div className="max-w-2xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#ff6321] text-white text-[10px] font-bold uppercase tracking-wider">
            <Globe className="w-3.5 h-3.5" /> Empire Of Trust • Public Book Store
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight font-serif">
            Discover & Download Offline <span className="text-[#ff6321]">Digital Books</span>
          </h1>

          <p className="text-xs text-gray-300 leading-relaxed max-w-xl">
            Browse our curated collection of books. Download digital book packages to read anytime offline on your phone or desktop in My Library.
          </p>

          {/* Search Input & Sort Controls Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vendors, products, books, authors, or publisher..."
                className="w-full bg-[#1a1a1a] border border-[#444] rounded-lg pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-400 focus:border-[#ff6321] focus:outline-none transition-colors"
              />
            </div>

            {/* Sort Order Selector */}
            <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#444] rounded-lg px-3 py-1.5 shrink-0">
              <span className="text-[11px] font-bold text-gray-300 font-mono flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-[#ff6321]" /> Order:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-2"
              >
                <option value="date_newest" className="bg-[#2c2c2c] text-white">📅 Recently Added</option>
                <option value="title_asc" className="bg-[#2c2c2c] text-white">🔤 Title: A to Z</option>
                <option value="title_desc" className="bg-[#2c2c2c] text-white">🔤 Title: Z to A</option>
                <option value="price_asc" className="bg-[#2c2c2c] text-white">💲 Price: Low to High</option>
                <option value="price_desc" className="bg-[#2c2c2c] text-white">💎 Price: High to Low</option>
                <option value="vendor" className="bg-[#2c2c2c] text-white">🏪 Vendor / Publisher</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Vendor Timed Slides Showcase Card */}
      <VendorTimedSlidesCard
        onOpenStorefront={(vProfile, prodId) => {
          setStorefrontVendorProfile(vProfile);
          setInitialSelectedProdId(prodId);
          setIsVendorStorefrontOpen(true);
        }}
      />

      {/* Category Pills & Catalog View Toggle */}
      <div className="bg-white border border-[#e0e0e0] rounded-xl p-5 shadow-xs space-y-4">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#f0f0f0] pb-4">
          
          {/* Active Store vs Published Archive View Switcher */}
          <div className="flex items-center gap-1.5 bg-[#f5f5f5] p-1 rounded-lg border border-[#e5e5e5]">
            <button
              onClick={() => setPortalView('active')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
                portalView === 'active'
                  ? 'bg-white text-[#ff6321] shadow-xs'
                  : 'text-[#666] hover:text-[#2c2c2c]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Active Releases ({publishedBooks.filter((b) => !b.isArchived).length})
            </button>

            <button
              onClick={() => setPortalView('archived')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
                portalView === 'archived'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-[#666] hover:text-[#2c2c2c]'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              Published Archive ({publishedBooks.filter((b) => b.isArchived).length})
            </button>
          </div>

          <div className="text-xs text-[#666] font-medium flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-[#ff6321]" /> Showing {filteredBooks.length} books
          </div>

        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all border ${
              selectedCategory === 'ALL'
                ? 'bg-[#ff6321] text-white border-[#ff6321] shadow-xs'
                : 'bg-[#f9f9f9] text-[#666] border-[#e0e0e0] hover:border-gray-400 hover:text-[#2c2c2c]'
            }`}
          >
            All Categories
          </button>

          {DEFAULT_BOOK_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all border ${
                selectedCategory === cat
                  ? 'bg-[#ff6321] text-white border-[#ff6321] shadow-xs'
                  : 'bg-[#f9f9f9] text-[#666] border-[#e0e0e0] hover:border-gray-400 hover:text-[#2c2c2c]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

      </div>

      {/* Published Books Marketplace Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#2c2c2c] flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#ff6321]" />
            {portalView === 'archived' ? 'Published Books Archive' : 'Published Books Catalog'} ({filteredBooks.length})
          </h2>
        </div>

        {filteredBooks.length === 0 ? (
          <div className="bg-white border border-[#e0e0e0] rounded-xl p-12 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-lg bg-[#f0f0f0] flex items-center justify-center text-[#ff6321] mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-[#2c2c2c] text-sm">No Books Found in this Category or Filter</h3>
            <p className="text-xs text-[#666] max-w-sm mx-auto">
              Try selecting "All Categories" or reset your search query, or publish a new book in the Studio!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBooks.map((book) => {
              const publisherName = book.coverBack?.publisherName || 'Empire Publishing Store';
              return (
                <div
                  key={book.id}
                  className="bg-white border border-slate-200 hover:border-[#ff6321] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                >
                  
                  {/* Book Card Top Visual */}
                  <div className="space-y-3.5">
                    
                    {/* Vendor/Publisher Badge */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1 border border-slate-200 truncate">
                        <Store className="w-3 h-3 text-[#ff6321]" />
                        <span className="truncate">Vendor: {publisherName}</span>
                      </span>

                      <span className="px-2 py-0.5 rounded-full bg-orange-50 text-[#ff6321] font-mono text-[11px] font-extrabold border border-orange-200/80 shrink-0">
                        {book.price === 0 ? 'FREE' : `$${book.price.toFixed(2)}`}
                      </span>
                    </div>

                    <div className="flex items-start gap-4">
                      
                      {/* Front Cover Thumb with lighter, attractive default gradient */}
                      <div
                        className="w-20 h-28 rounded-lg shadow-sm border border-slate-200 shrink-0 p-2 flex flex-col justify-between relative overflow-hidden transition-transform group-hover:scale-105"
                        style={{
                          background:
                            book.coverFront?.bgType === 'image' && book.coverFront?.bgImageUrl
                              ? `url(${book.coverFront.bgImageUrl}) center/cover`
                              : `linear-gradient(to bottom right, ${book.coverFront?.gradientStart || '#ffedd5'}, ${book.coverFront?.gradientEnd || '#fdba74'})`,
                        }}
                      >
                        <div className="relative z-10">
                          <p className={`text-[9px] font-bold font-serif line-clamp-3 leading-tight ${
                            book.coverFront?.bgType === 'image' ? 'text-white drop-shadow-sm' : 'text-slate-900'
                          }`}>
                            {book.title}
                          </p>
                        </div>
                        <p className={`relative z-10 text-[7px] truncate font-mono ${
                          book.coverFront?.bgType === 'image' ? 'text-orange-100' : 'text-orange-950 font-bold'
                        }`}>
                          {book.author}
                        </p>
                      </div>

                      {/* Book Info */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-slate-500 font-mono font-bold bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                            {book.chapters.length} Ch
                          </span>
                          {book.isArchived && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[9px] font-bold border border-amber-200">
                              Archived
                            </span>
                          )}
                        </div>

                        {/* Category Pill Badge */}
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-0.5 rounded-md bg-orange-50/80 text-orange-900 text-[9px] font-bold border border-orange-200/60 truncate flex items-center gap-1">
                            <Tag className="w-2.5 h-2.5 text-[#ff6321]" />
                            {book.category || 'Accounting & Finance'}
                          </span>
                        </div>

                        <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-[#ff6321] transition-colors line-clamp-2 leading-snug">
                          {book.title}
                        </h3>
                        <p className="text-xs text-slate-600 font-medium">By {book.author}</p>
                      </div>

                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {book.description || book.coverBack?.synopsis}
                    </p>
                  </div>

                {/* Card Action Buttons */}
                <div className="pt-4 mt-4 border-t border-[#f0f0f0] flex items-center gap-2">
                  <button
                    onClick={() => setPreviewModalBook(book)}
                    className="flex-1 py-2 rounded-md bg-[#f9f9f9] hover:bg-[#f0f0f0] text-[#2c2c2c] text-xs font-bold border border-[#e0e0e0] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#ff6321]" /> Preview
                  </button>

                  <button
                    onClick={() => handleOpenDownloadPack(book)}
                    className="flex-1 py-2 rounded-md bg-[#ff6321] hover:opacity-90 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-opacity"
                  >
                    <Download className="w-3.5 h-3.5" /> Get Pack
                  </button>
                </div>

              </div>
            );
          })}
          </div>
        )}
      </div>

      {/* Modal 1: Sample Chapter Preview Modal */}
      {previewModalBook && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#e0e0e0] rounded-xl max-w-2xl w-full p-6 space-y-6 max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-[#ff6321]" />
                <div>
                  <h3 className="font-bold text-base text-[#2c2c2c]">{previewModalBook.title}</h3>
                  <p className="text-xs text-[#ff6321] font-semibold">Sample Preview • Chapter 1</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewModalBook(null)}
                className="text-[#666] hover:text-[#2c2c2c] text-xs font-bold px-3 py-1 rounded bg-[#f0f0f0]"
              >
                Close
              </button>
            </div>

            {/* Chapter 1 Preview Content */}
            <div className="bg-[#f9f9f9] border border-[#e0e0e0] rounded-lg p-6 text-[#2c2c2c] text-sm leading-relaxed space-y-4 font-serif">
              {previewModalBook.chapters[0] ? (
                previewModalBook.chapters[0].blocks.map((blk) => (
                  <div key={blk.id}>
                    {blk.type === 'heading' && (
                      <h2 className="text-lg font-bold text-[#ff6321] my-2 font-sans">{blk.content}</h2>
                    )}
                    {blk.type === 'paragraph' && <p>{blk.content}</p>}
                    {blk.type === 'quote' && (
                      <blockquote className="border-l-4 border-[#ff6321] italic pl-3 text-[#2c2c2c] my-2 bg-[#ff6321]/5 py-2 rounded-r">
                        {blk.content}
                      </blockquote>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-[#666] italic font-sans">No chapter preview available.</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  const bookToRead = previewModalBook;
                  setPreviewModalBook(null);
                  handleOpenDownloadPack(bookToRead);
                }}
                className="px-5 py-2.5 rounded-md bg-[#ff6321] hover:opacity-90 text-white font-bold text-xs flex items-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4" /> Claim & Download Bound Data Pack
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Device ID & Phone Binding Download Pack Modal */}
      {isPackModalOpen && selectedBook && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#e0e0e0] rounded-xl max-w-lg w-full p-6 space-y-6 shadow-xl">
            
            <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#ff6321]" />
                <h3 className="font-bold text-base text-[#2c2c2c]">Download Book Package</h3>
              </div>
              <button
                onClick={() => setIsPackModalOpen(false)}
                className="text-[#666] hover:text-[#2c2c2c] text-xs font-bold px-3 py-1 rounded bg-[#f0f0f0]"
              >
                Cancel
              </button>
            </div>

            {downloadSuccess ? (
              <div className="space-y-4 text-center py-4">
                <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-[#2c2c2c]">Digital Book Package Downloaded!</h4>
                  <p className="text-xs text-[#666] mt-1">
                    Registered Reader Phone: <span className="font-mono text-[#ff6321] font-bold">{downloadSuccess.boundPhoneNumber}</span>
                  </p>
                </div>

                <div className="bg-[#f9f9f9] border border-[#e0e0e0] p-4 rounded-lg text-xs text-left space-y-2">
                  <p className="text-[#2c2c2c] font-bold">How to read in My Library:</p>
                  <ol className="list-decimal list-inside text-[#666] space-y-1 text-[11px]">
                    <li>Switch to <strong>My Library</strong> in the top navigation bar.</li>
                    <li>Click <strong>Import Book Package</strong> and select your downloaded file.</li>
                    <li>Your book will be saved to your local offline library and ready to read!</li>
                  </ol>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsPackModalOpen(false);
                      onOpenReaderWithBook(selectedBook, JSON.stringify(downloadSuccess));
                    }}
                    className="flex-1 py-2.5 rounded-md bg-[#ff6321] hover:opacity-90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Smartphone className="w-4 h-4" /> Open Directly in Reader
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerateAndDownloadPack} className="space-y-5 text-xs">
                
                {/* Book Card Summary */}
                <div className="bg-[#f9f9f9] border border-[#e0e0e0] rounded-lg p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-16 rounded shrink-0 shadow p-1 flex items-center justify-center text-[7px] text-white font-bold text-center"
                      style={{
                        background: `linear-gradient(to bottom right, ${selectedBook.coverFront?.gradientStart || '#ea580c'}, ${selectedBook.coverFront?.gradientEnd || '#9a3412'})`,
                      }}
                    >
                      {selectedBook.title}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#2c2c2c]">{selectedBook.title}</h4>
                      <p className="text-[#ff6321] font-medium">By {selectedBook.author}</p>
                      <p className="text-[#666] mt-1 font-mono font-bold">
                        {selectedBook.price === 0 ? 'FREE BOOK' : `${selectedBook.currency || 'USD'} $${selectedBook.price.toFixed(2)}`}
                      </p>
                    </div>
                  </div>
                  {selectedBook.price > 0 && (
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold rounded flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-600" /> POP Required
                    </span>
                  )}
                </div>

                {/* Step 1: Send Activation Request via WhatsApp */}
                <div className="bg-[#128C7E]/5 border border-[#128C7E]/20 rounded-lg p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#128C7E] text-xs flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-[#128C7E]" /> Step 1: Send Activation Request to +263774479121
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">WhatsApp: {selectedBook.whatsappNumber || '+263774479121'}</span>
                  </div>

                  <p className="text-[11px] text-[#444] leading-relaxed">
                    Click below to send a WhatsApp message to <strong className="text-[#128C7E] font-mono">+263774479121</strong> with your pre-filled book request and payment receipt / Proof of Payment (POP). The publisher studio will reply with your Book Download Activation Code.
                  </p>

                  {(() => {
                    const popInfo = formatWhatsAppPopUrl(selectedBook, readerPhone, deviceId);
                    return (
                      <div className="flex items-center gap-2 pt-1">
                        <a
                          href={popInfo.whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 px-3 rounded-md bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Send Request to +263774479121 <ExternalLink className="w-3 h-3" />
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(popInfo.rawMessage);
                            setCopiedWhatsappMsg(true);
                            setTimeout(() => setCopiedWhatsappMsg(false), 2500);
                          }}
                          className="py-2 px-3 rounded-md bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {copiedWhatsappMsg ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copy Message Text
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Step 2: Phone & Access Code Input */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3.5 space-y-3">
                  <span className="font-bold text-[#2c2c2c] text-xs flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-[#ff6321]" /> Step 2: Enter Book Download Activation Code
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#666] mb-1 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-[#ff6321]" /> Reader Phone
                      </label>
                      <input
                        type="tel"
                        value={readerPhone}
                        onChange={(e) => setReaderPhone(e.target.value)}
                        placeholder="e.g. +263774479121"
                        required
                        className="w-full bg-white border border-[#e0e0e0] rounded-md px-3 py-1.5 text-[#2c2c2c] font-mono font-bold focus:border-[#ff6321] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#666] mb-1 flex items-center gap-1">
                        <Key className="w-3 h-3 text-[#ff6321]" /> Access Code
                      </label>
                      <input
                        type="text"
                        value={enteredAccessCode}
                        onChange={(e) => {
                          setEnteredAccessCode(e.target.value);
                          if (codeValidationStatus) setCodeValidationStatus(null);
                        }}
                        placeholder="e.g. POP-883A92"
                        required={selectedBook.price > 0}
                        className="w-full bg-white border border-[#e0e0e0] rounded-md px-3 py-1.5 text-[#2c2c2c] font-mono font-bold uppercase focus:border-[#ff6321] focus:outline-none"
                      />
                    </div>
                  </div>

                  {codeValidationStatus && (
                    <div
                      className={`p-2.5 rounded-md text-xs font-semibold flex items-center gap-2 ${
                        codeValidationStatus.success
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}
                    >
                      {codeValidationStatus.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                      <span>{codeValidationStatus.message}</span>
                    </div>
                  )}

                  <p className="text-[11px] text-[#666] leading-snug">
                    Enter the code you received on WhatsApp after sending your Proof of Payment (POP). For testing free books, enter any code or <span className="font-mono text-[#ff6321] font-bold">POP-FREE</span>.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isGeneratingPack}
                  className="w-full py-3 rounded-md bg-[#ff6321] hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-opacity"
                >
                  {isGeneratingPack ? (
                    <span>Validating Code & Encrypting Pack...</span>
                  ) : (
                    <>
                      <Download className="w-4 h-4" /> Verify Code & Download Data Pack
                    </>
                  )}
                </button>

              </form>
            )}

          </div>
        </div>
      )}

      {/* Vendor Storefront Modal */}
      <VendorStorefrontModal
        isOpen={isVendorStorefrontOpen}
        onClose={() => setIsVendorStorefrontOpen(false)}
        vendorProfile={storefrontVendorProfile}
        products={getVendorProducts()}
        initialSelectedProductId={initialSelectedProdId}
      />

    </div>
  );
};
