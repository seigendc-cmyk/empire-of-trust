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
import { getSQLiteDB, subscribeSQLiteEngineState } from './lib/sqlite';
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
    const unsubscribe = subscribeSQLiteEngineState((state) => {
      if (state.status === 'unavailable') {
        setIsSqliteReady(false);
      }
    });
    void initLocalEngine();
    return unsubscribe;
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
          phoneNumber: firebaseUser.phoneNumber || getSavedPhoneNumber() || '',
          deviceId: getOrCreateDeviceId(),
          registeredAt: new Date().toISOString(),
        });
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const initLocalEngine = async () => {
    try {
      await getSQLiteDB();
      setIsSqliteReady(true);
    } catch {
      setIsSqliteReady(false);
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

        {/* Book and Series Studio */}
        {currentView === 'studio' && (
          <BookStudio
            user={user}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
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
