import React, { useState, useEffect } from 'react';
import { 
  Smartphone, Upload, BookOpen, Trash2, ShieldCheck, CheckCircle2, 
  Smartphone as PhoneIcon, Key, AlertTriangle, Sparkles, Database, FileText, Clock, Archive, Search, X, CheckSquare, Square, ListChecks, Check, MessageSquare, Lock, ShieldAlert,
  Wifi, WifiOff, Globe, Download, DownloadCloud, Store, ShoppingBag, Tag, RefreshCw
} from 'lucide-react';
import { Book, ReaderProfile, ReaderLibraryItem, DEFAULT_BOOK_CATEGORIES, RenewalAuthorization } from '../../types';
import { getReaderLibrarySQLite, saveToReaderLibrarySQLite, saveBookToSQLite, getAllLocalBooks, deleteFromReaderLibrarySQLite } from '../../lib/sqlite';
import { getOrCreateDeviceId, getSavedPhoneNumber, extractDataPackFromFile, savePhoneNumber, checkDataPackExpiration, renewBookDataPackJson, verifyImportedBookDataPack } from '../../lib/dataPack';
import { verifyAccessCode, formatWhatsAppPopUrl } from '../../lib/accessCodes';
import { DATA_PACK_PUBLIC_KEYS } from '@/config/keys';
import { fetchPublishedBooksFromFirestore } from '../../lib/firebase';
import { ReaderView } from './ReaderView';
import { PublicSeriesCatalogue } from '../portal/PublicSeriesCatalogue';

interface ReaderShellProps {
  user: ReaderProfile | null;
  onOpenAuth: () => void;
  directReadBook?: Book | null;
  directPackJson?: string | null;
  isStandalone?: boolean;
  onPromptInstall?: () => void;
}

export const ReaderShell: React.FC<ReaderShellProps> = ({
  user,
  onOpenAuth,
  directReadBook,
  directPackJson,
  isStandalone = false,
  onPromptInstall,
}) => {
  const [library, setLibrary] = useState<ReaderLibraryItem[]>([]);
  const [activeReadingBook, setActiveReadingBook] = useState<Book | null>(directReadBook || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [librarySortBy, setLibrarySortBy] = useState<'date_desc' | 'date_asc' | 'title_asc' | 'title_desc'>('date_desc');

  // Bulk Selection Mode State
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);

  // Import Pack Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [packJsonInput, setPackJsonInput] = useState('');
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Expired Book Renewal Modal State
  const [expiredRenewalModal, setExpiredRenewalModal] = useState<{
    isOpen: boolean;
    item: ReaderLibraryItem;
    book: Book;
    expiryDate: Date;
  } | null>(null);
  const [enteredRenewalCode, setEnteredRenewalCode] = useState('');
  const [renewalStatus, setRenewalStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Reader Phone & Device ID
  const [readerPhone, setReaderPhone] = useState(getSavedPhoneNumber() || user?.phoneNumber || '');
  const [deviceId, setDeviceId] = useState(getOrCreateDeviceId());

  // Online Connectivity & Online Store Catalog State
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [shellView, setShellView] = useState<'library' | 'online_catalog'>('library');
  const [onlineBooks, setOnlineBooks] = useState<Book[]>([]);
  const [isLoadingOnlineCatalog, setIsLoadingOnlineCatalog] = useState(false);
  const [onlineSearchQuery, setOnlineSearchQuery] = useState('');
  const [onlineCategory, setOnlineCategory] = useState('ALL');
  const [onlineSortBy, setOnlineSortBy] = useState<'date_desc' | 'price_asc' | 'price_desc' | 'title_asc' | 'title_desc'>('date_desc');

  // Direct Shell Download Modal State
  const [directDownloadModal, setDirectDownloadModal] = useState<{
    isOpen: boolean;
    book: Book | null;
  }>({ isOpen: false, book: null });
  const [downloadActivationCode, setDownloadActivationCode] = useState('');
  const [downloadStatus, setDownloadStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [alsoSaveZipBackup, setAlsoSaveZipBackup] = useState(true);

  // Monitor Network Connectivity
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch Online Catalog when switching to catalog view
  useEffect(() => {
    if (shellView === 'online_catalog') {
      loadOnlineCatalog();
    }
  }, [shellView]);

  const loadOnlineCatalog = async () => {
    setIsLoadingOnlineCatalog(true);
    try {
      const cloudBooks = await fetchPublishedBooksFromFirestore();
      const localBooks = await getAllLocalBooks();
      const localPublished = localBooks.filter((b) => b.isPublished);

      const bookMap = new Map<string, Book>();
      localPublished.forEach((b) => bookMap.set(b.id, b));
      cloudBooks.forEach((b) => bookMap.set(b.id, b));

      setOnlineBooks(Array.from(bookMap.values()));
    } catch (err) {
      console.warn('Error loading online store catalog in shell:', err);
    } finally {
      setIsLoadingOnlineCatalog(false);
    }
  };

  const handleInitiateDirectDownload = (book: Book) => {
    setDownloadActivationCode('');
    setDownloadStatus(null);
    setDirectDownloadModal({ isOpen: true, book });
  };

  const handleConfirmDirectDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directDownloadModal.book) return;

    const book = directDownloadModal.book;
    const phone = readerPhone.trim();

    if (!phone) {
      setDownloadStatus({
        success: false,
        message: 'Please enter your registered Reader Phone Number.',
      });
      return;
    }

    savePhoneNumber(phone);

    // If price > 0 and activation code required
    if ((book.price || 0) > 0) {
      const code = downloadActivationCode.trim();
      if (!code) {
        setDownloadStatus({
          success: false,
          message: 'Please enter the Book Access / Activation Code sent via WhatsApp (or enter POP-FREE if complimentary).',
        });
        return;
      }

      const verifyRes = verifyAccessCode(book, code);
      if (!verifyRes.isValid) {
        setDownloadStatus({
          success: false,
          message: verifyRes.message,
        });
        return;
      }
    }

    void alsoSaveZipBackup;
    setDownloadStatus({
      success: false,
      message: `"${book.title}" requires a publisher-issued signed v3.0.0 data pack. Import that pack after it is issued; this browser cannot hold the private signing key.`,
    });
  };

  // Copy Protection Banner Toast
  const [copyBlockedToast, setCopyBlockedToast] = useState<string | null>(null);

  const showCopyBlockedNotice = (msg?: string) => {
    setCopyBlockedToast(msg || '🛡️ Content Copy Protection Active: Manuscript text & library content are copy-protected.');
    setTimeout(() => {
      setCopyBlockedToast(null);
    }, 3200);
  };

  useEffect(() => {
    const handleCopyCut = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      e.preventDefault();
      showCopyBlockedNotice('🛡️ Content Copy Protection Active: Copying library content is disabled.');
    };

    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      e.preventDefault();
      showCopyBlockedNotice('🛡️ Context Menu Restricted: Right-click is disabled for library shell.');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl && (e.key === 'c' || e.key === 'C' || e.key === 'a' || e.key === 'A' || e.key === 'x' || e.key === 'X' || e.key === 'u' || e.key === 'U' || e.key === 'p' || e.key === 'P' || e.key === 's' || e.key === 'S')) {
        const target = e.target as HTMLElement;
        if ((e.key === 'a' || e.key === 'A' || e.key === 'c' || e.key === 'C' || e.key === 'x' || e.key === 'X') && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
          return; // Allow edit actions inside inputs
        }
        e.preventDefault();
        showCopyBlockedNotice('🛡️ Shortcut Restricted: Text copying & printing are protected.');
      }
    };

    document.addEventListener('copy', handleCopyCut);
    document.addEventListener('cut', handleCopyCut);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('copy', handleCopyCut);
      document.removeEventListener('cut', handleCopyCut);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    loadLibraryFromSQLite();
  }, []);

  // Handle direct pack import if passed from Public Portal
  useEffect(() => {
    if (directPackJson) {
      handleImportPackString(directPackJson);
    }
  }, [directPackJson]);

  const loadLibraryFromSQLite = async () => {
    try {
      const items = await getReaderLibrarySQLite();
      setLibrary(items);
      
      // Also ensure local SQLite books are synced
      const localBooks = await getAllLocalBooks();
      if (items.length === 0 && localBooks.length > 0) {
        // Auto-add available local books to library
        for (const b of localBooks) {
          const item: ReaderLibraryItem = {
            id: 'lib_' + b.id,
            bookId: b.id,
            bookTitle: b.title,
            author: b.author,
            coverFront: b.coverFront,
            boundPhoneNumber: readerPhone,
            boundDeviceId: deviceId,
            downloadedAt: new Date().toISOString(),
            isUnlocked: true,
            dataPackJson: JSON.stringify(b),
          };
          await saveToReaderLibrarySQLite(item);
        }
        const updated = await getReaderLibrarySQLite();
        setLibrary(updated);
      }
    } catch (err) {
      console.warn('Library load error:', err);
    }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus({
      success: true,
      message: 'Unzipping and extracting manuscript data pack...'
    });

    try {
      const content = await extractDataPackFromFile(file);
      setPackJsonInput(content);
      await handleImportPackString(content);
    } catch (err: any) {
      setImportStatus({
        success: false,
        message: `Failed to extract file: ${err.message || 'Ensure it is a valid zipped book data pack (.datapack.zip).'}`
      });
    }
  };

  const handleImportPackString = async (jsonString: string) => {
    setImportStatus(null);
    savePhoneNumber(readerPhone);

    const verification = await verifyImportedBookDataPack(
      jsonString,
      readerPhone,
      deviceId,
      DATA_PACK_PUBLIC_KEYS,
    );

    if (verification.success && verification.book) {
      const b = verification.book;

      await saveBookToSQLite(b);

      const legacyPack = verification.pack && 'boundPhoneNumber' in verification.pack
        ? verification.pack
        : undefined;
      const boundPhone = legacyPack?.boundPhoneNumber || readerPhone;
      const boundDevice = legacyPack?.boundDeviceId || deviceId;

      const libItem: ReaderLibraryItem = {
        id: 'lib_' + b.id + '_' + Date.now().toString(36),
        bookId: b.id,
        bookTitle: b.title,
        author: b.author,
        coverFront: b.coverFront,
        boundPhoneNumber: boundPhone,
        boundDeviceId: boundDevice,
        downloadedAt: new Date().toISOString(),
        isUnlocked: true,
        dataPackJson: jsonString,
      };

      await saveToReaderLibrarySQLite(libItem);
      await loadLibraryFromSQLite();

      setImportStatus({
        success: true,
        message: `🎉 Success! ${verification.message}`,
      });
    } else {
      setImportStatus({
        success: false,
        message: verification.message,
      });
    }
  };

  const handleOpenBook = async (item: ReaderLibraryItem) => {
    try {
      const expInfo = checkDataPackExpiration(item.dataPackJson, item.downloadedAt);

      let bookObj: Book | null = null;
      const localBooks = await getAllLocalBooks();
      const match = localBooks.find((b) => b.id === item.bookId);
      if (match) {
        bookObj = match;
      } else {
        const parsedPack = JSON.parse(item.dataPackJson);
        bookObj = parsedPack.book || parsedPack;
      }

      if (!bookObj) {
        alert('Failed to extract manuscript details for this library book.');
        return;
      }

      // If expired: DO NOT open book; prompt user to enter a new activation code
      if (expInfo.isExpired) {
        setExpiredRenewalModal({
          isOpen: true,
          item,
          book: bookObj,
          expiryDate: expInfo.expiryDate,
        });
        setEnteredRenewalCode('');
        setRenewalStatus(null);
        return;
      }

      // If active: save and open reading view
      await saveBookToSQLite(bookObj);
      setActiveReadingBook(bookObj);
    } catch (err: any) {
      alert('Error opening book from SQLite: ' + (err.message || err));
    }
  };

  const handleVerifyRenewalCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expiredRenewalModal) return;

    setRenewalStatus(null);
    const { item, book } = expiredRenewalModal;
    const code = enteredRenewalCode.trim();

    if (!code) {
      setRenewalStatus({
        success: false,
        message: 'Please enter the new Book Download Activation Code sent by the publisher via WhatsApp.',
      });
      return;
    }

    const result = verifyAccessCode(book, code);

    if (result.isValid) {
      try {
        const auth: RenewalAuthorization = {
          activationCode: code.trim(),
          bookId: book.id,
          boundPhoneNumber: item.boundPhoneNumber || readerPhone,
          issuedAt: new Date().toISOString(),
          extensionDays: 30,
        };

        const { updatedJson, newExpiresAt } = renewBookDataPackJson(item.dataPackJson, auth, 30);

        const updatedItem: ReaderLibraryItem = {
          ...item,
          downloadedAt: new Date().toISOString(),
          dataPackJson: updatedJson,
          isUnlocked: true,
        };

        await saveToReaderLibrarySQLite(updatedItem);
        await saveBookToSQLite(book);
        await loadLibraryFromSQLite();

        setRenewalStatus({
          success: true,
          message: `🎉 Success! Code verified. Your 30-day offline reading access for "${book.title}" has been renewed until ${new Date(newExpiresAt).toLocaleDateString()}. No need to re-download! Opening reader...`,
        });

        setTimeout(() => {
          setExpiredRenewalModal(null);
          setActiveReadingBook(book);
        }, 1300);
      } catch (err: any) {
        setRenewalStatus({
          success: false,
          message: `Failed to renew library item: ${err.message || err}`,
        });
      }
    } else {
      setRenewalStatus({
        success: false,
        message: result.message,
      });
    }
  };

  const handleOpenWhatsAppForRenewal = () => {
    if (!expiredRenewalModal) return;
    const { book } = expiredRenewalModal;
    const popInfo = formatWhatsAppPopUrl(book, readerPhone, deviceId);
    window.open(popInfo.whatsappUrl, '_blank');
  };

  const handleDeleteLibraryItem = async (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to remove "${title}" from your offline library?`)) return;
    await deleteFromReaderLibrarySQLite(id);
    await loadLibraryFromSQLite();
  };

  const toggleBookSelection = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedBookIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (filteredItems: ReaderLibraryItem[]) => {
    const allIds = filteredItems.map(item => item.id);
    setSelectedBookIds(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedBookIds([]);
  };

  const handleBulkDelete = async () => {
    if (selectedBookIds.length === 0) return;
    const count = selectedBookIds.length;
    const confirmMsg = `Are you sure you want to remove ${count} selected book${count > 1 ? 's' : ''} from your offline library?`;
    if (!window.confirm(confirmMsg)) return;

    for (const id of selectedBookIds) {
      await deleteFromReaderLibrarySQLite(id);
    }
    setSelectedBookIds([]);
    setIsBulkMode(false);
    await loadLibraryFromSQLite();
  };

  const toggleBulkMode = () => {
    if (isBulkMode) {
      setIsBulkMode(false);
      setSelectedBookIds([]);
    } else {
      setIsBulkMode(true);
    }
  };

  const filteredLibrary = library
    .filter((i) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        i.bookTitle.toLowerCase().includes(q) ||
        (i.author && i.author.toLowerCase().includes(q)) ||
        i.boundPhoneNumber.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (librarySortBy === 'date_desc') {
        return new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime();
      }
      if (librarySortBy === 'date_asc') {
        return new Date(a.downloadedAt).getTime() - new Date(b.downloadedAt).getTime();
      }
      if (librarySortBy === 'title_asc') {
        return a.bookTitle.localeCompare(b.bookTitle);
      }
      if (librarySortBy === 'title_desc') {
        return b.bookTitle.localeCompare(a.bookTitle);
      }
      return 0;
    });
  const availableSeriesBooks = library.flatMap((item) => {
    try {
      const parsed = JSON.parse(item.dataPackJson);
      const candidate = (parsed.book || parsed) as Book;
      return candidate?.id ? [candidate] : [];
    } catch {
      return [];
    }
  });
  if (activeReadingBook && !availableSeriesBooks.some((book) => book.id === activeReadingBook.id)) {
    availableSeriesBooks.push(activeReadingBook);
  }

  // If reading active book, render full screen ReaderView
  if (activeReadingBook) {
    return (
      <ReaderView
        book={activeReadingBook}
        onBackToLibrary={() => setActiveReadingBook(null)}
        availableSeriesBooks={availableSeriesBooks}
        onOpenSeriesBook={setActiveReadingBook}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 copy-protected-shell select-none relative">
      {isOnline && (
        <PublicSeriesCatalogue
          readerId={user?.uid}
          readerPhone={readerPhone}
          onPackageDownloaded={async (file) => {
            const content = await extractDataPackFromFile(file);
            await handleImportPackString(content);
          }}
        />
      )}
      
      {/* Toast Overlay for Copy/Context-Menu Block Notification */}
      {copyBlockedToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#1f1f1f] text-white text-xs font-bold px-4 py-3 rounded-xl border border-amber-500/50 shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{copyBlockedToast}</span>
        </div>
      )}

      {/* PWA Shell Header */}
      <div className="bg-white border border-[#e0e0e0] rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-[#2c2c2c] flex items-center justify-center text-[#ff6321] shadow-sm shrink-0">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-[#2c2c2c]">Offline Reader Library</h1>
              <span className="px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-mono font-bold flex items-center gap-1">
                <Database className="w-3 h-3" /> Offline Ready
              </span>
              <span className="px-2.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-mono font-bold flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-600" /> Copy Protected
              </span>
            </div>
            <p className="text-xs text-[#666] mt-0.5">
              Read your downloaded digital books offline with full formatting, notes, and highlights.
            </p>
          </div>
        </div>

        {/* Reader Device Binding Status Box */}
        <div className="bg-[#f9f9f9] border border-[#e0e0e0] rounded-lg p-3.5 px-4 flex flex-wrap items-center gap-4 text-xs">
          <div>
            <span className="text-[10px] text-[#666] block font-mono font-bold uppercase">READER PHONE:</span>
            <span className="font-mono font-bold text-[#ff6321]">{readerPhone}</span>
          </div>

          <div className="h-6 w-[1px] bg-[#e0e0e0] hidden sm:block" />

          <div>
            <span className="text-[10px] text-[#666] block font-mono font-bold uppercase">DEVICE KEY:</span>
            <span className="font-mono text-[#2c2c2c] font-medium">{deviceId.slice(0, 12)}...</span>
          </div>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2 rounded-md bg-[#ff6321] hover:opacity-90 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-opacity cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" /> Import Book Package
          </button>

          {!isStandalone && onPromptInstall && (
            <button
              onClick={onPromptInstall}
              className="px-4 py-2 rounded-md bg-[#2c2c2c] hover:bg-[#1a1a1a] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#ff6321]" /> Install Mobile App
            </button>
          )}
        </div>

      </div>

      {/* View Switcher Bar & Online Status Badge */}
      <div className="bg-white border border-[#e0e0e0] rounded-2xl p-3 px-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-[#f4f4f4] p-1 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShellView('library')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              shellView === 'library'
                ? 'bg-white text-[#2c2c2c] shadow-xs border border-[#e0e0e0]'
                : 'text-[#666] hover:text-[#2c2c2c]'
            }`}
          >
            <BookOpen className="w-4 h-4 text-[#ff6321]" />
            <span>My Offline Library ({library.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setShellView('online_catalog')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              shellView === 'online_catalog'
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-xs'
                : 'text-[#666] hover:text-[#2c2c2c]'
            }`}
          >
            <Globe className="w-4 h-4 text-orange-300" />
            <span>Online Store Catalog (Direct Shell Download)</span>
          </button>
        </div>

        {/* Network Status Badge */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {isOnline ? (
            <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono text-xs font-extrabold flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              <span>Online - Direct Downloads Ready</span>
            </span>
          ) : (
            <span className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-mono text-xs font-bold flex items-center gap-1.5 shadow-2xs">
              <WifiOff className="w-3.5 h-3.5 text-amber-600" />
              <span>Offline Mode - Reading Local Manuscripts</span>
            </span>
          )}
        </div>
      </div>

      {/* Local Library Grid */}
      {shellView === 'library' && (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-base font-bold text-[#2c2c2c] flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#ff6321]" />
            My Offline Books ({filteredLibrary.length}{searchQuery.trim() ? ` / ${library.length}` : ''})
          </h2>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Bar & Sort Dropdown */}
            {library.length > 0 && (
              <>
                <div className="relative min-w-[200px] sm:w-64">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search library by title or author..."
                    className="w-full pl-9 pr-8 py-2 bg-white border border-[#e0e0e0] rounded-xl text-xs font-medium text-[#2c2c2c] focus:outline-none focus:border-[#ff6321] transition-colors shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 bg-white border border-[#e0e0e0] rounded-xl px-2.5 py-1.5 shadow-2xs shrink-0">
                  <Tag className="w-3.5 h-3.5 text-[#ff6321]" />
                  <select
                    value={librarySortBy}
                    onChange={(e) => setLibrarySortBy(e.target.value as any)}
                    className="bg-transparent text-xs font-bold text-[#2c2c2c] focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="date_desc">Newest First</option>
                    <option value="date_asc">Oldest First</option>
                    <option value="title_asc">Title A-Z</option>
                    <option value="title_desc">Title Z-A</option>
                  </select>
                </div>
              </>
            )}

            {/* Bulk Select Mode Toggle Button */}
            {library.length > 0 && (
              <button
                type="button"
                onClick={toggleBulkMode}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  isBulkMode 
                    ? 'bg-[#ff6321] border-[#ff6321] text-white shadow-sm' 
                    : 'bg-white hover:bg-gray-50 border-[#e0e0e0] text-[#2c2c2c]'
                }`}
              >
                <ListChecks className="w-4 h-4" />
                <span>{isBulkMode ? 'Done Selecting' : 'Select Books'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Bulk Selection Mode Action Bar */}
        {isBulkMode && (
          <div className="bg-[#2c2c2c] text-white p-4 rounded-xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#ff6321]/20 text-[#ff6321] rounded-lg">
                <ListChecks className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>{selectedBookIds.length} of {filteredLibrary.length} Selected</span>
                </h3>
                <p className="text-[11px] text-gray-300">
                  Click any book card to toggle selection for batch removal.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              {selectedBookIds.length < filteredLibrary.length ? (
                <button
                  type="button"
                  onClick={() => handleSelectAll(filteredLibrary)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-[#ff6321]" /> Select All ({filteredLibrary.length})
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Square className="w-3.5 h-3.5 text-gray-400" /> Deselect All
                </button>
              )}

              <button
                type="button"
                disabled={selectedBookIds.length === 0}
                onClick={handleBulkDelete}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Selected ({selectedBookIds.length})
              </button>

              <button
                type="button"
                onClick={toggleBulkMode}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white font-semibold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {library.length === 0 ? (
          <div className="bg-white border border-[#e0e0e0] rounded-xl p-12 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-lg bg-[#f0f0f0] border border-[#e0e0e0] flex items-center justify-center text-[#ff6321] mx-auto">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-[#2c2c2c] text-base">Your Library is Empty</h3>
            <p className="text-xs text-[#666] max-w-md mx-auto leading-relaxed">
              Import a book package downloaded from the Book Store to start reading offline!
            </p>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-5 py-2.5 rounded-md bg-[#ff6321] hover:opacity-90 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Upload className="w-4 h-4" /> Import First Book Package
            </button>
          </div>
        ) : filteredLibrary.length === 0 ? (
          <div className="bg-white border border-[#e0e0e0] rounded-xl p-8 text-center space-y-3 shadow-sm">
            <Search className="w-8 h-8 text-gray-400 mx-auto" />
            <h3 className="font-bold text-[#2c2c2c] text-sm">No books found matching "{searchQuery}"</h3>
            <p className="text-xs text-gray-500">Try searching for a different book title or author name.</p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-[#2c2c2c] text-xs font-bold transition-colors cursor-pointer"
            >
              Clear Search Filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredLibrary.map((item) => {
              const isSelected = selectedBookIds.includes(item.id);
              const expInfo = checkDataPackExpiration(item.dataPackJson, item.downloadedAt);

              return (
                <div
                  key={item.id}
                  onClick={(e) => {
                    if (isBulkMode) {
                      toggleBookSelection(item.id, e);
                    } else {
                      handleOpenBook(item);
                    }
                  }}
                  className={`bg-white border rounded-xl p-5 shadow-sm transition-all duration-200 cursor-pointer flex flex-col justify-between group relative ${
                    expInfo.isExpired
                      ? 'border-red-300 hover:border-red-500 bg-red-50/10'
                      : isBulkMode && isSelected
                      ? 'border-[#ff6321] ring-2 ring-[#ff6321] bg-[#fff9f6]'
                      : isBulkMode
                      ? 'border-gray-300 hover:border-[#ff6321]'
                      : 'border-[#e0e0e0] hover:border-[#ff6321] hover:-translate-y-0.5'
                  }`}
                >
                  {/* Selection Checkbox Overlay in Bulk Mode */}
                  {isBulkMode && (
                    <div
                      onClick={(e) => toggleBookSelection(item.id, e)}
                      className={`absolute top-3 right-3 z-20 w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                        isSelected
                          ? 'bg-[#ff6321] text-white'
                          : 'bg-black/50 text-white/80 hover:bg-black/70 border border-white/40'
                      }`}
                      title={isSelected ? 'Deselect book' : 'Select book'}
                    >
                      {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : <Square className="w-4 h-4" />}
                    </div>
                  )}

                  <div className="space-y-4">
                    
                    {/* Front Cover Thumb */}
                    <div
                      className="w-full h-48 rounded shadow-md border border-black/10 p-4 flex flex-col justify-between relative overflow-hidden"
                      style={{
                        background:
                          item.coverFront?.bgType === 'image' && item.coverFront?.bgImageUrl
                            ? `url(${item.coverFront.bgImageUrl}) center/cover`
                            : `linear-gradient(to bottom right, ${item.coverFront?.gradientStart || '#ea580c'}, ${item.coverFront?.gradientEnd || '#9a3412'})`,
                      }}
                    >
                      <div className="relative z-10">
                        {expInfo.isExpired ? (
                          <span className="px-2 py-0.5 rounded bg-red-600/90 text-[9px] font-mono text-white font-bold border border-red-300/40 flex items-center gap-1 shadow-xs w-fit">
                            <Clock className="w-3 h-3 text-yellow-300" /> License Expired
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-black/40 text-[9px] font-mono text-orange-300 font-bold border border-orange-400/30">
                            Digital Edition
                          </span>
                        )}
                        <h3 className="font-bold text-base text-white font-serif mt-2 line-clamp-2 drop-shadow">
                          {item.bookTitle}
                        </h3>
                      </div>

                      <p className="relative z-10 text-xs text-orange-200 font-semibold font-mono">
                        By {item.author}
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-[#2c2c2c] group-hover:text-[#ff6321] transition-colors line-clamp-1">
                        {item.bookTitle}
                      </h3>
                      <p className="text-xs text-[#666] font-medium">By {item.author}</p>
                      
                      <p className="text-[10px] font-serif font-bold text-[#ff6321] mt-1">
                        Published by JE Trust Fund
                      </p>

                      {expInfo.isExpired ? (
                        <div className="flex items-center gap-1.5 text-[10px] text-red-600 font-bold font-mono mt-2 bg-red-50/80 px-2 py-1 rounded border border-red-200/80">
                          <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />
                          <span>Expired: {expInfo.expiryDate.toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[10px] text-[#666] font-mono mt-1.5">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" /> Reader: {item.boundPhoneNumber}
                        </div>
                      )}
                    </div>

                  </div>

                  <div className="pt-4 mt-4 border-t border-[#f0f0f0] flex items-center justify-between text-xs">
                    {expInfo.isExpired ? (
                      <span className="text-red-600 font-bold flex items-center gap-1.5 bg-red-50 px-2 py-1 rounded border border-red-200 group-hover:bg-red-100 transition-colors">
                        <Key className="w-3.5 h-3.5 text-red-600" /> Enter New Code
                      </span>
                    ) : (
                      <span className="text-[#ff6321] font-bold flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" /> {isBulkMode ? (isSelected ? 'Selected' : 'Click to select') : 'Read Offline'}
                      </span>
                    )}

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold ${expInfo.isExpired ? 'text-red-600' : 'text-emerald-700'}`}>
                        {expInfo.isExpired ? 'Reactivate' : 'Saved'}
                      </span>
                      {!isBulkMode && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteLibraryItem(e, item.id, item.bookTitle)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer"
                          title="Remove from offline library"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* Online Catalog Grid (Direct Shell Download) */}
      {shellView === 'online_catalog' && (
        <div className="space-y-6 animate-in fade-in zoom-in-95">
          {/* Header & Filter Controls */}
          <div className="bg-white border border-[#e0e0e0] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#f0f0f0] pb-4">
              <div>
                <h2 className="text-base font-extrabold text-[#2c2c2c] flex items-center gap-2">
                  <Globe className="w-5 h-5 text-orange-600" /> Online Book Catalog
                </h2>
                <p className="text-xs text-[#666] mt-0.5">
                  Browse published manuscripts and download directly into your offline reader shell with 1 click.
                </p>
              </div>

              <button
                type="button"
                onClick={loadOnlineCatalog}
                className="px-3.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#2c2c2c] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOnlineCatalog ? 'animate-spin' : ''}`} />
                <span>Refresh Catalog</span>
              </button>
            </div>

            {/* Category Pills, Search Bar & Sort Dropdown */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 overflow-x-auto py-1 flex-1">
                <span className="font-bold text-[#666] text-[11px] uppercase tracking-wider shrink-0">Category:</span>
                {['ALL', ...DEFAULT_BOOK_CATEGORIES].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setOnlineCategory(cat)}
                    className={`px-3 py-1 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
                      onlineCategory === cat
                        ? 'bg-[#ff6321] text-white shadow-2xs'
                        : 'bg-gray-100 text-[#555] hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 max-w-md w-full md:w-auto">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={onlineSearchQuery}
                    onChange={(e) => setOnlineSearchQuery(e.target.value)}
                    placeholder="Search online catalog..."
                    className="w-full bg-white border border-[#d0d0d0] rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-[#ff6321]"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-white border border-[#d0d0d0] rounded-xl px-2.5 py-1.5 shrink-0">
                  <Tag className="w-3.5 h-3.5 text-[#ff6321]" />
                  <select
                    value={onlineSortBy}
                    onChange={(e) => setOnlineSortBy(e.target.value as any)}
                    className="bg-transparent text-xs font-bold text-[#2c2c2c] focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="date_desc">Newest First</option>
                    <option value="title_asc">Title A-Z</option>
                    <option value="title_desc">Title Z-A</option>
                    <option value="price_asc">Price: Low-High</option>
                    <option value="price_desc">Price: High-Low</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Catalog Grid */}
          {isLoadingOnlineCatalog ? (
            <div className="bg-white border border-[#e0e0e0] rounded-2xl p-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-orange-600 animate-spin mx-auto" />
              <p className="text-xs text-[#666] font-bold">Connecting to publisher store & loading books...</p>
            </div>
          ) : onlineBooks.length === 0 ? (
            <div className="bg-white border border-[#e0e0e0] rounded-2xl p-12 text-center space-y-3">
              <Store className="w-10 h-10 text-gray-400 mx-auto" />
              <h3 className="font-bold text-[#2c2c2c] text-base">No Online Books Available</h3>
              <p className="text-xs text-[#666] max-w-md mx-auto">
                No published manuscripts found in the cloud store currently.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {onlineBooks
                .filter((b) => {
                  if (onlineCategory !== 'ALL' && (b.category || 'Accounting & Finance') !== onlineCategory) return false;
                  if (onlineSearchQuery.trim()) {
                    const q = onlineSearchQuery.toLowerCase();
                    const publisherName = b.coverBack?.publisherName || '';
                    return (
                      b.title.toLowerCase().includes(q) ||
                      b.author.toLowerCase().includes(q) ||
                      publisherName.toLowerCase().includes(q) ||
                      (b.description && b.description.toLowerCase().includes(q))
                    );
                  }
                  return true;
                })
                .sort((a, b) => {
                  if (onlineSortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
                  if (onlineSortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
                  if (onlineSortBy === 'title_asc') return a.title.localeCompare(b.title);
                  if (onlineSortBy === 'title_desc') return b.title.localeCompare(a.title);
                  return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                })
                .map((b) => {
                  const isAlreadyInShell = library.some((item) => item.bookId === b.id);

                  return (
                    <div
                      key={b.id}
                      className="bg-white border border-[#e0e0e0] hover:border-orange-400 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        {/* Front Cover */}
                        <div
                          className="w-full h-48 rounded-xl shadow-md border border-black/10 p-4 flex flex-col justify-between relative overflow-hidden"
                          style={{
                            background:
                              b.coverFront?.bgType === 'image' && b.coverFront?.bgImageUrl
                                ? `url(${b.coverFront.bgImageUrl}) center/cover`
                                : `linear-gradient(to bottom right, ${b.coverFront?.gradientStart || '#ea580c'}, ${b.coverFront?.gradientEnd || '#9a3412'})`,
                          }}
                        >
                          <div className="relative z-10 flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded bg-black/60 text-[9px] font-mono text-orange-300 font-bold border border-orange-400/30 uppercase">
                              {b.category || 'General'}
                            </span>
                            <span className="px-2.5 py-0.5 rounded bg-orange-600 text-white font-mono text-xs font-extrabold shadow-sm">
                              {b.price ? `$${b.price.toFixed(2)}` : 'FREE'}
                            </span>
                          </div>

                          <div className="relative z-10">
                            <h3 className="font-bold text-base text-white font-serif line-clamp-2 drop-shadow">
                              {b.title}
                            </h3>
                            <p className="text-xs text-orange-200 font-semibold font-mono mt-1">
                              By {b.author}
                            </p>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-extrabold text-sm text-[#2c2c2c] line-clamp-1">{b.title}</h3>
                          <p className="text-xs text-[#666]">By {b.author}</p>
                          <p className="text-[11px] text-[#888] mt-1 line-clamp-2">{b.description}</p>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-[#f0f0f0] flex items-center justify-between gap-2">
                        {isAlreadyInShell ? (
                          <>
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Installed
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const libItem = library.find((i) => i.bookId === b.id);
                                if (libItem) handleOpenBook(libItem);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <BookOpen className="w-3.5 h-3.5" /> Read
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleInitiateDirectDownload(b)}
                            className="w-full py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <DownloadCloud className="w-4 h-4" />
                            <span>Download Straight to Shell ⬇️</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Expired Book Renewal / Reactivation Code Input */}
      {expiredRenewalModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#e0e0e0] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#f0f0f0] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#2c2c2c] flex items-center gap-2">
                    Book Activation Expired
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Reactivate book without re-downloading
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setExpiredRenewalModal(null);
                  setRenewalStatus(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Expired Book Card Banner */}
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 flex items-center gap-3">
              <div
                className="w-12 h-16 rounded shadow-sm border border-black/10 flex-shrink-0 p-1.5 flex flex-col justify-end"
                style={{
                  background:
                    expiredRenewalModal.book.coverFront?.bgType === 'image' && expiredRenewalModal.book.coverFront?.bgImageUrl
                      ? `url(${expiredRenewalModal.book.coverFront.bgImageUrl}) center/cover`
                      : `linear-gradient(to bottom right, ${expiredRenewalModal.book.coverFront?.gradientStart || '#ea580c'}, ${expiredRenewalModal.book.coverFront?.gradientEnd || '#9a3412'})`,
                }}
              >
                <span className="text-[7px] text-white font-bold font-serif line-clamp-1">
                  {expiredRenewalModal.book.title}
                </span>
              </div>
              <div className="min-w-0 text-xs">
                <h4 className="font-bold text-gray-900 truncate">{expiredRenewalModal.book.title}</h4>
                <p className="text-gray-600 text-[11px]">By {expiredRenewalModal.book.author}</p>
                <div className="flex items-center gap-1 text-[10px] text-red-700 font-mono font-bold mt-1">
                  <Clock className="w-3 h-3 text-red-600" />
                  <span>Expired on {expiredRenewalModal.expiryDate.toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-600 leading-relaxed bg-gray-50 border border-gray-200 p-3 rounded-xl space-y-1">
              <p className="font-bold text-gray-800">💡 No need to re-download this book!</p>
              <p>
                Your 30-day offline reading license has ended. Simply enter a new Activation Code below to instantly grant another 30 days of offline access to your saved manuscript.
              </p>
            </div>

            {renewalStatus && (
              <div
                className={`p-3.5 rounded-xl text-xs font-medium flex items-start gap-2.5 ${
                  renewalStatus.success
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}
              >
                {renewalStatus.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{renewalStatus.message}</span>
              </div>
            )}

            {/* Renewal Code Verification Form */}
            <form onSubmit={handleVerifyRenewalCode} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-[#2c2c2c] mb-1.5 flex items-center justify-between">
                  <span>Enter New Book Activation Code</span>
                  <span className="text-[10px] font-mono text-gray-400">e.g. POP-XXXXXX or POP-FREE</span>
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={enteredRenewalCode}
                    onChange={(e) => setEnteredRenewalCode(e.target.value.toUpperCase())}
                    placeholder="Enter code received on WhatsApp..."
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-300 rounded-xl font-mono text-xs font-bold text-[#2c2c2c] focus:border-[#ff6321] focus:outline-none uppercase tracking-wider"
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#ff6321] hover:opacity-90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-opacity cursor-pointer"
              >
                <Key className="w-4 h-4" /> Verify Code & Extend Access (30 Days)
              </button>
            </form>

            {/* WhatsApp Request Box */}
            <div className="pt-3 border-t border-gray-100 text-center space-y-2">
              <p className="text-[11px] text-gray-500 font-medium">
                Don't have a new code yet? Request your renewal activation code directly from the publisher via WhatsApp:
              </p>
              <button
                type="button"
                onClick={handleOpenWhatsAppForRenewal}
                className="w-full py-2 rounded-xl bg-[#128C7E] hover:bg-[#0e6c62] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Request Renewal Code on WhatsApp (+263774479121)</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Import Zipped Book Data Pack */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#e0e0e0] rounded-xl max-w-xl w-full p-6 space-y-6 shadow-xl">
            
            <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#ff6321]" />
                <h3 className="font-bold text-base text-[#2c2c2c]">Import Zipped Book Data Pack</h3>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportStatus(null);
                }}
                className="text-[#666] hover:text-[#2c2c2c] text-xs font-bold px-3 py-1 rounded bg-[#f0f0f0] cursor-pointer"
              >
                Close
              </button>
            </div>

            {importStatus && (
              <div
                className={`p-4 rounded-lg text-xs font-medium flex items-start gap-2 ${
                  importStatus.success
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}
              >
                {importStatus.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{importStatus.message}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#666] mb-1">Your Registered Reader Phone Number</label>
                <input
                  type="tel"
                  value={readerPhone}
                  onChange={(e) => setReaderPhone(e.target.value)}
                  placeholder="+263774479121"
                  className="w-full bg-white border border-[#e0e0e0] rounded-md px-3 py-2 text-[#2c2c2c] font-mono font-bold focus:border-[#ff6321] focus:outline-none"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Ensure this phone matches the number used when activating/downloading the book package.
                </p>
              </div>

              {/* Upload Drop Zone */}
              <div className="border-2 border-dashed border-[#e0e0e0] hover:border-[#ff6321] rounded-xl p-8 text-center bg-[#f9f9f9] hover:bg-[#fff9f6] transition-colors relative cursor-pointer group">
                <input
                  type="file"
                  accept=".zip,.datapack,.json,application/zip,application/x-zip-compressed"
                  onChange={handleImportFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <Archive className="w-10 h-10 text-[#ff6321] mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-bold text-[#2c2c2c] text-sm">Select Zipped Book Data Pack File (<span className="text-[#ff6321] font-mono">.datapack.zip</span>)</p>
                <p className="text-[#666] text-[11px] mt-1">
                  Select the book file saved in your device Downloads folder (e.g. <strong className="font-mono text-gray-700">Book_Title.datapack.zip</strong>)
                </p>
                
                <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-center gap-2 text-[10px] font-bold text-emerald-800">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>30-Day Offline Expiration Security Enabled</span>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Modal: Direct Shell Download */}
      {directDownloadModal.isOpen && directDownloadModal.book && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#e0e0e0] rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 text-[#2c2c2c]">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#f0f0f0] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 shadow-xs">
                  <DownloadCloud className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#2c2c2c]">Download Straight to Offline Shell</h3>
                  <p className="text-xs text-gray-500">1-click manuscript download to local SQLite database</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDirectDownloadModal({ isOpen: false, book: null })}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Book Info Box */}
            <div className="bg-orange-50/60 border border-orange-200 rounded-2xl p-3.5 flex items-center gap-3">
              <div
                className="w-12 h-16 rounded-lg shadow-sm border border-black/10 flex-shrink-0 p-1.5 flex flex-col justify-end"
                style={{
                  background:
                    directDownloadModal.book.coverFront?.bgType === 'image' && directDownloadModal.book.coverFront?.bgImageUrl
                      ? `url(${directDownloadModal.book.coverFront.bgImageUrl}) center/cover`
                      : `linear-gradient(to bottom right, ${directDownloadModal.book.coverFront?.gradientStart || '#ea580c'}, ${directDownloadModal.book.coverFront?.gradientEnd || '#9a3412'})`,
                }}
              >
                <span className="text-[7px] text-white font-bold font-serif line-clamp-1">
                  {directDownloadModal.book.title}
                </span>
              </div>
              <div className="min-w-0 flex-1 text-xs space-y-0.5">
                <h4 className="font-extrabold text-gray-900 truncate">{directDownloadModal.book.title}</h4>
                <p className="text-gray-600">By {directDownloadModal.book.author}</p>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="font-mono text-orange-600 font-extrabold">
                    {directDownloadModal.book.price ? `$${directDownloadModal.book.price.toFixed(2)} USD` : 'FREE'}
                  </span>
                  <span className="text-[10px] font-mono text-gray-500">
                    Category: {directDownloadModal.book.category || 'General'}
                  </span>
                </div>
              </div>
            </div>

            {downloadStatus && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-semibold flex items-start gap-2.5 ${
                  downloadStatus.success
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}
              >
                {downloadStatus.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-2 leading-relaxed">
                  <p>{downloadStatus.message}</p>
                  {downloadStatus.success && (
                    <button
                      type="button"
                      onClick={() => {
                        const b = directDownloadModal.book;
                        setDirectDownloadModal({ isOpen: false, book: null });
                        if (b) setActiveReadingBook(b);
                      }}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer mt-1"
                    >
                      <BookOpen className="w-3.5 h-3.5" /> Read Offline Now 📖
                    </button>
                  )}
                </div>
              </div>
            )}

            {!downloadStatus?.success && (
              <form onSubmit={handleConfirmDirectDownload} className="space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-bold text-[#2c2c2c] mb-1">
                    Your Registered Reader Phone Number
                  </label>
                  <input
                    type="tel"
                    value={readerPhone}
                    onChange={(e) => setReaderPhone(e.target.value)}
                    placeholder="+263774479121"
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#2c2c2c] font-mono font-bold focus:border-orange-500 focus:outline-none"
                    required
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Book access license will be bound to your phone number and device key.
                  </p>
                </div>

                {(directDownloadModal.book.price || 0) > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-[#2c2c2c] mb-1 flex items-center justify-between">
                      <span>Book Access / Activation Code</span>
                      <span className="text-[10px] font-mono text-gray-400">e.g. POP-XXXXXX or POP-FREE</span>
                    </label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={downloadActivationCode}
                        onChange={(e) => setDownloadActivationCode(e.target.value.toUpperCase())}
                        placeholder="Enter activation code received on WhatsApp..."
                        className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-xl font-mono text-xs font-bold text-[#2c2c2c] focus:border-orange-500 focus:outline-none uppercase tracking-wider"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                  <input
                    type="checkbox"
                    id="saveZipOption"
                    checked={alsoSaveZipBackup}
                    onChange={(e) => setAlsoSaveZipBackup(e.target.checked)}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 h-4 w-4"
                  />
                  <label htmlFor="saveZipOption" className="text-[11px] text-gray-700 font-medium cursor-pointer">
                    Also save backup file (<strong className="font-mono">.datapack.zip</strong>) to device Downloads folder
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <DownloadCloud className="w-4 h-4" />
                  <span>⚡ Install Straight to Offline Shell</span>
                </button>
              </form>
            )}

            {/* WhatsApp Request Footer */}
            {(directDownloadModal.book.price || 0) > 0 && !downloadStatus?.success && (
              <div className="pt-3 border-t border-gray-100 text-center space-y-2">
                <p className="text-[11px] text-gray-500 font-medium">
                  Need a WhatsApp Book Activation Code? Click below to request your code:
                </p>
                <a
                  href={formatWhatsAppPopUrl(directDownloadModal.book, readerPhone, deviceId).whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 rounded-xl bg-[#128C7E] hover:bg-[#0e6c62] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Request Code on WhatsApp (+263774479121)</span>
                </a>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
