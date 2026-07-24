import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Edit3, Trash2, Eye, Share2, UploadCloud, Download, CheckCircle2, 
  Sparkles, BookOpen, Layers, DollarSign, Database, FileCode, Copy,
  MessageSquare, Key, Phone, Check, Archive, ArchiveRestore, Tag, Search,
  RefreshCw, Hash, FileDown, FileText, Tv, User, Compass, Users, Shield, MoreVertical, Store, AlertTriangle
} from 'lucide-react';
import { Book, Chapter, ContentBlock, FrontCover, BackCover, ReferenceItem, ReaderProfile, DEFAULT_BOOK_CATEGORIES, BookNumberingConfig, BookFrontMatter, BookSeriesConfig, Character, CharacterAsset } from '../../types';
import { DocumentEditor } from './DocumentEditor';
import { ChapterManager } from './ChapterManager';
import { CoverEditor } from './CoverEditor';
import { ReferencesEditor } from './ReferencesEditor';
import { BookNumberingModal } from './BookNumberingModal';
import { FrontMatterModal } from './FrontMatterModal';
import { BookSeriesModal } from './BookSeriesModal';
import { BookStructureModal } from './BookStructureModal';
import { AuthorContributorsModal } from './AuthorContributorsModal';
import { CharacterAssetModal } from './CharacterAssetModal';
import { ActivationDashboard } from './ActivationDashboard';
import { VendorMarketingStudio } from './VendorMarketingStudio';
import {
  saveBookToSQLite,
  deleteBookFromSQLite,
  getAllLocalBooks,
  getSQLiteEngineState,
  retrySQLiteInitialization,
  subscribeSQLiteEngineState,
} from '../../lib/sqlite';
import { publishBookToFirestore, fetchPublishedBooksFromFirestore } from '../../lib/firebase';
import { generateRandomPopCode, formatPublisherReplyMessage, cleanPhoneNumber } from '../../lib/accessCodes';
import { exportBookToPDF } from '../../lib/pdfExporter';
import { DebouncedSaveQueue } from '../../lib/debouncedSave';

interface BookStudioProps {
  user: ReaderProfile | null;
  onOpenAuth: () => void;
<<<<<<< HEAD
  initialMode?: 'books' | 'series';
  initialBookId?: string;
}

export const BookStudio: React.FC<BookStudioProps> = ({ user, onOpenAuth, initialMode = 'books', initialBookId }) => {
  const [studioMode, setStudioMode] = useState<'books' | 'series'>(initialMode);
=======
  initialBookId?: string;
}

export const BookStudio: React.FC<BookStudioProps> = ({ user, onOpenAuth, initialBookId }) => {
>>>>>>> origin/main
  const [books, setBooks] = useState<Book[]>([]);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'covers' | 'references' | 'publish' | 'marketing'>('content');
  const [activeChapterId, setActiveChapterId] = useState<string>('');
  
  // Studio View & Filtering State
  const [studioView, setStudioView] = useState<'active' | 'archived' | 'activations'>('active');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccessMessage, setPublishSuccessMessage] = useState<string | null>(null);
  const [sqliteEngineState, setSqliteEngineState] = useState(getSQLiteEngineState);
  const [isRetryingSQLite, setIsRetryingSQLite] = useState(false);

  // Publisher POP Code Generator State
  const [generatedPopCode, setGeneratedPopCode] = useState<string | null>(null);
  const [copiedPopReply, setCopiedPopReply] = useState(false);
  const [copiedCodeOnly, setCopiedCodeOnly] = useState(false);
  const [readerPhoneForActivation, setReaderPhoneForActivation] = useState<string>('');
  const [newCustomCodeInput, setNewCustomCodeInput] = useState('');
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  // Front Matter, Series, Numbering, Structure & Author Modals State
  const [isFrontMatterModalOpen, setIsFrontMatterModalOpen] = useState(false);
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [isNumberingModalOpen, setIsNumberingModalOpen] = useState(false);
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [isAuthorContributorsModalOpen, setIsAuthorContributorsModalOpen] = useState(false);
  const [isCastModalOpen, setIsCastModalOpen] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isStudioToolbarMenuOpen, setIsStudioToolbarMenuOpen] = useState(false);

  const saveQueueRef = useRef<DebouncedSaveQueue<Book> | null>(null);
  if (!saveQueueRef.current) {
    saveQueueRef.current = new DebouncedSaveQueue(saveBookToSQLite, {
      delayMs: 700,
      onStatusChange: (status, error) => {
        if (status === 'unsaved') setSaveStatus('Unsaved changes');
        if (status === 'saving') setSaveStatus('Saving');
        if (status === 'saved') setSaveStatus('Saved');
        if (status === 'failed') {
          setSaveStatus('Save failed');
          console.error('Book Studio save failed:', error);
        }
      },
    });
  }

  const handleUpdateCharacters = (characters: Character[]) => {
    if (!activeBook) return;
    updateActiveBook({
      ...activeBook,
      characters,
    });
  };

  const handleUpdateAssets = (assets: CharacterAsset[]) => {
    if (!activeBook) return;
    updateActiveBook({
      ...activeBook,
      assets,
    });
  };

  const handleUpdateFrontMatter = (updatedMatter: BookFrontMatter) => {
    if (!activeBook) return;
    updateActiveBook({
      ...activeBook,
      frontMatter: updatedMatter,
    });
  };

  const handleUpdateSeriesConfig = (updatedSeries: BookSeriesConfig) => {
    if (!activeBook) return;
    updateActiveBook({
      ...activeBook,
      seriesConfig: updatedSeries,
    });
  };

  const handleExportPDF = async () => {
    if (!activeBook) return;
    if (!(await flushSave())) return;
    try {
      setIsExportingPDF(true);
      await exportBookToPDF(activeBook);
    } catch (err) {
      console.error('PDF Export error:', err);
      alert('Failed to generate PDF file. Please check chapter content and retry.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleUpdateNumberingConfig = (newConfig: BookNumberingConfig) => {
    if (!activeBook) return;
    updateActiveBook({
      ...activeBook,
      numberingConfig: newConfig,
    });
  };

  // Load books from local SQLite storage on mount
  useEffect(() => {
    loadLocalBooks();
  }, []);

  useEffect(() => subscribeSQLiteEngineState(setSqliteEngineState), []);

  const loadLocalBooks = async (): Promise<Book[]> => {
    try {
      const local = await getAllLocalBooks();
      if (local.length > 0) {
        setBooks(local);
        if (!activeBookId) {
          const selected = local.find((book) => book.id === initialBookId) || local[0];
          setActiveBookId(selected.id);
          if (selected.chapters.length > 0) {
            setActiveChapterId(selected.chapters[0].id);
          }
        }
        return local;
      } else {
        // Create initial default sample book
        const sample = createSampleBook();
        await saveBookToSQLite(sample);
        setBooks([sample]);
        setActiveBookId(sample.id);
        setActiveChapterId(sample.chapters[0].id);
        return [sample];
      }
    } catch (err) {
      console.error('Error loading SQLite books:', err);
      return [];
    }
  };

  const activeBook = books.find((b) => b.id === activeBookId) || null;
  const activeChapter = activeBook?.chapters.find((c) => c.id === activeChapterId) || activeBook?.chapters[0] || null;

  const scheduleSave = (book: Book) => {
    saveQueueRef.current?.schedule(book);
  };

  const flushSave = async (): Promise<boolean> => {
    try {
      await saveQueueRef.current?.flush();
      return true;
    } catch (error) {
      console.error('Book Studio save flush failed:', error);
      return false;
    }
  };

  const switchStudioView = async (view: 'active' | 'archived' | 'activations') => {
    if (await flushSave()) {
      setStudioView(view);
    }
  };

  const handleRetrySQLite = async () => {
    setIsRetryingSQLite(true);
    try {
      await retrySQLiteInitialization();
      await loadLocalBooks();
    } catch {
      // The shared engine state exposes the controlled error to the panel.
    } finally {
      setIsRetryingSQLite(false);
    }
  };

  const switchActiveTab = (tab: 'content' | 'covers' | 'references' | 'publish' | 'marketing') => {
    setActiveTab(tab);
    void flushSave()
      .then((saved) => {
        if (!saved) {
          setSaveStatus('Save failed');
        }
      })
      .catch((error) => {
        console.error('Background save failed during tab navigation:', error);
        setSaveStatus('Save failed');
      });
  };

  const switchActiveBook = async (book: Book) => {
    if (!(await flushSave())) return;
    setActiveBookId(book.id);
    setActiveChapterId(book.chapters[0]?.id || '');
  };

  useEffect(() => {
    return () => {
      void saveQueueRef.current?.dispose().catch((error) => {
        console.error('Book Studio unmount save flush failed:', error);
      });
    };
  }, []);

  useEffect(() => {
    const handlePageHide = () => {
      void flushSave();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void flushSave();
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Auto-save active book to SQLite whenever changed
  const updateActiveBook = async (updatedBook: Book) => {
    const nextBooks = books.map((b) => (b.id === updatedBook.id ? updatedBook : b));
    setBooks(nextBooks);
    scheduleSave(updatedBook);
  };

  // Archive book handler
  const handleArchiveBook = async (bookId: string) => {
    if (!(await flushSave())) return;
    const target = books.find((b) => b.id === bookId);
    if (!target) return;
    const updated: Book = {
      ...target,
      isArchived: true,
      archivedAt: new Date().toISOString(),
    };
    await saveBookToSQLite(updated);
    setBooks(books.map((b) => (b.id === bookId ? updated : b)));
    setSaveStatus('Book archived');
    setTimeout(() => setSaveStatus(null), 2500);
  };

  const handleUnarchiveBook = async (bookId: string) => {
    if (!(await flushSave())) return;
    const target = books.find((b) => b.id === bookId);
    if (!target) return;
    const updated: Book = {
      ...target,
      isArchived: false,
      archivedAt: undefined,
    };
    await saveBookToSQLite(updated);
    setBooks(books.map((b) => (b.id === bookId ? updated : b)));
    setSaveStatus('Book restored to active studio');
    setTimeout(() => setSaveStatus(null), 2500);
  };

  const handleSyncPublishedCloudBooks = async () => {
    if (!(await flushSave())) return;
    setIsSyncingCloud(true);
    try {
      const cloudBooks = await fetchPublishedBooksFromFirestore();
      let importedCount = 0;

      const existingMap = new Map(books.map((b) => [b.id, b]));
      for (const cb of cloudBooks) {
        if (!existingMap.has(cb.id)) {
          await saveBookToSQLite(cb);
          existingMap.set(cb.id, cb);
          importedCount++;
        }
      }

      const merged = Array.from(existingMap.values());
      setBooks(merged);
      alert(`Cloud store sync complete! Found ${cloudBooks.length} published books (${importedCount} new retrieved to studio).`);
    } catch (err: any) {
      alert('Cloud sync failed: ' + (err.message || 'Error occurred'));
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleCreateNewBook = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      if (!(await flushSave())) return;
      const newBookId = 'book_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      const newChapId = 'chap_' + Math.random().toString(36).substring(2, 9);
      const newRefId = 'ref_' + Math.random().toString(36).substring(2, 9);
      const blk1Id = 'blk_' + Math.random().toString(36).substring(2, 9);
      const blk2Id = 'blk_' + Math.random().toString(36).substring(2, 9);

      const newBook: Book = {
        id: newBookId,
        title: 'New Offline Masterpiece',
        subtitle: 'Created in Empire Of Trust Studio',
        author: user?.displayName || 'Master Author',
        publisherId: user?.uid || 'guest_publisher',
        description: 'An engaging new book ready for publication and distribution via PWA reader shells.',
        category: 'Accounting & Finance',
        price: 0,
        currency: 'USD',
        isPublished: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0.0',
        coverFront: {
          title: 'New Offline Masterpiece',
          subtitle: 'Created in Empire Of Trust Studio',
          author: user?.displayName || 'Master Author',
          bgType: 'gradient',
          bgColor: '#ea580c',
          gradientStart: '#ea580c',
          gradientEnd: '#9a3412',
          titleColor: '#ffffff',
          authorColor: '#fed7aa',
          layoutStyle: 'classic',
          badgeText: 'Publisher Edition',
        },
        coverBack: {
          synopsis: 'Discover deep knowledge packaged in lightweight, offline-accessible JSON book data packs.',
          blurb: '"A groundbreaking step forward for independent publishing." — Tech Literature',
          authorBio: 'Written by an innovative digital creator using the Empire Of Trust suite.',
          isbn: '978-' + Math.floor(1000000000 + Math.random() * 9000000000),
          publisherName: 'Empire Of Trust Press',
          bgColor: '#1f2125',
          textColor: '#ffffff',
        },
        chapters: [
          {
            id: newChapId,
            bookId: newBookId,
            title: 'Chapter 1: The New Era of Mobile Literature',
            chapterNumber: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            blocks: [
              {
                id: blk1Id,
                chapterId: newChapId,
                type: 'heading',
                content: 'Chapter 1: The New Era of Mobile Literature',
                meta: { headingLevel: 'h1', alignment: 'left' },
                orderIndex: 0,
              },
              {
                id: blk2Id,
                chapterId: newChapId,
                type: 'paragraph',
                content: 'Welcome to your new publishing studio! You can format paragraphs, insert headings, place high-definition images, and attach bibliographic citations seamlessly.',
                meta: { alignment: 'left' },
                orderIndex: 1,
              },
            ],
          },
        ],
        references: [
          {
            id: newRefId,
            bookId: newBookId,
            citationKey: '[1]',
            title: 'Progressive Web Apps and Modern Local Storage Engines',
            authors: 'DeepMind Web Engineering Group',
            publicationYear: '2026',
            journalOrPublisher: 'Journal of Offline Web Architecture',
          },
        ],
      };

      // Reset view filters so the newly created book card is guaranteed to be visible
      setStudioView('active');
      setCategoryFilter('ALL');
      setSearchFilter('');

      // Instantly update state and select new book
      setBooks((prev) => [newBook, ...prev]);
      setActiveBookId(newBook.id);
      setActiveChapterId(newBook.chapters[0].id);

      setSaveStatus('New book created!');
      setTimeout(() => setSaveStatus(null), 2500);

      // Persist to local SQLite asynchronously
      try {
        await saveBookToSQLite(newBook);
      } catch (sqliteErr) {
        console.warn('SQLite storage save warning for new book:', sqliteErr);
      }
    } catch (err) {
      console.error('Error creating new book:', err);
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!(await flushSave())) return;
    const targetBook = books.find((b) => b.id === bookId);
    if (!window.confirm(`Are you sure you want to permanently delete "${targetBook?.title || 'this book'}" from local SQLite storage?`)) return;
    
    await deleteBookFromSQLite(bookId);
    const updated = books.filter((b) => b.id !== bookId);

    if (updated.length === 0) {
      const newBookId = 'book_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      const cleanBook: Book = {
        id: newBookId,
        title: 'New Blank Manuscript',
        subtitle: 'Created in O-Publish Studio',
        author: user?.displayName || 'Author',
        publisherId: user?.uid || 'guest_publisher',
        description: 'A fresh book manuscript ready for writing.',
        category: 'General Non-Fiction',
        price: 0,
        currency: 'USD',
        isPublished: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0.0',
        coverFront: {
          title: 'New Blank Manuscript',
          subtitle: 'Created in O-Publish Studio',
          author: user?.displayName || 'Author',
          bgType: 'gradient',
          bgColor: '#ea580c',
          gradientStart: '#ea580c',
          gradientEnd: '#9a3412',
          titleColor: '#ffffff',
          authorColor: '#fed7aa',
          layoutStyle: 'classic',
          badgeText: 'Publisher Edition',
        },
        coverBack: {
          synopsis: 'Draft new knowledge packaged in lightweight, offline-accessible JSON book data packs.',
          blurb: 'A new manuscript ready for editing.',
          authorBio: 'Written by an author.',
          isbn: '978-' + Math.floor(1000000000 + Math.random() * 9000000000),
          publisherName: 'O-Publish Studio Press',
          bgColor: '#1f2125',
          textColor: '#ffffff',
        },
        chapters: [
          {
            id: 'chap_' + Math.random().toString(36).substring(2, 9),
            bookId: newBookId,
            title: 'Chapter 1: Getting Started',
            chapterNumber: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            blocks: [
              {
                id: 'blk_' + Math.random().toString(36).substring(2, 9),
                chapterId: '',
                type: 'heading',
                content: 'Chapter 1: Getting Started',
                meta: { headingLevel: 'h1', alignment: 'left' },
                orderIndex: 0,
              },
            ],
          },
        ],
        references: [],
        frontMatter: {},
      };
      await saveBookToSQLite(cleanBook);
      setBooks([cleanBook]);
      setActiveBookId(cleanBook.id);
      setActiveChapterId(cleanBook.chapters[0].id);
      setSaveStatus('Book deleted. Started clean draft.');
    } else {
      setBooks(updated);
      if (activeBookId === bookId) {
        setActiveBookId(updated[0].id);
        setActiveChapterId(updated[0].chapters[0]?.id || '');
      }
      setSaveStatus('Book deleted from SQLite');
    }
    setTimeout(() => setSaveStatus(null), 2500);
  };

  // Chapter handlers
  const handleAddChapter = (title: string) => {
    if (!activeBook) return;
    const newChap: Chapter = {
      id: 'chap_' + Math.random().toString(36).substring(2, 9),
      bookId: activeBook.id,
      title,
      chapterNumber: activeBook.chapters.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      blocks: [
        {
          id: 'blk_' + Math.random().toString(36).substring(2, 9),
          chapterId: '',
          type: 'heading',
          content: title,
          meta: { headingLevel: 'h2' },
          orderIndex: 0,
        },
      ],
    };
    newChap.blocks[0].chapterId = newChap.id;

    const updatedBook = {
      ...activeBook,
      chapters: [...activeBook.chapters, newChap],
      updatedAt: new Date().toISOString(),
    };
    updateActiveBook(updatedBook);
    setActiveChapterId(newChap.id);
  };

  const handleUpdateChapterBlocks = (blocks: ContentBlock[]) => {
    if (!activeBook || !activeChapter) return;
    const updatedChapters = activeBook.chapters.map((chap) =>
      chap.id === activeChapter.id ? { ...chap, blocks, updatedAt: new Date().toISOString() } : chap
    );
    updateActiveBook({ ...activeBook, chapters: updatedChapters, updatedAt: new Date().toISOString() });
  };

  // Publish to Firestore
  const handlePublishCloud = async () => {
    if (!activeBook) return;
    if (!(await flushSave())) return;
    setIsPublishing(true);
    setPublishSuccessMessage(null);
    try {
      const updatedBook = {
        ...activeBook,
        isPublished: true,
        publishedAt: new Date().toISOString(),
      };
      await publishBookToFirestore(updatedBook);
      await saveBookToSQLite(updatedBook);
      setBooks(books.map((b) => (b.id === updatedBook.id ? updatedBook : b)));
      setPublishSuccessMessage(`🎉 Book "${activeBook.title}" is published to Firebase Cloud database and live on the Public Portal!`);
    } catch (err: any) {
      console.error('Publish error:', err);
      alert('Failed to publish to Firebase: ' + (err.message || 'Error occurred'));
    } finally {
      setIsPublishing(false);
    }
  };

  const handleExportDataPack = async () => {
    if (!activeBook) return;
    if (!(await flushSave())) return;
    alert('Signed v3.0.0 data packs must be issued by the external publisher signing workflow. Browser export is disabled because the private signing key must never be shipped to the frontend.');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {sqliteEngineState.status === 'unavailable' && (
        <section
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 p-5 text-red-950 shadow-sm"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <h2 className="font-bold">Local book storage is unavailable</h2>
                <p className="mt-1 text-sm text-red-800">
                  SQLite could not start, so Studio changes cannot be saved locally. Your existing IndexedDB data has not been deleted.
                </p>
                {sqliteEngineState.error && (
                  <p className="mt-2 break-words font-mono text-xs text-red-700">
                    {sqliteEngineState.error}
                  </p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => void handleRetrySQLite()}
                disabled={isRetryingSQLite}
                className="inline-flex items-center gap-2 rounded-md bg-red-700 px-4 py-2 text-xs font-bold text-white hover:bg-red-800 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${isRetryingSQLite ? 'animate-spin' : ''}`} />
                {isRetryingSQLite ? 'Retrying…' : 'Retry'}
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-md border border-red-300 bg-white px-4 py-2 text-xs font-bold text-red-800 hover:bg-red-100"
              >
                Reload
              </button>
            </div>
          </div>
        </section>
      )}
      
      {/* Studio Header & Action Controls */}
      <div className="bg-white border border-[#e0e0e0] rounded-xl p-6 shadow-sm space-y-4">
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#ff6321] flex items-center justify-center text-white shadow-md shrink-0">
              <Edit3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[#2c2c2c]">Book Publishing Studio</h1>
                <span className="px-2 py-0.5 bg-[#f0f0f0] text-[10px] font-bold text-[#666] rounded uppercase tracking-wider">
                  Drafting & Architecture
                </span>
                {saveStatus && (
                  <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1 font-semibold">
                    <Database className="w-3 h-3 text-emerald-600" /> {saveStatus}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#666] mt-0.5">
                Categorize, draft, compile covers & references, archive books, and publish with local SQLite persistence.
              </p>
            </div>
          </div>

          {/* Top Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={handleSyncPublishedCloudBooks}
              disabled={isSyncingCloud}
              className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md bg-[#2c2c2c] hover:bg-[#1a1a1a] disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-colors"
              title="Retrieve and import all published books from Firebase Cloud database"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#ff6321] ${isSyncingCloud ? 'animate-spin' : ''}`} />
              <span>{isSyncingCloud ? 'Syncing...' : 'Retrieve Published Books'}</span>
            </button>

            <button
              id="studio-create-book-btn"
              type="button"
              onClick={(e) => handleCreateNewBook(e)}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-[#ff6321] hover:opacity-90 text-white font-bold text-xs shadow-sm transition-opacity cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create New Book
            </button>
          </div>
        </div>

        {/* View Tabs, Category Filters & Search */}
        <div className="pt-3 border-t border-[#f0f0f0] flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Active vs Archive Vault Tabs */}
          <div className="flex items-center gap-1 bg-[#f5f5f5] p-1 rounded-lg border border-[#e5e5e5]">
            <button
              onClick={() => void switchStudioView('active')}
              className={`px-3 py-1.5 rounded-md font-bold flex items-center gap-1.5 transition-all ${
                studioView === 'active'
                  ? 'bg-white text-[#ff6321] shadow-xs'
                  : 'text-[#666] hover:text-[#2c2c2c]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Active Books ({books.filter((b) => !b.isArchived).length})
            </button>

            <button
              onClick={() => void switchStudioView('archived')}
              className={`px-3 py-1.5 rounded-md font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                studioView === 'archived'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-[#666] hover:text-[#2c2c2c]'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              Archive Vault ({books.filter((b) => b.isArchived).length})
            </button>

            <button
              onClick={() => void switchStudioView('activations')}
              className={`px-3 py-1.5 rounded-md font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                studioView === 'activations'
                  ? 'bg-white text-[#128C7E] shadow-xs'
                  : 'text-[#666] hover:text-[#2c2c2c]'
              }`}
            >
              <Key className="w-3.5 h-3.5 text-[#128C7E]" />
              <span>Activation Dashboard</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#128C7E]/15 text-[#128C7E] font-extrabold text-[10px]">
                +263774479121
              </span>
            </button>
          </div>

          {/* Category Filter & Search Bar */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 max-w-xl justify-end">
            
            {/* Category Dropdown Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-[#e0e0e0] rounded-md px-2.5 py-1.5">
              <Tag className="w-3.5 h-3.5 text-[#ff6321]" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-[#2c2c2c] focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                {DEFAULT_BOOK_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Studio Search Bar */}
            <div className="relative flex-1 min-w-[160px]">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search studio books..."
                className="w-full bg-white border border-[#e0e0e0] rounded-md pl-8 pr-3 py-1.5 text-xs text-[#2c2c2c] focus:border-[#ff6321] focus:outline-none"
              />
            </div>

          </div>

        </div>

      </div>

      {/* Filtered Book Selector Grid or Activation Dashboard */}
      {studioView === 'activations' ? (
        <ActivationDashboard
          books={books}
          onUpdateBook={updateActiveBook}
          onClose={() => void switchStudioView('active')}
        />
      ) : (() => {
        const viewFiltered = books.filter((b) => (studioView === 'archived' ? b.isArchived : !b.isArchived));
        const categoryFiltered = viewFiltered.filter((b) => {
          if (categoryFilter === 'ALL') return true;
          return (b.category || 'Accounting & Finance') === categoryFilter;
        });
        const finalFiltered = categoryFiltered.filter((b) => {
          if (!searchFilter.trim()) return true;
          const q = searchFilter.toLowerCase();
          return (
            b.title.toLowerCase().includes(q) ||
            b.author.toLowerCase().includes(q) ||
            (b.category && b.category.toLowerCase().includes(q))
          );
        });

        if (finalFiltered.length === 0) {
          return (
            <div className="bg-white border border-[#e0e0e0] rounded-xl p-8 text-center space-y-2 shadow-xs">
              <Archive className="w-8 h-8 text-gray-400 mx-auto" />
              <h3 className="font-bold text-[#2c2c2c] text-sm">
                {studioView === 'archived' ? 'No Archived Books Found' : 'No Active Books Found'}
              </h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                {studioView === 'archived'
                  ? 'Archive books from your active workspace to store them safely in your vault.'
                  : 'Try adjusting your category filter or search query, or create a new book.'}
              </p>
              {studioView !== 'archived' && (
                <div className="pt-2">
                  <button
                    onClick={handleCreateNewBook}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-[#ff6321] hover:opacity-90 text-white font-bold text-xs shadow-xs transition-opacity"
                  >
                    <Plus className="w-4 h-4" /> Create New Book
                  </button>
                </div>
              )}
            </div>
          );
        }

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {finalFiltered.map((b) => (
              <div
                key={b.id}
                onClick={() => void switchActiveBook(b)}
                className={`group p-4 rounded-lg border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  activeBookId === b.id
                    ? 'bg-[#ff6321]/5 border-[#ff6321] shadow-sm'
                    : 'bg-white border-[#e0e0e0] hover:border-gray-400'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className="w-10 h-14 rounded shrink-0 shadow border border-black/10 flex items-center justify-center p-1 text-[8px] text-white font-serif font-bold text-center leading-tight overflow-hidden"
                    style={{
                      background: `linear-gradient(to bottom right, ${b.coverFront?.gradientStart || '#ea580c'}, ${b.coverFront?.gradientEnd || '#9a3412'})`,
                    }}
                  >
                    {b.title}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="font-bold text-xs text-[#2c2c2c] truncate">{b.title}</h3>
                    <p className="text-[11px] text-[#666] truncate">{b.author}</p>
                    
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-bold text-[9px] border border-gray-200">
                        {b.category || 'Accounting & Finance'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] font-mono text-[#ff6321] font-bold bg-[#ff6321]/10 px-1.5 py-0.5 rounded">
                        {b.price === 0 ? 'FREE' : `$${b.price.toFixed(2)}`}
                      </span>
                      {b.isPublished ? (
                        <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Published
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-500 font-medium">Draft</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Archive / Delete Controls */}
                <div className="pt-3 mt-3 border-t border-[#f0f0f0] flex items-center justify-between gap-1">
                  {b.isArchived ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnarchiveBook(b.id);
                      }}
                      className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[10px] font-bold flex items-center gap-1 transition-colors"
                      title="Restore book from archive vault back to active workspace"
                    >
                      <ArchiveRestore className="w-3 h-3 text-amber-600" /> Restore Book
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchiveBook(b.id);
                      }}
                      className="px-2 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded text-[10px] font-bold flex items-center gap-1 transition-colors"
                      title="Archive book to vault"
                    >
                      <Archive className="w-3 h-3 text-gray-500" /> Archive
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBook(b.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer"
                    title="Delete book from local SQLite storage"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            ))}
          </div>
        );
      })()}

      {activeBook ? (
        <div className="space-y-6">
          
          {/* Main Workspace Navigation Tabs */}
          <div className="bg-white border border-[#e0e0e0] rounded-xl p-2 flex flex-wrap items-center justify-between gap-2 shadow-sm">
            <div className="flex flex-wrap items-center gap-1 text-xs font-semibold">
              <button
                type="button"
                id="tab-content"
                onClick={() => switchActiveTab('content')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                  activeTab === 'content'
                    ? 'bg-[#ff6321] text-white shadow-sm font-bold'
                    : 'text-[#666] hover:text-[#2c2c2c] hover:bg-[#f0f0f0]'
                }`}
              >
                <BookOpen className="w-4 h-4" /> Document & Chapters
              </button>

              <button
                type="button"
                id="tab-covers"
                onClick={() => switchActiveTab('covers')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                  activeTab === 'covers'
                    ? 'bg-[#ff6321] text-white shadow-sm font-bold'
                    : 'text-[#666] hover:text-[#2c2c2c] hover:bg-[#f0f0f0]'
                }`}
              >
                <Layers className="w-4 h-4" /> Front & Back Covers
              </button>

              <button
                type="button"
                id="tab-references"
                onClick={() => switchActiveTab('references')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                  activeTab === 'references'
                    ? 'bg-[#ff6321] text-white shadow-sm font-bold'
                    : 'text-[#666] hover:text-[#2c2c2c] hover:bg-[#f0f0f0]'
                }`}
              >
                <FileCode className="w-4 h-4" /> References ({activeBook.references.length})
              </button>

              <button
                type="button"
                id="tab-publish"
                onClick={() => switchActiveTab('publish')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                  activeTab === 'publish'
                    ? 'bg-[#ff6321] text-white shadow-sm font-bold'
                    : 'text-[#666] hover:text-[#2c2c2c] hover:bg-[#f0f0f0]'
                }`}
              >
                <UploadCloud className="w-4 h-4" /> Pricing & Publishing Studio
              </button>

              <button
                type="button"
                id="tab-marketing"
                onClick={() => switchActiveTab('marketing')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all cursor-pointer ${
                  activeTab === 'marketing'
                    ? 'bg-orange-600 text-white shadow-sm font-bold'
                    : 'text-[#666] hover:text-[#2c2c2c] hover:bg-[#f0f0f0]'
                }`}
              >
                <Store className="w-4 h-4" /> Vendor Marketing Studio
              </button>
            </div>

            {/* Desktop Action Toolbar */}
            <div className="hidden xl:flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsStructureModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 font-bold text-xs border border-blue-500/30 transition-colors"
                title="Configure Book Category, Genre, Sub-Genre, Search Tags, Target Audience & Language"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Structure & Metadata</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAuthorContributorsModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 font-bold text-xs border border-amber-500/30 transition-colors"
                title="Manage Author Biography, Photo, Social Links, Co-Authors & Contributors"
              >
                <User className="w-3.5 h-3.5" />
                <span>Author & Staff</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSeriesModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 font-bold text-xs border border-purple-500/30 transition-colors"
                title="Configure Series Name, Seasons, Episode Recaps ('Previously On...') & Next Episode Teasers"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Series & Episodes</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCastModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition-colors cursor-pointer"
                title="Manage Series Characters, Actors & Owned Assets with scene image galleries"
              >
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>Cast & Gear ({activeBook?.characters?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFrontMatterModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#ff6321]/10 hover:bg-[#ff6321]/20 text-[#ff6321] font-bold text-xs border border-[#ff6321]/30 transition-colors"
                title="Manage Executive Summary, Preamble, Legal Notes, Disclaimers, and Copyrights"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Executive Summary & Legal</span>
              </button>

              <button
                type="button"
                onClick={() => setIsNumberingModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#f5f5f5] hover:bg-[#e0e0e0] text-[#2c2c2c] font-bold text-xs border border-[#e0e0e0] transition-colors"
                title="Configure chapter numbering formats and design headers"
              >
                <Hash className="w-3.5 h-3.5 text-[#ff6321]" />
                <span>Numbering & Design</span>
              </button>

              <button
                type="button"
                onClick={handleExportPDF}
                disabled={isExportingPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
                title="Export entire book with cover, TOC, tables and spreadsheets as a formatted PDF"
              >
                <FileDown className={`w-3.5 h-3.5 ${isExportingPDF ? 'animate-bounce' : ''}`} />
                <span>{isExportingPDF ? 'Generating PDF...' : 'Export Formatted PDF'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleDeleteBook(activeBook.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs border border-red-200/80 transition-colors cursor-pointer"
                title="Permanently delete this active book manuscript"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Book</span>
              </button>
            </div>

            {/* Mobile & Tablet 3-Dot Overflow Menu */}
            <div className="relative xl:hidden">
              <button
                type="button"
                onClick={() => setIsStudioToolbarMenuOpen(!isStudioToolbarMenuOpen)}
                className="p-2 rounded-md bg-[#2c2c2c] text-white hover:bg-[#1f1f1f] border border-gray-700 transition-colors flex items-center gap-1 text-xs font-bold shadow-sm"
                title="Studio Options"
              >
                <MoreVertical className="w-4 h-4 text-[#ff6321]" />
                <span>Tools</span>
              </button>

              {isStudioToolbarMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-[#2c2c2c] text-white border border-[#444] rounded-xl shadow-2xl p-2 z-50 space-y-1 animate-in fade-in slide-in-from-top-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsStructureModalOpen(true);
                      setIsStudioToolbarMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-[#3d3d3d] text-xs font-semibold flex items-center gap-2 text-blue-400"
                  >
                    <Tag className="w-3.5 h-3.5" /> Structure & Metadata
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAuthorContributorsModalOpen(true);
                      setIsStudioToolbarMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-[#3d3d3d] text-xs font-semibold flex items-center gap-2 text-amber-400"
                  >
                    <User className="w-3.5 h-3.5" /> Author & Staff
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSeriesModalOpen(true);
                      setIsStudioToolbarMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-[#3d3d3d] text-xs font-semibold flex items-center gap-2 text-purple-400"
                  >
                    <Tv className="w-3.5 h-3.5" /> Series & Episodes
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCastModalOpen(true);
                      setIsStudioToolbarMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-[#3d3d3d] text-xs font-semibold flex items-center gap-2 text-indigo-300"
                  >
                    <Users className="w-3.5 h-3.5" /> Cast & Gear ({activeBook?.characters?.length || 0})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsFrontMatterModalOpen(true);
                      setIsStudioToolbarMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-[#3d3d3d] text-xs font-semibold flex items-center gap-2 text-[#ff6321]"
                  >
                    <FileText className="w-3.5 h-3.5" /> Executive Summary & Legal
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsNumberingModalOpen(true);
                      setIsStudioToolbarMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-[#3d3d3d] text-xs font-semibold flex items-center gap-2 text-gray-200"
                  >
                    <Hash className="w-3.5 h-3.5" /> Numbering & Design
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleExportPDF();
                      setIsStudioToolbarMenuOpen(false);
                    }}
                    disabled={isExportingPDF}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-[#3d3d3d] text-xs font-semibold flex items-center gap-2 text-emerald-400"
                  >
                    <FileDown className="w-3.5 h-3.5" /> {isExportingPDF ? 'Generating PDF...' : 'Export Formatted PDF'}
                  </button>

                  <div className="border-t border-gray-700 my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteBook(activeBook.id);
                      setIsStudioToolbarMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-red-950/60 text-xs font-semibold flex items-center gap-2 text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Book
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Active Tab View */}
          {activeTab === 'content' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Chapter List */}
              <div className="lg:col-span-4">
                <ChapterManager
                  chapters={activeBook.chapters}
                  activeChapterId={activeChapterId}
                  onSelectChapter={(id) => setActiveChapterId(id)}
                  onAddChapter={handleAddChapter}
                  onRenameChapter={(id, newTitle) => {
                    const updatedChapters = activeBook.chapters.map((c) => (c.id === id ? { ...c, title: newTitle } : c));
                    updateActiveBook({ ...activeBook, chapters: updatedChapters });
                  }}
                  onDeleteChapter={(id) => {
                    const updatedChapters = activeBook.chapters.filter((c) => c.id !== id);
                    updateActiveBook({ ...activeBook, chapters: updatedChapters });
                    if (activeChapterId === id) {
                      setActiveChapterId(updatedChapters[0]?.id || '');
                    }
                  }}
                  onReorderChapters={(chapters) => {
                    updateActiveBook({ ...activeBook, chapters });
                  }}
                />
              </div>

              {/* Right Column: Active Chapter Document Formatting Studio */}
              <div className="lg:col-span-8">
                {activeChapter ? (
                  <DocumentEditor
                    blocks={activeChapter.blocks}
                    onChangeBlocks={handleUpdateChapterBlocks}
                    references={activeBook.references}
                    onAddReference={() => switchActiveTab('references')}
                  />
                ) : (
                  <div className="p-8 text-center bg-[#1e2023] rounded-2xl border border-gray-800 text-gray-400">
                    Select a chapter from the left Table of Contents to start formatting.
                  </div>
                )}
              </div>

            </div>
          )}

          {activeTab === 'covers' && (
            <CoverEditor
              frontCover={activeBook.coverFront}
              backCover={activeBook.coverBack}
              onChangeFrontCover={(coverFront) => updateActiveBook({ ...activeBook, coverFront, title: coverFront.title, author: coverFront.author })}
              onChangeBackCover={(coverBack) => updateActiveBook({ ...activeBook, coverBack })}
            />
          )}

          {activeTab === 'references' && (
            <ReferencesEditor
              references={activeBook.references}
              onAddReference={(refData) => {
                const newRef: ReferenceItem = {
                  ...refData,
                  id: 'ref_' + Math.random().toString(36).substring(2, 9),
                  bookId: activeBook.id,
                };
                updateActiveBook({ ...activeBook, references: [...activeBook.references, newRef] });
              }}
              onDeleteReference={(id) => {
                updateActiveBook({ ...activeBook, references: activeBook.references.filter((r) => r.id !== id) });
              }}
            />
          )}

          {activeTab === 'publish' && (
            <div className="bg-white border border-[#e0e0e0] rounded-xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-[#ff6321]" />
                  <h3 className="font-bold text-base text-[#2c2c2c]">Pricing, JSON Data Packs & Firebase Publishing</h3>
                </div>
              </div>

              {publishSuccessMessage && (
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{publishSuccessMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Book Meta & Price Config */}
                <div className="bg-[#f9f9f9] border border-[#e0e0e0] rounded-lg p-5 space-y-4 text-xs">
                  <h4 className="font-bold text-sm text-[#2c2c2c]">Publication Metadata & Price</h4>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#666] mb-1">Book Title</label>
                    <input
                      type="text"
                      value={activeBook.title}
                      onChange={(e) => updateActiveBook({ ...activeBook, title: e.target.value })}
                      className="w-full bg-white border border-[#e0e0e0] rounded-md px-3 py-2 text-[#2c2c2c] font-medium focus:border-[#ff6321] focus:outline-none"
                    />
                  </div>

                  {/* Book Category Selector */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#666] mb-1 flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-[#ff6321]" /> Book Category
                    </label>
                    <select
                      value={activeBook.category || 'Accounting & Finance'}
                      onChange={(e) => updateActiveBook({ ...activeBook, category: e.target.value })}
                      className="w-full bg-white border border-[#e0e0e0] rounded-md px-3 py-2 text-[#2c2c2c] font-semibold focus:border-[#ff6321] focus:outline-none text-xs"
                    >
                      {DEFAULT_BOOK_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value="Custom">Custom / Enter Other Category...</option>
                    </select>

                    {(activeBook.category === 'Custom' || !DEFAULT_BOOK_CATEGORIES.includes(activeBook.category || 'Accounting & Finance')) && (
                      <div className="mt-2">
                        <input
                          type="text"
                          value={customCategoryInput || (DEFAULT_BOOK_CATEGORIES.includes(activeBook.category || '') ? '' : activeBook.category || '')}
                          onChange={(e) => {
                            setCustomCategoryInput(e.target.value);
                            updateActiveBook({ ...activeBook, category: e.target.value || 'Accounting & Finance' });
                          }}
                          placeholder="Type custom category name..."
                          className="w-full bg-white border border-[#e0e0e0] rounded-md px-3 py-1.5 text-xs text-[#2c2c2c] font-medium focus:border-[#ff6321] focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Archive Status & Action */}
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-md flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-gray-500 block">Archive Status</span>
                      <span className="text-xs font-bold text-[#2c2c2c] flex items-center gap-1">
                        {activeBook.isArchived ? (
                          <span className="text-amber-700 flex items-center gap-1">
                            <Archive className="w-3.5 h-3.5 text-amber-600" /> Archived in Vault
                          </span>
                        ) : (
                          <span className="text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active in Workspace
                          </span>
                        )}
                      </span>
                    </div>

                    {activeBook.isArchived ? (
                      <button
                        type="button"
                        onClick={() => handleUnarchiveBook(activeBook.id)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <ArchiveRestore className="w-3.5 h-3.5" /> Restore
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleArchiveBook(activeBook.id)}
                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-800 text-white rounded text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <Archive className="w-3.5 h-3.5" /> Archive Book
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#666] mb-1">Selling Price (USD)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-400 font-bold">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={activeBook.price}
                        onChange={(e) => updateActiveBook({ ...activeBook, price: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white border border-[#e0e0e0] rounded-md pl-7 pr-3 py-2 text-[#2c2c2c] font-bold focus:border-[#ff6321] focus:outline-none font-mono"
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">Set to $0.00 to publish as a free download.</p>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#666] mb-1">Book Description</label>
                    <textarea
                      value={activeBook.description}
                      onChange={(e) => updateActiveBook({ ...activeBook, description: e.target.value })}
                      rows={3}
                      className="w-full bg-white border border-[#e0e0e0] rounded-md p-3 text-[#2c2c2c] font-medium focus:border-[#ff6321] focus:outline-none leading-relaxed"
                    />
                  </div>

                  {/* WhatsApp POP & Activation Verification Config */}
                  <div className="pt-3 border-t border-[#e0e0e0] space-y-3">
                    <h5 className="font-bold text-xs text-[#2c2c2c] flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-[#128C7E]" /> WhatsApp Activation Request Settings
                    </h5>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#666] mb-1 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-[#ff6321]" /> Publisher WhatsApp Number
                      </label>
                      <input
                        type="tel"
                        value={activeBook.whatsappNumber || '+263774479121'}
                        onChange={(e) => updateActiveBook({ ...activeBook, whatsappNumber: e.target.value })}
                        placeholder="+263774479121"
                        className="w-full bg-white border border-[#e0e0e0] rounded-md px-3 py-2 text-[#2c2c2c] font-mono font-bold focus:border-[#ff6321] focus:outline-none"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">
                        Readers send activation requests via WhatsApp to <strong className="text-[#128C7E] font-mono">+263774479121</strong> to receive their book download access code.
                      </p>
                    </div>

                    {/* Custom Access Codes List */}
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#666] mb-1 flex items-center gap-1">
                        <Key className="w-3 h-3 text-[#ff6321]" /> Registered Book Download Activation Codes
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={newCustomCodeInput}
                          onChange={(e) => setNewCustomCodeInput(e.target.value)}
                          placeholder="e.g. POP-263889 or VIP-2026"
                          className="flex-1 bg-white border border-[#e0e0e0] rounded-md px-3 py-1.5 text-xs uppercase font-mono font-bold focus:border-[#ff6321] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!newCustomCodeInput.trim()) return;
                            const existing = activeBook.accessCodes || [];
                            const codeToAdd = newCustomCodeInput.trim().toUpperCase();
                            if (!existing.includes(codeToAdd)) {
                              updateActiveBook({
                                ...activeBook,
                                accessCodes: [...existing, codeToAdd],
                              });
                            }
                            setNewCustomCodeInput('');
                          }}
                          className="px-3 py-1.5 bg-[#2c2c2c] hover:bg-[#1a1a1a] text-white font-bold text-xs rounded-md cursor-pointer"
                        >
                          Add Code
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10px] font-bold">
                          POP-{activeBook.id.substring(0, 6).toUpperCase()} (Auto)
                        </span>
                        {(activeBook.accessCodes || []).map((c, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[10px] font-bold flex items-center gap-1"
                          >
                            {c}
                            <button
                              type="button"
                              onClick={() => {
                                const filtered = (activeBook.accessCodes || []).filter((item) => item !== c);
                                updateActiveBook({ ...activeBook, accessCodes: filtered });
                              }}
                              className="text-amber-600 hover:text-red-600 font-bold ml-1 cursor-pointer"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Book Download Activation Code Engine */}
                    <div className="p-3.5 bg-[#25D366]/10 border border-[#25D366]/30 rounded-xl space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#128C7E] flex items-center gap-1.5 text-xs">
                          <Sparkles className="w-4 h-4 text-[#128C7E]" /> Book Download Activation Code Engine
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#128C7E]/20 text-[#128C7E] text-[10px] font-bold font-mono">
                          +263774479121
                        </span>
                      </div>

                      {/* Reader Phone Input */}
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-gray-700 mb-1 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#128C7E]" /> Reader's WhatsApp Phone Number
                        </label>
                        <input
                          type="tel"
                          value={readerPhoneForActivation}
                          onChange={(e) => setReaderPhoneForActivation(e.target.value)}
                          placeholder="e.g. +263774479121"
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 font-mono text-xs font-bold text-[#2c2c2c] focus:border-[#128C7E] focus:outline-none"
                        />
                        <p className="text-[10px] text-gray-500 mt-1">
                          Enter the reader's phone number to send them their download activation details automatically via WhatsApp.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const code = generateRandomPopCode(activeBook.id);
                          const replyMsg = formatPublisherReplyMessage(activeBook.title, code, readerPhoneForActivation);
                          try {
                            navigator.clipboard.writeText(replyMsg);
                            setCopiedPopReply(true);
                          } catch (e) {}

                          setGeneratedPopCode(code);

                          // Register code in book's valid access codes list
                          const existing = activeBook.accessCodes || [];
                          if (!existing.includes(code)) {
                            updateActiveBook({
                              ...activeBook,
                              accessCodes: [...existing, code],
                            });
                          }

                          setTimeout(() => setCopiedPopReply(false), 3500);
                        }}
                        className="w-full py-2.5 px-3 rounded-lg bg-[#128C7E] hover:bg-[#0e6f64] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                      >
                        <Key className="w-4 h-4" /> Generate Activation Code & Register
                      </button>

                      {generatedPopCode && (
                        <div className="p-3 rounded-xl bg-white border border-[#25D366]/50 text-xs text-[#2c2c2c] space-y-2.5 shadow-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-100">
                            <div>
                              <span className="text-[10px] text-gray-500 font-sans uppercase font-bold block">Generated Activation Code:</span>
                              <span className="font-extrabold text-[#128C7E] text-base tracking-wider font-mono bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                                {generatedPopCode}
                              </span>
                            </div>

                            {/* Copy Code Only Button */}
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(generatedPopCode);
                                setCopiedCodeOnly(true);
                                setTimeout(() => setCopiedCodeOnly(false), 2500);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Copy raw activation code only"
                            >
                              <Copy className="w-3.5 h-3.5 text-emerald-700" />
                              <span>{copiedCodeOnly ? 'Code Copied!' : 'Copy Code'}</span>
                            </button>
                          </div>

                          {/* Direct WhatsApp Send to Reader Button */}
                          <a
                            href={`https://wa.me/${cleanPhoneNumber(readerPhoneForActivation)}?text=${encodeURIComponent(
                              formatPublisherReplyMessage(activeBook.title, generatedPopCode, readerPhoneForActivation)
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2.5 px-3 rounded-lg bg-[#25D366] hover:bg-[#1ebd59] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                          >
                            <MessageSquare className="w-4 h-4" />
                            <span>Send Activation Details to Reader ({readerPhoneForActivation || 'WhatsApp'})</span>
                          </a>

                          <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1">
                            <span className="flex items-center gap-1 text-emerald-700 font-medium">
                              <Check className="w-3 h-3 text-emerald-600" /> Code registered to {activeBook.title}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const replyMsg = formatPublisherReplyMessage(activeBook.title, generatedPopCode, readerPhoneForActivation);
                                navigator.clipboard.writeText(replyMsg);
                                setCopiedPopReply(true);
                                setTimeout(() => setCopiedPopReply(false), 2500);
                              }}
                              className="text-[#128C7E] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>{copiedPopReply ? 'Reply Copied!' : 'Copy Full WhatsApp Reply'}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => void switchStudioView('activations')}
                        className="w-full py-2 px-3 rounded-lg bg-white border border-[#128C7E]/40 hover:bg-[#128C7E]/5 text-[#128C7E] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[#128C7E]" /> Open Full WhatsApp Activation Dashboard
                      </button>
                    </div>

                  </div>

                  <div className="pt-2 border-t border-[#e0e0e0] flex items-center justify-between text-[#666]">
                    <span>Total Chapters: <strong className="text-[#2c2c2c]">{activeBook.chapters.length}</strong></span>
                    <span>Total References: <strong className="text-[#2c2c2c]">{activeBook.references.length}</strong></span>
                  </div>
                </div>

                {/* Direct Distribution Actions */}
                <div className="space-y-4">
                  
                  {/* Action 1: Publish to Firebase Cloud */}
                  <div className="bg-[#f9f9f9] border border-[#e0e0e0] rounded-lg p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <UploadCloud className="w-5 h-5 text-[#ff6321]" />
                      <h4 className="font-bold text-sm text-[#2c2c2c]">1. Publish to Firebase Store</h4>
                    </div>
                    <p className="text-xs text-[#666] leading-relaxed">
                      Publish this book to the online Firebase Database store where readers can discover, sample, and claim books.
                    </p>
                    <button
                      id="publish-firebase-btn"
                      onClick={handlePublishCloud}
                      disabled={isPublishing}
                      className="w-full py-2.5 rounded-md bg-[#ff6321] hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition-opacity"
                    >
                      {isPublishing ? (
                        <span>Publishing to Firestore...</span>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4" /> Publish Book to Public Store
                        </>
                      )}
                    </button>
                  </div>

                  {/* Action 2: Export Zipped Data Pack */}
                  <div className="bg-[#f9f9f9] border border-[#e0e0e0] rounded-lg p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Download className="w-5 h-5 text-[#2c2c2c]" />
                      <h4 className="font-bold text-sm text-[#2c2c2c]">2. Download Zipped Book Data Pack</h4>
                    </div>
                    <p className="text-xs text-[#666] leading-relaxed">
                      Generate a standalone encrypted zipped `.datapack.zip` Book Data Pack saved with the book name, bound to reader phone and device ID with a 30-day expiry limit for My Library offline reading.
                    </p>
                    <button
                      id="export-datapack-btn"
                      onClick={handleExportDataPack}
                      className="w-full py-2.5 rounded-md bg-[#2c2c2c] hover:bg-[#1a1a1a] text-white text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-[#ff6321]" /> Export Zipped Data Pack (.datapack.zip)
                    </button>
                  </div>

                </div>

              </div>
            </div>
          )}

          {activeTab === 'marketing' && (
            <VendorMarketingStudio />
          )}

        </div>
      ) : null}

      {/* Front Matter & Legal Notes Modal */}
      {activeBook && (
        <FrontMatterModal
          isOpen={isFrontMatterModalOpen}
          onClose={() => setIsFrontMatterModalOpen(false)}
          frontMatter={activeBook.frontMatter || {}}
          bookTitle={activeBook.title}
          authorName={activeBook.author}
          onChangeFrontMatter={handleUpdateFrontMatter}
        />
      )}

      {/* Book Structure, Classification & Keywords Modal */}
      {activeBook && (
        <BookStructureModal
          isOpen={isStructureModalOpen}
          onClose={() => setIsStructureModalOpen(false)}
          book={activeBook}
          onUpdateBook={updateActiveBook}
        />
      )}

      {/* Author Details, Biography & Contributors Modal */}
      {activeBook && (
        <AuthorContributorsModal
          isOpen={isAuthorContributorsModalOpen}
          onClose={() => setIsAuthorContributorsModalOpen(false)}
          book={activeBook}
          onUpdateBook={updateActiveBook}
        />
      )}

      {/* Book Series, Season & Episode Modal */}
      {activeBook && (
        <BookSeriesModal
          isOpen={isSeriesModalOpen}
          onClose={() => setIsSeriesModalOpen(false)}
          seriesConfig={activeBook.seriesConfig || {}}
          bookTitle={activeBook.title}
          onChangeSeriesConfig={handleUpdateSeriesConfig}
        />
      )}

      {/* Book Numbering Formats & Design Modal */}
      {activeBook && (
        <BookNumberingModal
          isOpen={isNumberingModalOpen}
          onClose={() => setIsNumberingModalOpen(false)}
          config={activeBook.numberingConfig || {
            numberingStyle: 'arabic',
            numberingPrefix: 'Chapter',
            numberingSuffix: '',
            chapterDesignStyle: 'classic',
            showChapterNumbersInTOC: true,
            pageNumberPosition: 'bottom-center',
          }}
          onChangeConfig={handleUpdateNumberingConfig}
        />
      )}

      {/* Series Characters, Actors & Assets Studio Modal */}
      {activeBook && (
        <CharacterAssetModal
          isOpen={isCastModalOpen}
          onClose={() => setIsCastModalOpen(false)}
          characters={activeBook.characters || []}
          assets={activeBook.assets || []}
          onSaveCharacters={handleUpdateCharacters}
          onSaveAssets={handleUpdateAssets}
        />
      )}

    </div>
  );
};

// Helper to create initial rich sample book
function createSampleBook(): Book {
  const bookId = 'book_sample_pwa_guide';
  const chapId = 'chap_sample_1';
  return {
    id: bookId,
    title: 'The Offline Reader PWA Blueprint',
    subtitle: 'Building Cross-Device Book Libraries with Local SQLite Storage',
    author: 'Elena Vance',
    publisherId: 'pub_master_001',
    description: 'A comprehensive treatise on modern offline literature distribution using encrypted JSON book data packs and web WASM database engines.',
    category: 'Software Architecture & Systems',
    genre: 'Technical & Engineering',
    subGenre: 'Cloud Computing & Offline DB Systems',
    tags: ['SQLite', 'PWA', 'React', 'Offline-First', 'WebArchitecture', 'TypeScript'],
    targetAudience: 'Software Engineers, Technical Writers & Digital Publishers',
    language: 'English (US)',
    price: 9.99,
    currency: 'USD',
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: '2.1.0',
    authorDetails: {
      bio: 'Elena Vance is a Principal Systems Architect and Author specializing in offline-first web software, local WASM database engines, and progressive web application publishing platforms.',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      website: 'https://elenavance.dev',
      socialTwitter: '@elenavance_tech',
      socialLinkedin: 'https://linkedin.com/in/elenavance',
      socialGithub: 'https://github.com/elenavance',
    },
    contributors: [
      {
        id: 'contrib_1',
        name: 'Marcus Thorne',
        role: 'Co-Author',
        bio: 'Distributed systems engineer and contributor to WebAssembly SQLite bindings.',
        website: 'https://marcusthorne.io',
      },
      {
        id: 'contrib_2',
        name: 'Sophia Chen',
        role: 'Editor',
        bio: 'Senior Technical Editor with 12 years of experience in computer science literature.',
      }
    ],
    frontMatter: {
      executiveSummary: 'This blueprint establishes a standardized architecture for self-contained, offline-first digital literature. By storing book content in client-side SQLite database structures, readers enjoy zero-latency chapter transitions and full offline library persistence.',
      legalNotes: 'All software design concepts and diagrams contained herein are protected under international copyright law. Unauthorized duplication for commercial redistribution without publisher license is strictly prohibited.',
      copyrightNotice: 'Copyright © 2026 Elena Vance & O-Publish Press. All Rights Reserved. First Electronic Edition.',
      isbnNumber: '978-1-68004-921-3',
      edition: '2nd Revised Edition',
      dedication: 'Dedicated to open-web software architects and digital creators world-wide.',
      disclaimer: 'The information and code patterns provided in this book are for educational and architectural purposes. Neither the author nor publisher assumes liability for operational downtime or data loss arising from custom implementations.',
    },
    seriesConfig: {
      isSeries: true,
      seriesName: 'The PWA Architecture Chronicles',
      seasonNumber: 1,
      episodeNumber: 2,
      episodeTitle: 'Offline Storage & Web SQLite Synchronization',
      previousEpisodeRecap: 'In Season 1, Episode 1 ("PWA Service Worker Setup"), we configured background service worker caching and manifest parameters. We established local PWA installations and set up client-side offline database schemas.',
      nextEpisodeTeaser: 'In Season 1, Episode 3 ("Peer-to-Peer Data Pack Exchanges & Licenses"), we examine cryptographic verification, custom POP access codes, and offline license sharing across mobile devices.',
      nextEpisodeTitle: 'Episode 3: Peer-to-Peer Data Pack Exchanges',
      nextEpisodeReleaseDate: 'Releasing August 2026',
      showSeriesBannerInReader: true,
    },
    characters: [
      {
        id: 'char_elena',
        name: 'Elena Vance',
        role: 'Protagonist / Chief Systems Architect',
        bio: 'Lead engineer of the offline literature initiative, pioneering SQLite WASM persistence engines.',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
        images: [
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80'
        ],
        aliases: ['Elena Vance', 'Elena', 'Vance', 'Dr. Vance'],
        assetIds: ['asset_cyberdeck'],
      },
      {
        id: 'char_marcus',
        name: 'Marcus Thorne',
        role: 'Co-Author & Hardware Operative',
        bio: 'Distributed systems veteran specializing in offline hardware synchronization and PWA data pack verification.',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
        images: [
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=600&q=80'
        ],
        aliases: ['Marcus Thorne', 'Marcus', 'Thorne'],
        assetIds: ['asset_hoverbike'],
      }
    ],
    assets: [
      {
        id: 'asset_cyberdeck',
        name: 'Neural Quantum Cyberdeck',
        type: 'Gadget',
        description: 'Custom encrypted terminal used by Elena Vance for WASM database compilation.',
        images: [
          'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80'
        ],
        keywords: ['Neural Quantum Cyberdeck', 'Cyberdeck', 'Terminal'],
        ownerCharacterId: 'char_elena',
      },
      {
        id: 'asset_hoverbike',
        name: 'Aegis Speeder Bike',
        type: 'Vehicle',
        description: 'High-speed field courier vehicle owned by Marcus Thorne.',
        images: [
          'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80'
        ],
        keywords: ['Aegis Speeder Bike', 'Speeder Bike', 'Hoverbike'],
        ownerCharacterId: 'char_marcus',
      }
    ],
    coverFront: {
      title: 'The Offline Reader PWA Blueprint',
      subtitle: 'Building Cross-Device Book Libraries with Local SQLite Storage',
      author: 'Elena Vance',
      bgType: 'gradient',
      bgColor: '#ea580c',
      gradientStart: '#ea580c',
      gradientEnd: '#9a3412',
      titleColor: '#ffffff',
      authorColor: '#fed7aa',
      layoutStyle: 'classic',
      badgeText: 'PWA Master Series',
    },
    coverBack: {
      synopsis: 'Explore how SQLite WASM and IndexedDB persistence allow readers to maintain an offline digital library without central cloud dependencies.',
      blurb: '"An indispensable guide for independent authors and web engineers." — Tech Literature Quarterly',
      authorBio: 'Elena Vance is a principal software architect specializing in offline-first web engines and web assembly databases.',
      isbn: '978-1-68004-921-3',
      publisherName: 'O-Publish Matt Grey Press',
      bgColor: '#1f2125',
      textColor: '#ffffff',
    },
    chapters: [
      {
        id: chapId,
        bookId,
        title: 'Chapter 1: The Architecture of Local Web Books',
        chapterNumber: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        blocks: [
          {
            id: 'b1',
            chapterId: chapId,
            type: 'heading',
            content: 'Chapter 1: The Architecture of Local Web Books',
            meta: { headingLevel: 'h1', alignment: 'left' },
            orderIndex: 0,
          },
          {
            id: 'b2',
            chapterId: chapId,
            type: 'paragraph',
            content: 'Modern digital literature demands complete autonomy from intermittent cloud connections. By combining Service Worker web caches with client-side WebAssembly SQLite databases, digital publishers can distribute self-contained book packages.',
            meta: { alignment: 'left' },
            orderIndex: 1,
          },
          {
            id: 'b3',
            chapterId: chapId,
            type: 'quote',
            content: 'Literature should never be held hostage by network availability. The offline shell is the ultimate sanctuary for modern readers.',
            meta: { caption: 'Elena Vance, 2026' },
            orderIndex: 2,
          },
          {
            id: 'b4',
            chapterId: chapId,
            type: 'heading',
            content: 'Key Pillars of Phone & Device ID Binding',
            meta: { headingLevel: 'h2', alignment: 'left' },
            orderIndex: 3,
          },
          {
            id: 'b5',
            chapterId: chapId,
            type: 'paragraph',
            content: 'Each JSON Book Data Pack contains a cryptographic security token bound to the reader phone number and generated device token. This enables seamless cross-device synchronization while preventing unauthorized file distribution.',
            meta: { alignment: 'left' },
            orderIndex: 4,
          },
          {
            id: 'b6',
            chapterId: chapId,
            type: 'image',
            content: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1000&q=80',
            meta: { caption: 'Digital reading shell running directly inside client storage.' },
            orderIndex: 5,
          },
          {
            id: 'b7',
            chapterId: chapId,
            type: 'reference',
            content: '[1]',
            meta: { referenceId: 'ref_sample_1' },
            orderIndex: 6,
          },
        ],
      },
      {
        id: 'chap_sample_2',
        bookId,
        title: 'Chapter 2: SQLite Storage and Index Persistence',
        chapterNumber: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        blocks: [
          {
            id: 'b8',
            chapterId: 'chap_sample_2',
            type: 'heading',
            content: 'Chapter 2: SQLite Storage and Index Persistence',
            meta: { headingLevel: 'h1', alignment: 'left' },
            orderIndex: 0,
          },
          {
            id: 'b9',
            chapterId: 'chap_sample_2',
            type: 'paragraph',
            content: 'By storing books in local SQLite relational tables, the offline PWA shell can execute fast queries for bookmarks, full-text chapter searches, and reading progress updates without latency.',
            meta: { alignment: 'left' },
            orderIndex: 1,
          },
        ],
      },
    ],
    references: [
      {
        id: 'ref_sample_1',
        bookId,
        citationKey: '[1]',
        title: 'High Performance WebAssembly Relational Engines in Browsers',
        authors: 'Vance, E. & Miller, K.',
        publicationYear: '2026',
        journalOrPublisher: 'ACM Transactions on Web Storage Systems',
        url: 'https://example.org/pwa-sqlite-2026',
      },
    ],
  };
}
