import React, { useState, useEffect } from 'react';
import {
  Store, Sparkles, ChevronLeft, ChevronRight, MessageSquare, ShieldCheck,
  ShoppingBag, ExternalLink, Pause, Play
} from 'lucide-react';
import { VendorProfile, VendorProduct } from '../../types';
import { getVendorProfile, getVendorProducts, formatWhatsAppProductUrl } from '../../lib/vendorStorage';

interface VendorTimedSlidesCardProps {
  onOpenStorefront: (vendorProfile: VendorProfile, productId?: string) => void;
}

export const VendorTimedSlidesCard: React.FC<VendorTimedSlidesCardProps> = ({ onOpenStorefront }) => {
  const [profile, setProfile] = useState<VendorProfile>(getVendorProfile());
  const [products, setProducts] = useState<VendorProduct[]>(getVendorProducts());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // Sync profile and products periodically or on mount
  useEffect(() => {
    setProfile(getVendorProfile());
    setProducts(getVendorProducts());
  }, []);

  // Timer interval for auto-sliding every 4 seconds
  useEffect(() => {
    if (!isPlaying || products.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % products.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isPlaying, products.length]);

  if (products.length === 0) return null;

  const activeProduct = products[currentIdx] || products[0];

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (prev + 1) % products.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (prev - 1 + products.length) % products.length);
  };

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  const waUrl = formatWhatsAppProductUrl(
    profile.phone,
    activeProduct.title,
    activeProduct.price,
    activeProduct.currency,
    activeProduct.whatsappMsgTemplate
  );

  return (
    <div className="bg-gradient-to-br from-amber-500/10 via-orange-400/10 to-amber-100/40 rounded-3xl p-1 shadow-md border border-orange-200/80 overflow-hidden text-slate-900 group hover:shadow-lg transition-all">
      <div className="bg-white/95 rounded-[22px] p-4 sm:p-6 space-y-4 relative">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-orange-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ff6321] text-white flex items-center justify-center shadow-md shrink-0 font-extrabold">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm sm:text-base text-slate-900">{profile.businessName}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold flex items-center gap-1 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Vendor Showcase
                </span>
              </div>
              <p className="text-xs text-[#ff6321] font-bold italic line-clamp-1">{profile.tagline || profile.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Play/Pause Timer toggle button */}
            <button
              type="button"
              onClick={handleTogglePlay}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[10px] font-bold border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
              title={isPlaying ? 'Pause timed slides' : 'Resume timed slides'}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3 h-3 text-amber-600" />
                  <span>Timed Slides (4s)</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 text-emerald-600" />
                  <span>Paused</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => onOpenStorefront(profile, activeProduct.id)}
              className="px-3.5 py-1.5 rounded-full bg-[#ff6321] hover:bg-[#e55315] text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Visit Storefront</span>
            </button>
          </div>
        </div>

        {/* Timed Slide Card Main Body */}
        <div
          onClick={() => onOpenStorefront(profile, activeProduct.id)}
          className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center cursor-pointer p-2 rounded-2xl hover:bg-orange-50/50 transition-all border border-transparent hover:border-orange-100"
        >
          
          {/* Product Image Stage (5 Cols) */}
          <div className="md:col-span-5 relative h-60 rounded-2xl overflow-hidden border border-slate-200 shadow-md group/img">
            <img
              src={activeProduct.imageUrl}
              alt={activeProduct.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-105"
            />

            {/* Badge Tag */}
            {activeProduct.badge && (
              <span className="absolute top-3 left-3 bg-[#ff6321] text-white text-[10px] font-mono font-extrabold px-3 py-1 rounded-full shadow-md uppercase tracking-wider">
                {activeProduct.badge}
              </span>
            )}

            {/* Price Tag */}
            <span className="absolute top-3 right-3 bg-white/95 backdrop-blur-md text-slate-900 font-mono font-extrabold text-sm px-3.5 py-1 rounded-full shadow-md border border-slate-200">
              {activeProduct.currency === 'USD' ? '$' : activeProduct.currency + ' '}
              {activeProduct.price.toFixed(2)}
            </span>

            {/* Slide Arrows */}
            <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none">
              <button
                type="button"
                onClick={handlePrev}
                className="p-2 rounded-full bg-white/80 hover:bg-white text-slate-800 pointer-events-auto backdrop-blur-md cursor-pointer transition-transform hover:scale-110 shadow-md border border-slate-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="p-2 rounded-full bg-white/80 hover:bg-white text-slate-800 pointer-events-auto backdrop-blur-md cursor-pointer transition-transform hover:scale-110 shadow-md border border-slate-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Slide Progress Indicator Bar */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900/80 px-3 py-1 rounded-full backdrop-blur-md border border-white/20">
              {products.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIdx(i);
                  }}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    i === currentIdx ? 'w-6 bg-[#ff6321]' : 'w-1.5 bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Product Details (7 Cols) */}
          <div className="md:col-span-7 space-y-3.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-extrabold text-[#ff6321] bg-orange-100 px-2.5 py-0.5 rounded-md border border-orange-200">
                  {activeProduct.category}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Slide {currentIdx + 1} of {products.length}
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1.5 leading-snug group-hover:text-[#ff6321] transition-colors">
                {activeProduct.title}
              </h3>

              <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
                {activeProduct.description}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-orange-50/60 border border-orange-200/70 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-700">
                <span className="font-extrabold text-emerald-700 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> Instant WhatsApp Sales Enquiry
                </span>
                <span className="font-mono text-[11px] text-slate-600 font-bold">{profile.phone}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send WhatsApp Lead Enquiry 💬</span>
                </a>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenStorefront(profile, activeProduct.id);
                  }}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs border border-slate-300 transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <ShoppingBag className="w-4 h-4 text-[#ff6321]" />
                  <span>View All Vendor Products ({products.length})</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
