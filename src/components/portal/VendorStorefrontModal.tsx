import React, { useState } from 'react';
import {
  Store, MessageSquare, Phone, MapPin, Tag, ShieldCheck, ExternalLink,
  X, Search, CheckCircle2, Copy, Share2, Sparkles, Filter, ShoppingBag
} from 'lucide-react';
import { VendorProfile, VendorProduct } from '../../types';
import { formatWhatsAppProductUrl } from '../../lib/vendorStorage';

interface VendorStorefrontModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorProfile: VendorProfile;
  products: VendorProduct[];
  initialSelectedProductId?: string;
}

export const VendorStorefrontModal: React.FC<VendorStorefrontModalProps> = ({
  isOpen,
  onClose,
  vendorProfile,
  products,
  initialSelectedProductId,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<VendorProduct | null>(
    products.find((p) => p.id === initialSelectedProductId) || products[0] || null
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'title_asc' | 'title_desc' | 'price_asc' | 'price_desc'>('title_asc');
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const categories = ['ALL', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products
    .filter((p) => {
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.price.toString().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'title_asc') return a.title.localeCompare(b.title);
      if (sortBy === 'title_desc') return b.title.localeCompare(a.title);
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      return 0;
    });

  const handleCopyWhatsAppText = (p: VendorProduct) => {
    const waUrl = formatWhatsAppProductUrl(
      vendorProfile.phone,
      p.title,
      p.price,
      p.currency,
      p.whatsappMsgTemplate
    );
    navigator.clipboard.writeText(waUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-[#d8d8d8] rounded-3xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-[#2c2c2c] animate-in fade-in zoom-in-95">
        
        {/* Vendor Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-zinc-800 to-stone-900 text-white p-5 sm:p-6 relative border-b border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Close Storefront"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={vendorProfile.logoUrl || 'https://images.unsplash.com/photo-1535551951406-a19828b0a76b?auto=format&fit=crop&w=400&q=80'}
                alt={vendorProfile.businessName}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-orange-500 shadow-md shrink-0"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-extrabold text-white">{vendorProfile.businessName}</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[10px] flex items-center gap-1 border border-emerald-500/30">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Verified Vendor Storefront
                  </span>
                </div>
                {vendorProfile.tagline && (
                  <p className="text-xs text-orange-400 font-semibold italic mt-0.5">{vendorProfile.tagline}</p>
                )}
                <p className="text-xs text-slate-300 mt-1 line-clamp-2 max-w-2xl">{vendorProfile.description}</p>
              </div>
            </div>

            {/* Vendor Direct Contact WhatsApp Pill */}
            <div className="shrink-0 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl p-3 text-right space-y-1">
              <div className="text-[10px] font-mono text-emerald-300 font-bold uppercase tracking-wider">
                Vendor WhatsApp Desk
              </div>
              <a
                href={`https://wa.me/${vendorProfile.phone.replace(/[^0-[#9+]/g, '').replace('+', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{vendorProfile.phone}</span>
              </a>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-4 text-xs text-slate-300">
            <span className="flex items-center gap-1 text-orange-300">
              <ShoppingBag className="w-3.5 h-3.5 text-orange-400" /> {products.length} Products Catalog
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> {vendorProfile.address || 'Harare, Zimbabwe'}
            </span>
            <span className="flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-blue-400" /> {vendorProfile.category}
            </span>
          </div>
        </div>

        {/* Filter & Sort Order Bar */}
        <div className="bg-slate-50 border-b border-[#e0e0e0] p-3 px-6 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 overflow-x-auto py-1 flex-1">
            <span className="font-bold text-[#666] text-[11px] uppercase tracking-wider shrink-0">Category:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#ff6321] text-white shadow-xs'
                    : 'bg-white text-[#555] hover:bg-[#e0e0e0] border border-[#d5d5d5]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 max-w-md w-full sm:w-auto">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#888]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full bg-white border border-[#d0d0d0] rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-[#ff6321]"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-[#d0d0d0] rounded-xl px-2.5 py-1.5 shrink-0">
              <Filter className="w-3.5 h-3.5 text-[#ff6321]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-[#2c2c2c] focus:outline-none cursor-pointer pr-1"
              >
                <option value="title_asc">Title A-Z</option>
                <option value="title_desc">Title Z-A</option>
                <option value="price_asc">Price: Low-High</option>
                <option value="price_desc">Price: High-Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Modal Main Content Grid */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* Selected Featured Product Highlight Box */}
          {selectedProduct && (
            <div className="bg-gradient-to-br from-orange-50/60 via-amber-50/30 to-white border-2 border-orange-300 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row gap-5 items-start">
                
                <div className="relative w-full md:w-64 h-56 rounded-2xl overflow-hidden border border-orange-200 shadow-md shrink-0">
                  <img
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.title}
                    className="w-full h-full object-cover"
                  />
                  {selectedProduct.badge && (
                    <span className="absolute top-2.5 left-2.5 bg-orange-600 text-white text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded-full shadow-md uppercase">
                      {selectedProduct.badge}
                    </span>
                  )}
                  <span className="absolute top-2.5 right-2.5 bg-black/80 text-amber-300 font-mono font-extrabold text-xs px-2.5 py-0.5 rounded-full shadow-md">
                    {selectedProduct.currency === 'USD' ? '$' : selectedProduct.currency + ' '}
                    {selectedProduct.price.toFixed(2)}
                  </span>
                </div>

                <div className="flex-1 space-y-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-orange-600 uppercase bg-orange-100 px-2 py-0.5 rounded">
                      {selectedProduct.category}
                    </span>
                    <h3 className="text-lg font-extrabold text-[#1f1f1f] mt-1">{selectedProduct.title}</h3>
                    <p className="text-xs text-[#555] mt-1 leading-relaxed">{selectedProduct.description}</p>
                  </div>

                  <div className="p-3 bg-white border border-emerald-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4 text-emerald-600" /> WhatsApp Direct Sales Enquiry Lead
                      </span>
                      <span className="text-[10px] font-mono text-emerald-600">Fast Vendor Response ⚡</span>
                    </div>

                    <p className="text-[11px] text-[#666] italic bg-slate-50 p-2 rounded-lg border border-slate-200 font-mono">
                      "{selectedProduct.whatsappMsgTemplate || `Hello ${vendorProfile.businessName}, I am inquiring about '${selectedProduct.title}' priced at $${selectedProduct.price.toFixed(2)}.`}"
                    </p>

                    <div className="pt-1 flex flex-wrap items-center gap-2">
                      <a
                        href={formatWhatsAppProductUrl(
                          vendorProfile.phone,
                          selectedProduct.title,
                          selectedProduct.price,
                          selectedProduct.currency,
                          selectedProduct.whatsappMsgTemplate
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Send WhatsApp Enquiry To Vendor</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleCopyWhatsAppText(selectedProduct)}
                        className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition-colors flex items-center gap-1.5"
                      >
                        {copiedLink ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedLink ? 'Link Copied!' : 'Copy WhatsApp Link'}</span>
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Product Grid Catalog */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm text-[#1f1f1f] flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-orange-600" /> Storefront Catalog ({filteredProducts.length})
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((p) => {
                const waUrl = formatWhatsAppProductUrl(
                  vendorProfile.phone,
                  p.title,
                  p.price,
                  p.currency,
                  p.whatsappMsgTemplate
                );

                const isSelected = selectedProduct?.id === p.id;

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProduct(p)}
                    className={`bg-white rounded-2xl border transition-all cursor-pointer flex flex-col justify-between overflow-hidden group ${
                      isSelected
                        ? 'border-orange-500 ring-2 ring-orange-400/40 shadow-md'
                        : 'border-[#e0e0e0] hover:border-orange-300 hover:shadow-md'
                    }`}
                  >
                    <div>
                      <div className="relative h-44 bg-slate-100 overflow-hidden">
                        <img
                          src={p.imageUrl}
                          alt={p.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {p.badge && (
                          <span className="absolute top-2 left-2 bg-orange-600 text-white text-[9px] font-mono font-extrabold px-2 py-0.5 rounded-full shadow-xs uppercase">
                            {p.badge}
                          </span>
                        )}
                        <span className="absolute top-2 right-2 bg-black/80 text-amber-300 font-mono font-extrabold text-xs px-2 py-0.5 rounded-full shadow-xs">
                          {p.currency === 'USD' ? '$' : p.currency + ' '}{p.price.toFixed(2)}
                        </span>
                      </div>

                      <div className="p-3.5 space-y-1.5">
                        <span className="text-[9px] font-mono text-orange-600 font-bold uppercase">
                          {p.category}
                        </span>
                        <h5 className="font-extrabold text-xs text-[#1f1f1f] line-clamp-1">{p.title}</h5>
                        <p className="text-[11px] text-[#666] line-clamp-2">{p.description}</p>
                      </div>
                    </div>

                    <div className="p-3 pt-0 flex items-center justify-between gap-2 border-t border-[#f5f5f5] mt-2">
                      <span className="text-[10px] font-bold text-orange-600 hover:underline">
                        {isSelected ? '✓ Selected' : 'View Details'}
                      </span>
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] shadow-xs flex items-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Enquire 💬</span>
                      </a>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
