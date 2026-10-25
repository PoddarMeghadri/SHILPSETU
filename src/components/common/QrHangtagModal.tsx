import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas-pro';
import { sound } from '../../services/sound';
import { ShilpSetuLogo } from './ShilpSetuLogo';
import { useTranslation } from '../../services/translations';
import { INITIAL_ARTISAN } from '../../data/mockData';
import { ArtisanProfile } from '../../types';

export function useArtisanProfile(): ArtisanProfile {
  const [profile, setProfile] = useState<ArtisanProfile>(() => {
    try {
      const stored = localStorage.getItem('shilpsetu_artisan');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...INITIAL_ARTISAN,
          ...parsed,
          name: parsed.name || parsed.fullName || INITIAL_ARTISAN.name,
          location: parsed.location || (parsed.city ? `${parsed.city}, ${parsed.state || 'India'}` : INITIAL_ARTISAN.location),
        };
      }
    } catch (_) {}
    return INITIAL_ARTISAN;
  });

  useEffect(() => {
    const handleStorage = () => {
      try {
        const stored = localStorage.getItem('shilpsetu_artisan');
        if (stored) {
          const parsed = JSON.parse(stored);
          setProfile({
            ...INITIAL_ARTISAN,
            ...parsed,
            name: parsed.name || parsed.fullName || INITIAL_ARTISAN.name,
            location: parsed.location || (parsed.city ? `${parsed.city}, ${parsed.state || 'India'}` : INITIAL_ARTISAN.location),
          });
        }
      } catch (_) {}
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return profile;
}

export interface QrHangtagModalProps {
  isOpen: boolean;
  onClose: () => void;
  craftTitle: string;
  category?: string;
  price: number;
  materials?: string;
  craftId?: string;
  artisanName?: string;
  artisanLocation?: string;
  artisanId?: string;
  isDark?: boolean;
}

export const QrHangtagModal: React.FC<QrHangtagModalProps> = ({
  isOpen,
  onClose,
  craftTitle,
  category = 'Handicrafts',
  price,
  materials = 'Natural River Clay & Mineral Glaze',
  craftId,
  artisanName: propArtisanName,
  artisanLocation: propArtisanLocation,
  artisanId: propArtisanId,
  isDark = false,
}) => {
  const { t } = useTranslation();
  const activeArtisan = useArtisanProfile();
  const labelRef = useRef<HTMLDivElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeSide, setActiveSide] = useState<'front' | 'back' | 'both'>('both');

  if (!isOpen) return null;

  // Resolve dynamic artisan values
  const effectiveArtisanName = propArtisanName || activeArtisan.name || 'Ranjit Prajapati';
  const effectiveLocation = propArtisanLocation || activeArtisan.location || 'Varanasi, Uttar Pradesh';
  const effectiveArtisanId = propArtisanId || activeArtisan.id || 'artisan-7501';
  const effectiveCraftId = craftId || `craft-${Math.abs(craftTitle.split('').reduce((acc, char) => acc + char.charCodeAt(0), 100))}`;

  // Dynamic Vercel Hangtag URL
  const qrDynamicUrl = `https://shilpsetu-seven.vercel.app/artisan/${effectiveArtisanId}/product/${effectiveCraftId}`;
  const batchCode = `IN-GI-${Math.abs(craftTitle.split('').reduce((acc, char) => acc + char.charCodeAt(0), 100))}`;

  const handlePrint = () => {
    sound.playTap();
    window.print();
  };

  const handleDownload = async () => {
    if (!labelRef.current || isDownloading) return;
    try {
      sound.playTap();
      setIsDownloading(true);

      const canvas = await html2canvas(labelRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#FFFFFF',
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `ShilpSetu_Hangtag_${craftTitle.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      sound.playSuccess();
    } catch (err) {
      console.warn('Hangtag download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      {/* 3" x 5" Print Stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-hangtag-area,
          #printable-hangtag-area * {
            visibility: visible !important;
          }
          #printable-hangtag-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 6in !important;
            height: 5in !important;
            margin: 0 !important;
            padding: 0.1in !important;
            background: #FFFFFF !important;
            color: #000000 !important;
            display: flex !important;
            flex-direction: row !important;
            gap: 0.2in !important;
            justify-content: center !important;
            align-items: center !important;
            z-index: 999999 !important;
          }
          .hangtag-card {
            width: 2.85in !important;
            height: 4.8in !important;
            border: 2px solid #D4A759 !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
          }
          @page {
            size: auto;
            margin: 0;
          }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`w-full max-w-2xl rounded-3xl p-5 sm:p-6 shadow-2xl border my-4 relative max-h-[94vh] overflow-y-auto ${
            isDark
              ? 'bg-[#1C221A] text-[#F4ECDE] border-[#2D3A2B]'
              : 'bg-[#FAF6EE] text-[#1A1815] border-[#22331E]/15'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#B5451B]/15 text-[#B5451B] flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-2xl">qr_code_2</span>
              </div>
              <div>
                <h3 className="font-serif font-bold text-base sm:text-lg leading-tight">
                  {t('generate_qr_label', 'Print Physical QR Label & Hangtag')}
                </h3>
                <p className="text-[11px] opacity-75 font-sans">
                  Dynamic 3"×5" dual-sided hangtag for <span className="font-bold text-[#B5451B]">{effectiveArtisanName}</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playTap();
                onClose();
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {/* Active Artisan Verification Banner */}
          <div className="p-3 rounded-2xl bg-[#B5451B]/10 border border-[#B5451B]/20 mb-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#B5451B]">verified_user</span>
              <span>
                Verified Artisan: <strong>{effectiveArtisanName}</strong> ({effectiveLocation})
              </span>
            </div>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-[#B5451B] text-white font-bold">
              {batchCode}
            </span>
          </div>

          {/* Printable Dual-Sided Hangtag Container (3" x 5" aspect ratio) */}
          <div
            id="printable-hangtag-area"
            ref={labelRef}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 justify-center items-center py-2"
          >
            {/* SIDE A: FRONT OF HANGTAG (Craft Details, Pricing, Artisan Name) */}
            <div className="hangtag-card w-full max-w-[280px] h-[440px] mx-auto rounded-2xl border-2 border-[#D4A759] bg-[#FAF7EE] text-[#1A1815] p-4 flex flex-col justify-between shadow-lg relative overflow-hidden select-none">
              {/* Top Punch Hole Guide */}
              <div className="flex justify-center -mt-1 mb-2">
                <div className="w-5 h-5 rounded-full border-2 border-[#D4A759] bg-white flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#D4A759]" />
                </div>
              </div>

              {/* Header Branding */}
              <div className="text-center space-y-1">
                <div className="flex justify-center mb-1">
                  <ShilpSetuLogo size="xs" />
                </div>
                <h4 className="font-serif font-black text-sm tracking-widest text-[#B5451B] leading-none">
                  SHILPSETU
                </h4>
                <p className="text-[9px] font-serif uppercase tracking-widest text-[#78350f]">
                  Heritage Craft of India
                </p>
              </div>

              {/* Craft Info Center Block */}
              <div className="text-center my-auto py-2 space-y-1.5 border-y border-[#D4A759]/30">
                <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#2E4638] text-white uppercase tracking-wider">
                  {category}
                </span>
                <h5 className="font-serif font-bold text-base text-[#1A1815] leading-tight line-clamp-2 px-1">
                  {craftTitle}
                </h5>
                <p className="text-[11px] text-[#555] font-serif italic">
                  Crafted by {effectiveArtisanName}
                </p>
                <p className="text-[10px] text-[#777] font-sans flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[11px]">location_on</span>
                  <span>{effectiveLocation}</span>
                </p>
                <p className="text-[9.5px] text-[#666] font-sans line-clamp-1 px-2">
                  Materials: {materials}
                </p>
              </div>

              {/* Bottom Price & Trust Bar */}
              <div className="text-center pt-2">
                <span className="text-[9px] uppercase tracking-wider text-black/60 font-sans block">
                  Direct Fair Price
                </span>
                <span className="font-serif font-black text-2xl text-[#B5451B]">
                  ₹{Number(price).toLocaleString('en-IN')}
                </span>
                <span className="text-[8.5px] text-[#2E4638] font-bold block mt-0.5">
                  ✓ 100% Handcrafted • Zero Middlemen
                </span>
              </div>
            </div>

            {/* SIDE B: BACK OF HANGTAG (Dynamic QR Code & Provenance) */}
            <div className="hangtag-card w-full max-w-[280px] h-[440px] mx-auto rounded-2xl border-2 border-[#D4A759] bg-[#FAF7EE] text-[#1A1815] p-4 flex flex-col justify-between shadow-lg relative overflow-hidden select-none">
              {/* Top Punch Hole Guide */}
              <div className="flex justify-center -mt-1 mb-2">
                <div className="w-5 h-5 rounded-full border-2 border-[#D4A759] bg-white flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#D4A759]" />
                </div>
              </div>

              {/* Header */}
              <div className="text-center">
                <span className="text-[10px] font-serif font-bold uppercase tracking-wider text-[#B5451B]">
                  Authenticity & Provenance
                </span>
                <p className="text-[9px] text-black/60 font-sans">
                  Scan to meet the maker and hear oral story
                </p>
              </div>

              {/* Dynamic QR Code Centerpiece */}
              <div className="my-auto flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-[#D4A759]/40 shadow-xs mx-auto">
                <QRCodeSVG
                  value={qrDynamicUrl}
                  size={140}
                  level="H"
                  includeMargin={true}
                  fgColor="#1A1815"
                />
                <span className="text-[8.5px] font-mono text-black/60 mt-1 truncate max-w-[180px]">
                  {qrDynamicUrl}
                </span>
              </div>

              {/* Instructions & GI Tag */}
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-[#2E4638]">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  <span>Geographical Indication Verified</span>
                </div>
                <p className="text-[8.5px] text-black/60 leading-tight">
                  Camera scan opens digital passport, workshop photos & care guide.
                </p>
                <p className="font-mono text-[9px] text-[#B5451B] font-bold">
                  BATCH: {batchCode}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons: Print Craft Hangtags & Download PNG */}
          <div className="mt-5 pt-3 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 py-3 px-4 rounded-xl bg-[#B5451B] hover:bg-[#9C3A14] text-white font-serif font-bold text-sm flex items-center justify-center gap-2 shadow-artisan transition-transform active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">print</span>
              <span>Print Craft Hangtags (3" × 5")</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="py-3 px-4 rounded-xl border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 font-serif font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              <span>{isDownloading ? 'Generating...' : 'Download Image'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default QrHangtagModal;
