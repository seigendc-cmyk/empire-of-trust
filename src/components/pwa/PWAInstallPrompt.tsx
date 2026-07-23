import React, { useState } from 'react';
import { Download, Smartphone, X, Sparkles, BookOpen, ExternalLink, CheckCircle2, Share2, MoreVertical, PlusSquare, Monitor } from 'lucide-react';

interface PWAInstallPromptProps {
  isInstallable: boolean;
  isStandalone: boolean;
  isInIframe?: boolean;
  onInstall: () => Promise<boolean>;
  showModal?: boolean;
  onCloseModal?: () => void;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  isInstallable,
  isStandalone,
  isInIframe = false,
  onInstall,
  showModal,
  onCloseModal,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [internalShowModal, setInternalShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>('android');

  const isModalOpen = showModal !== undefined ? showModal : internalShowModal;
  const closeModal = () => {
    if (onCloseModal) onCloseModal();
    setInternalShowModal(false);
  };

  // Detect platform
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);

  // Set default tab based on platform
  React.useEffect(() => {
    if (isIOS) setActiveTab('ios');
    else if (isAndroid) setActiveTab('android');
    else setActiveTab('desktop');
  }, [isIOS, isAndroid]);

  if (isStandalone || !isInstallable) {
    return null;
  }

  const handleInstallClick = async () => {
    setInstalling(true);
    let installed = false;
    
    if (isInstallable) {
      installed = await onInstall();
    }

    setInstalling(false);

    // If native prompt wasn't triggered or was cancelled/unavailable (e.g. inside iframe), show guided modal
    if (!installed) {
      if (showModal === undefined) {
        setInternalShowModal(true);
      } else if (onCloseModal) {
        // If controlled by parent, parent handler should open modal
      }
    }
  };

  const handleOpenStandaloneWindow = () => {
    window.open(window.location.origin, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      {/* Top Banner Prompt */}
      {!isDismissed && (
        <div className="bg-gradient-to-r from-[#ff6321] via-[#ea580c] to-[#c2410c] text-white p-3.5 sm:p-4 rounded-2xl shadow-xl border border-white/20 my-4 max-w-7xl mx-auto px-4 sm:px-6 relative overflow-hidden animate-in fade-in slide-in-from-top-2">
          
          {/* Background Decorative Book Shapes */}
          <div className="absolute -right-8 -bottom-8 opacity-15 pointer-events-none">
            <BookOpen className="w-40 h-40 text-white" />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
            
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0 shadow-inner">
                <img src="/favicon.svg" alt="Book Icon" className="w-8 h-8 drop-shadow" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                    Install Mobile Reader App
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[10px] font-bold text-orange-100 uppercase tracking-wider border border-white/20">
                    PWA Ready
                  </span>
                </div>
                <p className="text-xs text-orange-100 leading-tight mt-0.5 max-w-xl">
                  Add Empire Of Trust to your device home screen for fast, offline access to your manuscript library & book data packs.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-1 sm:pt-0">
              <button
                onClick={handleInstallClick}
                disabled={installing}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-white text-[#ff6321] hover:bg-orange-50 font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#ff6321]" />
                {installing ? 'Launching...' : 'Install Mobile Reader App'}
              </button>

              <button
                onClick={() => setIsDismissed(true)}
                className="p-2 rounded-xl hover:bg-white/10 text-orange-100 hover:text-white transition-colors cursor-pointer"
                title="Dismiss prompt"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Guided PWA Installation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#ff6321] flex items-center justify-center text-white shadow-md">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#2c2c2c]">Install Mobile Reader App</h3>
                  <p className="text-[11px] text-gray-500">Empire Of Trust Progressive Web App (PWA)</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-[#2c2c2c] p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PWA Diagnostic Checklist */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2 text-xs">
              <span className="font-extrabold text-gray-800 text-[11px] uppercase tracking-wider block">
                PWA Device Readiness Diagnostics:
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 p-1.5 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Service Worker (v2)</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 p-1.5 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Manifest.json</span>
                </div>
                <div className={`flex items-center gap-1.5 p-1.5 rounded-lg border ${
                  isInIframe
                    ? 'text-amber-800 bg-amber-50 border-amber-200'
                    : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                }`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isInIframe ? 'text-amber-600' : 'text-emerald-600'}`} />
                  <span className="truncate">{isInIframe ? 'Preview iFrame' : 'Direct Browser'}</span>
                </div>
                <div className={`flex items-center gap-1.5 p-1.5 rounded-lg border ${
                  isInstallable
                    ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                    : 'text-blue-800 bg-blue-50 border-blue-200'
                }`}>
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">{isInstallable ? 'Native Prompt Ready' : 'Manual Install Ready'}</span>
                </div>
              </div>
            </div>

            {/* Frame Bypass Launcher Notice */}
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3.5 text-xs text-orange-950 space-y-2">
              <div className="flex items-center justify-between font-bold text-orange-900">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#ff6321]" /> Preview Frame Installation Tip
                </span>
                <span className="bg-orange-200 text-orange-900 text-[10px] font-mono px-2 py-0.5 rounded-full uppercase">
                  Full Features
                </span>
              </div>
              <p className="text-[11px] text-orange-800 leading-relaxed">
                {isInIframe
                  ? 'Browsers prevent native "Add to Home Screen" popups inside embedded preview frames. Click below to open in a direct tab/window, then click "Install App"!'
                  : 'If native prompt does not trigger automatically, follow the step-by-step browser guide below for your phone or tablet.'}
              </p>
              <button
                onClick={handleOpenStandaloneWindow}
                className="w-full py-2.5 px-3 rounded-xl bg-[#ff6321] hover:bg-[#e55315] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" /> Open App in Direct Window to Install
              </button>
            </div>

            {/* Platform Instructions Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#2c2c2c]">Installation Steps by Platform:</label>
                <div className="flex bg-gray-100 p-0.5 rounded-lg text-[11px] font-semibold">
                  <button
                    onClick={() => setActiveTab('android')}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer ${activeTab === 'android' ? 'bg-[#ff6321] text-white font-bold shadow-xs' : 'text-gray-600 hover:text-black'}`}
                  >
                    Android
                  </button>
                  <button
                    onClick={() => setActiveTab('ios')}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer ${activeTab === 'ios' ? 'bg-[#ff6321] text-white font-bold shadow-xs' : 'text-gray-600 hover:text-black'}`}
                  >
                    iOS / iPhone
                  </button>
                  <button
                    onClick={() => setActiveTab('desktop')}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer ${activeTab === 'desktop' ? 'bg-[#ff6321] text-white font-bold shadow-xs' : 'text-gray-600 hover:text-black'}`}
                  >
                    Desktop
                  </button>
                </div>
              </div>

              {/* Step Details */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs space-y-3">
                {activeTab === 'android' && (
                  <ol className="space-y-2.5 text-[#2c2c2c]">
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#ff6321] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                      <div>
                        <strong>Open in Google Chrome or Edge</strong> on your Android phone/tablet.
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#ff6321] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                      <div>
                        Tap the <strong className="inline-flex items-center gap-1 bg-gray-200 px-1.5 py-0.5 rounded text-[11px]"><MoreVertical className="w-3 h-3" /> Menu (3 dots)</strong> at the top-right corner.
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#ff6321] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                      <div>
                        Select <strong className="text-[#ff6321]">"Add to Home screen"</strong> or <strong className="text-[#ff6321]">"Install app"</strong>.
                      </div>
                    </li>
                  </ol>
                )}

                {activeTab === 'ios' && (
                  <ol className="space-y-2.5 text-[#2c2c2c]">
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#ff6321] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                      <div>
                        Open this website in <strong>Apple Safari</strong> on your iPhone or iPad.
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#ff6321] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                      <div>
                        Tap the <strong className="inline-flex items-center gap-1 bg-gray-200 px-1.5 py-0.5 rounded text-[11px]"><Share2 className="w-3 h-3" /> Share button</strong> at the bottom browser bar.
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#ff6321] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                      <div>
                        Scroll down and tap <strong className="text-[#ff6321] inline-flex items-center gap-1"><PlusSquare className="w-3 h-3" /> Add to Home Screen</strong>.
                      </div>
                    </li>
                  </ol>
                )}

                {activeTab === 'desktop' && (
                  <ol className="space-y-2.5 text-[#2c2c2c]">
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#ff6321] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                      <div>
                        In <strong>Chrome, Edge, or Brave</strong>, look at the right end of your URL address bar.
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#ff6321] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                      <div>
                        Click the <strong className="inline-flex items-center gap-1 bg-gray-200 px-1.5 py-0.5 rounded text-[11px]"><Download className="w-3 h-3 text-[#ff6321]" /> Install Icon</strong> or browser menu.
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#ff6321] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                      <div>
                        Click <strong className="text-[#ff6321]">"Install"</strong> to add Empire Of Trust directly to your desktop apps.
                      </div>
                    </li>
                  </ol>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
              <span className="text-gray-500 font-mono text-[11px]">Mode: {isStandalone ? 'Standalone App' : 'Web View'}</span>
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
