import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Edit3, Globe, Smartphone, User, LogOut, MoreVertical, Database, Sparkles, CheckCircle2 } from 'lucide-react';
import { AppView, ReaderProfile } from '../types';

interface NavbarProps {
  currentView: AppView;
  onSelectView: (view: AppView) => void;
  user: ReaderProfile | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  isSqliteReady: boolean;
  isMobileOrTablet?: boolean;
  isInstallable?: boolean;
  isStandalone?: boolean;
  onPromptInstall?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSelectView,
  user,
  onOpenAuth,
  onLogout,
  isSqliteReady,
  isMobileOrTablet = false,
  isInstallable = false,
  isStandalone = false,
  onPromptInstall,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      {/* Top Header */}
      <header className="bg-[#2c2c2c] text-white border-b border-[#1a1a1a] sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo & Brand */}
            <div 
              className="flex items-center gap-2.5 sm:gap-3 cursor-pointer" 
              onClick={() => onSelectView(isMobileOrTablet ? 'reader' : 'studio')}
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#ff6321] to-[#e55315] flex items-center justify-center shadow-lg text-white font-bold shrink-0">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="font-extrabold text-base sm:text-lg text-white tracking-tight truncate max-w-[150px] sm:max-w-none">
                    Empire Of Trust
                  </span>
                  <span className="text-[9px] sm:text-[10px] uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded bg-[#ff6321]/20 text-[#ff6321] font-bold border border-[#ff6321]/30 font-mono">
                    {isMobileOrTablet ? 'Reader PWA' : 'Studio & Reader'}
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-gray-400 leading-none mt-0.5 hidden sm:block">
                  {isMobileOrTablet ? 'Mobile Reader & Book Data Pack Library' : 'Publishing Studio & Offline Reader'}
                </p>
              </div>
            </div>

            {/* Navigation Layer Tabs (Desktop / Tablet Header) */}
            <nav className="hidden md:flex items-center gap-1 bg-[#1a1a1a] p-1 rounded-lg border border-[#3a3a3a]">
              {!isMobileOrTablet && (
                <button
                  id="nav-layer-studio"
                  onClick={() => onSelectView('studio')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'studio'
                      ? 'bg-[#ff6321] text-white shadow-sm font-bold'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Studio
                </button>
              )}

              <button
                id="nav-layer-portal"
                onClick={() => onSelectView('portal')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                  currentView === 'portal'
                    ? 'bg-[#ff6321] text-white shadow-sm font-bold'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                Book Store
              </button>

              <button
                id="nav-layer-reader"
                onClick={() => onSelectView('reader')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                  currentView === 'reader'
                    ? 'bg-[#ff6321] text-white shadow-sm font-bold'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                My Library
              </button>
            </nav>

            {/* Right Info & Auth Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              
              {/* PWA Install Trigger in Top Header */}
              {!isStandalone && onPromptInstall && (
                <button
                  onClick={onPromptInstall}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#ff6321] to-[#e55315] text-white font-bold text-xs shadow-sm hover:opacity-90 transition-all cursor-pointer"
                  title="Install Empire Of Trust Mobile Reader App"
                >
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  <span className="hidden sm:inline">Install App</span>
                </button>
              )}

              {/* Sync Status Indicator */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded bg-[#1a1a1a] border border-[#3a3a3a] text-xs font-mono text-gray-300">
                <div className={`w-2 h-2 rounded-full ${isSqliteReady ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-amber-500 animate-pulse'}`} />
                <span className="text-[11px] font-semibold">
                  {isSqliteReady ? 'Library Synced' : 'Connecting...'}
                </span>
              </div>

              {/* Desktop Auth / Profile status */}
              <div className="hidden sm:block">
                {user ? (
                  <div className="flex items-center gap-2 bg-[#1a1a1a] pl-2 pr-1.5 py-1 rounded-md border border-[#3a3a3a]">
                    <div className="flex items-center gap-2">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName} className="w-6 h-6 rounded-md border border-[#ff6321]" />
                      ) : (
                        <div className="w-6 h-6 rounded-md bg-[#ff6321] flex items-center justify-center text-white text-xs font-bold">
                          {user.displayName.charAt(0)}
                        </div>
                      )}
                      <div className="text-left">
                        <p className="text-xs font-semibold text-white leading-tight max-w-[110px] truncate">{user.displayName}</p>
                        <p className="text-[10px] text-[#ff6321] leading-tight font-mono">
                          {user.phoneNumber ? user.phoneNumber : 'Account Active'}
                        </p>
                      </div>
                    </div>
                    <button
                      id="auth-logout-btn"
                      onClick={onLogout}
                      title="Logout"
                      className="p-1.5 text-gray-400 hover:text-[#ff6321] hover:bg-white/10 rounded transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    id="auth-google-login-btn"
                    onClick={onOpenAuth}
                    className="flex items-center gap-2 px-4 py-2 rounded-md bg-[#ff6321] hover:opacity-90 text-white text-xs font-bold shadow-sm transition-opacity cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5" />
                    Sign In
                  </button>
                )}
              </div>

              {/* Mobile 3-Dot Overflow Menu Button */}
              <div className="relative sm:hidden" ref={menuRef}>
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 rounded-lg bg-[#1a1a1a] border border-[#3a3a3a] text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="More options"
                >
                  <MoreVertical className="w-5 h-5 text-[#ff6321]" />
                </button>

                {/* Mobile 3-Dot Dropdown */}
                {isMobileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-[#2c2c2c] border border-[#444] rounded-xl shadow-2xl p-3 z-50 space-y-3 animate-in fade-in slide-in-from-top-2">
                    {/* User Profile Info */}
                    <div className="p-2 rounded-lg bg-[#1a1a1a] border border-[#3a3a3a]">
                      {user ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-md bg-[#ff6321] flex items-center justify-center text-white font-bold text-xs">
                              {user.displayName.charAt(0)}
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-xs font-bold text-white truncate">{user.displayName}</p>
                              <p className="text-[10px] text-gray-400 truncate">{user.email || user.phoneNumber}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              onLogout();
                              setIsMobileMenuOpen(false);
                            }}
                            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded"
                            title="Sign Out"
                          >
                            <LogOut className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            onOpenAuth();
                            setIsMobileMenuOpen(false);
                          }}
                          className="w-full py-2 rounded bg-[#ff6321] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <User className="w-3.5 h-3.5" />
                          Sign In / Account
                        </button>
                      )}
                    </div>

                    {/* Install PWA Button */}
                    {!isStandalone && onPromptInstall && (
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onPromptInstall();
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-[#ff6321] to-[#e55315] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:opacity-95 transition-opacity"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                        <span>Install Mobile Reader App</span>
                      </button>
                    )}

                    {/* Sync Status Info */}
                    <div className="flex items-center justify-between px-2 py-1.5 text-xs text-gray-300 bg-[#1a1a1a] rounded-md border border-[#3a3a3a]">
                      <span className="flex items-center gap-2 text-[11px] font-mono">
                        <Database className="w-3.5 h-3.5 text-[#ff6321]" /> Local Sync
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isSqliteReady ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {isSqliteReady ? 'Active' : 'Connecting'}
                      </span>
                    </div>

                    {/* App Features Quick List */}
                    <div className="text-[11px] text-gray-400 space-y-1 px-1">
                      <div className="flex items-center gap-1.5 text-gray-300">
                        <Sparkles className="w-3.5 h-3.5 text-[#ff6321]" />
                        <span>Empire Of Trust Reader</span>
                      </div>
                      <p className="text-[10px] text-gray-500">
                        {isMobileOrTablet 
                          ? 'Optimized Reader PWA for Mobile & Tablet.' 
                          : 'Offline PWA optimized for phones, tablets & desktop.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      </header>

      {/* FLOATING MOBILE & TABLET NAVIGATION BAR (Fixed at Bottom) */}
      <div className="md:hidden fixed bottom-3 left-3 right-3 z-50 pointer-events-auto">
        <nav className="bg-[#2c2c2c]/95 backdrop-blur-md border border-[#444] rounded-2xl p-1.5 shadow-2xl flex items-center justify-around max-w-md mx-auto ring-1 ring-black/40">
          
          {!isMobileOrTablet && (
            <button
              onClick={() => onSelectView('studio')}
              className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-medium transition-all cursor-pointer ${
                currentView === 'studio'
                  ? 'bg-[#ff6321] text-white font-bold shadow-md scale-[1.02]'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Edit3 className="w-4 h-4 mb-0.5" />
              <span>Studio</span>
            </button>
          )}

          <button
            onClick={() => onSelectView('portal')}
            className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-medium transition-all cursor-pointer ${
              currentView === 'portal'
                ? 'bg-[#ff6321] text-white font-bold shadow-md scale-[1.02]'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Globe className="w-4 h-4 mb-0.5" />
            <span>Book Store</span>
          </button>

          <button
            onClick={() => onSelectView('reader')}
            className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-medium transition-all cursor-pointer ${
              currentView === 'reader'
                ? 'bg-[#ff6321] text-white font-bold shadow-md scale-[1.02]'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Smartphone className="w-4 h-4 mb-0.5" />
            <span>My Library</span>
          </button>

        </nav>
      </div>
    </>
  );
};

