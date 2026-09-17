import React, { useState, useEffect, useRef } from 'react';
import { ProductItem, ScreenId, LanguageCode } from '../../types';
import { sound } from '../../services/sound';
import { PotterWheelSpinner } from '../common/PotterWheelSpinner';
import { SuccessModal } from '../common/SuccessModal';
import { useTranslation } from '../../services/translations';

interface AIStudioScreenProps {
  products: ProductItem[];
  onNavigate: (screen: ScreenId) => void;
  onSelectProductForCatalog?: (prod: ProductItem) => void;
  onAddProduct?: (prod: ProductItem) => void;
  language?: LanguageCode;
  isDark?: boolean;
}

type DeviceCategory = 'mobile' | 'tablet' | 'pc';
type AspectRatioOption = '1:1' | '4:3' | '16:9' | '9:16';

const getDeviceCategory = (): DeviceCategory => {
  if (typeof window === 'undefined') return 'pc';
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'pc';
};

const getViewfinderClass = (ratio: AspectRatioOption, device: DeviceCategory): string => {
  if (device === 'mobile') {
    switch (ratio) {
      case '1:1':
        return 'aspect-square max-w-[340px]';
      case '4:3':
        return 'aspect-[4/3] max-w-[360px]';
      case '9:16':
      default:
        return 'aspect-[9/16] max-w-[280px]';
    }
  }

  if (device === 'tablet') {
    switch (ratio) {
      case '1:1':
        return 'aspect-square max-w-[420px]';
      case '4:3':
        return 'aspect-[4/3] max-w-[520px]';
      case '16:9':
      default:
        return 'aspect-[16/9] max-w-[680px]';
    }
  }

  // PC / Desktop (>= 1024px)
  switch (ratio) {
    case '1:1':
      return 'aspect-square max-w-[420px]';
    case '4:3':
      return 'aspect-[4/3] max-w-[560px]';
    case '16:9':
    default:
      return 'aspect-[16/9] max-w-[700px]';
  }
};

export const AIStudioScreen: React.FC<AIStudioScreenProps> = ({
  products,
  onNavigate,
  onSelectProductForCatalog,
  onAddProduct,
  isDark = false,
}) => {
  const { t } = useTranslation();
  const [deviceCategory, setDeviceCategory] = useState<DeviceCategory>(getDeviceCategory);
  const [activeTab, setActiveTab] = useState<'camera' | 'gallery'>('camera');
  const [selectedProduct, setSelectedProduct] = useState<ProductItem>(products[0] || {} as ProductItem);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [activeLighting, setActiveLighting] = useState<string>('soft_cinematic');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('1:1');
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [studioProducts, setStudioProducts] = useState<ProductItem[]>(products);
  const [viewfinderImage, setViewfinderImage] = useState<string>(
    'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800&auto=format&fit=crop&q=80'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lightingScrollRef = useRef<HTMLDivElement>(null);

  // Responsive device listener for viewport resize and orientation changes
  useEffect(() => {
    const handleResize = () => {
      const cat = getDeviceCategory();
      setDeviceCategory((prev) => {
        if (prev !== cat) {
          if (cat === 'mobile' && aspectRatio === '16:9') {
            setAspectRatio('9:16');
          } else if (cat !== 'mobile' && aspectRatio === '9:16') {
            setAspectRatio('16:9');
          }
          return cat;
        }
        return prev;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [aspectRatio]);

  // Ensure aspect ratio is appropriate for current device category
  useEffect(() => {
    if (deviceCategory === 'mobile' && aspectRatio === '16:9') {
      setAspectRatio('9:16');
    } else if (deviceCategory !== 'mobile' && aspectRatio === '9:16') {
      setAspectRatio('16:9');
    }
  }, [deviceCategory, aspectRatio]);

  // Auto-scroll lighting presets back to beginning (guaranteeing Soft Cinematic is always in full view)
  useEffect(() => {
    const scrollToStart = () => {
      if (lightingScrollRef.current) {
        lightingScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      }
    };
    scrollToStart();
    const timer = setTimeout(scrollToStart, 60);
    return () => clearTimeout(timer);
  }, [aspectRatio, deviceCategory]);

  const availableRatios = deviceCategory === 'mobile'
    ? (['1:1', '4:3', '9:16'] as const)
    : (['1:1', '4:3', '16:9'] as const);

  useEffect(() => {
    setStudioProducts(products);
    if (!products.some((p) => p.id === selectedProduct?.id) && products.length > 0) {
      setSelectedProduct(products[0]);
    }
  }, [products, selectedProduct]);

  // Handle Capture with realistic processing simulation
  const handleCapture = (capturedImageOverride?: string) => {
    sound.playShutter();
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      sound.playSuccess();

      const imgToUse = capturedImageOverride || viewfinderImage;
      const newCraftItem: ProductItem = {
        id: `studio-${Date.now()}`,
        title: selectedProduct?.title ? `${selectedProduct.title} (Enhanced)` : 'Terracotta Craft (4K Studio)',
        category: selectedProduct?.category || 'Heritage Pottery',
        price: selectedProduct?.price || 1450,
        stock: selectedProduct?.stock || 6,
        rawImageUrl: imgToUse,
        polishedImageUrl: imgToUse,
        description: 'Captured in AI Studio with soft cinematic lighting, 4K texture preservation, and neutral background.',
        materials: selectedProduct?.materials || ['Natural Clay', 'Organic Glaze'],
        hoursWorked: selectedProduct?.hoursWorked || 12,
        materialCost: selectedProduct?.materialCost || 320,
        status: 'live',
        dateAdded: 'Just now',
        gemSyncStatus: 'synced',
      };

      setStudioProducts((prev) => [newCraftItem, ...prev]);
      if (onAddProduct) {
        onAddProduct(newCraftItem);
      }

      setActiveTab('gallery');
      setShowSuccess(true);
    }, 2000);
  };

  // Custom photo upload simulation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const uploadedUrl = event.target?.result as string;
        setViewfinderImage(uploadedUrl);
        // Create dynamic preview item
        setSelectedProduct((prev) => ({
          ...prev,
          rawImageUrl: uploadedUrl,
          polishedImageUrl: uploadedUrl,
        }));
        handleCapture(uploadedUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-28 md:pb-12 pt-2 px-3 sm:px-6 lg:px-8 space-y-6">
      {/* Sub-navigation pill tabs - 2 options: AI Viewfinder & Studio Gallery */}
      <div className="flex justify-center">
        <div
          className={`flex p-1 rounded-2xl border w-full max-w-md ${
            isDark
              ? 'bg-[#1C221A] border-[#2D3A2B]'
              : 'bg-[#EFE4CF] border-[#22331E]/10'
          }`}
        >
          <button
            onClick={() => {
              sound.playTap();
              setActiveTab('camera');
            }}
            className={`flex-1 py-2.5 text-xs font-serif font-bold rounded-xl transition-all ${
              activeTab === 'camera'
                ? 'bg-[#B5451B] text-white shadow-xs'
                : isDark
                ? 'text-[#F4ECDE]/70 hover:text-white'
                : 'text-[#22331E]/70 hover:text-[#1A1815]'
            }`}
          >
            {t('ai_viewfinder', 'AI Viewfinder')}
          </button>

          <button
            onClick={() => {
              sound.playTap();
              setActiveTab('gallery');
            }}
            className={`flex-1 py-2.5 text-xs font-serif font-bold rounded-xl transition-all ${
              activeTab === 'gallery'
                ? 'bg-[#B5451B] text-white shadow-xs'
                : isDark
                ? 'text-[#F4ECDE]/70 hover:text-white'
                : 'text-[#22331E]/70 hover:text-[#1A1815]'
            }`}
          >
            {t('studio_gallery', 'Studio Gallery')}
          </button>
        </div>
      </div>

      {/* AI Processing Shimmer Loader State */}
      {isProcessing && (
        <div
          className={`rounded-3xl p-7 text-center space-y-4 border shadow-2xl ${
            isDark
              ? 'bg-[#1C221A] text-[#F4ECDE] border-[#2D3A2B]'
              : 'bg-[#22331E] text-[#F4ECDE] border-[#E8B84B]/40'
          }`}
        >
          <PotterWheelSpinner size="lg" text={t('enhancing_photo', 'Enhancing Photo with AI...')} />
          
          <div className="space-y-1.5 px-2">
            <h4 className="font-serif font-bold text-base text-white">
              {t('studio_photo_title', 'Professional Studio Product Photography')}
            </h4>
            <p className="text-xs text-white/80 font-sans leading-relaxed">
              {t('studio_photo_desc', 'Soft cinematic lighting, 4k resolution, clean neutral background, sharp focus, exact original object preservation, highly detailed native texture, photorealistic enhancement.')}
            </p>
          </div>

          <div className="w-full h-2 rounded-full overflow-hidden shimmer-gold" />
        </div>
      )}

      {/* TAB 1: AI VIEWFINDER / CAMERA MODE */}
      {activeTab === 'camera' && !isProcessing && (
        <div className="w-full flex flex-col items-center space-y-4">
          <div
            className={`relative w-full ${getViewfinderClass(
              aspectRatio,
              deviceCategory
            )} bg-[#1A1815] rounded-3xl overflow-hidden border-2 border-[#D9A441]/40 shadow-2xl flex flex-col justify-between p-3.5 sm:p-4 transition-all duration-300 ease-out`}
            style={{
              aspectRatio:
                aspectRatio === '1:1'
                  ? '1 / 1'
                  : aspectRatio === '4:3'
                  ? '4 / 3'
                  : aspectRatio === '9:16'
                  ? '9 / 16'
                  : '16 / 9',
            }}
          >
            <img
              src={viewfinderImage}
              alt="Live Viewfinder"
              className="absolute inset-0 w-full h-full object-cover opacity-85 transition-all duration-300"
            />

            {showGrid && (
              <div className="absolute inset-0 woven-viewfinder pointer-events-none" />
            )}

            {/* Top Camera Controls */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex bg-black/60 backdrop-blur-md rounded-full p-1 border border-white/20">
                {availableRatios.map((ratio) => (
                  <button
                    key={ratio}
                    id={`btn-aspect-${ratio.replace(':', '-')}`}
                    onClick={() => {
                      sound.playTap();
                      setAspectRatio(ratio);
                    }}
                    className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full transition-colors cursor-pointer ${
                      aspectRatio === ratio ? 'bg-[#E8B84B] text-[#1A1815]' : 'text-white/80 hover:text-white'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    sound.playTap();
                    setShowGrid(!showGrid);
                  }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border cursor-pointer ${
                    showGrid
                      ? 'bg-[#E8B84B] text-[#1A1815] border-[#E8B84B]'
                      : 'bg-black/60 text-white border-white/20'
                  }`}
                  title="Toggle Framing Grid"
                >
                  <span className="material-symbols-outlined text-base">grid_4x4</span>
                </button>

                {/* Hidden input for camera upload handling */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <button
                  onClick={() => sound.playTap()}
                  className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-md border border-white/20 cursor-pointer"
                  title="Toggle Flash"
                >
                  <span className="material-symbols-outlined text-base">flash_on</span>
                </button>
              </div>
            </div>

            {/* Center Focus Box Indicator - positioned absolutely so it never consumes vertical flex space or squashes controls */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-20 h-20 sm:w-24 sm:h-24 border-2 border-dashed border-[#E8B84B] rounded-2xl flex flex-col items-center justify-center pointer-events-none animate-pulse">
              <span className="text-[9px] uppercase tracking-widest text-[#E8B84B] font-bold bg-black/70 px-2 py-0.5 rounded">
                {t('focus_locked', 'Sharp Focus Locked')}
              </span>
              <span className="text-[8px] text-white/80 mt-1">
                {t('geometry_preserved', 'Exact Geometry Preserved')}
              </span>
            </div>

            {/* Bottom Lighting Presets Bar (Always full clearance, never cut off across 1:1, 4:3, 16:9, and 9:16) */}
            <div className="relative z-10 w-full pt-1 sm:pt-2">
              <div
                ref={lightingScrollRef}
                className="w-full overflow-x-auto no-scrollbar py-1 scroll-smooth"
              >
                <div className="flex items-center gap-2 px-1 sm:px-2 min-w-max justify-start">
                  {[
                    { id: 'soft_cinematic', label: t('lighting_soft_cinematic', 'Soft Cinematic'), icon: 'wb_incandescent' },
                    { id: 'clean_neutral', label: t('lighting_direct_sunlight', 'Clean Neutral'), icon: 'wb_sunny' },
                    { id: 'texture_macro', label: t('lighting_heritage_museum', 'High Detail Macro'), icon: 'texture' },
                    { id: 'photorealistic', label: t('lighting_boutique_gallery', 'Editorial Polish'), icon: 'auto_awesome' },
                  ].map((light) => (
                    <button
                      key={light.id}
                      id={`btn-lighting-${light.id}`}
                      onClick={() => {
                        sound.playTap();
                        setActiveLighting(light.id);
                        if (light.id === 'soft_cinematic' && lightingScrollRef.current) {
                          lightingScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-medium backdrop-blur-md transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                        activeLighting === light.id
                          ? 'bg-[#B5451B] text-white border-2 border-[#E8B84B] shadow-md'
                          : 'bg-black/75 text-white/95 border border-white/30 hover:bg-black/90'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">{light.icon}</span>
                      <span className="whitespace-nowrap">{light.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Shutter & Actions Row */}
          <div className="flex items-center justify-center gap-6 pt-3">
            <button
              onClick={() => {
                sound.playTap();
                setActiveTab('gallery');
              }}
              className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-[#22331E]/20 shadow-xs hover:scale-105 active:scale-95 transition-transform cursor-pointer"
              title={t('studio_gallery', 'Studio Gallery')}
              id="btn-viewfinder-gallery"
            >
              <img
                src={studioProducts[0]?.polishedImageUrl || 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=800&auto=format&fit=crop&q=80'}
                alt="Thumbnail"
                className="w-full h-full object-cover"
              />
            </button>

            {/* Master Capture Button */}
            <button
              onClick={() => handleCapture()}
              className="w-20 h-20 rounded-full bg-[#B5451B] border-4 border-[#F4ECDE] shadow-xl flex items-center justify-center text-white active:scale-90 transition-transform group cursor-pointer"
              title={t('capture_photo', 'Capture Photo')}
              id="btn-viewfinder-shutter"
            >
              <div className="w-14 h-14 rounded-full border-2 border-[#E8B84B] flex items-center justify-center bg-[#9E3913] group-hover:bg-[#B5451B] transition-colors">
                <span className="material-symbols-outlined text-2xl text-[#E8B84B]">
                  camera
                </span>
              </div>
            </button>

            {/* Upload Button on the right side of shutter button */}
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                fileInputRef.current?.click();
              }}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer ${
                isDark
                  ? 'bg-[#1C221A] border-[#D4A759]/40 text-[#E8B84B] hover:bg-[#252E22]'
                  : 'bg-[#EFE4CF] border-[#22331E]/20 text-[#B5451B] hover:bg-[#EAE0CC]'
              }`}
              title={t('upload_photo', 'Upload Craft Photo')}
              id="btn-viewfinder-upload"
            >
              <span className="material-symbols-outlined text-2xl">
                upload_file
              </span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: STUDIO GALLERY */}
      {activeTab === 'gallery' && !isProcessing && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3
              className={`font-serif font-bold text-lg ${
                isDark ? 'text-[#F4ECDE]' : 'text-[#22331E]'
              }`}
            >
              {t('enhanced_catalog', 'Enhanced Studio Catalog')}
            </h3>
            <span className="text-xs text-[#B5451B] font-sans font-bold">
              {t('high_res_crafts_count', '{count} High-Res Crafts').replace(
                '{count}',
                String(studioProducts.length)
              )}
            </span>
          </div>


          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {studioProducts.map((prod) => (
              <div
                key={prod.id}
                className={`rounded-3xl p-3.5 border flex flex-col justify-between shadow-xs group ${
                  isDark
                    ? 'bg-[#1C221A] border-[#2D3A2B]'
                    : 'bg-[#EFE4CF] border-[#22331E]/10'
                }`}
              >
                <div className="w-full aspect-square rounded-2xl overflow-hidden relative mb-2">
                  <img
                    src={prod.polishedImageUrl}
                    alt={prod.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-[#22331E]/90 text-white rounded-full text-[9px] font-bold">
                    ₹{(prod.price ?? 1200).toLocaleString('en-IN')}
                  </div>
                  <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/70 backdrop-blur-xs text-[8px] font-bold text-[#E8B84B] rounded">
                    {t('studio_4k_badge', '4K Studio')}
                  </div>
                </div>

                <h4
                  className={`font-serif font-bold text-xs line-clamp-1 ${
                    isDark ? 'text-[#F4ECDE]' : 'text-[#1A1815]'
                  }`}
                >
                  {prod.title}
                </h4>
                <p className="text-[10px] opacity-70 font-sans mt-0.5">
                  {prod.category} • {prod.stock} {t('in_stock', 'in stock')}
                </p>

                <div className="flex gap-1.5 mt-2">
                  <button
                    onClick={() => {
                      sound.playTap();
                      if (onSelectProductForCatalog) {
                        onSelectProductForCatalog(prod);
                      }
                      onNavigate('cataloger');
                    }}
                    className="flex-1 bg-[#B5451B] text-white text-[10px] font-semibold py-2 rounded-xl text-center flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">mic</span>
                    <span>{t('catalog', 'Catalog')}</span>
                  </button>
                  <button
                    onClick={() => {
                      sound.playTap();
                      onNavigate('social');
                    }}
                    className={`w-8 h-8 rounded-xl border flex items-center justify-center text-[#25D366] ${
                      isDark
                        ? 'bg-[#121411] border-[#2D3A2B]'
                        : 'bg-white border-[#22331E]/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">share</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          onNavigate('b2b');
        }}
        onAction={() => {
          setShowSuccess(false);
          onNavigate('b2b');
        }}
        title={t('studio_enhancement_complete', 'Studio Enhancement Complete!')}
        subtitle={t('studio_photo_desc', 'Soft cinematic lighting, 4k resolution, clean neutral background, sharp focus, exact original object preservation, highly detailed native texture, photorealistic enhancement.')}
        actionText={t('continue_to_sell', 'Continue to Sell')}
        actionLabel={t('continue_to_sell', 'Continue to Sell')}
        isDark={isDark}
      />
    </div>
  );
};

