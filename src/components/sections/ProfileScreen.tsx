import React, { useState } from 'react';
import { ArtisanProfile, ScreenId, LanguageCode } from '../../types';
import { sound } from '../../services/sound';
import { EditProfileModal } from '../profile/EditProfileModal';
import { WhatsAppIcon, InstagramIcon, FacebookIcon, XIcon, BlueVerifiedBadge } from '../common/SocialIcons';
import { SocialRedirectModal, SocialPlatformType } from '../common/SocialRedirectModal';
import { ShareWorkshopModal } from '../common/ShareWorkshopModal';
import { useTranslation } from '../../services/translations';
import { DEFAULT_ARTISAN_AVATAR } from '../../data/mockData';
import { useAdminMode } from '../../context/AdminModeContext';

const DEFAULT_AVATAR = DEFAULT_ARTISAN_AVATAR;

interface ProfileScreenProps {
  artisan: ArtisanProfile;
  onNavigate: (screen: ScreenId) => void;
  onUpdateArtisan: (updated: ArtisanProfile) => void;
  isDark?: boolean;
  language?: LanguageCode;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  artisan,
  onNavigate,
  onUpdateArtisan,
  isDark = false,
}) => {
  const { t, language } = useTranslation();
  const { isAdminMode } = useAdminMode();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [redirectPlatform, setRedirectPlatform] = useState<SocialPlatformType | null>(null);

  const artisanSlug = artisan.name.toLowerCase().replace(/\s+/g, '-');
  const storeUrl = `https://shilpsetu.org/${artisanSlug}`;
  const defaultShareCaption = `🏺 Discover authentic ${artisan.craft} handcrafted by master artisan ${artisan.name} from ${artisan.location}.\n\n✨ Direct from maker with zero middlemen. Certified on ShilpSetu & GeM Govt portal.\n\n#HandmadeInIndia #VocalForLocal #ArtisanDirect #ShilpSetu`;

  const handleOpenSocialRedirect = (platform: SocialPlatformType) => {
    sound.playTap();
    setRedirectPlatform(platform);
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-28 md:pb-12 pt-2 px-3 sm:px-6 lg:px-8 space-y-6">
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
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#B5451B]/15 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          {/* Avatar with gold ring, Blue Verified Badge & edit badge */}
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-[#B5451B] via-[#E8B84B] to-[#2E4638] shadow-md">
              <img
                src={artisan.avatarUrl || DEFAULT_AVATAR}
                alt={artisan.name}
                className="w-full h-full rounded-full object-cover border-2 border-[#F5EFE3]"
              />
            </div>

            {/* Official Blue Verified Badge */}
            {isAdminMode && <div
              className="absolute bottom-0 right-0 flex items-center justify-center drop-shadow-md"
              title="Official Blue Verified Master Artisan"
            >
              <BlueVerifiedBadge size={26} />
            </div>}

          </div>

          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <h3 className="font-serif font-bold text-2xl">{artisan.name}</h3>
            {isAdminMode && <BlueVerifiedBadge size={20} />}
          </div>
          <p className="text-xs font-serif font-semibold text-[#B5451B] mt-0.5">
            {t('artisan_default_title', artisan.title)}
          </p>
          <div className="text-xs opacity-80 font-sans mt-0.5 flex items-center justify-center gap-1.5 flex-wrap">
            <span>{artisan.location}</span>
            <span>•</span>
            <span>{t('artisan_default_craft', artisan.craft)}</span>
            {artisan.gender && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#B5451B]/10 text-[#B5451B] dark:text-[#FFA680]">
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
                  <span className="material-symbols-outlined text-xs text-[#B5451B]">call</span>
                  <span>+91 {artisan.mobile}</span>
                </span>
              )}
              {artisan.email && artisan.email.trim().length > 0 && (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 border border-[#22331E]/10 dark:border-white/10 truncate max-w-[200px]">
                  <span className="material-symbols-outlined text-xs text-[#B5451B]">mail</span>
                  <span className="truncate">{artisan.email.trim()}</span>
                </span>
              )}
            </div>
          )}

          {/* Verification Badges */}
          <div className="flex flex-wrap justify-center gap-1.5 mt-3">
            {isAdminMode && <span className="px-2.5 py-0.5 bg-[#0095F6]/15 text-[#0095F6] dark:text-[#52B7FF] rounded-full text-[10px] font-bold uppercase border border-[#0095F6]/30 flex items-center gap-1">
              <BlueVerifiedBadge size={12} />
            </span>}
            {isAdminMode && <span className="px-2.5 py-0.5 bg-[#2E4638]/15 text-[#2E4638] dark:text-[#88C498] rounded-full text-[10px] font-bold uppercase border border-[#2E4638]/20 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">check_circle</span>
              {t('gem_govt_vendor', 'GeM Govt. Vendor')}
            </span>}
            <span className="px-2.5 py-0.5 bg-[#E8B84B]/20 text-[#B5451B] rounded-full text-[10px] font-bold uppercase border border-[#E8B84B]/40 font-mono">
              {artisan.udyamNumber || 'UDYAM-UP-0029182'}
            </span>
            <span className="px-2.5 py-0.5 bg-[#B5451B]/15 text-[#B5451B] dark:text-[#FFA680] rounded-full text-[10px] font-bold uppercase border border-[#B5451B]/30 flex items-center gap-1">
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
            className="mt-4 px-4 py-2 rounded-2xl bg-[#B5451B]/15 hover:bg-[#B5451B]/25 text-[#B5451B] dark:text-[#FFA680] border border-[#B5451B]/30 font-serif font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all"
          >
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

    </div>
  </div>

      {/* Edit Profile Modal with Custom Photo Upload & Cascading State/City */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        artisan={artisan}
        onSave={(updated) => {
          onUpdateArtisan(updated);
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

    </div>
  );
};
