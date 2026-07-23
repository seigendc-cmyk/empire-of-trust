import React, { useState, useEffect } from 'react';
import {
  Store, Plus, Edit3, Trash2, Check, Sparkles, Image as ImageIcon,
  DollarSign, Phone, Mail, MapPin, Tag, MessageSquare, ExternalLink,
  ChevronLeft, ChevronRight, Eye, RefreshCw, AlertCircle, CheckCircle2,
  Share2, ShieldCheck, Layers, ShoppingBag
} from 'lucide-react';
import { VendorProfile, VendorProduct } from '../../types';
import {
  getVendorProfile,
  saveVendorProfile,
  getVendorProducts,
  saveVendorProducts,
  formatWhatsAppProductUrl,
  DEFAULT_VENDOR_PRODUCTS
} from '../../lib/vendorStorage';

// Sample product artwork images for quick selection
const SAMPLE_PRODUCT_IMAGES = [
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
];

export const VendorMarketingStudio: React.FC = () => {
  const [profile, setProfile] = useState<VendorProfile>(getVendorProfile());
  const [products, setProducts] = useState<VendorProduct[]>(getVendorProducts());
  
  // Edit Profile Mode
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<VendorProfile>(profile);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Add / Edit Product Modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<Partial<VendorProduct>>({
    title: '',
    description: '',
    price: 15.00,
    currency: 'USD',
    category: "Children's Books",
    imageUrl: SAMPLE_PRODUCT_IMAGES[0],
    badge: 'Featured',
    whatsappMsgTemplate: '',
    inStock: true,
  });

  // Timed Slides Live Preview Index
  const [previewSlideIdx, setPreviewSlideIdx] = useState(0);
  const [isAutoPlayPreview, setIsAutoPlayPreview] = useState(true);

  // Auto slide interval for preview
  useEffect(() => {
    if (!isAutoPlayPreview || products.length === 0) return;
    const timer = setInterval(() => {
      setPreviewSlideIdx((prev) => (prev + 1) % products.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [isAutoPlayPreview, products.length]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    saveVendorProfile(profileForm);
    setProfile(profileForm);
    setIsEditingProfile(false);
    
    // Also update vendor fields across all products
    const updatedProducts = products.map(p => ({
      ...p,
      vendorBusinessName: profileForm.businessName,
      vendorPhone: profileForm.phone,
      currency: profileForm.currency,
    }));
    saveVendorProducts(updatedProducts);
    setProducts(updatedProducts);

    triggerToast('✅ Vendor business details updated successfully!');
  };

  const handleOpenAddProduct = () => {
    setEditingProductId(null);
    setProductForm({
      title: '',
      description: '',
      price: 12.50,
      currency: profile.currency || 'USD',
      category: "Children's Illustrated Books",
      imageUrl: SAMPLE_PRODUCT_IMAGES[Math.floor(Math.random() * SAMPLE_PRODUCT_IMAGES.length)],
      badge: 'Featured',
      whatsappMsgTemplate: '',
      inStock: true,
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: VendorProduct) => {
    setEditingProductId(prod.id);
    setProductForm(prod);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.title?.trim()) {
      alert('Please enter a product title.');
      return;
    }

    let updatedList: VendorProduct[] = [];
    if (editingProductId) {
      updatedList = products.map((p) =>
        p.id === editingProductId
          ? {
              ...p,
              ...productForm,
              vendorId: profile.id,
              vendorBusinessName: profile.businessName,
              vendorPhone: profile.phone,
              price: Number(productForm.price) || 0,
            } as VendorProduct
          : p
      );
      triggerToast('✅ Vendor product updated!');
    } else {
      const newProd: VendorProduct = {
        id: 'prod_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
        vendorId: profile.id,
        vendorBusinessName: profile.businessName,
        vendorPhone: profile.phone,
        title: productForm.title || 'New Vendor Product',
        description: productForm.description || '',
        price: Number(productForm.price) || 0,
        currency: productForm.currency || profile.currency || 'USD',
        category: productForm.category || 'General Products',
        imageUrl: productForm.imageUrl || SAMPLE_PRODUCT_IMAGES[0],
        badge: productForm.badge || 'New Arrival',
        whatsappMsgTemplate: productForm.whatsappMsgTemplate || '',
        inStock: productForm.inStock ?? true,
        createdAt: new Date().toISOString(),
      };
      updatedList = [newProd, ...products];
      triggerToast('🎉 New vendor product added to Book Store timed slides!');
    }

    saveVendorProducts(updatedList);
    setProducts(updatedList);
    setIsProductModalOpen(false);
  };

  const handleDeleteProduct = (prodId: string) => {
    if (!window.confirm('Delete this product from your vendor store?')) return;
    const updated = products.filter((p) => p.id !== prodId);
    saveVendorProducts(updated);
    setProducts(updated);
    if (previewSlideIdx >= updated.length) {
      setPreviewSlideIdx(Math.max(0, updated.length - 1));
    }
    triggerToast('Product removed.');
  };

  const handleResetDefaultProducts = () => {
    if (!window.confirm('Reset vendor products to default sample catalog?')) return;
    saveVendorProducts(DEFAULT_VENDOR_PRODUCTS);
    setProducts(DEFAULT_VENDOR_PRODUCTS);
    setPreviewSlideIdx(0);
    triggerToast('Reset to default sample vendor products.');
  };

  const triggerToast = (msg: string) => {
    setSaveMessage(msg);
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const activePreviewProduct = products[previewSlideIdx] || products[0];

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {saveMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#1f1f1f] text-white text-xs font-bold px-4 py-3 rounded-xl border border-emerald-500/50 shadow-2xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Section Header */}
      <div className="bg-gradient-to-br from-slate-900 via-zinc-800 to-stone-900 rounded-2xl p-6 text-white shadow-md border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-orange-500 text-white shadow-lg shrink-0">
              <Store className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold tracking-tight">Vendor Storefront & Marketing Studio</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold uppercase border border-emerald-500/30">
                  WhatsApp Sales Leads Active
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Manage your business details, upload product images, and publish timed spotlight slides directly on the Book Store.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenAddProduct}
              className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Vendor Product
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Left Column Business Profile & Product Manager | Right Column Live Timed Slides Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Vendor Business Profile & Product List (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Vendor Business Details Card */}
          <div className="bg-white border border-[#e0e0e0] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-orange-600" />
                <h3 className="font-extrabold text-sm text-[#1f1f1f]">Vendor Business Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProfileForm(profile);
                  setIsEditingProfile(!isEditingProfile);
                }}
                className="px-3 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs border border-orange-200 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditingProfile ? 'Cancel Edit' : 'Edit Profile'}</span>
              </button>
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#555] mb-1">Business / Store Name:</label>
                    <input
                      type="text"
                      required
                      value={profileForm.businessName}
                      onChange={(e) => setProfileForm({ ...profileForm, businessName: e.target.value })}
                      placeholder="e.g. AfriCraft Children's Bookstore"
                      className="w-full bg-white border border-[#d0d0d0] rounded-lg px-2.5 py-1.5 font-bold text-[#2c2c2c] focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#555] mb-1">Owner / Manager Name:</label>
                    <input
                      type="text"
                      required
                      value={profileForm.ownerName}
                      onChange={(e) => setProfileForm({ ...profileForm, ownerName: e.target.value })}
                      placeholder="e.g. Tendai Moyo"
                      className="w-full bg-white border border-[#d0d0d0] rounded-lg px-2.5 py-1.5 text-[#2c2c2c] focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#555] mb-1 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-600" /> WhatsApp Phone Number (with Country Code):
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      placeholder="e.g. +263774479121"
                      className="w-full bg-white border border-[#d0d0d0] rounded-lg px-2.5 py-1.5 font-mono text-[#2c2c2c] focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#555] mb-1">Default Currency:</label>
                    <select
                      value={profileForm.currency}
                      onChange={(e) => setProfileForm({ ...profileForm, currency: e.target.value })}
                      className="w-full bg-white border border-[#d0d0d0] rounded-lg px-2.5 py-1.5 font-bold text-[#2c2c2c] focus:outline-none focus:border-orange-500"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="ZAR">ZAR (R)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#555] mb-1">Store Tagline / Slogan:</label>
                  <input
                    type="text"
                    value={profileForm.tagline || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, tagline: e.target.value })}
                    placeholder="e.g. Colourful African Cartoons & Children's Books"
                    className="w-full bg-white border border-[#d0d0d0] rounded-lg px-2.5 py-1.5 text-[#2c2c2c] focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#555] mb-1">Full Business Description:</label>
                  <textarea
                    rows={2}
                    value={profileForm.description}
                    onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                    placeholder="Describe your storybook & product offerings..."
                    className="w-full bg-white border border-[#d0d0d0] rounded-lg p-2 text-[#2c2c2c] focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#555] mb-1">Store Address / Location:</label>
                    <input
                      type="text"
                      value={profileForm.address || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      placeholder="e.g. Shop 14, Heritage Square, Harare"
                      className="w-full bg-white border border-[#d0d0d0] rounded-lg px-2.5 py-1.5 text-[#2c2c2c] focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#555] mb-1">Logo Image URL:</label>
                    <input
                      type="text"
                      value={profileForm.logoUrl || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, logoUrl: e.target.value })}
                      placeholder="e.g. https://..."
                      className="w-full bg-white border border-[#d0d0d0] rounded-lg px-2.5 py-1.5 text-[#2c2c2c] focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-3 py-1.5 rounded-lg bg-[#f0f0f0] text-[#555] font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-extrabold shadow-sm"
                  >
                    Save Business Details
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3">
                  <img
                    src={profile.logoUrl || SAMPLE_PRODUCT_IMAGES[0]}
                    alt={profile.businessName}
                    className="w-12 h-12 rounded-xl object-cover border border-[#e0e0e0] shadow-xs"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-[#1f1f1f]">{profile.businessName}</h4>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold text-[10px] flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified Vendor
                      </span>
                    </div>
                    {profile.tagline && (
                      <p className="text-xs text-orange-600 font-semibold italic">{profile.tagline}</p>
                    )}
                    <p className="text-xs text-[#666] mt-1">{profile.description}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#f0f0f0] grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-[#555]">
                  <div className="flex items-center gap-1.5 font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                    <Phone className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                    <span className="font-bold truncate">{profile.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-[#f8f8f8] px-2 py-1 rounded-md border border-[#e8e8e8]">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-orange-500" />
                    <span className="truncate">{profile.address || 'Online Storefront'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-[#f8f8f8] px-2 py-1 rounded-md border border-[#e8e8e8]">
                    <Tag className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                    <span className="truncate">{profile.category}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Vendor Products Manager */}
          <div className="bg-white border border-[#e0e0e0] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-orange-600" />
                <h3 className="font-extrabold text-sm text-[#1f1f1f]">
                  Vendor Products Catalog ({products.length})
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetDefaultProducts}
                  className="px-2.5 py-1 rounded-lg bg-[#f0f0f0] hover:bg-[#e0e0e0] text-[#555] font-bold text-[11px] cursor-pointer"
                  title="Reset to default sample products"
                >
                  Reset Defaults
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddProduct}
                  className="px-3 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Product
                </button>
              </div>
            </div>

            {/* Product Cards List */}
            {products.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#888] space-y-2">
                <p>No vendor products added yet.</p>
                <button
                  type="button"
                  onClick={handleOpenAddProduct}
                  className="px-4 py-2 rounded-xl bg-orange-500 text-white font-bold text-xs"
                >
                  + Add First Product
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {products.map((prod, idx) => {
                  const waUrl = formatWhatsAppProductUrl(
                    profile.phone,
                    prod.title,
                    prod.price,
                    prod.currency,
                    prod.whatsappMsgTemplate
                  );

                  return (
                    <div
                      key={prod.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        previewSlideIdx === idx
                          ? 'border-orange-500 bg-orange-50/40 ring-1 ring-orange-400/30'
                          : 'border-[#e0e0e0] bg-white hover:border-orange-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={prod.imageUrl}
                          alt={prod.title}
                          className="w-14 h-14 rounded-lg object-cover border border-[#e0e0e0] shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-xs text-[#1f1f1f]">{prod.title}</span>
                            {prod.badge && (
                              <span className="px-2 py-0.2 rounded bg-amber-100 text-amber-800 font-bold text-[9px] uppercase border border-amber-200">
                                {prod.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#666] line-clamp-1 mt-0.5">{prod.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono font-extrabold text-xs text-orange-600">
                              {prod.currency === 'USD' ? '$' : prod.currency + ' '}{prod.price.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-[#888]">• {prod.category}</span>
                          </div>
                        </div>
                      </div>

                      {/* Item controls */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => setPreviewSlideIdx(idx)}
                          className="px-2 py-1 rounded bg-[#f0f0f0] hover:bg-[#e0e0e0] text-[#333] font-bold text-[10px] flex items-center gap-1"
                          title="Preview slide in right column"
                        >
                          <Eye className="w-3 h-3 text-orange-500" /> Preview Slide
                        </button>

                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1"
                          title="Test WhatsApp sales lead link"
                        >
                          <MessageSquare className="w-3 h-3" /> Test WhatsApp
                        </a>

                        <button
                          type="button"
                          onClick={() => handleOpenEditProduct(prod)}
                          className="p-1.5 rounded hover:bg-[#f0f0f0] text-[#555] hover:text-[#1f1f1f]"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(prod.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-[#888] hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Live Timed Slides Card Preview on Book Store (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-gradient-to-br from-orange-50 via-amber-50/40 to-yellow-50 border border-orange-200 rounded-2xl p-4 shadow-sm space-y-3">
            
            <div className="flex items-center justify-between border-b border-orange-200 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-orange-900">
                <Sparkles className="w-4 h-4 text-orange-600 animate-pulse" />
                <span>Live Book Store Timed Slide Card</span>
              </div>

              <div className="flex items-center gap-1 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => setIsAutoPlayPreview(!isAutoPlayPreview)}
                  className={`px-2 py-0.5 rounded font-bold transition-colors ${
                    isAutoPlayPreview ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {isAutoPlayPreview ? 'Auto-Slide ON ⏱️' : 'Paused ⏸️'}
                </button>
              </div>
            </div>

            {/* Timed Slide Card Preview Box */}
            {activePreviewProduct ? (
              <div className="bg-white border border-orange-200 rounded-2xl shadow-lg overflow-hidden space-y-0 group transition-all hover:shadow-xl">
                
                {/* Header Vendor Tag */}
                <div className="bg-[#2c2c2c] text-white px-3.5 py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <Store className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span className="font-extrabold truncate text-orange-100">{profile.businessName}</span>
                  </div>
                  <span className="text-[10px] font-mono bg-orange-500 text-white font-bold px-2 py-0.5 rounded-full">
                    Vendor Showcase
                  </span>
                </div>

                {/* Main Product Image Container */}
                <div className="relative h-56 bg-slate-100 overflow-hidden">
                  <img
                    src={activePreviewProduct.imageUrl}
                    alt={activePreviewProduct.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Badge */}
                  {activePreviewProduct.badge && (
                    <div className="absolute top-3 left-3 bg-orange-600 text-white text-[10px] font-mono font-extrabold px-3 py-1 rounded-full shadow-md uppercase tracking-wider">
                      {activePreviewProduct.badge}
                    </div>
                  )}

                  {/* Price Badge */}
                  <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-xs text-amber-300 font-mono font-extrabold text-sm px-3 py-1 rounded-full shadow-md border border-amber-400/30">
                    {activePreviewProduct.currency === 'USD' ? '$' : activePreviewProduct.currency + ' '}
                    {activePreviewProduct.price.toFixed(2)}
                  </div>

                  {/* Slide controls overlay */}
                  <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none">
                    <button
                      type="button"
                      onClick={() => setPreviewSlideIdx((prev) => (prev - 1 + products.length) % products.length)}
                      className="p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white pointer-events-auto backdrop-blur-xs cursor-pointer transition-transform hover:scale-110"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewSlideIdx((prev) => (prev + 1) % products.length)}
                      className="p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white pointer-events-auto backdrop-blur-xs cursor-pointer transition-transform hover:scale-110"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Slide Indicators Dots */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                    {products.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPreviewSlideIdx(i)}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          i === previewSlideIdx ? 'w-5 bg-orange-400' : 'w-1.5 bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Content Footer */}
                <div className="p-4 space-y-2.5 bg-white">
                  <div>
                    <h4 className="font-extrabold text-sm text-[#1f1f1f] line-clamp-1">
                      {activePreviewProduct.title}
                    </h4>
                    <p className="text-xs text-[#666] line-clamp-2 mt-1">
                      {activePreviewProduct.description}
                    </p>
                  </div>

                  {/* CTA Button */}
                  <div className="pt-1 flex items-center justify-between gap-2 border-t border-[#f0f0f0]">
                    <span className="text-[11px] font-mono text-[#888]">
                      Slide {previewSlideIdx + 1} of {products.length}
                    </span>
                    <a
                      href={formatWhatsAppProductUrl(
                        profile.phone,
                        activePreviewProduct.title,
                        activePreviewProduct.price,
                        activePreviewProduct.currency,
                        activePreviewProduct.whatsappMsgTemplate
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp Sales Lead 💬</span>
                    </a>
                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-white p-6 rounded-2xl text-center text-xs text-[#888]">
                Add vendor products to enable timed slides preview.
              </div>
            )}

            <div className="text-[11px] text-orange-800 bg-orange-100/60 p-2.5 rounded-xl border border-orange-200">
              💡 <strong>How it works:</strong> The Book Store automatically renders this timed slideshow card. When visitors click the card or products, they enter your full <strong>Vendor Storefront</strong> and send instant <strong>WhatsApp Sales Leads</strong> straight to your phone number <code>{profile.phone}</code>!
            </div>

          </div>
        </div>

      </div>

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#d8d8d8] rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl text-[#2c2c2c] max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
              <h3 className="font-extrabold text-base text-[#1f1f1f]">
                {editingProductId ? 'Edit Vendor Product' : 'Add New Vendor Product'}
              </h3>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="text-[#666] hover:text-[#1f1f1f] text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#555] mb-1">Product Title:</label>
                <input
                  type="text"
                  required
                  value={productForm.title || ''}
                  onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                  placeholder="e.g. Max the Teddy Bear Cartoon Book Box Set"
                  className="w-full bg-white border border-[#d0d0d0] rounded-lg px-2.5 py-1.5 font-bold text-[#2c2c2c] focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#555] mb-1">Price:</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={productForm.price ?? 10}
                    onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-[#d0d0d0] rounded-lg px-2.5 py-1.5 font-mono font-bold text-[#2c2c2c] focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#555] mb-1">Category:</label>
                  <input
                    type="text"
                    value={productForm.category || ''}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    placeholder="e.g. Children's Books"
                    className="w-full bg-white border border-[#d0d0d0] rounded-lg px-2.5 py-1.5 text-[#2c2c2c] focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#555] mb-1">Badge Tag (Optional):</label>
                <select
                  value={productForm.badge || ''}
                  onChange={(e) => setProductForm({ ...productForm, badge: e.target.value })}
                  className="w-full bg-white border border-[#d0d0d0] rounded-lg px-2.5 py-1.5 font-bold text-[#2c2c2c] focus:outline-none focus:border-orange-500"
                >
                  <option value="Featured">Featured</option>
                  <option value="Best Seller">Best Seller</option>
                  <option value="Hot Deal">Hot Deal</option>
                  <option value="New Arrival">New Arrival</option>
                  <option value="Special Offer">Special Offer</option>
                  <option value="">(No Badge)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#555] mb-1">Product Description:</label>
                <textarea
                  rows={2}
                  value={productForm.description || ''}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Key features, cartoon illustrations included, age range..."
                  className="w-full bg-white border border-[#d0d0d0] rounded-lg p-2 text-[#2c2c2c] focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Sample Product Artwork Gallery */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-[#555]">Product Image URL / Sample Selection:</label>
                <input
                  type="text"
                  required
                  value={productForm.imageUrl || ''}
                  onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                  placeholder="e.g. https://..."
                  className="w-full bg-white border border-[#d0d0d0] rounded-lg px-2.5 py-1.5 text-xs text-[#2c2c2c] focus:outline-none focus:border-orange-500 font-mono"
                />
                <div className="flex gap-1.5 overflow-x-auto pt-1 pb-1">
                  {SAMPLE_PRODUCT_IMAGES.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setProductForm({ ...productForm, imageUrl: url })}
                      className={`w-12 h-12 rounded-lg border overflow-hidden shrink-0 transition-transform ${
                        productForm.imageUrl === url ? 'ring-2 ring-orange-500 scale-105' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt="sample" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#555] mb-1">
                  Custom WhatsApp Sales Enquiry Message Template:
                </label>
                <textarea
                  rows={2}
                  value={productForm.whatsappMsgTemplate || ''}
                  onChange={(e) => setProductForm({ ...productForm, whatsappMsgTemplate: e.target.value })}
                  placeholder="e.g. Hello AfriCraft, I am interested in purchasing this cartoon book set..."
                  className="w-full bg-white border border-[#d0d0d0] rounded-lg p-2 text-[#2c2c2c] focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#f0f0f0]">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#f0f0f0] text-[#555] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold shadow-md"
                >
                  Save Product
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
