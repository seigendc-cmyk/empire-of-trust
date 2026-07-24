import React from 'react';
import { BookOpen, Library, LogOut, Rows3, ShieldCheck } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import type { ReaderProfile } from '../../types';

const publicLink = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 text-xs font-bold ${isActive ? 'bg-[#ff6321] text-white' : 'text-gray-200 hover:bg-white/10'}`;

export const PublicLayout: React.FC<{
  user: ReaderProfile | null;
  onOpenAuth: () => void;
}> = ({ user, onOpenAuth }) => (
  <div className="min-h-screen bg-[#f2f2f2] text-[#2c2c2c]">
    <header className="sticky top-0 z-40 border-b border-black bg-[#24282c] text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link to="/books" className="inline-flex items-center gap-2 font-extrabold"><BookOpen className="h-5 w-5 text-[#ff6321]" />Empire Of Trust</Link>
        <nav aria-label="Public navigation" className="flex items-center gap-1">
          <NavLink to="/books" className={publicLink}>Book Store</NavLink>
          <NavLink to="/series" className={publicLink}>Series</NavLink>
          <NavLink to="/my-library" className={publicLink}>My Library</NavLink>
          <button onClick={onOpenAuth} className="px-3 py-2 text-xs font-bold">{user ? user.displayName : 'Reader Login'}</button>
        </nav>
      </div>
    </header>
    <main className="mx-auto max-w-7xl p-3 sm:p-6"><Outlet /></main>
  </div>
);

export const ReaderLayout: React.FC = () => (
  <div className="min-h-screen bg-[#f2f2f2]">
    <header className="border-b bg-[#24282c] px-4 py-3 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link to="/books" className="text-xs font-bold">← Book Store</Link>
        <strong className="inline-flex items-center gap-2"><Library className="h-4 w-4 text-[#ff6321]" />My Library</strong>
      </div>
    </header>
    <Outlet />
  </div>
);

export const StaffLayout: React.FC<{
  onLogout: () => void;
}> = ({ onLogout }) => (
  <div className="min-h-screen bg-[#eef0f1] lg:grid lg:grid-cols-[220px_1fr]">
    <aside className="bg-[#24282c] p-4 text-white">
      <p className="text-[10px] font-bold uppercase text-[#ff8e5e]">Protected Staff</p>
      <h1 className="mt-1 font-extrabold">Publishing Studio</h1>
      <nav aria-label="Staff navigation" className="mt-5 grid gap-1">
        <NavLink to="/staff" end className={({isActive}) => `px-3 py-2 text-xs font-bold ${isActive?'bg-[#ff6321]':'hover:bg-white/10'}`}><ShieldCheck className="mr-2 inline h-4 w-4" />Dashboard</NavLink>
        <NavLink to="/staff/books" className={({isActive}) => `px-3 py-2 text-xs font-bold ${isActive?'bg-[#ff6321]':'hover:bg-white/10'}`}><BookOpen className="mr-2 inline h-4 w-4" />Books</NavLink>
        <NavLink to="/staff/series" className={({isActive}) => `px-3 py-2 text-xs font-bold ${isActive?'bg-[#ff6321]':'hover:bg-white/10'}`}><Rows3 className="mr-2 inline h-4 w-4" />Series Production</NavLink>
        <button onClick={onLogout} className="mt-4 border-t border-white/15 px-3 py-3 text-left text-xs font-bold"><LogOut className="mr-2 inline h-4 w-4" />Sign Out</button>
      </nav>
    </aside>
    <main className="min-w-0"><Outlet /></main>
  </div>
);
