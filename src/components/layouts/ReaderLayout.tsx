import React from 'react';
import { ArrowLeft, BookOpen, Download, LogIn } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';

interface Props {
  isInstallable: boolean;
  isStandalone: boolean;
  onInstall: () => void;
  onReaderLogin: () => void;
}

export const ReaderLayout: React.FC<Props> = ({
  isInstallable, isStandalone, onInstall, onReaderLogin,
}) => (
  <div className="min-h-screen bg-[#f2f2f2] text-[#2c2c2c]">
    <header className="border-b bg-[#24282c] text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/books" className="inline-flex items-center gap-2 text-xs font-bold"><ArrowLeft className="h-4 w-4" />Book Store</Link>
        <span className="inline-flex items-center gap-2 font-extrabold"><BookOpen className="h-5 w-5 text-[#ff6321]" />My Library</span>
        <div className="flex gap-2">
          {!isStandalone && <button disabled={!isInstallable} onClick={onInstall} className="text-xs font-bold disabled:opacity-50"><Download className="mr-1 inline h-4 w-4" />Install</button>}
          <button onClick={onReaderLogin} className="text-xs font-bold"><LogIn className="mr-1 inline h-4 w-4" />Reader Login</button>
        </div>
      </div>
    </header>
    <main><Outlet /></main>
  </div>
);
