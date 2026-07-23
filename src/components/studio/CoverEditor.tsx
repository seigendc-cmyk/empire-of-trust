import React, { useState, useRef } from 'react';
import { 
  Palette, Image as ImageIcon, Book, Barcode, Sparkles, Layout, 
  Upload, Move, AlignLeft, AlignCenter, AlignRight, Type, Sliders,
  Trash2, Eye, ShieldAlert, Layers, Check, RefreshCw
} from 'lucide-react';
import { FrontCover, BackCover } from '../../types';

interface CoverEditorProps {
  frontCover: FrontCover;
  backCover: BackCover;
  onChangeFrontCover: (cover: FrontCover) => void;
  onChangeBackCover: (cover: BackCover) => void;
}

export const CoverEditor: React.FC<CoverEditorProps> = ({
  frontCover,
  backCover,
  onChangeFrontCover,
  onChangeBackCover,
}) => {
  const [activeTab, setActiveTab] = useState<'front' | 'back'>('front');
  const frontFileInputRef = useRef<HTMLInputElement>(null);
  const backFileInputRef = useRef<HTMLInputElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // Preset Colors & Gradients
  const bgPresets = [
    { name: 'Matt Orange Gradient', start: '#ea580c', end: '#9a3412' },
    { name: 'Matt Charcoal', start: '#1f2125', end: '#111315' },
    { name: 'Warm Crimson', start: '#9f1239', end: '#4c0519' },
    { name: 'Deep Midnight', start: '#1e1b4b', end: '#0f172a' },
    { name: 'Emerald Forest', start: '#064e3b', end: '#022c22' },
    { name: 'Sunset Matt', start: '#f97316', end: '#431407' },
  ];

  // Helper for reading uploaded device image file
  const handleDeviceImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'front' | 'back' | 'logo'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPEG, WebP, SVG).');
      return;
    }

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size exceeds 5MB limit. Please select a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (target === 'front') {
        onChangeFrontCover({
          ...frontCover,
          bgType: 'image',
          bgImageUrl: result,
        });
      } else if (target === 'back') {
        onChangeBackCover({
          ...backCover,
          bgType: 'image',
          bgImageUrl: result,
        });
      } else if (target === 'logo') {
        onChangeBackCover({
          ...backCover,
          publisherLogoUrl: result,
        });
      }
    };
    reader.readAsDataURL(file);
    // Reset file input value to allow re-uploading same file
    e.target.value = '';
  };

  // Font family mappings
  const fontClasses = {
    serif: 'font-serif',
    sans: 'font-sans',
    mono: 'font-mono',
    display: 'font-serif tracking-tight font-black uppercase',
  };

  // Title size mappings
  const titleSizeClasses = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
    '2xl': 'text-4xl',
  };

  // Vertical position mappings
  const verticalJustifyClasses = {
    top: 'justify-start',
    center: 'justify-center',
    bottom: 'justify-end',
  };

  // Horizontal text align mappings
  const textAlignClasses = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  };

  return (
    <div className="bg-white border border-[#e0e0e0] rounded-xl p-6 shadow-sm space-y-6">
      
      {/* Front / Back Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0f0f0] pb-4">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-[#ff6321]" />
          <div>
            <h3 className="font-bold text-base text-[#2c2c2c]">Book Cover Studio</h3>
            <p className="text-xs text-[#666]">
              Upload cover artwork, position titles & text, adjust typography & dark overlays
            </p>
          </div>
        </div>

        <div className="flex bg-[#f0f0f0] p-1 rounded-md border border-[#e0e0e0] text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('front')}
            className={`px-4 py-1.5 rounded-md font-bold transition-all ${
              activeTab === 'front'
                ? 'bg-[#ff6321] text-white shadow-sm'
                : 'text-[#666] hover:text-[#2c2c2c]'
            }`}
          >
            Front Cover
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('back')}
            className={`px-4 py-1.5 rounded-md font-bold transition-all ${
              activeTab === 'back'
                ? 'bg-[#ff6321] text-white shadow-sm'
                : 'text-[#666] hover:text-[#2c2c2c]'
            }`}
          >
            Back Cover & Blurb
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Controls Column */}
        <div className="lg:col-span-7 space-y-5">
          
          {activeTab === 'front' ? (
            <div className="space-y-5 text-xs">
              
              {/* 1. Device Image Upload Section */}
              <div className="bg-[#f9f9f9] border border-[#e0e0e0] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#2c2c2c] flex items-center gap-1.5 text-xs">
                    <Upload className="w-4 h-4 text-[#ff6321]" /> Cover Image Upload (From Device)
                  </label>
                  {frontCover.bgType === 'image' && frontCover.bgImageUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        onChangeFrontCover({
                          ...frontCover,
                          bgType: 'gradient',
                          bgImageUrl: '',
                        })
                      }
                      className="text-red-500 hover:text-red-700 font-bold flex items-center gap-1 text-[11px]"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove Image
                    </button>
                  )}
                </div>

                <input
                  ref={frontFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleDeviceImageUpload(e, 'front')}
                  className="hidden"
                />

                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <button
                    type="button"
                    onClick={() => frontFileInputRef.current?.click()}
                    className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-[#ff6321]/40 hover:border-[#ff6321] bg-white text-[#ff6321] font-bold transition-all shadow-xs"
                  >
                    <Upload className="w-4 h-4" /> Choose File from Device
                  </button>

                  <div className="text-center sm:text-left text-[11px] text-[#666]">
                    Supports PNG, JPEG, WebP (Max 5MB)
                  </div>
                </div>

                {/* Sample Unsplash / Custom Image URL fallback */}
                <div className="pt-2 border-t border-[#e0e0e0] flex items-center gap-2">
                  <span className="text-[10px] text-[#888] font-mono">OR Image URL:</span>
                  <input
                    type="text"
                    value={frontCover.bgImageUrl || ''}
                    onChange={(e) =>
                      onChangeFrontCover({
                        ...frontCover,
                        bgType: e.target.value ? 'image' : 'gradient',
                        bgImageUrl: e.target.value,
                      })
                    }
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 bg-white border border-[#e0e0e0] rounded px-2.5 py-1 text-[11px] text-[#2c2c2c] focus:border-[#ff6321] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onChangeFrontCover({
                        ...frontCover,
                        bgType: 'image',
                        bgImageUrl:
                          'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
                      })
                    }
                    className="px-2.5 py-1 bg-[#2c2c2c] text-white rounded text-[11px] font-bold hover:bg-black"
                  >
                    Sample
                  </button>
                </div>

                {/* Image Formatting Options (Fit, Overlay Darkness) */}
                {frontCover.bgType === 'image' && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#e0e0e0]">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#666] mb-1">
                        Image Fit Mode
                      </label>
                      <select
                        value={frontCover.imageFit || 'cover'}
                        onChange={(e) =>
                          onChangeFrontCover({
                            ...frontCover,
                            imageFit: e.target.value as any,
                          })
                        }
                        className="w-full bg-white border border-[#e0e0e0] rounded px-2.5 py-1.5 font-bold text-[#2c2c2c]"
                      >
                        <option value="cover">Cover (Fill & Crop)</option>
                        <option value="contain">Contain (Fit Entire)</option>
                        <option value="center">Center Natural</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#666] mb-1 flex justify-between">
                        <span>Dark Overlay Tint</span>
                        <span>{Math.round((frontCover.overlayOpacity ?? 0.4) * 100)}%</span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="0.9"
                        step="0.05"
                        value={frontCover.overlayOpacity ?? 0.4}
                        onChange={(e) =>
                          onChangeFrontCover({
                            ...frontCover,
                            overlayOpacity: parseFloat(e.target.value),
                          })
                        }
                        className="w-full accent-[#ff6321]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Text Location & Positioning Controls */}
              <div className="bg-[#f9f9f9] border border-[#e0e0e0] rounded-xl p-4 space-y-3">
                <label className="font-bold text-[#2c2c2c] flex items-center gap-1.5 text-xs">
                  <Move className="w-4 h-4 text-[#ff6321]" /> Text Position & Layout Alignment
                </label>

                <div className="grid grid-cols-2 gap-3">
                  {/* Vertical Position */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#666] mb-1">
                      Vertical Placement
                    </label>
                    <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded border border-[#e0e0e0]">
                      {(['top', 'center', 'bottom'] as const).map((pos) => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() =>
                            onChangeFrontCover({
                              ...frontCover,
                              textPosition: pos,
                            })
                          }
                          className={`py-1 rounded text-[11px] capitalize font-bold transition-all ${
                            (frontCover.textPosition || 'top') === pos
                              ? 'bg-[#ff6321] text-white shadow-xs'
                              : 'text-[#666] hover:text-[#2c2c2c]'
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Horizontal Alignment */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#666] mb-1">
                      Text Alignment
                    </label>
                    <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded border border-[#e0e0e0]">
                      <button
                        type="button"
                        onClick={() =>
                          onChangeFrontCover({
                            ...frontCover,
                            textAlign: 'left',
                          })
                        }
                        className={`p-1.5 rounded flex items-center justify-center transition-all ${
                          (frontCover.textAlign || 'left') === 'left'
                            ? 'bg-[#ff6321] text-white shadow-xs'
                            : 'text-[#666] hover:text-[#2c2c2c]'
                        }`}
                        title="Align Left"
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onChangeFrontCover({
                            ...frontCover,
                            textAlign: 'center',
                          })
                        }
                        className={`p-1.5 rounded flex items-center justify-center transition-all ${
                          (frontCover.textAlign || 'left') === 'center'
                            ? 'bg-[#ff6321] text-white shadow-xs'
                            : 'text-[#666] hover:text-[#2c2c2c]'
                        }`}
                        title="Align Center"
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onChangeFrontCover({
                            ...frontCover,
                            textAlign: 'right',
                          })
                        }
                        className={`p-1.5 rounded flex items-center justify-center transition-all ${
                          (frontCover.textAlign || 'left') === 'right'
                            ? 'bg-[#ff6321] text-white shadow-xs'
                            : 'text-[#666] hover:text-[#2c2c2c]'
                        }`}
                        title="Align Right"
                      >
                        <AlignRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Typography Font Family & Size */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#666] mb-1 flex items-center gap-1">
                      <Type className="w-3 h-3 text-[#ff6321]" /> Font Family
                    </label>
                    <select
                      value={frontCover.fontFamily || 'serif'}
                      onChange={(e) =>
                        onChangeFrontCover({
                          ...frontCover,
                          fontFamily: e.target.value as any,
                        })
                      }
                      className="w-full bg-white border border-[#e0e0e0] rounded px-2.5 py-1.5 font-bold text-[#2c2c2c]"
                    >
                      <option value="serif">Classic Serif (Garamond/Playfair)</option>
                      <option value="sans">Modern Sans-Serif (Helvetica/Inter)</option>
                      <option value="mono">Technical Monospace</option>
                      <option value="display">Bold Display Uppercase</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#666] mb-1">
                      Title Font Size
                    </label>
                    <select
                      value={frontCover.titleSize || 'lg'}
                      onChange={(e) =>
                        onChangeFrontCover({
                          ...frontCover,
                          titleSize: e.target.value as any,
                        })
                      }
                      className="w-full bg-white border border-[#e0e0e0] rounded px-2.5 py-1.5 font-bold text-[#2c2c2c]"
                    >
                      <option value="sm">Small</option>
                      <option value="md">Medium</option>
                      <option value="lg">Large (Default)</option>
                      <option value="xl">Extra Large</option>
                      <option value="2xl">Massive Banner</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Text Content & Colors */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#666] mb-1">Book Title</label>
                  <input
                    type="text"
                    value={frontCover.title}
                    onChange={(e) => onChangeFrontCover({ ...frontCover, title: e.target.value })}
                    className="w-full bg-[#f9f9f9] border border-[#e0e0e0] rounded-md px-3 py-2 text-[#2c2c2c] font-medium focus:border-[#ff6321] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#666] mb-1">Subtitle / Tagline</label>
                  <input
                    type="text"
                    value={frontCover.subtitle || ''}
                    onChange={(e) => onChangeFrontCover({ ...frontCover, subtitle: e.target.value })}
                    placeholder="e.g. A Comprehensive Guide to Offline PWAs"
                    className="w-full bg-[#f9f9f9] border border-[#e0e0e0] rounded-md px-3 py-2 text-[#2c2c2c] font-medium focus:border-[#ff6321] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#666] mb-1">Author Name</label>
                    <input
                      type="text"
                      value={frontCover.author}
                      onChange={(e) => onChangeFrontCover({ ...frontCover, author: e.target.value })}
                      className="w-full bg-[#f9f9f9] border border-[#e0e0e0] rounded-md px-3 py-2 text-[#2c2c2c] font-medium focus:border-[#ff6321] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#666] mb-1">Badge Tag</label>
                    <input
                      type="text"
                      value={frontCover.badgeText || ''}
                      onChange={(e) => onChangeFrontCover({ ...frontCover, badgeText: e.target.value })}
                      placeholder="e.g. Bestseller • 1st Edition"
                      className="w-full bg-[#f9f9f9] border border-[#e0e0e0] rounded-md px-3 py-2 text-[#2c2c2c] font-medium focus:border-[#ff6321] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Color Pickers for Text */}
                <div className="grid grid-cols-3 gap-2 bg-[#f9f9f9] border border-[#e0e0e0] p-3 rounded-lg">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#666] mb-1">Title Color</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={frontCover.titleColor || '#ffffff'}
                        onChange={(e) => onChangeFrontCover({ ...frontCover, titleColor: e.target.value })}
                        className="w-7 h-7 rounded border border-[#e0e0e0] cursor-pointer"
                      />
                      <span className="font-mono text-[10px] text-[#666]">{frontCover.titleColor || '#ffffff'}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#666] mb-1">Author Color</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={frontCover.authorColor || '#fed7aa'}
                        onChange={(e) => onChangeFrontCover({ ...frontCover, authorColor: e.target.value })}
                        className="w-7 h-7 rounded border border-[#e0e0e0] cursor-pointer"
                      />
                      <span className="font-mono text-[10px] text-[#666]">{frontCover.authorColor || '#fed7aa'}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#666] mb-1">Subtitle Color</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={frontCover.subtitleColor || '#ffedd5'}
                        onChange={(e) => onChangeFrontCover({ ...frontCover, subtitleColor: e.target.value })}
                        className="w-7 h-7 rounded border border-[#e0e0e0] cursor-pointer"
                      />
                      <span className="font-mono text-[10px] text-[#666]">{frontCover.subtitleColor || '#ffedd5'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Color & Gradient Presets */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#666] mb-1.5">Background Presets</label>
                <div className="grid grid-cols-3 gap-2">
                  {bgPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        onChangeFrontCover({
                          ...frontCover,
                          bgType: 'gradient',
                          gradientStart: preset.start,
                          gradientEnd: preset.end,
                          bgImageUrl: '',
                        })
                      }
                      className="flex items-center gap-2 p-2 rounded-md bg-[#f9f9f9] border border-[#e0e0e0] hover:border-gray-400 text-left"
                    >
                      <div
                        className="w-5 h-5 rounded shrink-0 shadow"
                        style={{ background: `linear-gradient(to bottom right, ${preset.start}, ${preset.end})` }}
                      />
                      <span className="text-[11px] text-[#2c2c2c] truncate font-medium">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            /* BACK COVER CONTROLS */
            <div className="space-y-5 text-xs">
              
              {/* Back Cover Image Upload */}
              <div className="bg-[#f9f9f9] border border-[#e0e0e0] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#2c2c2c] flex items-center gap-1.5 text-xs">
                    <Upload className="w-4 h-4 text-[#ff6321]" /> Back Cover Background Image (From Device)
                  </label>
                  {backCover.bgType === 'image' && backCover.bgImageUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        onChangeBackCover({
                          ...backCover,
                          bgType: 'solid',
                          bgImageUrl: '',
                        })
                      }
                      className="text-red-500 hover:text-red-700 font-bold flex items-center gap-1 text-[11px]"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove Image
                    </button>
                  )}
                </div>

                <input
                  ref={backFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleDeviceImageUpload(e, 'back')}
                  className="hidden"
                />

                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <button
                    type="button"
                    onClick={() => backFileInputRef.current?.click()}
                    className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-[#ff6321]/40 hover:border-[#ff6321] bg-white text-[#ff6321] font-bold transition-all shadow-xs"
                  >
                    <Upload className="w-4 h-4" /> Upload Back Cover Image
                  </button>
                </div>
              </div>

              {/* Publisher Logo Device Upload */}
              <div className="bg-[#f9f9f9] border border-[#e0e0e0] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#2c2c2c] flex items-center gap-1.5 text-xs">
                    <ImageIcon className="w-4 h-4 text-[#ff6321]" /> Publisher Logo Image
                  </label>
                  {backCover.publisherLogoUrl && (
                    <button
                      type="button"
                      onClick={() => onChangeBackCover({ ...backCover, publisherLogoUrl: '' })}
                      className="text-red-500 hover:text-red-700 font-bold text-[11px]"
                    >
                      Clear Logo
                    </button>
                  )}
                </div>

                <input
                  ref={logoFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleDeviceImageUpload(e, 'logo')}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => logoFileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-white border border-[#e0e0e0] text-[#2c2c2c] font-bold hover:bg-[#f0f0f0]"
                >
                  <Upload className="w-3.5 h-3.5 text-[#ff6321]" /> Upload Publisher Logo File
                </button>
              </div>

              {/* Text Positioning for Back Cover */}
              <div className="bg-[#f9f9f9] border border-[#e0e0e0] rounded-xl p-4 space-y-3">
                <label className="font-bold text-[#2c2c2c] flex items-center gap-1.5 text-xs">
                  <Move className="w-4 h-4 text-[#ff6321]" /> Back Cover Text Position & Alignment
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#666] mb-1">
                      Vertical Position
                    </label>
                    <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded border border-[#e0e0e0]">
                      {(['top', 'center', 'bottom'] as const).map((pos) => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => onChangeBackCover({ ...backCover, textPosition: pos })}
                          className={`py-1 rounded text-[11px] capitalize font-bold transition-all ${
                            (backCover.textPosition || 'top') === pos
                              ? 'bg-[#ff6321] text-white'
                              : 'text-[#666]'
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#666] mb-1">
                      Text Alignment
                    </label>
                    <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded border border-[#e0e0e0]">
                      <button
                        type="button"
                        onClick={() => onChangeBackCover({ ...backCover, textAlign: 'left' })}
                        className={`p-1.5 rounded flex items-center justify-center ${
                          (backCover.textAlign || 'left') === 'left' ? 'bg-[#ff6321] text-white' : 'text-[#666]'
                        }`}
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onChangeBackCover({ ...backCover, textAlign: 'center' })}
                        className={`p-1.5 rounded flex items-center justify-center ${
                          (backCover.textAlign || 'left') === 'center' ? 'bg-[#ff6321] text-white' : 'text-[#666]'
                        }`}
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onChangeBackCover({ ...backCover, textAlign: 'right' })}
                        className={`p-1.5 rounded flex items-center justify-center ${
                          (backCover.textAlign || 'left') === 'right' ? 'bg-[#ff6321] text-white' : 'text-[#666]'
                        }`}
                      >
                        <AlignRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Text Fields */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#666] mb-1">Book Synopsis & Overview</label>
                <textarea
                  value={backCover.synopsis}
                  onChange={(e) => onChangeBackCover({ ...backCover, synopsis: e.target.value })}
                  rows={4}
                  className="w-full bg-[#f9f9f9] border border-[#e0e0e0] rounded-md p-3 text-[#2c2c2c] font-medium focus:border-[#ff6321] focus:outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-[#666] mb-1">Praise / Editorial Blurb</label>
                <input
                  type="text"
                  value={backCover.blurb || ''}
                  onChange={(e) => onChangeBackCover({ ...backCover, blurb: e.target.value })}
                  placeholder='e.g. "A masterpiece of offline literature." — Review'
                  className="w-full bg-[#f9f9f9] border border-[#e0e0e0] rounded-md px-3 py-2 text-[#2c2c2c] font-medium focus:border-[#ff6321] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#666] mb-1">ISBN Number</label>
                  <input
                    type="text"
                    value={backCover.isbn || ''}
                    onChange={(e) => onChangeBackCover({ ...backCover, isbn: e.target.value })}
                    placeholder="978-3-16-148410-0"
                    className="w-full bg-[#f9f9f9] border border-[#e0e0e0] rounded-md px-3 py-2 text-[#2c2c2c] font-mono font-medium focus:border-[#ff6321] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#666] mb-1">Publisher Name</label>
                  <input
                    type="text"
                    value={backCover.publisherName || ''}
                    onChange={(e) => onChangeBackCover({ ...backCover, publisherName: e.target.value })}
                    placeholder="O-Publish Press Ltd."
                    className="w-full bg-[#f9f9f9] border border-[#e0e0e0] rounded-md px-3 py-2 text-[#2c2c2c] font-medium focus:border-[#ff6321] focus:outline-none"
                  />
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Live Visual Book Cover Canvas Preview Box */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center bg-[#f0f0f0] border border-[#e0e0e0] rounded-xl p-6 shadow-inner">
          <p className="text-xs font-bold text-[#2c2c2c] uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#ff6321]" />
            Live Cover Artwork Canvas ({activeTab === 'front' ? 'Front Cover' : 'Back Cover'})
          </p>

          {/* Realistic 3D Book Cover Canvas */}
          <div
            className="w-64 h-96 rounded-xl shadow-2xl p-6 flex flex-col relative overflow-hidden transition-all border border-black/20"
            style={{
              backgroundColor: activeTab === 'front' ? (frontCover.bgColor || '#1a1a1a') : (backCover.bgColor || '#1f2125'),
              backgroundImage:
                activeTab === 'front'
                  ? frontCover.bgType === 'image' && frontCover.bgImageUrl
                    ? `url(${frontCover.bgImageUrl})`
                    : `linear-gradient(to bottom right, ${frontCover.gradientStart || '#ea580c'}, ${frontCover.gradientEnd || '#9a3412'})`
                  : backCover.bgType === 'image' && backCover.bgImageUrl
                  ? `url(${backCover.bgImageUrl})`
                  : `linear-gradient(to bottom right, ${backCover.gradientStart || '#2c2c2c'}, ${backCover.gradientEnd || '#111315'})`,
              backgroundSize:
                (activeTab === 'front' ? frontCover.imageFit : backCover.imageFit) === 'contain'
                  ? 'contain'
                  : 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {/* Dark Overlay Filter */}
            {((activeTab === 'front' && frontCover.bgType === 'image') || (activeTab === 'back' && backCover.bgType === 'image')) && (
              <div
                className="absolute inset-0 transition-opacity"
                style={{
                  backgroundColor: activeTab === 'front' ? (frontCover.overlayColor || '#000000') : '#000000',
                  opacity: activeTab === 'front' ? (frontCover.overlayOpacity ?? 0.4) : (backCover.overlayOpacity ?? 0.4),
                }}
              />
            )}

            {/* Book Spine Shadow Edge */}
            <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/40 via-black/10 to-transparent pointer-events-none z-20" />

            {/* Canvas Content Layer */}
            {activeTab === 'front' ? (
              <div
                className={`relative z-10 flex flex-col h-full w-full ${
                  verticalJustifyClasses[frontCover.textPosition || 'top']
                } ${textAlignClasses[frontCover.textAlign || 'left']}`}
              >
                
                {/* Badge Tag */}
                {frontCover.badgeText && (
                  <div className="mb-3">
                    <span
                      className="inline-block px-2.5 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase font-bold border"
                      style={{
                        color: frontCover.badgeColor || '#ffedd5',
                        backgroundColor: frontCover.badgeBg || 'rgba(0,0,0,0.5)',
                        borderColor: 'rgba(255,255,255,0.2)',
                      }}
                    >
                      {frontCover.badgeText}
                    </span>
                  </div>
                )}

                {/* Title and Subtitle Block */}
                <div className="space-y-1.5 my-2">
                  <h2
                    className={`font-bold leading-tight drop-shadow-md transition-all ${
                      fontClasses[frontCover.fontFamily || 'serif']
                    } ${titleSizeClasses[frontCover.titleSize || 'lg']}`}
                    style={{ color: frontCover.titleColor || '#ffffff' }}
                  >
                    {frontCover.title || 'Untitled Book'}
                  </h2>

                  {frontCover.subtitle && (
                    <p
                      className="text-xs drop-shadow-sm font-sans line-clamp-2 opacity-90"
                      style={{ color: frontCover.subtitleColor || '#ffedd5' }}
                    >
                      {frontCover.subtitle}
                    </p>
                  )}
                </div>

                {/* Author Block */}
                <div className="pt-3 border-t border-white/20 mt-3 w-full">
                  <p className="text-[9px] uppercase font-mono tracking-widest opacity-70" style={{ color: frontCover.authorColor || '#fed7aa' }}>
                    Author
                  </p>
                  <p
                    className={`text-sm font-bold tracking-wide ${fontClasses[frontCover.fontFamily || 'serif']}`}
                    style={{ color: frontCover.authorColor || '#ffffff' }}
                  >
                    {frontCover.author || 'Author Name'}
                  </p>
                </div>

              </div>
            ) : (
              /* Back Cover Live Rendering */
              <div
                className={`relative z-10 flex flex-col h-full w-full justify-between text-white ${
                  verticalJustifyClasses[backCover.textPosition || 'top']
                } ${textAlignClasses[backCover.textAlign || 'left']}`}
              >
                <div className="space-y-3">
                  {backCover.publisherLogoUrl && (
                    <img
                      src={backCover.publisherLogoUrl}
                      alt="Publisher Logo"
                      className="h-7 object-contain mb-2 max-w-[100px]"
                    />
                  )}

                  <p className="font-semibold text-orange-300 text-[10px] uppercase tracking-wider font-mono">
                    Book Overview
                  </p>
                  <p className="text-[11px] leading-relaxed text-gray-100 line-clamp-6 italic font-serif">
                    {backCover.synopsis || 'No synopsis added yet.'}
                  </p>

                  {backCover.blurb && (
                    <div className="bg-black/40 p-2 rounded-lg border border-white/10 text-[10px] italic text-orange-200">
                      {backCover.blurb}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-white/20 flex items-end justify-between w-full mt-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-200">{backCover.publisherName || 'JE Trust Fund'}</p>
                    <p className="text-[8px] font-mono text-gray-300">{backCover.isbn || 'ISBN 978-0-0000-000'}</p>
                  </div>
                  
                  {/* Simulated Barcode */}
                  {backCover.showBarcode !== false && (
                    <div className="bg-white p-1 rounded shadow-xs">
                      <Barcode className="w-10 h-6 text-black" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <p className="text-[11px] text-[#888] font-mono mt-3">
            Real-time artwork preview scaled to standard book ratio
          </p>
        </div>

      </div>

    </div>
  );
};
