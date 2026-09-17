import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ProductItem, ArtisanProfile, ScreenId, LanguageCode } from '../../types';
import { sound } from '../../services/sound';
import { WhatsAppIcon, InstagramIcon, FacebookIcon, XIcon } from '../common/SocialIcons';
import { SocialRedirectModal, SocialPlatformType } from '../common/SocialRedirectModal';
import { useTranslation } from '../../services/translations';

interface SocialShareScreenProps {
  products: ProductItem[];
  artisan: ArtisanProfile;
  onNavigate: (screen: ScreenId) => void;
  isDark?: boolean;
  language?: LanguageCode;
}

type TemplateTheme = 'minimal' | 'festive' | 'artisan_seal' | 'story_card';

export const SocialShareScreen: React.FC<SocialShareScreenProps> = ({
  products,
  artisan,
  onNavigate,
  isDark = false,
}) => {
  const { t } = useTranslation();
  const [selectedProduct, setSelectedProduct] = useState<ProductItem>(products[0]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateTheme>('festive');
  const [caption, setCaption] = useState<string>(
    `🏺 Directly from our Varanasi pottery wheel to your home.\n\n` +
      `Handcrafted ${selectedProduct.title} shaped with pure riverbed clay, burnished with river pebbles, and open wood kiln fired.\n\n` +
      `✨ Price: ₹${selectedProduct.price} (Inclusive of safe packaging)\n` +
      `📦 DM or WhatsApp to order direct from master artisan ${artisan.name}.\n\n` +
      `#HandmadeInIndia #VaranasiPottery #VocalForLocal #IndianArtisans #ShilpSetu #Terracotta`
  );
  const [redirectPlatform, setRedirectPlatform] = useState<SocialPlatformType | null>(null);

  const artisanSlug = artisan.name.toLowerCase().replace(/\s+/g, '-');
  const storeUrl = `https://shilpsetu.org/${artisanSlug}`;

  const handleShareClick = (platform: SocialPlatformType) => {
    sound.playTap();
    setRedirectPlatform(platform);
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-28 md:pb-12 pt-2 px-3 sm:px-6 lg:px-8 space-y-6">
      {/* Top Banner */}
      <div
        className={`rounded-3xl p-5 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs ${
          isDark ? 'bg-[#1C221A] border-[#2D3A2B] text-[#F4ECDE]' : 'bg-[#EFE4CF] border-[#22331E]/10 text-[#1A1815]'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#22331E] text-[#E8B84B] flex items-center justify-center shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-2xl">share</span>
          </div>
          <div>
            <h3 className="font-serif font-bold text-base sm:text-lg">
              {t('social_share_header', '1-Click Social Marketing Kit')}
            </h3>
            <p className="text-xs opacity-75 font-sans leading-relaxed mt-0.5 max-w-2xl">
              {t('social_share_desc', 'AI formats your craft into ready-to-post graphics with hashtags for WhatsApp, Instagram, and Facebook.')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs opacity-60 font-sans">Direct Store:</span>
          <span className="text-xs font-mono font-bold text-[#B5451B] bg-white/40 dark:bg-black/20 px-2.5 py-1 rounded-lg border border-black/5">
            /{artisanSlug}
          </span>
        </div>
      </div>

      {/* Main 2-Column Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Craft Selector, Theme Tabs, Live Preview Card */}
        <div className="lg:col-span-6 space-y-5">
          {/* Product Selector */}
          <div className="space-y-2">
            <span className="text-xs uppercase font-bold tracking-widest text-[#B5451B]">
              {t('select_craft_to_market', 'Select Craft to Market:')}
            </span>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {products.map((prod) => (
                <button
                  key={prod.id}
                  onClick={() => {
                    sound.playTap();
                    setSelectedProduct(prod);
                    setCaption(
                      `🏺 Directly from our workshop to your home.\n\n` +
                        `Handcrafted ${prod.title}.\n\n` +
                        `✨ Price: ₹${prod.price} (Direct Artisan Price)\n` +
                        `📦 DM or WhatsApp to order direct from master artisan ${artisan.name}.\n\n` +
                        `#HandmadeInIndia #VocalForLocal #ShilpSetu #ArtisanDirect`
                    );
                  }}
                  className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border text-xs shrink-0 transition-all ${
                    selectedProduct.id === prod.id
                      ? 'bg-[#B5451B] text-white border-[#B5451B] font-bold shadow-xs'
                      : isDark
                      ? 'bg-[#1C221A] text-[#F4ECDE] border-[#2D3A2B]'
                      : 'bg-[#EFE4CF] text-[#1A1815] border-[#22331E]/10'
                  }`}
                >
                  <img
                    src={prod.polishedImageUrl}
                    alt={prod.title}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?w=800&auto=format&fit=crop&q=80';
                    }}
                    className="w-7 h-7 rounded-xl object-cover"
                  />
                  <span className="truncate max-w-[140px]">{prod.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Template Theme Tabs */}
          <div
            className={`flex p-1.5 rounded-2xl border ${
              isDark ? 'bg-[#1C221A] border-[#2D3A2B]' : 'bg-[#EFE4CF] border-[#22331E]/10'
            }`}
          >
            {[
              { id: 'festive', label: 'Festive Gold' },
              { id: 'minimal', label: 'Ivory Minimal' },
              { id: 'artisan_seal', label: 'Wax Seal' },
              { id: 'story_card', label: 'Heritage Story' },
            ].map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => {
                  sound.playTap();
                  setSelectedTemplate(tmpl.id as TemplateTheme);
                }}
                className={`flex-1 py-2 text-xs font-serif font-bold rounded-xl transition-all ${
                  selectedTemplate === tmpl.id
                    ? 'bg-[#22331E] text-[#E8B84B] shadow-xs'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                {tmpl.label}
              </button>
            ))}
          </div>

          {/* Live Social Preview Card Frame */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className={`font-serif font-bold ${isDark ? 'text-[#F4ECDE]' : 'text-[#22331E]'}`}>
                Generated Marketing Post
              </span>
              <span className="text-[10px] text-[#B5451B] uppercase font-bold">1:1 Square Format</span>
            </div>

            {/* The Card Component */}
            <motion.div
              key={selectedTemplate + selectedProduct.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`relative w-full max-w-md mx-auto aspect-square rounded-3xl overflow-hidden shadow-2xl border-2 flex flex-col justify-between p-5 ${
                isDark ? 'border-[#2D3A2B]' : 'border-[#22331E]/15'
              } ${
                selectedTemplate === 'festive'
                  ? 'bg-gradient-to-b from-[#1A1815] via-[#2B2823] to-[#1A1815] text-[#F4ECDE]'
                  : selectedTemplate === 'minimal'
                  ? 'bg-[#F4ECDE] text-[#1A1815]'
                  : selectedTemplate === 'artisan_seal'
                  ? 'bg-[#EFE4CF] text-[#1A1815]'
                  : 'bg-[#22331E] text-[#F4ECDE]'
              }`}
            >
              {/* Background Product Image */}
              <div className="absolute inset-0 z-0">
                <img
                  src={selectedProduct.polishedImageUrl}
                  alt={selectedProduct.title}
                  className={`w-full h-full object-cover ${
                    selectedTemplate === 'festive'
                      ? 'opacity-85'
                      : selectedTemplate === 'minimal'
                      ? 'opacity-90'
                      : 'opacity-80'
                  }`}
                />
                {/* Gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/60" />
              </div>

              {/* Top Stamp / Header Overlay */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20">
                  <span className="w-2 h-2 rounded-full bg-[#E8B84B] animate-pulse" />
                  <span className="text-[10px] sm:text-xs uppercase font-bold tracking-widest text-[#FFEBB3]">
                    ShilpSetu Certified Craft
                  </span>
                </div>

                {/* Wax Seal Badge if selected */}
                {selectedTemplate === 'artisan_seal' && (
                  <div className="w-10 h-10 rounded-full bg-[#B5451B] border-2 border-[#E8B84B] flex items-center justify-center text-white shadow-lg">
                    <span className="material-symbols-outlined text-lg">verified</span>
                  </div>
                )}
              </div>

              {/* Bottom Card Title & Price Overlay */}
              <div className="relative z-10 space-y-2 bg-black/70 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/15">
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-[#E8B84B]">
                      Direct From Maker • {artisan.location}
                    </span>
                    <h4 className="font-serif font-bold text-base sm:text-lg text-white leading-tight mt-0.5">
                      {selectedProduct.title}
                    </h4>
                    <p className="text-xs text-white/80 font-sans mt-0.5">
                      Master Artisan: <strong>{artisan.name}</strong>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] sm:text-[10px] text-[#E8B84B] uppercase font-bold block">Artisan Price</span>
                    <span className="font-serif font-bold text-xl sm:text-2xl text-white">
                      ₹{selectedProduct.price}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right Column: Caption Editor & Direct Social Channels */}
        <div className="lg:col-span-6 space-y-5">
          {/* Editable Caption with Hashtags */}
          <div
            className={`rounded-3xl p-5 border shadow-xs space-y-3 ${
              isDark ? 'bg-[#1C221A] border-[#2D3A2B]' : 'bg-[#EFE4CF] border-[#22331E]/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#B5451B] block">
                Auto-Generated Caption & Hashtags
              </label>
            </div>
            <textarea
              rows={8}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className={`w-full border rounded-2xl p-4 text-xs font-sans leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-[#B5451B] ${
                isDark
                  ? 'bg-[#121411] border-[#2D3A2B] text-white'
                  : 'bg-white border-[#22331E]/15 text-[#1A1815]'
              }`}
            />
          </div>

          {/* Direct Social Channels Share Buttons with Official Icons */}
          <div className="space-y-3 pt-1">
            <span className="text-xs uppercase font-bold tracking-widest text-[#B5451B] block">
              {t('share_now', 'Publish Directly (Click to Open App):')}
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Official WhatsApp Button */}
              <button
                onClick={() => handleShareClick('whatsapp')}
                title="Publish on WhatsApp"
                className="bg-[#25D366] hover:bg-[#1EBE5D] text-white font-serif font-bold py-3.5 px-3 rounded-2xl shadow-md flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all text-xs"
              >
                <WhatsAppIcon size={26} />
                <span className="text-xs whitespace-nowrap text-center font-bold">WhatsApp</span>
              </button>

              {/* Official Instagram Button */}
              <button
                onClick={() => handleShareClick('instagram')}
                title="Publish on Instagram"
                className="bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white font-serif font-bold py-3.5 px-3 rounded-2xl shadow-md flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all text-xs"
              >
                <InstagramIcon size={26} />
                <span className="text-xs whitespace-nowrap text-center font-bold">Instagram</span>
              </button>

              {/* Official Facebook Button */}
              <button
                onClick={() => handleShareClick('facebook')}
                title="Publish on Facebook"
                className="bg-[#1877F2] hover:bg-[#1565C0] text-white font-serif font-bold py-3.5 px-3 rounded-2xl shadow-md flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all text-xs"
              >
                <FacebookIcon size={26} />
                <span className="text-xs whitespace-nowrap text-center font-bold">Facebook</span>
              </button>

              {/* Official X (Twitter) Button */}
              <button
                onClick={() => handleShareClick('x')}
                title="Publish on X"
                className="bg-black hover:bg-neutral-800 text-white font-serif font-bold py-3.5 px-3 rounded-2xl shadow-md flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all text-xs"
              >
                <XIcon size={24} />
                <span className="text-xs whitespace-nowrap text-center font-bold">X (Twitter)</span>
              </button>
            </div>
          </div>

          {/* Helpful Tips Card for Artisans */}
          <div className={`rounded-3xl p-4 border flex items-start gap-3 text-xs ${
            isDark ? 'bg-[#1C221A] border-[#2D3A2B] text-[#F4ECDE]' : 'bg-[#EAE0CC] border-[#22331E]/10 text-[#1A1815]'
          }`}>
            <span className="material-symbols-outlined text-[#B5451B] text-xl shrink-0">tips_and_updates</span>
            <p className="opacity-80 font-sans leading-relaxed">
              Posts shared through ShilpSetu contain direct links to your verified digital storefront with secure SBI Escrow payments, ensuring you receive 100% of the sale value.
            </p>
          </div>
        </div>
      </div>

      {/* Social Redirect Confirmation Modal */}
      {redirectPlatform && (
        <SocialRedirectModal
          isOpen={!!redirectPlatform}
          onClose={() => setRedirectPlatform(null)}
          platform={redirectPlatform}
          captionText={caption}
          storeUrl={storeUrl}
          isDark={isDark}
        />
      )}
    </div>
  );
};

