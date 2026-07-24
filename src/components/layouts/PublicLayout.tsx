import React from 'react';
import { BookOpen, Download, Library, LogIn, Rows3 } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

interface Props {
  isInstallable: boolean;
  isStandalone: boolean;
  onInstall: () => void;
  onReaderLogin: () => void;
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 text-xs font-bold ${isActive ? 'bg-[#ff6321] text-white' : 'text-gray-200 hover:bg-white/10'}`;

export const PublicLayout: React.FC<Props> = ({
  isInstallable, isStandalone, onInstall, onReaderLogin,
}) => (
  <div className="min-h-screen bg-[#f2f2f2] text-[#2c2c2c]">
    <header className="sticky top-0 z-40 border-b border-black bg-[#24282c] text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <NavLink to="/books" className="flex items-center gap-2 font-extrabold">
          <span className="grid h-9 w-9 place-items-center rounded bg-[#ff6321]"><BookOpen className="h-5 w-5" /></span>
          Empire Of Trust
        </NavLink>
        <nav aria-label="Public navigation" className="flex flex-wrap items-center gap-1">
          <NavLink to="/books" className={linkClass}><BookOpen className="mr-1 inline h-4 w-4" />Book Store</NavLink>
          <NavLink to="/series" className={linkClass}><Rows3 className="mr-1 inline h-4 w-4" />Series</NavLink>
          <NavLink to="/my-library" className={linkClass}><Library className="mr-1 inline h-4 w-4" />My Library</NavLink>
          {!isStandalone && <button disabled={!isInstallable} onClick={onInstall} className="px-3 py-2 text-xs font-bold disabled:opacity-50"><Download className="mr-1 inline h-4 w-4" />Install App</button>}
          <button onClick={onReaderLogin} className="px-3 py-2 text-xs font-bold"><LogIn className="mr-1 inline h-4 w-4" />Reader Login</button>
        </nav>
      </div>
    </header>
    <main className="mx-auto max-w-7xl p-3 sm:p-6"><Outlet /></main>
  </div>
);
