import React, { useState, useEffect } from 'react';
import { DEFAULT_ARTISAN_AVATAR } from '../../data/mockData';

/**
 * Checks whether an avatar URL is unusable, temporary, or known to fail.
 * Blob URLs must never be persisted across sessions because they expire on reload.
 */
export function isInvalidAvatarUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('blob:')) return true;
  if (
    trimmed.includes('images.unsplash.com/photo-1544005313') ||
    trimmed.includes('images.unsplash.com/photo-1534528741')
  ) {
    return true;
  }
  if (trimmed === 'null' || trimmed === 'undefined' || trimmed === '[object Object]') {
    return true;
  }
  return false;
}

/**
 * Normalizes an avatar URL, falling back to DEFAULT_ARTISAN_AVATAR if invalid.
 */
export function cleanseAvatarUrl(url?: string | null, fallback = DEFAULT_ARTISAN_AVATAR): string {
  if (isInvalidAvatarUrl(url)) {
    return fallback;
  }
  return (url as string).trim();
}

/**
 * Purges invalid, expired, or broken avatar references from localStorage.
 */
export function repairStoredAvatars(): void {
  if (typeof window === 'undefined') return;
  try {
    // 1. Cleanse shilpsetu_artisan
    const artisanRaw = localStorage.getItem('shilpsetu_artisan');
    if (artisanRaw) {
      try {
        const parsed = JSON.parse(artisanRaw);
        if (parsed && isInvalidAvatarUrl(parsed.avatarUrl)) {
          parsed.avatarUrl = DEFAULT_ARTISAN_AVATAR;
          localStorage.setItem('shilpsetu_artisan', JSON.stringify(parsed));
        }
      } catch (_) {}
    }

    // 2. Cleanse shilpsetu_user_profile
    const userProfRaw = localStorage.getItem('shilpsetu_user_profile');
    if (userProfRaw) {
      try {
        const parsed = JSON.parse(userProfRaw);
        if (parsed && (isInvalidAvatarUrl(parsed.avatar_url) || isInvalidAvatarUrl(parsed.avatarUrl))) {
          parsed.avatar_url = DEFAULT_ARTISAN_AVATAR;
          parsed.avatarUrl = DEFAULT_ARTISAN_AVATAR;
          localStorage.setItem('shilpsetu_user_profile', JSON.stringify(parsed));
        }
      } catch (_) {}
    }

    // 3. Cleanse shilpsetu_uploaded_portraits
    const portraitsRaw = localStorage.getItem('shilpsetu_uploaded_portraits');
    if (portraitsRaw) {
      try {
        const parsed = JSON.parse(portraitsRaw);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((u) => !isInvalidAvatarUrl(u));
          if (cleaned.length !== parsed.length) {
            localStorage.setItem('shilpsetu_uploaded_portraits', JSON.stringify(cleaned));
          }
        }
      } catch (_) {}
    }
  } catch (_) {}
}

export interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
  fallbackSrc?: string;
  name?: string;
  onBrokenImageDetected?: (brokenUrl: string) => void;
}

/**
 * Resilient AvatarImage component with zero-broken-image guarantee.
 * - Detects invalid/expired blob URLs synchronously before render.
 * - Catches runtime 404/403/CORS errors via onError and swaps instantly to fallback SVG.
 * - Automatically repairs corrupted localStorage keys to heal the artisan profile permanently.
 */
export const AvatarImage: React.FC<AvatarImageProps> = ({
  src,
  fallbackSrc = DEFAULT_ARTISAN_AVATAR,
  alt = 'Artisan profile',
  name,
  className = '',
  onError,
  onBrokenImageDetected,
  ...props
}) => {
  const safeInitial = cleanseAvatarUrl(src, fallbackSrc);
  const [currentSrc, setCurrentSrc] = useState<string>(safeInitial);
  const [hasFailed, setHasFailed] = useState<boolean>(false);

  useEffect(() => {
    const nextSafe = cleanseAvatarUrl(src, fallbackSrc);
    setCurrentSrc(nextSafe);
    setHasFailed(false);
  }, [src, fallbackSrc]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasFailed) {
      setHasFailed(true);
      setCurrentSrc(fallbackSrc);

      const failedUrl = src || currentSrc;
      if (failedUrl && onBrokenImageDetected) {
        onBrokenImageDetected(failedUrl);
      }

      // Automatically repair localStorage if current broken image is saved there
      try {
        if (typeof window !== 'undefined' && failedUrl && !failedUrl.startsWith('data:')) {
          const artisanSaved = localStorage.getItem('shilpsetu_artisan');
          if (artisanSaved && artisanSaved.includes(failedUrl)) {
            const parsed = JSON.parse(artisanSaved);
            if (parsed?.avatarUrl === failedUrl) {
              parsed.avatarUrl = fallbackSrc;
              localStorage.setItem('shilpsetu_artisan', JSON.stringify(parsed));
            }
          }

          const userProfSaved = localStorage.getItem('shilpsetu_user_profile');
          if (userProfSaved && userProfSaved.includes(failedUrl)) {
            const parsed = JSON.parse(userProfSaved);
            if (parsed?.avatar_url === failedUrl || parsed?.avatarUrl === failedUrl) {
              parsed.avatar_url = fallbackSrc;
              parsed.avatarUrl = fallbackSrc;
              localStorage.setItem('shilpsetu_user_profile', JSON.stringify(parsed));
            }
          }

          const portraitsRaw = localStorage.getItem('shilpsetu_uploaded_portraits');
          if (portraitsRaw && portraitsRaw.includes(failedUrl)) {
            const parsed = JSON.parse(portraitsRaw);
            if (Array.isArray(parsed)) {
              const cleaned = parsed.filter((p) => p !== failedUrl);
              localStorage.setItem('shilpsetu_uploaded_portraits', JSON.stringify(cleaned));
            }
          }
        }
      } catch (_) {}
    }

    onError?.(e);
  };

  return (
    <img
      src={currentSrc}
      alt={alt}
      onError={handleError}
      className={className}
      {...props}
    />
  );
};
