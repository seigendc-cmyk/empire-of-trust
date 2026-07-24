import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import type { Book, ReaderProfile } from './types';
import { auth } from './lib/firebase';
import { getOrCreateDeviceId, getSavedPhoneNumber } from './lib/dataPack';
import { getSQLiteDB, subscribeSQLiteEngineState } from './lib/sqlite';
import { useDeviceAndPWA } from './hooks/useDeviceAndPWA';
import { PublicLayout } from './components/layouts/PublicLayout';
import { ReaderLayout } from './components/layouts/ReaderLayout';
import { StaffLayout } from './components/layouts/StaffLayout';
import { PublicPortal } from './components/portal/PublicPortal';
import { PublicSeriesCatalogue } from './components/portal/PublicSeriesCatalogue';
import { ReaderShell } from './components/reader/ReaderShell';
import { BookStudio } from './components/studio/BookStudio';
import { GoogleAuthModal } from './components/auth/GoogleAuthModal';
import {
  RequirePermission, RequireSeriesAssignment, RequireStaff,
} from './components/routing/StaffGuards';
import {
  StaffAuditLogPage, StaffDashboardPage, StaffLoginPage, StaffPlaceholderPage,
  StatusPage,
} from './components/staff/StaffPages';
import { useStaffAuth } from './contexts/StaffAuthContext';

const SeriesRoute: React.FC<{ user: ReaderProfile | null }> = ({ user }) => {
  const { seriesId } = useParams();
  return <PublicSeriesCatalogue
    initialSeriesId={seriesId}
    readerId={user?.uid}
    readerPhone={user?.phoneNumber}
  />;
};

const BookRoute: React.FC<{
  user: ReaderProfile | null;
  onOpenAuth: () => void;
  onOpenReaderWithBook: (book: Book, packJson?: string) => void;
}> = (props) => {
  const { bookId } = useParams();
  return <PublicPortal initialBookId={bookId} {...props} />;
};

const ReaderLoginPage: React.FC<{ onOpenAuth: () => void }> = ({ onOpenAuth }) => (
  <section className="mx-auto max-w-lg border bg-white p-7 text-center">
    <h1 className="text-2xl font-extrabold">Reader Login</h1>
    <p className="mt-2 text-sm text-[#666]">Reader sign-in is optional for the offline library. It is separate from staff authorization.</p>
    <button onClick={onOpenAuth} className="mt-5 bg-[#ff6321] px-4 py-2 text-sm font-bold text-white">Open reader sign in</button>
  </section>
);

const StaffStudioPage: React.FC<{ initialMode: 'books' | 'series' }> = ({ initialMode }) => {
  const { firebaseUser, staffUser } = useStaffAuth();
  const { bookId } = useParams();
  const user: ReaderProfile | null = firebaseUser && staffUser ? {
    uid: firebaseUser.uid,
    email: firebaseUser.email || staffUser.email,
    displayName: firebaseUser.displayName || staffUser.displayName,
    photoURL: firebaseUser.photoURL || undefined,
    phoneNumber: firebaseUser.phoneNumber || '',
    deviceId: getOrCreateDeviceId(),
    registeredAt: new Date().toISOString(),
  } : null;
  return <BookStudio user={user} onOpenAuth={() => undefined} initialMode={initialMode} initialBookId={bookId} />;
};

export const AppRoutes: React.FC<{
  user: ReaderProfile | null;
  onOpenReaderAuth: () => void;
  onOpenReaderWithBook: (book: Book, packJson?: string) => void;
  directReadBook: Book | null;
  directPackJson: string | null;
  isInstallable: boolean;
  isStandalone: boolean;
  onInstall: () => void;
}> = ({
  user, onOpenReaderAuth, onOpenReaderWithBook, directReadBook, directPackJson,
  isInstallable, isStandalone, onInstall,
}) => (
  <Routes>
    <Route path="/" element={<Navigate to="/books" replace />} />
    <Route element={<PublicLayout isInstallable={isInstallable} isStandalone={isStandalone} onInstall={onInstall} onReaderLogin={onOpenReaderAuth} />}>
      <Route path="/books" element={<BookRoute user={user} onOpenAuth={onOpenReaderAuth} onOpenReaderWithBook={onOpenReaderWithBook} />} />
      <Route path="/books/:bookId" element={<BookRoute user={user} onOpenAuth={onOpenReaderAuth} onOpenReaderWithBook={onOpenReaderWithBook} />} />
      <Route path="/series" element={<SeriesRoute user={user} />} />
      <Route path="/series/:seriesId" element={<SeriesRoute user={user} />} />
      <Route path="/login" element={<ReaderLoginPage onOpenAuth={onOpenReaderAuth} />} />
    </Route>

    <Route element={<ReaderLayout isInstallable={isInstallable} isStandalone={isStandalone} onInstall={onInstall} onReaderLogin={onOpenReaderAuth} />}>
      <Route path="/my-library" element={<ReaderShell user={user} onOpenAuth={onOpenReaderAuth} directReadBook={directReadBook} directPackJson={directPackJson} isStandalone={isStandalone} onPromptInstall={onInstall} />} />
    </Route>

    <Route path="/staff/login" element={<StaffLoginPage />} />
    <Route path="/access-denied" element={<StatusPage title="Access denied" message="This Firebase account does not have an active staff record." />} />
    <Route path="/staff/suspended" element={<StatusPage title="Staff account suspended" message="Contact an administrator to restore staff access." />} />
    <Route path="/staff/forbidden" element={<StatusPage title="Permission required" message="Your staff record does not grant access to this workspace." />} />

    <Route element={<RequireStaff />}>
      <Route element={<StaffLayout />}>
        <Route path="/staff" element={<RequirePermission permission="staff.portal.view"><StaffDashboardPage /></RequirePermission>} />
        <Route path="/staff/books" element={<RequirePermission permission="books.view"><StaffStudioPage initialMode="books" /></RequirePermission>} />
        <Route path="/staff/books/:bookId" element={<RequirePermission permission="books.view"><StaffStudioPage initialMode="books" /></RequirePermission>} />
        <Route path="/staff/series" element={<RequirePermission permission="series.view"><StaffStudioPage initialMode="series" /></RequirePermission>} />
        <Route path="/staff/series/:seriesId" element={<RequirePermission permission="series.view"><RequireSeriesAssignment><StaffStudioPage initialMode="series" /></RequireSeriesAssignment></RequirePermission>} />
        <Route path="/staff/series/:seriesId/production" element={<RequirePermission permission="series.edit"><RequireSeriesAssignment><StaffStudioPage initialMode="series" /></RequireSeriesAssignment></RequirePermission>} />
        <Route path="/staff/payments" element={<RequirePermission permission="payments.review"><StaffPlaceholderPage title="Payments" description="Review proof-of-payment submissions through audited server operations." /></RequirePermission>} />
        <Route path="/staff/publishing" element={<RequirePermission permission="publishing.manage"><StaffPlaceholderPage title="Publishing" description="Publish and unpublish safe public projections through audited server operations." /></RequirePermission>} />
        <Route path="/staff/audit-log" element={<RequirePermission permission="audit.view"><StaffAuditLogPage /></RequirePermission>} />
        <Route path="/staff/team" element={<RequirePermission permission="team.view"><StaffPlaceholderPage title="Team" description="Invite staff and manage roles through administrator-only server operations." /></RequirePermission>} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/books" replace />} />
  </Routes>
);

export default function App() {
  const { isInstallable, isStandalone, promptInstall } = useDeviceAndPWA();
  const navigate = useNavigate();
  const [user, setUser] = useState<ReaderProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [directReadBook, setDirectReadBook] = useState<Book | null>(null);
  const [directPackJson, setDirectPackJson] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeEngine = subscribeSQLiteEngineState(() => undefined);
    void getSQLiteDB().catch(() => undefined);
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) return setUser(null);
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || 'Reader',
        photoURL: firebaseUser.photoURL || undefined,
        phoneNumber: firebaseUser.phoneNumber || getSavedPhoneNumber() || '',
        deviceId: getOrCreateDeviceId(),
        registeredAt: new Date().toISOString(),
      });
    });
    return () => { unsubscribeEngine(); unsubscribeAuth(); };
  }, []);

  const install = async () => { if (!isStandalone) await promptInstall(); };
  const openReader = (book: Book, packJson?: string) => {
    setDirectReadBook(book);
    setDirectPackJson(packJson || null);
    navigate('/my-library');
  };

  return <>
    <AppRoutes
      user={user}
      onOpenReaderAuth={() => setIsAuthModalOpen(true)}
      onOpenReaderWithBook={openReader}
      directReadBook={directReadBook}
      directPackJson={directPackJson}
      isInstallable={isInstallable}
      isStandalone={isStandalone}
      onInstall={() => void install()}
    />
    <GoogleAuthModal
      isOpen={isAuthModalOpen}
      onClose={() => setIsAuthModalOpen(false)}
      onAuthSuccess={setUser}
    />
  </>;
}
