import React from 'react';
import { BookOpen, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  isFadingOut?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ isFadingOut = false }) => {
  return (
    <div
      className={`fixed inset-0 z-[100] bg-gradient-to-br from-[#ff7d3b] via-[#ff6321] to-[#d9480f] flex flex-col items-center justify-between p-8 text-white transition-opacity duration-500 select-none ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Decorative top ambient glow */}
      <div className="w-full max-w-sm flex items-center justify-between text-white/40 pt-4">
        <span className="text-[10px] uppercase font-mono tracking-widest font-bold">Empire Of Trust</span>
        <span className="text-[10px] uppercase font-mono tracking-widest font-bold">PWA Reader</span>
      </div>

      {/* Main Centered Book Badge & Branding */}
      <div className="flex flex-col items-center justify-center space-y-6 text-center animate-in fade-in zoom-in-95 duration-700">
        
        {/* Glow Ring Wrapper */}
        <div className="relative">
          <div className="absolute -inset-4 rounded-3xl bg-white/20 blur-xl animate-pulse" />
          
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white/10 backdrop-blur-md border-2 border-white/30 flex items-center justify-center shadow-2xl overflow-hidden p-3">
            <img 
              src="/favicon.svg" 
              alt="Empire Of Trust Book Logo" 
              className="w-full h-full object-contain drop-shadow-xl animate-in zoom-in-75 duration-500" 
            />
          </div>
        </div>

        {/* Text Details */}
        <div className="space-y-2 max-w-xs">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm">
            Empire Of Trust
          </h1>
          <p className="text-xs sm:text-sm text-orange-100 font-medium leading-snug">
            Mobile Book Store & Offline PWA Reader Shell
          </p>
        </div>

        {/* Loading Spinner */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/15 backdrop-blur-xs border border-white/20 text-orange-100 text-[11px] font-mono">
          <div className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>Initializing Engine & Storage...</span>
        </div>

      </div>

      {/* Bottom Footer Badge */}
      <div className="text-center pb-2 text-[11px] text-orange-100/80 font-medium flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-white/80" />
        <span>Version 2.5 • WhatsApp Activation Engine Ready</span>
      </div>
    </div>
  );
};
