import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WhatsAppIcon, InstagramIcon, FacebookIcon, XIcon } from './SocialIcons';
import { sound } from '../../services/sound';
import { useTranslation } from '../../services/translations';

export type SocialPlatformType = 'whatsapp' | 'instagram' | 'facebook' | 'x';

interface SocialRedirectModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: SocialPlatformType;
  captionText: string;
  storeUrl?: string;
  isDark?: boolean;
}

export const SocialRedirectModal: React.FC<SocialRedirectModalProps> = ({
  isOpen,
  onClose,
  platform,
  captionText,
  storeUrl = 'https://shilpsetu.org/artisan',
  isDark = false,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const platformDetails: Record<
    SocialPlatformType,
    {
      name: string;
      colorBg: string;
      textColor: string;
      buttonBg: string;
      icon: React.ReactNode;
      description: string;
      getRedirectUrl: (caption: string, url: string) => string;
    }
  > = {
    whatsapp: {
      name: 'WhatsApp',
      colorBg: 'bg-[#25D366]/15',
      textColor: 'text-[#128C7E] dark:text-[#25D366]',
      buttonBg: 'bg-[#25D366] hover:bg-[#1EBE5D] text-white',
      icon: <WhatsAppIcon size={36} />,
      description: t(
        'whatsapp_share_desc',
        'Ready to share with your customer list or WhatsApp Status. Craft story & catalog link will be formatted automatically.'
      ),
      getRedirectUrl: (cap, url) =>
        `https://api.whatsapp.com/send?text=${encodeURIComponent(cap + '\n\n' + url)}`,
    },
    instagram: {
      name: 'Instagram',
      colorBg: 'bg-gradient-to-tr from-[#F58529]/20 via-[#DD2A7B]/20 to-[#8134AF]/20',
      textColor: 'text-[#C13584] dark:text-[#F77737]',
      buttonBg: 'bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white',
      icon: <InstagramIcon size={36} />,
      description: t(
        'instagram_share_desc',
        'Caption and hashtags will be copied to your clipboard so you can paste them directly when creating your Instagram Post or Story.'
      ),
      getRedirectUrl: () => 'https://www.instagram.com/',
    },
    facebook: {
      name: 'Facebook',
      colorBg: 'bg-[#1877F2]/15',
      textColor: 'text-[#1877F2]',
      buttonBg: 'bg-[#1877F2] hover:bg-[#1565C0] text-white',
      icon: <FacebookIcon size={36} />,
      description: t(
        'facebook_share_desc',
        'Publish directly to Facebook Marketplace, Craft Groups, or your Artisan Page to reach buyers across India.'
      ),
      getRedirectUrl: (cap, url) =>
        `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(cap)}&u=${encodeURIComponent(url)}`,
    },
    x: {
      name: 'X (Twitter)',
      colorBg: 'bg-black/10 dark:bg-white/10',
      textColor: 'text-black dark:text-white',
      buttonBg: 'bg-black hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200',
      icon: <XIcon size={36} />,
      description: t(
        'x_share_desc',
        'Post directly on X to showcase your master craft, tag #HandmadeInIndia & #VocalForLocal, and reach global art collectors.'
      ),
      getRedirectUrl: (cap, url) =>
        `https://x.com/intent/tweet?text=${encodeURIComponent(cap.slice(0, 240) + '...\n' + url)}`,
    },
  };

  const currentPlatform = platformDetails[platform];

  const handleConfirmRedirect = () => {
    sound.playSuccess();
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(captionText + '\n\n' + storeUrl);
        setCopied(true);
      }
    } catch {
      // ignore
    }

    const targetUrl = currentPlatform.getRedirectUrl(captionText, storeUrl);

    setTimeout(() => {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      onClose();
      setCopied(false);
    }, 450);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 12 }}
          className={`w-full max-w-sm rounded-3xl p-6 border shadow-2xl relative overflow-hidden text-center ${
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

          {/* Platform Icon Badge */}
          <div className="flex justify-center mb-3">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center border border-current/10 shadow-sm ${currentPlatform.colorBg}`}
            >
              {currentPlatform.icon}
            </div>
          </div>

          <h3 className="font-serif font-bold text-lg leading-tight mb-1">
            {t('redirect_to', 'Redirect to')} {currentPlatform.name}?
          </h3>
          <p className="text-xs opacity-75 font-sans leading-relaxed mb-4">
            {currentPlatform.description}
          </p>

          {/* Preview Box */}
          <div
            className={`p-3 rounded-2xl border text-left text-xs mb-5 max-h-28 overflow-y-auto ${
              isDark
                ? 'bg-[#121411] border-[#2D3A2B] text-neutral-300'
                : 'bg-[#EFE4CF]/60 border-[#22331E]/10 text-neutral-700'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-1 opacity-60">
              <span>{t('ready_for_posting', 'Ready for Posting')}</span>
              <span>{t('auto_formatted', 'Auto-Formatted')}</span>
            </div>
            <p className="line-clamp-3 italic text-[11px] leading-snug">{captionText}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5">
            <button
              onClick={() => {
                sound.playTap();
                onClose();
              }}
              className="flex-1 py-3 rounded-2xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-serif font-bold text-xs active:scale-95 transition-all"
            >
              {t('cancel', 'Cancel')}
            </button>

            <button
              onClick={handleConfirmRedirect}
              className={`flex-2 py-3 px-4 rounded-2xl font-serif font-bold text-xs shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all ${currentPlatform.buttonBg}`}
            >
              <span>{copied ? t('copied_opening', 'Copied! Opening...') : `${t('open_app', 'Open')} ${currentPlatform.name}`}</span>
              <span className="material-symbols-outlined text-sm">open_in_new</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
