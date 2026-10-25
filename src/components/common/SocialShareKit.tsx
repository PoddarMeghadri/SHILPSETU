import React from 'react';
import { ProductItem, ArtisanProfile } from '../../types';

/**
 * Sanitized caption title helper:
 * Prevents redundant "Handcrafted Handcrafted..." prefixes if the title already includes "Handcrafted".
 */
export function formatCraftTitleWithPrefix(title: string): string {
  const clean = (title || '').trim();
  if (/^handcrafted\b/i.test(clean)) {
    return clean;
  }
  return `Handcrafted ${clean}`;
}

export function generateSanitizedSocialCaption(params: {
  product: ProductItem;
  artisan: ArtisanProfile;
  platform?: 'instagram' | 'whatsapp' | 'facebook';
}): string {
  const { product, artisan, platform = 'instagram' } = params;
  const formattedTitle = formatCraftTitleWithPrefix(product.title);

  if (platform === 'whatsapp') {
    return (
      `🏺 *Direct from Artisan Workshop to Your Home*\n\n` +
      `*${formattedTitle}*\n\n` +
      `✨ Direct Artisan Price: ₹${product.price.toLocaleString('en-IN')}\n` +
      `📍 Origin: ${artisan.location || 'India'}\n` +
      `🌿 Materials: ${product.materials?.join(', ') || 'Natural organic materials'}\n\n` +
      `Tap here to purchase direct without middlemen: https://shilpsetu-seven.vercel.app/artisan/${artisan.id || 'master'}/product/${product.id}`
    );
  }

  return (
    `🏺 Directly from our workshop to your home.\n\n` +
    `${formattedTitle}.\n\n` +
    `✨ Price: ₹${product.price.toLocaleString('en-IN')} (Direct Artisan Price)\n` +
    `📦 DM or WhatsApp to order direct from master artisan ${artisan.name}.\n\n` +
    `#HandmadeInIndia #VocalForLocal #ShilpSetu #ArtisanDirect #HandicraftsOfIndia`
  );
}

export interface SocialShareKitProps {
  product: ProductItem;
  artisan: ArtisanProfile;
  onShare?: (caption: string) => void;
}

export const SocialShareKit: React.FC<SocialShareKitProps> = ({
  product,
  artisan,
  onShare,
}) => {
  const caption = generateSanitizedSocialCaption({ product, artisan });

  return (
    <div className="p-4 rounded-2xl bg-[#FAF6EE] dark:bg-[#1C221A] border border-[#22331E]/10 dark:border-[#2D3A2B] space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-serif font-bold text-sm text-[#B5451B]">
          1-Click Social Marketing Caption
        </h4>
        <span className="text-[11px] text-black/60 dark:text-white/60 font-mono">
          Ready to post
        </span>
      </div>

      <pre className="text-xs p-3 rounded-xl bg-white dark:bg-black/30 border border-black/5 dark:border-white/10 whitespace-pre-wrap font-sans text-black/80 dark:text-white/80 leading-relaxed">
        {caption}
      </pre>

      <button
        onClick={() => {
          navigator.clipboard.writeText(caption);
          if (onShare) onShare(caption);
        }}
        className="w-full py-2.5 rounded-xl bg-[#B5451B] text-white text-xs font-bold font-serif hover:bg-[#9C3A14] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
      >
        <span className="material-symbols-outlined text-base">content_copy</span>
        <span>Copy Sanitized Caption</span>
      </button>
    </div>
  );
};

export default SocialShareKit;
