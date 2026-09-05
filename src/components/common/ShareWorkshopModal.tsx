import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { ArtisanProfile } from '../../types';
import { BlueVerifiedBadge, WhatsAppIcon, XIcon, FacebookIcon } from './SocialIcons';
import { sound } from '../../services/sound';
import { useTranslation } from '../../services/translations';

interface ShareWorkshopModalProps {
  isOpen: boolean;
  onClose: () => void;
  artisan: ArtisanProfile;
  isDark?: boolean;
}

export const ShareWorkshopModal: React.FC<ShareWorkshopModalProps> = ({
  isOpen,
  onClose,
  artisan,
  isDark = false,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const artisanSlug = artisan.name.toLowerCase().replace(/\s+/g, '-');
  const storeUrl = `https://shilpsetu.org/${artisanSlug}`;
  const shareMessage = `🙏 Namaste! Visit my verified artisan workshop on ShilpSetu:\n\n🏺 ${artisan.name} • ${artisan.craft}\n📍 ${artisan.location}\n✨ Direct from maker with zero middlemen.\n\n🔗 ${storeUrl}`;

  const handleCopyLink = () => {
    sound.playSuccess();
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(storeUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // ignore
    }
  };

  const handleDownloadQR = () => {
    sound.playSuccess();
    setDownloading(true);

    try {
      const svgElement = qrRef.current?.querySelector('svg');
      if (svgElement) {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        canvas.width = 600;
        canvas.height = 760;

        img.onload = () => {
          if (ctx) {
            // Background fill
            ctx.fillStyle = '#FAF4E8';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Border frame
            ctx.strokeStyle = '#B5451B';
            ctx.lineWidth = 10;
            ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

            // Header text
            ctx.fillStyle = '#22331E';
            ctx.font = 'bold 30px serif';
            ctx.textAlign = 'center';
            ctx.fillText('SHILPSETU CRAFT STANDEE', canvas.width / 2, 70);

            ctx.fillStyle = '#B5451B';
            ctx.font = 'italic 18px serif';
            ctx.fillText('Scan to view verified workshop & order direct', canvas.width / 2, 100);

            // Draw QR Code
            ctx.drawImage(img, 100, 130, 400, 400);

            // Artisan Name & Location
            ctx.fillStyle = '#1D1C14';
            ctx.font = 'bold 26px serif';
            ctx.fillText(artisan.name, canvas.width / 2, 580);

            ctx.fillStyle = '#666666';
            ctx.font = '18px sans-serif';
            ctx.fillText(`${artisan.craft} • ${artisan.location}`, canvas.width / 2, 615);

            // URL badge
            ctx.fillStyle = '#22331E';
            ctx.font = 'bold 18px monospace';
            ctx.fillText(`shilpsetu.org/${artisanSlug}`, canvas.width / 2, 660);

            // Govt / Trust footer
            ctx.fillStyle = '#2E4638';
            ctx.font = 'bold 14px sans-serif';
            ctx.fillText('✓ GeM Verified Master Artisan • Vocal For Local', canvas.width / 2, 710);

            const pngFile = canvas.toDataURL('image/png');
            const downloadLink = document.createElement('a');
            downloadLink.download = `ShilpSetu-${artisanSlug}-QR.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
          }
          setDownloading(false);
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
      } else {
        setDownloading(false);
      }
    } catch {
      setDownloading(false);
    }
  };

  const handleShareApp = (app: 'whatsapp' | 'x' | 'facebook') => {
    sound.playTap();
    let url = '';
    if (app === 'whatsapp') {
      url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
    } else if (app === 'x') {
      url = `https://x.com/intent/tweet?text=${encodeURIComponent(`Explore handcrafted heritage art by master craftsman ${artisan.name} on @ShilpSetu #HandmadeInIndia #VocalForLocal\n\n${storeUrl}`)}`;
    } else if (app === 'facebook') {
      url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(storeUrl)}&quote=${encodeURIComponent(shareMessage)}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          className={`w-full max-w-sm rounded-3xl p-6 border shadow-2xl relative overflow-hidden text-center my-auto ${
            isDark
              ? 'bg-[#1C221A] text-[#F4ECDE] border-[#2D3A2B]'
              : 'bg-[#FDFBF7] text-[#1A1815] border-[#22331E]/15'
          }`}
        >
          {/* Close button */}
          <button
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-current/50 hover:text-current hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>

          {/* Header */}
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="material-symbols-outlined text-[#B5451B] text-xl">qr_code_2</span>
            <h3 className="font-serif font-bold text-lg">{t('workshop_storefront_qr', 'Workshop Storefront & QR')}</h3>
          </div>
          <p className="text-xs opacity-75 font-sans mb-4">
            {t('display_qr_sub', 'Display this QR at your craft stall or share the digital link with buyers.')}
          </p>

          {/* Standee QR Card Container */}
          <div
            className={`p-4 rounded-2xl border mb-4 shadow-inner relative ${
              isDark
                ? 'bg-[#121411] border-[#2D3A2B]'
                : 'bg-[#FAF4E8] border-[#22331E]/15'
            }`}
          >
            {/* Artisan Profile Preview Strip */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <img
                src={artisan.avatarUrl}
                alt={artisan.name}
                className="w-8 h-8 rounded-full object-cover border border-[#E8B84B]"
              />
              <div className="text-left">
                <div className="flex items-center gap-1">
                  <span className="font-serif font-bold text-xs">{artisan.name}</span>
                  <BlueVerifiedBadge size={14} />
                </div>
                <span className="text-[10px] opacity-70 block leading-tight">{artisan.craft}</span>
              </div>
            </div>

            {/* Generated QR Code */}
            <div
              ref={qrRef}
              className="bg-white p-3.5 rounded-2xl shadow-md inline-block border border-black/10 mx-auto"
            >
              <QRCodeSVG
                value={storeUrl}
                size={168}
                level="H"
                includeMargin={false}
                fgColor="#22331E"
                imageSettings={{
                  src: artisan.avatarUrl,
                  x: undefined,
                  y: undefined,
                  height: 36,
                  width: 36,
                  excavate: true,
                }}
              />
            </div>

            <p className="text-[10px] font-mono font-semibold text-[#B5451B] mt-2.5 tracking-tight">
              shilpsetu.org/{artisanSlug}
            </p>
          </div>

          {/* Copyable Link Input */}
          <div className="mb-4">
            <div
              className={`flex items-center gap-2 p-2 rounded-2xl border ${
                isDark ? 'bg-[#121411] border-[#2D3A2B]' : 'bg-white border-[#22331E]/15'
              }`}
            >
              <span className="material-symbols-outlined text-sm opacity-50 ml-1">link</span>
              <input
                type="text"
                readOnly
                value={storeUrl}
                className="flex-1 bg-transparent text-xs font-mono outline-hidden truncate"
              />
              <button
                onClick={handleCopyLink}
                className={`px-3 py-1.5 rounded-xl text-xs font-serif font-bold transition-all active:scale-95 flex items-center gap-1 shrink-0 ${
                  copied
                    ? 'bg-[#2E4638] text-white'
                    : 'bg-[#B5451B] hover:bg-[#9C3A14] text-white shadow-xs'
                }`}
              >
                <span className="material-symbols-outlined text-xs">
                  {copied ? 'check' : 'content_copy'}
                </span>
                <span>{copied ? t('copied', 'Copied') : t('copy', 'Copy')}</span>
              </button>
            </div>
          </div>

          {/* Quick Direct Share Buttons */}
          <div className="space-y-2 mb-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-current/60 block text-left">
              {t('share_workshop_directly', 'Share Workshop Directly:')}
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleShareApp('whatsapp')}
                className="p-2.5 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#128C7E] dark:text-[#25D366] transition-all active:scale-95"
              >
                <WhatsAppIcon size={18} />
                <span>WhatsApp</span>
              </button>
              <button
                onClick={() => handleShareApp('x')}
                className="p-2.5 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-black/20 border border-current/10 flex items-center justify-center gap-1.5 text-xs font-semibold text-black dark:text-white transition-all active:scale-95"
              >
                <XIcon size={18} />
                <span>X</span>
              </button>
              <button
                onClick={() => handleShareApp('facebook')}
                className="p-2.5 rounded-xl bg-[#1877F2]/15 hover:bg-[#1877F2]/25 border border-[#1877F2]/30 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#1877F2] transition-all active:scale-95"
              >
                <FacebookIcon size={18} />
                <span>Facebook</span>
              </button>
            </div>
          </div>

          {/* Download Standee Button */}
          <div className="flex gap-2">
            <button
              onClick={handleDownloadQR}
              disabled={downloading}
              className="flex-1 py-3 px-4 rounded-2xl bg-[#22331E] hover:bg-[#2D3A2B] text-[#FFEBB3] font-serif font-bold text-xs shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-base">
                {downloading ? 'hourglass_top' : 'download'}
              </span>
              <span>{downloading ? t('exporting_png', 'Exporting PNG...') : t('download_qr_standee', 'Download QR Standee')}</span>
            </button>

            <button
              onClick={() => {
                sound.playTap();
                onClose();
              }}
              className={`py-3 px-4 rounded-2xl border font-serif font-bold text-xs active:scale-95 transition-all ${
                isDark
                  ? 'bg-[#252E22] border-[#2D3A2B] text-[#F4ECDE]'
                  : 'bg-[#EFE4CF] border-[#22331E]/15 text-[#1A1815]'
              }`}
            >
              {t('done', 'Done')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
