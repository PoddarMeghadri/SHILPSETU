import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { sound } from '../../services/sound';
import { ShilpSetuLogo } from './ShilpSetuLogo';
import { useTranslation } from '../../services/translations';

interface PrintableCraftQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  craftTitle: string;
  category: string;
  price: number;
  artisanName: string;
  artisanLocation?: string;
  materials?: string;
  craftId?: string;
  isDark?: boolean;
}

export const PrintableCraftQRCodeModal: React.FC<PrintableCraftQRCodeModalProps> = ({
  isOpen,
  onClose,
  craftTitle,
  category,
  price,
  artisanName,
  artisanLocation = 'Jaipur, Rajasthan',
  materials = 'Terracotta & River Clay',
  craftId = 'craft-9812',
  isDark = false,
}) => {
  const { t } = useTranslation();
  const labelRef = useRef<HTMLDivElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const craftUrl = `https://shilpsetu.org/craft/${craftId}`;
  const batchCode = `IN-GI-${Math.abs(craftTitle.split('').reduce((acc, char) => acc + char.charCodeAt(0), 100))}`;

  const handlePrint = () => {
    sound.playTap();
    window.print();
  };

  const handleDownloadTagImage = async () => {
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
      link.download = `ShilpSetu_Craft_Hangtag_${craftTitle.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      sound.playSuccess();
    } catch (err) {
      console.error('Error downloading hangtag:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className={`w-full max-w-md rounded-3xl shadow-2xl border flex flex-col overflow-hidden ${
            isDark ? 'bg-[#1C221A] border-[#2D3A2B] text-[#F4ECDE]' : 'bg-[#FDFBF7] border-[#22331E]/20 text-[#1A1815]'
          }`}
        >
          {/* Modal Header */}
          <div className="p-4 border-b border-current/10 flex items-center justify-between shrink-0 bg-black/5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#B5451B]">qr_code_scanner</span>
              <div>
                <h3 className="font-serif font-bold text-sm sm:text-base text-[#B5451B]">
                  {t('generate_qr_label', 'Print Physical QR Label')}
                </h3>
                <p className="text-[11px] opacity-75">
                  {t('generate_qr_desc', 'Generate physical hangtag linking buyers to your digital story')}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                sound.playTap();
                onClose();
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>

          {/* Physical Craft Hangtag Preview Area */}
          <div className="p-6 overflow-y-auto flex-1 bg-neutral-100 dark:bg-black/30 flex justify-center">
            {/* Physical Hangtag Card */}
            <div
              ref={labelRef}
              id="printable-craft-tag"
              className="w-72 bg-gradient-to-b from-[#FFFDF9] to-[#FBF7EE] text-[#1A1815] p-5 rounded-3xl shadow-xl border-2 border-[#D4A759]/60 relative flex flex-col items-center text-center space-y-3"
              style={{
                boxShadow: '0 10px 25px -5px rgba(181, 69, 27, 0.15)',
              }}
            >
              {/* Hangtag Punch Hole Guide */}
              <div className="w-5 h-5 rounded-full border-2 border-[#D4A759] bg-neutral-200/50 flex items-center justify-center shadow-inner">
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
              </div>

              {/* ShilpSetu & GeM Brand Header */}
              <div className="flex items-center justify-center gap-1.5 pt-0.5">
                <ShilpSetuLogo size="xs" />
                <span className="font-serif font-black text-sm tracking-wider text-[#B5451B]">
                  SHILPSETU
                </span>
              </div>

              <div className="w-full border-t border-[#D4A759]/40" />

              {/* Craft Info */}
              <div className="space-y-1 w-full">
                <span className="text-[9px] uppercase font-bold tracking-widest text-[#2E4638] bg-[#E8B84B]/25 px-2 py-0.5 rounded-full">
                  {category}
                </span>
                <h4 className="font-serif font-bold text-base text-[#1A1815] leading-tight line-clamp-2 pt-1">
                  {craftTitle}
                </h4>
                <p className="text-[11px] text-neutral-600 font-serif">
                  Crafted by <strong className="text-[#B5451B]">{artisanName}</strong>
                </p>
                <p className="text-[10px] text-neutral-500 font-sans">
                  {artisanLocation}
                </p>
              </div>

              {/* QR Code Container */}
              <div className="p-3 bg-white rounded-2xl border-2 border-[#E8B84B]/40 shadow-sm flex flex-col items-center">
                <QRCodeSVG
                  value={craftUrl}
                  size={120}
                  level="H"
                  includeMargin={false}
                />
                <span className="text-[8px] font-bold uppercase tracking-widest text-[#B5451B] mt-1.5">
                  {t('scan_story_hint', 'Scan for Heritage Story')}
                </span>
              </div>

              {/* Details and Price */}
              <div className="w-full bg-[#FAF4E8] p-2.5 rounded-xl border border-[#22331E]/10 space-y-1">
                <div className="flex justify-between items-center text-[10px] font-sans">
                  <span className="opacity-70">{t('materials_label', 'Materials')}:</span>
                  <span className="font-semibold text-neutral-800 truncate max-w-[140px]">{materials}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-sans">
                  <span className="opacity-70">Batch UID:</span>
                  <span className="font-mono font-bold text-[#B5451B]">{batchCode}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-black/5">
                  <span className="text-[11px] font-bold text-[#2E4638]">{t('fair_market_price', 'Fair Value')}:</span>
                  <span className="text-sm font-bold font-mono text-[#B5451B]">₹{price.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Certified Seal */}
              <div className="pt-1 flex items-center justify-center gap-1 text-[9px] text-emerald-800 font-bold uppercase tracking-wider">
                <span className="material-symbols-outlined text-sm text-emerald-700">verified</span>
                <span>{t('craft_origin_tag', 'Certified Authentic Handcrafted')}</span>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-4 border-t border-current/10 bg-black/5 flex items-center justify-between gap-3 shrink-0">
            <button
              onClick={handlePrint}
              className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
                isDark ? 'border-[#2D3A2B] hover:bg-[#252E22]' : 'border-[#22331E]/20 hover:bg-[#FAF4E8]'
              }`}
            >
              <span className="material-symbols-outlined text-base">print</span>
              <span>{t('print_label', 'Print Craft Hangtags')}</span>
            </button>

            <button
              onClick={handleDownloadTagImage}
              disabled={isDownloading}
              className="flex-1 py-2.5 px-3 bg-[#B5451B] hover:bg-[#9C3A14] text-white text-xs font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">
                {isDownloading ? 'sync' : 'image'}
              </span>
              <span>
                {isDownloading ? 'Saving...' : 'Download Tag Image'}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
