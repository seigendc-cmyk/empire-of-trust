import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, type User } from 'firebase/auth';
import type { Book, ReaderProfile } from './types';
import { auth, logoutUser } from './lib/firebase';
import { getOrCreateDeviceId, getSavedPhoneNumber } from './lib/dataPack';
import { getSQLiteDB, subscribeSQLiteEngineState } from './lib/sqlite';
import { useDeviceAndPWA } from './hooks/useDeviceAndPWA';
import { PublicPortal } from './components/portal/PublicPortal';
import { PublicSeriesCatalogue } from './components/portal/PublicSeriesCatalogue';
import { ReaderShell } from './components/reader/ReaderShell';
import { GoogleAuthModal } from './components/auth/GoogleAuthModal';
import { PWAInstallPrompt } from './components/pwa/PWAInstallPrompt';
import { PublicLayout, ReaderLayout, StaffLayout } from './components/layouts/RouteLayouts';
import { RequireStaff } from './components/routing/RequireStaff';
import {
  BookBuilderRoute, InteractiveProductionRoute, SeriesStudioRoute,
  StaffDashboardRoute, StaffLoginRoute,
} from './components/routing/StudioRoutes';
import { StaffRouteProvider } from './contexts/StaffRouteContext';

export interface AppRoutesProps {
  reader: ReaderProfile | null;
  directReadBook: Book | null;
  directPackJson: string | null;
  isStandalone: boolean;
  onOpenReaderAuth: () => void;
  onOpenReaderWithBook: (book: Book, packJson?: string) => void;
  onPromptInstall: () => void;
  onStaffLogout: () => void;
}

export const AppRoutes: React.FC<AppRoutesProps> = ({
  reader, directReadBook, directPackJson, isStandalone, onOpenReaderAuth,
  onOpenReaderWithBook, onPromptInstall, onStaffLogout,
}) => (
  <Routes>
    <Route path="/" element={<Navigate to="/books" replace />} />
    <Route element={<PublicLayout user={reader} onOpenAuth={onOpenReaderAuth} />}>
      <Route path="/books" element={<PublicPortal user={reader} onOpenAuth={onOpenReaderAuth} onOpenReaderWithBook={onOpenReaderWithBook} />} />
      <Route path="/series" element={<PublicSeriesCatalogue readerId={reader?.uid} readerPhone={reader?.phoneNumber} />} />
    </Route>
    <Route element={<ReaderLayout />}>
      <Route path="/my-library" element={<ReaderShell user={reader} onOpenAuth={onOpenReaderAuth} directReadBook={directReadBook} directPackJson={directPackJson} isStandalone={isStandalone} onPromptInstall={onPromptInstall} />} />
    </Route>

    <Route path="/staff/login" element={<StaffLoginRoute />} />
    <Route element={<RequireStaff />}>
      <Route element={<StaffLayout onLogout={onStaffLogout} />}>
        <Route path="/staff" element={<StaffDashboardRoute />} />
        <Route path="/staff/books" element={<BookBuilderRoute />} />
        <Route path="/staff/books/:bookId" element={<BookBuilderRoute />} />
        <Route path="/staff/series" element={<SeriesStudioRoute />} />
        <Route path="/staff/series/:seriesId" element={<SeriesStudioRoute />} />
        <Route path="/staff/series/:seriesId/production" element={<InteractiveProductionRoute />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/books" replace />} />
  </Routes>
);

export default function App() {
  const { isInstallable, isStandalone, isInIframe, promptInstall } = useDeviceAndPWA();
  const navigate = useNavigate();
  const [reader, setReader] = useState<ReaderProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [directReadBook, setDirectReadBook] = useState<Book | null>(null);
  const [directPackJson, setDirectPackJson] = useState<string | null>(null);
  const [showGuidedInstallModal, setShowGuidedInstallModal] = useState(false);

  useEffect(() => {
    const unsubscribeStorage = subscribeSQLiteEngineState(() => undefined);
    void getSQLiteDB().catch(() => undefined);
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthResolved(true);
      if (!user) return setReader(null);
      setReader({
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Reader',
        photoURL: user.photoURL || undefined,
        phoneNumber: user.phoneNumber || getSavedPhoneNumber() || '',
        deviceId: getOrCreateDeviceId(),
        registeredAt: new Date().toISOString(),
      });
    });
    return () => { unsubscribeStorage(); unsubscribeAuth(); };
  }, []);

  const install = async () => {
    if (isStandalone) return;
    const installed = isInstallable ? await promptInstall() : false;
    if (!installed) setShowGuidedInstallModal(true);
  };
  const openReader = (book: Book, packJson?: string) => {
    setDirectReadBook(book);
    setDirectPackJson(packJson || null);
    navigate('/my-library');
  };
  const staffLogout = async () => {
    await logoutUser();
    navigate('/books');
  };

  return <StaffRouteProvider resolved={authResolved} user={firebaseUser}>
    <AppRoutes
      reader={reader}
      directReadBook={directReadBook}
      directPackJson={directPackJson}
      isStandalone={isStandalone}
      onOpenReaderAuth={() => setIsAuthModalOpen(true)}
      onOpenReaderWithBook={openReader}
      onPromptInstall={() => void install()}
      onStaffLogout={() => void staffLogout()}
    />
    <PWAInstallPrompt
      isInstallable={isInstallable}
      isStandalone={isStandalone}
      isInIframe={isInIframe}
      onInstall={promptInstall}
      showModal={showGuidedInstallModal}
      onCloseModal={() => setShowGuidedInstallModal(false)}
    />
    <GoogleAuthModal
      isOpen={isAuthModalOpen}
      onClose={() => setIsAuthModalOpen(false)}
      onAuthSuccess={setReader}
    />
  </StaffRouteProvider>;
}
