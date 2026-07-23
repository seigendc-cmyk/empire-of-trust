import React, { useState, useEffect } from 'react';
import { AppView, Book, ReaderProfile } from './types';
import { Navbar } from './components/Navbar';
import { BookStudio } from './components/studio/BookStudio';
import { PublicPortal } from './components/portal/PublicPortal';
import { ReaderShell } from './components/reader/ReaderShell';
import { GoogleAuthModal } from './components/auth/GoogleAuthModal';
import { PWAInstallPrompt } from './components/pwa/PWAInstallPrompt';
import { useDeviceAndPWA } from './hooks/useDeviceAndPWA';
import { SplashScreen } from './components/SplashScreen';
import { getSQLiteDB } from './lib/sqlite';
import { auth, logoutUser } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getOrCreateDeviceId, getSavedPhoneNumber } from './lib/dataPack';
import { Smartphone, Globe, BookOpen } from 'lucide-react';

export default function App() {
  const { isMobileOrTablet, isInstallable, isStandalone, isInIframe, promptInstall } = useDeviceAndPWA();

  // On phone or tablet, default landing page is 'reader' (My Library)
  const [currentView, setCurrentView] = useState<AppView>(() => {
    return isMobileOrTablet ? 'reader' : 'studio';
  });

  const [user, setUser] = useState<ReaderProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSqliteReady, setIsSqliteReady] = useState(false);
  const [showGuidedInstallModal, setShowGuidedInstallModal] = useState(false);

  const handlePromptInstall = async () => {
    if (isStandalone) return;
    let installed = false;
    if (isInstallable) {
      installed = await promptInstall();
    }
    if (!installed) {
      setShowGuidedInstallModal(true);
    }
  };

  // Splash screen state (shows for 8 seconds on app launch)
  const [showSplash, setShowSplash] = useState(true);
  const [isFadingSplash, setIsFadingSplash] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFadingSplash(true);
      const removeTimer = setTimeout(() => {
        setShowSplash(false);
      }, 500);
      return () => clearTimeout(removeTimer);
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  // Cross-layer navigation parameters
  const [directReadBook, setDirectReadBook] = useState<Book | null>(null);
  const [directPackJson, setDirectPackJson] = useState<string | null>(null);

  // Ensure phones/tablets redirect away from Studio to 'reader' landing page
  useEffect(() => {
    if (isMobileOrTablet && currentView === 'studio') {
      setCurrentView('reader');
    }
  }, [isMobileOrTablet, currentView]);

  // Initialize SQLite local storage engine on startup
  useEffect(() => {
    initLocalEngine();
  }, []);

  // Monitor Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || 'Google Author',
          photoURL: firebaseUser.photoURL || undefined,
          phoneNumber: firebaseUser.phoneNumber || getSavedPhoneNumber() || '+263774479121',
          deviceId: getOrCreateDeviceId(),
          registeredAt: new Date().toISOString(),
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const initLocalEngine = async () => {
    try {
      await getSQLiteDB();
      setIsSqliteReady(true);
    } catch (err) {
      console.error('Failed to boot SQLite WASM engine:', err);
    }
  };

  const handleOpenReaderWithBook = (book: Book, packJson?: string) => {
    setDirectReadBook(book);
    setDirectPackJson(packJson || null);
    setCurrentView('reader');
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-[#f2f2f2] text-[#2c2c2c] flex flex-col font-sans selection:bg-[#ff6321] selection:text-white">
      
      {/* Branded Orange Splash Screen */}
      {showSplash && <SplashScreen isFadingOut={isFadingSplash} />}

      {/* Navbar Header */}
      <Navbar
        currentView={currentView}
        onSelectView={(view) => {
          // If on mobile/tablet, forbid studio navigation
          if (isMobileOrTablet && view === 'studio') {
            setCurrentView('reader');
            return;
          }
          setCurrentView(view);
          if (view !== 'reader') {
            setDirectReadBook(null);
            setDirectPackJson(null);
          }
        }}
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        isSqliteReady={isSqliteReady}
        isMobileOrTablet={isMobileOrTablet}
        isInstallable={isInstallable}
        isStandalone={isStandalone}
        onPromptInstall={handlePromptInstall}
      />

      {/* Primary Application Views */}
      <main className="flex-1 pb-20 md:pb-0 max-w-full overflow-x-hidden">
        
        {/* PWA Install Prompt Banner */}
        <PWAInstallPrompt
          isInstallable={isInstallable}
          isStandalone={isStandalone}
          isInIframe={isInIframe}
          onInstall={promptInstall}
          showModal={showGuidedInstallModal}
          onCloseModal={() => setShowGuidedInstallModal(false)}
        />

        {/* Studio View (Desktop Only) */}
        {currentView === 'studio' && !isMobileOrTablet && (
          <BookStudio
            user={user}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        )}

        {/* Mobile Guard for Studio View */}
        {currentView === 'studio' && isMobileOrTablet && (
          <div className="max-w-2xl mx-auto my-12 px-4 text-center space-y-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#ff6321] to-[#e55315] flex items-center justify-center text-white mx-auto shadow-xl">
              <BookOpen className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-[#2c2c2c]">Studio Requires Desktop Screen</h2>
              <p className="text-sm text-[#666] leading-relaxed">
                The Book Studio manuscript editor is optimized for desktop screens with full multi-panel editing tools. On phones and tablets, enjoy browsing the Book Store and reading your downloaded books in My Library.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setCurrentView('reader')}
                className="px-5 py-2.5 rounded-xl bg-[#ff6321] text-white font-bold text-xs flex items-center gap-2 shadow-md hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Smartphone className="w-4 h-4" /> Open My Library
              </button>
              <button
                onClick={() => setCurrentView('portal')}
                className="px-5 py-2.5 rounded-xl bg-[#2c2c2c] text-white font-bold text-xs flex items-center gap-2 shadow-md hover:bg-[#1a1a1a] transition-colors cursor-pointer"
              >
                <Globe className="w-4 h-4" /> Browse Book Store
              </button>
            </div>
          </div>
        )}

        {currentView === 'portal' && (
          <PublicPortal
            user={user}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onOpenReaderWithBook={handleOpenReaderWithBook}
          />
        )}

        {currentView === 'reader' && (
          <ReaderShell
            user={user}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            directReadBook={directReadBook}
            directPackJson={directPackJson}
            isStandalone={isStandalone}
            onPromptInstall={handlePromptInstall}
          />
        )}
      </main>

      {/* Google Auth Modal */}
      <GoogleAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(profile) => setUser(profile)}
      />

      {/* Footer */}
      <footer className="border-t border-[#e0e0e0] bg-[#2c2c2c] text-white py-6 text-center text-xs">
        <p className="text-gray-300 font-medium">
          Empire Of Trust • {isMobileOrTablet ? 'Offline Reader PWA' : 'Professional Book Studio & Offline Reader'}
        </p>
      </footer>

    </div>
  );
}
