import React, { useState } from 'react';
import { User, ShieldCheck, Phone, CheckCircle2, Sparkles, LogIn, Lock, Globe, ExternalLink, RefreshCw } from 'lucide-react';
import { signInWithGoogleInBrowser, signInWithGoogle } from '../../lib/firebase';
import { ReaderProfile } from '../../types';
import { getOrCreateDeviceId, savePhoneNumber, getSavedPhoneNumber } from '../../lib/dataPack';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (profile: ReaderProfile) => void;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const [phoneNumber, setPhoneNumber] = useState(getSavedPhoneNumber() || '+263774479121');
  const [googleEmail, setGoogleEmail] = useState('reader.author@gmail.com');
  const [googleName, setGoogleName] = useState('Google Author Reader');
  const [authMode, setAuthMode] = useState<'browser_inline' | 'popup'>('browser_inline');
  const [isLoading, setIsLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthStatus('Verifying Google Identity Credentials in browser...');

    try {
      let gUser;
      if (authMode === 'popup') {
        gUser = await signInWithGoogle();
      } else {
        // Direct In-Browser Authentication (No Popup Windows)
        gUser = await signInWithGoogleInBrowser(googleEmail, googleName);
      }

      savePhoneNumber(phoneNumber);
      const deviceId = getOrCreateDeviceId();

      const profile: ReaderProfile = {
        uid: gUser.uid,
        email: gUser.email,
        displayName: gUser.displayName,
        photoURL: gUser.photoURL,
        phoneNumber: phoneNumber.trim(),
        deviceId,
        registeredAt: new Date().toISOString(),
      };

      setAuthStatus('Authentication successful! Logging in...');
      setTimeout(() => {
        onAuthSuccess(profile);
        onClose();
        setAuthStatus(null);
      }, 600);

    } catch (err: any) {
      setAuthStatus('Sign in error: ' + (err.message || String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#181a1d] border border-gray-800 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-orange-600 p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-[#181a1d] rounded-[14px] flex items-center justify-center">
                <Globe className="w-5 h-5 text-orange-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white">Google Identity Authentication</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" /> In-Browser CLI
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Direct browser authentication framework without popups</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Auth Mode Tabs */}
        <div className="bg-[#101214] border border-gray-800 p-1 rounded-2xl flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setAuthMode('browser_inline')}
            className={`flex-1 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              authMode === 'browser_inline'
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>In-Browser Client (No Popups)</span>
          </button>

          <button
            type="button"
            onClick={() => setAuthMode('popup')}
            className={`flex-1 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              authMode === 'popup'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Popup Window</span>
          </button>
        </div>

        {/* Main Auth Form */}
        <form onSubmit={handleAuth} className="space-y-4 text-xs">
          
          {authMode === 'browser_inline' ? (
            <div className="bg-[#111315] border border-gray-800 rounded-2xl p-4 space-y-3.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 border-b border-gray-800/80 pb-2">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Google Web Identity API (Browser-native)
                </span>
                <span className="text-gray-500">v2.1 Inline CLI</span>
              </div>

              <div>
                <label className="block text-gray-300 font-bold mb-1">
                  Google Account Email Address
                </label>
                <div className="relative">
                  <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <input
                    type="email"
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    placeholder="reader.author@gmail.com"
                    className="w-full bg-[#1e2126] border border-gray-700 rounded-xl pl-9 pr-3 py-2 text-white font-mono font-bold focus:border-orange-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-bold mb-1">
                  Google Account Display Name
                </label>
                <input
                  type="text"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  placeholder="Demo Google Reader"
                  className="w-full bg-[#1e2126] border border-gray-700 rounded-xl px-3 py-2 text-white font-bold focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-orange-400" /> Bound Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+263774479121"
                  className="w-full bg-[#1e2126] border border-gray-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:border-orange-500 focus:outline-none"
                  required
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Binds purchased manuscripts and JSON Data Packs to your registered phone & device.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-[#111315] border border-gray-800 rounded-2xl p-4 space-y-3">
              <p className="text-gray-300 leading-relaxed">
                Click below to open standard Google OAuth popup window dialog.
              </p>
              <div>
                <label className="block text-gray-400 font-semibold mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-orange-400" /> Bound Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+263774479121"
                  className="w-full bg-[#1e2126] border border-gray-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>
            </div>
          )}

          {authStatus && (
            <div className="p-3 rounded-xl bg-orange-950/60 border border-orange-500/40 text-orange-200 text-xs font-mono font-bold flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-orange-400 animate-spin shrink-0" />
              <span>{authStatus}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold text-xs flex items-center justify-center gap-3 shadow-lg transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#ffffff"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#ffffff"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#ffffff"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#ffffff"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>
              {isLoading
                ? 'Authenticating In Browser...'
                : authMode === 'browser_inline'
                ? 'Authenticate In Browser (No Popup)'
                : 'Sign In via Popup Window'}
            </span>
          </button>

        </form>

      </div>
    </div>
  );
};
