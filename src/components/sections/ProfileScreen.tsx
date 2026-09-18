import React, { useState, useRef, useEffect } from 'react';
import { ArtisanProfile, ProductItem, ScreenId, LanguageCode } from '../../types';
import { sound } from '../../services/sound';
import { EditProfileModal } from '../profile/EditProfileModal';
import { WhatsAppIcon, InstagramIcon, FacebookIcon, XIcon, BlueVerifiedBadge } from '../common/SocialIcons';
import { SocialRedirectModal, SocialPlatformType } from '../common/SocialRedirectModal';
import { ShareWorkshopModal } from '../common/ShareWorkshopModal';
import { useTranslation } from '../../services/translations';
import { useAdminMode } from '../../context/AdminModeContext';
import { DEFAULT_ARTISAN_AVATAR } from '../../data/mockData';

const DEFAULT_AVATAR = DEFAULT_ARTISAN_AVATAR;

interface ProfileScreenProps {
  artisan: ArtisanProfile;
  products: ProductItem[];
  isOffline: boolean;
  onToggleOffline: () => void;
  onNavigate: (screen: ScreenId) => void;
  onUpdateArtisan: (updated: ArtisanProfile) => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  language?: LanguageCode;
  onLogout?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  artisan,
  products = [],
  isOffline,
  onToggleOffline,
  onNavigate,
  onUpdateArtisan,
  isDark = false,
  onToggleTheme,
  onLogout,
}) => {
  const { t, language } = useTranslation();
  const { isAdminMode, exitAdminMode } = useAdminMode();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [redirectPlatform, setRedirectPlatform] = useState<SocialPlatformType | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Profile photo upload input ref
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const directGalleryInputRef = useRef<HTMLInputElement | null>(null);

  // State for recent photos persisted across refresh (purely craft/workshop photos, never profile pictures)
  const [recentPhotos, setRecentPhotos] = useState<string[]>(() => {
    const saved = localStorage.getItem('shilpsetu_recent_photos');
    let photos: string[] = [];
    if (saved) {
      try {
        photos = JSON.parse(saved);
      } catch (_) {}
    } else {
      photos = artisan.recentPhotos || [
        'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=600&auto=format&fit=crop&q=80',
      ];
    }
    // Strict requirement: Never include uploaded profile pictures in recent photos
    const currentAvatar = artisan.avatarUrl;
    const uploadedPortraits: string[] = JSON.parse(localStorage.getItem('shilpsetu_uploaded_portraits') || '[]');
    return photos.filter((p) => p !== currentAvatar && !uploadedPortraits.includes(p));
  });

  // Sync to localStorage and artisan object
  useEffect(() => {
    localStorage.setItem('shilpsetu_recent_photos', JSON.stringify(recentPhotos));
  }, [recentPhotos]);

  const artisanSlug = artisan.name.toLowerCase().replace(/\s+/g, '-');
  const storeUrl = `https://shilpsetu.org/${artisanSlug}`;
  const defaultShareCaption = `🏺 Discover authentic ${artisan.craft} handcrafted by master artisan ${artisan.name} from ${artisan.location}.\n\n✨ Direct from maker with zero middlemen. Certified on ShilpSetu & GeM Govt portal.\n\n#HandmadeInIndia #VocalForLocal #ArtisanDirect #ShilpSetu`;

  const handleOpenSocialRedirect = (platform: SocialPlatformType) => {
    sound.playTap();
    setRedirectPlatform(platform);
  };

  // Remove photo with top cross button
  const handleRemovePhoto = (indexToRemove: number) => {
    sound.playTap();
    const updated = recentPhotos.filter((_, idx) => idx !== indexToRemove);
    setRecentPhotos(updated);
    localStorage.setItem('shilpsetu_recent_photos', JSON.stringify(updated));
    onUpdateArtisan({ ...artisan, recentPhotos: updated });
  };

  // Direct upload to recent photos
  const handleDirectGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      sound.playTap();
      const reader = new FileReader();
      reader.onload = (event) => {
        const resultUrl = event.target?.result as string;
        if (resultUrl) {
          const updated = [resultUrl, ...recentPhotos];
          setRecentPhotos(updated);
          localStorage.setItem('shilpsetu_recent_photos', JSON.stringify(updated));
          onUpdateArtisan({ ...artisan, recentPhotos: updated });
          sound.playSuccess();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload new profile picture
  const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      sound.playTap();
      const reader = new FileReader();
      reader.onload = (event) => {
        const resultUrl = event.target?.result as string;
        if (resultUrl) {
          const updatedArtisan = { ...artisan, avatarUrl: resultUrl };
          onUpdateArtisan(updatedArtisan);
          localStorage.setItem('shilpsetu_artisan', JSON.stringify(updatedArtisan));
          // Save to uploaded portraits only (never to recent photos)
          try {
            const savedPortraits: string[] = JSON.parse(localStorage.getItem('shilpsetu_uploaded_portraits') || '[]');
            if (!savedPortraits.includes(resultUrl)) {
              localStorage.setItem('shilpsetu_uploaded_portraits', JSON.stringify([resultUrl, ...savedPortraits]));
            }
          } catch (_) {}
          sound.playSuccess();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove profile picture (reset to default avatar)
  const handleRemoveProfilePicture = () => {
    sound.playTap();
    const updatedArtisan = { ...artisan, avatarUrl: DEFAULT_AVATAR };
    onUpdateArtisan(updatedArtisan);
    localStorage.setItem('shilpsetu_artisan', JSON.stringify(updatedArtisan));
    sound.playSuccess();
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-28 md:pb-12 pt-2 px-3 sm:px-6 lg:px-8 space-y-6">
      {/* Hidden inputs for direct uploads */}
      <input
        ref={profilePhotoInputRef}
        type="file"
        accept="image/*"
        onChange={handleProfilePictureUpload}
        className="hidden"
      />
      <input
        ref={directGalleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleDirectGalleryUpload}
        className="hidden"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Master Identity Card & Key Credentials */}
        <div className="lg:col-span-5 space-y-5">
          {/* Artisan Master Identity Card */}
      <div
        className={`rounded-3xl p-6 border shadow-artisan relative overflow-hidden text-center transition-colors ${
          isDark
            ? 'bg-[#1C221A] border-[#2D3A2B] text-[#F4ECDE]'
            : 'bg-[#EAE0CC] border-[#22331E]/15 text-[#1D1C14]'
        }`}
      >
        {/* Decorative Background Glow */}
        <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-xl pointer-events-none ${
          isAdminMode ? 'bg-[#059669]/15' : 'bg-[#B5451B]/15'
        }`} />

        <div className="relative z-10 flex flex-col items-center">
          {/* Avatar with gold ring, Blue Verified Badge & edit badge */}
          <div className="relative mb-3 group">
            <div className={`w-24 h-24 rounded-full p-1 shadow-md ${
              isAdminMode
                ? 'bg-gradient-to-tr from-[#059669] via-[#E8B84B] to-[#047857]'
                : 'bg-gradient-to-tr from-[#B5451B] via-[#E8B84B] to-[#2E4638]'
            }`}>
              <img
                src={artisan.avatarUrl || DEFAULT_AVATAR}
                alt={artisan.name}
                className="w-full h-full rounded-full object-cover border-2 border-[#F5EFE3]"
              />
            </div>

            {/* Official Blue Verified Badge */}
            <div
              className="absolute bottom-0 right-0 flex items-center justify-center drop-shadow-md"
              title="Official Blue Verified Master Artisan"
            >
              <BlueVerifiedBadge size={26} />
            </div>

            {/* Quick Upload Overlay Button */}
            <button
              onClick={() => profilePhotoInputRef.current?.click()}
              className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              title="Change Profile Picture"
            >
              <span className="material-symbols-outlined text-white text-xl">photo_camera</span>
            </button>
          </div>

          {/* Profile Picture Actions: Upload & Remove */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => profilePhotoInputRef.current?.click()}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-full border flex items-center gap-1 transition-colors ${
                isAdminMode
                  ? 'bg-[#059669]/15 hover:bg-[#059669]/25 text-[#059669] dark:text-[#6EE7B7] border-[#059669]/30'
                  : 'bg-[#B5451B]/10 hover:bg-[#B5451B]/20 text-[#B5451B] dark:text-[#FFA680] border-[#B5451B]/30'
              }`}
            >
              <span className="material-symbols-outlined text-xs">add_a_photo</span>
              <span>{t('change_photo', 'Change Photo')}</span>
            </button>
            <button
              onClick={handleRemoveProfilePicture}
              className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-[11px] font-bold rounded-full border border-red-500/30 flex items-center gap-1 transition-colors"
              title={t('remove_photo', 'Remove Photo')}
            >
              <span className="material-symbols-outlined text-xs">delete</span>
              <span>{t('remove_photo', 'Remove Photo')}</span>
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <h3 className="font-serif font-bold text-2xl">{artisan.name}</h3>
            <BlueVerifiedBadge size={20} />
          </div>
          <p className={`text-xs font-serif font-semibold mt-0.5 ${
            isAdminMode ? 'text-[#059669] dark:text-[#6EE7B7]' : 'text-[#B5451B]'
          }`}>
            {t('artisan_default_title', artisan.title)}
          </p>
          <div className="text-xs opacity-80 font-sans mt-0.5 flex items-center justify-center gap-1.5 flex-wrap">
            <span>{artisan.location}</span>
            <span>•</span>
            <span>{t('artisan_default_craft', artisan.craft)}</span>
            {artisan.gender && (
              <>
                <span>•</span>
                <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  isAdminMode
                    ? 'bg-[#059669]/15 text-[#059669] dark:text-[#6EE7B7]'
                    : 'bg-[#B5451B]/10 text-[#B5451B] dark:text-[#FFA680]'
                }`}>
                  <span className="material-symbols-outlined text-xs">
                    {artisan.gender === 'male' ? 'male' : artisan.gender === 'female' ? 'female' : 'transgender'}
                  </span>
                  <span>{artisan.gender === 'male' ? 'Male' : artisan.gender === 'female' ? 'Female' : 'Others'}</span>
                </span>
              </>
            )}
          </div>

          {/* Contact Details - Display only provided mobile and email */}
          {((artisan.mobile && artisan.mobile.trim().length > 0) ||
            (artisan.email && artisan.email.trim().length > 0)) && (
            <div className="flex items-center justify-center gap-2.5 text-[11px] opacity-85 mt-1.5 font-mono flex-wrap">
              {artisan.mobile && artisan.mobile.trim().length > 0 && (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 border border-[#22331E]/10 dark:border-white/10">
                  <span className={`material-symbols-outlined text-xs ${isAdminMode ? 'text-[#059669] dark:text-[#6EE7B7]' : 'text-[#B5451B]'}`}>call</span>
                  <span>+91 {artisan.mobile}</span>
                </span>
              )}
              {artisan.email && artisan.email.trim().length > 0 && (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 border border-[#22331E]/10 dark:border-white/10 truncate max-w-[200px]">
                  <span className={`material-symbols-outlined text-xs ${isAdminMode ? 'text-[#059669] dark:text-[#6EE7B7]' : 'text-[#B5451B]'}`}>mail</span>
                  <span className="truncate">{artisan.email.trim()}</span>
                </span>
              )}
            </div>
          )}

          {/* Verification Badges */}
          <div className="flex flex-wrap justify-center gap-1.5 mt-3">
            <span className="px-2.5 py-0.5 bg-[#0095F6]/15 text-[#0095F6] dark:text-[#52B7FF] rounded-full text-[10px] font-bold uppercase border border-[#0095F6]/30 flex items-center gap-1">
              <BlueVerifiedBadge size={12} />
              {t('verified_artisan', 'Blue Verified')}
            </span>
            <span className="px-2.5 py-0.5 bg-[#2E4638]/15 text-[#2E4638] dark:text-[#88C498] rounded-full text-[10px] font-bold uppercase border border-[#2E4638]/20 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">check_circle</span>
              {t('gem_govt_vendor', 'GeM Govt. Vendor')}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border font-mono ${
              isAdminMode
                ? 'bg-[#E8B84B]/20 text-[#059669] dark:text-[#6EE7B7] border-[#E8B84B]/40'
                : 'bg-[#E8B84B]/20 text-[#B5451B] border-[#E8B84B]/40'
            }`}>
              {artisan.udyamNumber || 'UDYAM-UP-0029182'}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border flex items-center gap-1 ${
              isAdminMode
                ? 'bg-[#059669]/15 text-[#059669] dark:text-[#6EE7B7] border-[#059669]/30'
                : 'bg-[#B5451B]/15 text-[#B5451B] dark:text-[#FFA680] border-[#B5451B]/30'
            }`}>
              <span className="material-symbols-outlined text-xs">star</span>
              {t('trust_score', 'Trust Score')}: {artisan.trustScore ?? 98}/100
            </span>
          </div>

          {/* Artisan Bio & Story quote */}
          <p className="text-xs opacity-80 font-sans leading-relaxed mt-3 px-2 italic">
            "{t('artisan_story_quote', artisan.storyQuote || artisan.bio)}"
          </p>

          {/* Prominent Edit Profile Button */}
          <button
            onClick={() => {
              sound.playTap();
              setIsEditModalOpen(true);
            }}
            className={`mt-4 px-4 py-2 rounded-2xl font-serif font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all ${
              isAdminMode
                ? 'bg-[#059669]/15 hover:bg-[#059669]/25 text-[#059669] dark:text-[#6EE7B7] border border-[#059669]/30'
                : 'bg-[#B5451B]/15 hover:bg-[#B5451B]/25 text-[#B5451B] dark:text-[#FFA680] border border-[#B5451B]/30'
            }`}
          >
            <span className="material-symbols-outlined text-sm">edit</span>
            <span>{t('edit_profile', 'Edit Profile & Lineage')}</span>
          </button>
            <span className="material-symbols-outlined text-sm">edit</span>
            <span>{t('edit_profile', 'Edit Profile & Lineage')}</span>
          </button>
        </div>
      </div>

      {/* Profile Completeness Strip */}
      <div className="bg-[#22331E] text-[#F4ECDE] rounded-3xl p-5 border border-[#E8B84B]/40 shadow-xs space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold font-serif text-[#FFEBB3]">
            {t('profile_completeness', 'Profile Completeness')}
          </span>
          <span className="font-bold text-[#E8B84B]">
            {artisan.completeness}% {t('completed', 'Completed')}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full bg-[#E8B84B] rounded-full transition-all duration-500"
            style={{ width: `${artisan.completeness}%` }}
          />
        </div>
        <p className="text-[10px] text-white/70">
          {t('udyam_active_desc', 'Udyam registration and verified portfolio active.')}
        </p>
      </div>

      {/* Share Workshop QR Code Button - Opens Live QR Modal */}
      <button
        onClick={() => {
          sound.playSuccess();
          setIsShareModalOpen(true);
        }}
        className="w-full bg-[#B5451B] hover:bg-[#9C3A14] text-white font-serif font-bold py-3.5 rounded-2xl shadow-artisan flex items-center justify-center gap-2 text-sm active:scale-95 transition-all"
      >
        <span className="material-symbols-outlined text-lg">qr_code_2</span>
        <span>{t('share_qr_link', 'Share Workshop Link & QR')}</span>
      </button>
    </div>

    {/* Right Column: Workshop Photos, Social Marketing, Settings */}
    <div className="lg:col-span-7 space-y-5">
      {/* RECENT WORKSHOP PICTURES GALLERY (PERSISTED + CROSS BUTTON TO REMOVE) */}
      <div
        className={`rounded-3xl p-5 border shadow-xs space-y-3 ${
          isDark
            ? 'bg-[#1C221A] border-[#2D3A2B] text-[#F4ECDE]'
            : 'bg-[#EAE0CC] border-[#22331E]/15 text-[#1D1C14]'
        }`}
      >
        <div className="flex items-center justify-between">
          <h4 className="font-serif font-bold text-base flex items-center gap-2">
            <span className="material-symbols-outlined text-[#B5451B] text-xl">photo_library</span>
            <span>{t('recent_photos', 'Recent Photos')} ({recentPhotos.length})</span>
          </h4>
          <button
            onClick={() => directGalleryInputRef.current?.click()}
            className="flex items-center gap-1 text-[11px] font-bold text-[#B5451B] dark:text-[#FFA680] bg-[#B5451B]/15 hover:bg-[#B5451B]/25 px-3 py-1 rounded-full border border-[#B5451B]/30 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">add_photo_alternate</span>
            <span>{t('upload_photo', 'Upload Photo')}</span>
          </button>
        </div>

        <p className="text-xs opacity-75 font-sans">
          {t('recent_photos_desc', 'Photos are saved permanently across page refreshes. Tap the ✕ cross on any photo to remove it.')}
        </p>

        {recentPhotos.length === 0 ? (
          <div className="p-6 text-center rounded-2xl border-2 border-dashed border-[#22331E]/20 text-xs opacity-70">
            {t('no_recent_photos', 'No recent photos uploaded. Tap "Upload Photo" to add your craft pictures.')}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-1">
            {recentPhotos.map((imgUrl, idx) => (
              <div
                key={idx}
                className="relative aspect-square rounded-2xl overflow-hidden border border-[#22331E]/20 group shadow-sm bg-black/10"
              >
                <img
                  src={imgUrl}
                  alt={`Recent Craft ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Top Cross / Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemovePhoto(idx);
                  }}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-md active:scale-90 transition-transform z-10"
                  title={t('delete_photo', 'Remove this photo')}
                >
                  <span className="material-symbols-outlined text-[13px] font-bold">close</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Social Marketing Kit Hub with Official Icons & Redirect Confirmation */}
      <div
        className={`rounded-3xl p-5 border shadow-xs space-y-3 ${
          isDark
            ? 'bg-[#1C221A] border-[#2D3A2B] text-[#F4ECDE]'
            : 'bg-[#EAE0CC] border-[#22331E]/15 text-[#1D1C14]'
        }`}
      >
        <div className="flex items-center justify-between">
          <h4 className="font-serif font-bold text-base flex items-center gap-2">
            <span className="material-symbols-outlined text-[#B5451B] text-xl">share</span>
            {t('screen_social', 'Social Marketing Kit')}
          </h4>
          <span className="text-[10px] font-bold text-[#B5451B] uppercase tracking-wider">
            {t('official_channels', 'Official Channels')}
          </span>
        </div>

        <p className="text-xs opacity-75 leading-snug">
          {t(
            'social_share_desc',
            'Click any app to copy marketing story and redirect for instant direct publishing:'
          )}
        </p>

        {/* 4-Column Grid: WhatsApp, Instagram, Facebook, X */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {/* WhatsApp Action */}
          <button
            onClick={() => handleOpenSocialRedirect('whatsapp')}
            title={`${t('share_on_social', 'Share on')} WhatsApp`}
            className="py-2.5 px-1 bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 group"
          >
            <WhatsAppIcon size={26} />
            <span className="text-[9.5px] font-bold font-sans text-[#128C7E] dark:text-[#25D366] whitespace-nowrap text-center">
              WhatsApp
            </span>
          </button>

          {/* Instagram Action */}
          <button
            onClick={() => handleOpenSocialRedirect('instagram')}
            title={`${t('share_on_social', 'Share on')} Instagram`}
            className="py-2.5 px-1 bg-gradient-to-tr from-[#F58529]/15 via-[#DD2A7B]/15 to-[#8134AF]/15 hover:opacity-80 border border-[#DD2A7B]/40 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 group"
          >
            <InstagramIcon size={26} />
            <span className="text-[9.5px] font-bold font-sans text-[#C13584] dark:text-[#F77737] whitespace-nowrap text-center">
              Instagram
            </span>
          </button>

          {/* Facebook Action */}
          <button
            onClick={() => handleOpenSocialRedirect('facebook')}
            title={`${t('share_on_social', 'Share on')} Facebook`}
            className="py-2.5 px-1 bg-[#1877F2]/15 hover:bg-[#1877F2]/25 border border-[#1877F2]/40 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 group"
          >
            <FacebookIcon size={26} />
            <span className="text-[9.5px] font-bold font-sans text-[#1877F2] dark:text-[#64A9FF] whitespace-nowrap text-center">
              Facebook
            </span>
          </button>

          {/* X (Twitter) Action with Official X Logo */}
          <button
            onClick={() => handleOpenSocialRedirect('x')}
            title={`${t('share_on_social', 'Share on')} X`}
            className={`py-2.5 px-1 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 group border ${
              isDark
                ? 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                : 'bg-black/5 hover:bg-black/10 border-black/20 text-black'
            }`}
          >
            <XIcon size={24} className={isDark ? 'text-white' : '!text-black'} />
            <span className={`text-[9.5px] font-bold font-sans whitespace-nowrap text-center ${
              isDark ? 'text-white' : '!text-black'
            }`}>
              X
            </span>
          </button>
        </div>
      </div>

      {/* Workshop & Account Settings */}
      <div
        className={`rounded-3xl p-5 border shadow-xs space-y-3 ${
          isDark
            ? 'bg-[#1C221A] border-[#2D3A2B] text-[#F4ECDE]'
            : 'bg-[#EAE0CC] border-[#22331E]/15 text-[#1D1C14]'
        }`}
      >
        <h4 className="font-serif font-bold text-base">
          {t('workshop_settings', 'Workshop & Account Settings')}
        </h4>

        <div className="space-y-2">
          {/* Setting 1: Dark Mode Toggle Option */}
          {onToggleTheme && (
            <div
              className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                isDark ? 'bg-[#121411] border-[#2D3A2B]' : 'bg-white border-[#22331E]/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isDark ? 'bg-[#E8B84B] text-[#1A1815]' : 'bg-[#22331E] text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">
                    {isDark ? 'dark_mode' : 'light_mode'}
                  </span>
                </div>
                <div>
                  <p className="font-serif font-bold text-xs">
                    {t('theme_mode', 'Theme Appearance')}
                  </p>
                  <p className="text-[10px] opacity-70">
                    {isDark
                      ? t('dark_mode_active_label', 'Heritage Dark Mode Active')
                      : t('light_mode_active_label', 'Warm Sandalwood Light Active')}
                  </p>
                </div>
              </div>

              {/* Segmented Light/Dark selector buttons */}
              <div className="flex items-center p-0.5 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
                <button
                  type="button"
                  onClick={() => {
                    if (isDark) {
                      sound.playTap();
                      onToggleTheme();
                    }
                  }}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all ${
                    !isDark
                      ? 'bg-white text-[#B5451B] shadow-xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs">light_mode</span>
                  <span>{t('light_mode_btn', 'Light')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isDark) {
                      sound.playTap();
                      onToggleTheme();
                    }
                  }}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all ${
                    isDark
                      ? 'bg-[#B5451B] text-white shadow-xs'
                      : 'text-neutral-500 hover:text-black'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs">dark_mode</span>
                  <span>{t('dark_mode_btn', 'Dark')}</span>
                </button>
              </div>
            </div>
          )}

          {/* Setting 2: Edit Heritage Story */}
          <button
            onClick={() => {
              sound.playTap();
              onNavigate('story');
            }}
            className={`w-full p-3 rounded-2xl border flex items-center justify-between text-left active:scale-98 transition-all ${
              isDark
                ? 'bg-[#121411] border-[#2D3A2B] hover:bg-[#222720]'
                : 'bg-white border-[#22331E]/10 hover:bg-[#FAF4E8]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#B5451B] text-white flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">history_edu</span>
              </div>
              <div>
                <p className="font-serif font-bold text-xs">{t('edit_heritage_story', 'Edit Heritage Story')}</p>
                <p className="text-[10px] opacity-70">
                  {t('edit_lineage_desc', 'Update ancestral lineage & craft philosophy')}
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-sm opacity-60">arrow_forward_ios</span>
          </button>

          {/* Setting 3: Offline Mode Toggle */}
          <div
            className={`p-3 rounded-2xl border flex items-center justify-between ${
              isDark ? 'bg-[#121411] border-[#2D3A2B]' : 'bg-white border-[#22331E]/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${
                  isOffline ? 'bg-amber-600' : 'bg-[#2E4638]'
                }`}
              >
                <span className="material-symbols-outlined text-lg">
                  {isOffline ? 'cloud_off' : 'cloud_done'}
                </span>
              </div>
              <div>
                <p className="font-serif font-bold text-xs">
                  {t('simulate_offline', 'Simulate Offline Mode')}
                </p>
                <p className="text-[10px] opacity-70">
                  {t('offline_resilience_desc', 'Test cached offline resilience')}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playTap();
                onToggleOffline();
              }}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                isOffline ? 'bg-[#B5451B]' : 'bg-[#DDC0B8]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  isOffline ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Admin Mode Status & Exit Control */}
          {isAdminMode && (
            <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-serif font-bold text-xs text-emerald-800 dark:text-emerald-300">
                      Admin Bypass Mode Active
                    </p>
                    <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase tracking-wider bg-emerald-600 text-white rounded">
                      Test Mode
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 truncate">
                    Network authentication bypassed. Emerald theme active.
                  </p>
                </div>
              </div>
              <button
                id="btn-profile-exit-admin-mode"
                type="button"
                onClick={() => {
                  sound.playTap();
                  exitAdminMode();
                }}
                className="px-3 py-1.5 rounded-xl border border-emerald-600/30 bg-emerald-600/20 hover:bg-emerald-600 hover:text-white text-emerald-800 dark:text-emerald-200 text-xs font-serif font-bold transition-all active:scale-95 cursor-pointer shrink-0"
              >
                Exit Admin
              </button>
            </div>
          )}

          {/* Setting 4: Logout Button */}
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setShowLogoutModal(true);
            }}
            className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-left active:scale-98 transition-all ${
              isDark
                ? 'bg-red-950/20 border-red-900/40 hover:bg-red-950/40 text-red-300'
                : 'bg-red-50/80 border-red-200 hover:bg-red-100/90 text-red-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-lg">logout</span>
              </div>
              <div>
                <p className="font-serif font-bold text-xs">
                  {t('logout', 'Log Out')}
                </p>
                <p className="text-[10px] opacity-75">
                  {t('logout_desc', 'Sign out of your artisan account on this device')}
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-sm opacity-70">arrow_forward_ios</span>
          </button>
        </div>
      </div>
    </div>
  </div>

      {/* Edit Profile Modal with Custom Photo Upload & Cascading State/City */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        artisan={artisan}
        onSave={(updated) => {
          onUpdateArtisan(updated);
          if (updated.recentPhotos) {
            setRecentPhotos(updated.recentPhotos);
          }
        }}
        language={language}
        isDark={isDark}
      />

      {/* Live QR Code & Storefront Modal */}
      <ShareWorkshopModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        artisan={artisan}
        isDark={isDark}
      />

      {/* Social Redirect Confirmation Modal */}
      {redirectPlatform && (
        <SocialRedirectModal
          isOpen={!!redirectPlatform}
          onClose={() => setRedirectPlatform(null)}
          platform={redirectPlatform}
          captionText={defaultShareCaption}
          storeUrl={storeUrl}
          isDark={isDark}
        />
      )}

      {/* Logout Confirmation Dialog Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className={`w-full max-w-sm rounded-3xl p-6 border shadow-2xl space-y-4 text-center ${
              isDark
                ? 'bg-[#1C221A] border-[#2D3A2B] text-[#F4ECDE]'
                : 'bg-[#F4ECDE] border-[#22331E]/20 text-[#1A1815]'
            }`}
          >
            <div className="w-14 h-14 mx-auto rounded-full bg-red-500/15 border border-red-500/30 text-red-500 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">logout</span>
            </div>
            <div>
              <h4 className="font-serif font-bold text-lg">
                {t('logout_confirm_title', 'Log Out of ShilpSetu?')}
              </h4>
              <p className="text-xs opacity-75 mt-1 font-sans leading-relaxed">
                {t(
                  'logout_confirm_desc',
                  'You will be returned to the launch registration screen. You can sign back in anytime using your registered mobile number.'
                )}
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setShowLogoutModal(false);
                }}
                className="flex-1 py-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-serif font-bold transition-colors active:scale-95"
              >
                {t('cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setShowLogoutModal(false);
                  if (onLogout) {
                    onLogout();
                  }
                }}
                className="flex-1 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-serif font-bold shadow-md active:scale-95 transition-all"
              >
                {t('yes_logout', 'Yes, Log Out')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
