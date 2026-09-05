import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArtisanProfile, LanguageCode } from '../../types';
import { sound } from '../../services/sound';
import { useTranslation } from '../../services/translations';
import { INDIAN_STATES_AND_CITIES, parseLocationString } from '../../data/indianLocations';
import { DEFAULT_ARTISAN_AVATAR } from '../../data/mockData';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  artisan: ArtisanProfile;
  onSave: (updatedArtisan: ArtisanProfile) => void;
  language: LanguageCode;
  isDark?: boolean;
}

const DEFAULT_AVATAR = DEFAULT_ARTISAN_AVATAR;

const AVATAR_PRESETS = [
  {
    name: 'Default Artisan Avatar',
    url: DEFAULT_ARTISAN_AVATAR,
  },
  {
    name: 'Meera (Madhubani)',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Babulal (Terracotta)',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Anandi Bai (Weaver)',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Kallu Mistry (Brass/Wood)',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Devaki (Pashmina/Embroidery)',
    url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&auto=format&fit=crop&q=80',
  },
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  artisan,
  onSave,
  language,
  isDark = false,
}) => {
  const { t } = useTranslation(language);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState<ArtisanProfile>({ ...artisan });
  const [selectedState, setSelectedState] = useState<string>('Uttar Pradesh');
  const [selectedCity, setSelectedCity] = useState<string>('Varanasi');
  const [uploadedPortraits, setUploadedPortraits] = useState<string[]>(() => {
    const saved = localStorage.getItem('shilpsetu_uploaded_portraits');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (_) {}
    }
    return [artisan.avatarUrl || DEFAULT_AVATAR];
  });
  const [selectedPortraitForDelete, setSelectedPortraitForDelete] = useState<string | null>(artisan.avatarUrl || null);

  const [recentPhotos, setRecentPhotos] = useState<string[]>(() => {
    const saved = localStorage.getItem('shilpsetu_recent_photos');
    let list: string[] = [];
    if (saved) {
      try {
        list = JSON.parse(saved);
      } catch (_) {}
    } else {
      list = artisan.recentPhotos || [
        'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=600&auto=format&fit=crop&q=80',
      ];
    }
    // Never include avatar in recent photos
    const currentAvatar = artisan.avatarUrl;
    return list.filter((p) => p !== currentAvatar);
  });
  const [isSaving, setIsSaving] = useState(false);

  // Sync state & city when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({ ...artisan });
      const parsed = parseLocationString(artisan.location);
      setSelectedState(parsed.state);
      setSelectedCity(parsed.city);
    }
  }, [isOpen, artisan]);

  // Update cities list when state changes
  const currentCities =
    INDIAN_STATES_AND_CITIES.find((s) => s.state === selectedState)?.cities || [];

  const handleStateChange = (newState: string) => {
    sound.playTap();
    setSelectedState(newState);
    const newCities =
      INDIAN_STATES_AND_CITIES.find((s) => s.state === newState)?.cities || [];
    const firstCity = newCities[0] || '';
    setSelectedCity(firstCity);
    const combinedLocation = `${firstCity}, ${newState}`;
    setFormData((prev) => ({ ...prev, location: combinedLocation }));
  };

  const handleCityChange = (newCity: string) => {
    sound.playTap();
    setSelectedCity(newCity);
    const combinedLocation = `${newCity}, ${selectedState}`;
    setFormData((prev) => ({ ...prev, location: combinedLocation }));
  };

  if (!isOpen) return null;

  // Handle avatar upload
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      sound.playTap();
      const reader = new FileReader();
      reader.onload = (event) => {
        const resultUrl = event.target?.result as string;
        if (resultUrl) {
          setFormData((prev) => ({ ...prev, avatarUrl: resultUrl }));
          setSelectedPortraitForDelete(resultUrl);
          const updatedPortraits = [resultUrl, ...uploadedPortraits.filter((p) => p !== resultUrl)];
          setUploadedPortraits(updatedPortraits);
          localStorage.setItem('shilpsetu_uploaded_portraits', JSON.stringify(updatedPortraits));
          sound.playSuccess();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Delete a specific uploaded portrait
  const handleDeletePortrait = (portraitUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playTap();
    const updated = uploadedPortraits.filter((p) => p !== portraitUrl);
    setUploadedPortraits(updated);
    localStorage.setItem('shilpsetu_uploaded_portraits', JSON.stringify(updated));

    if (formData.avatarUrl === portraitUrl) {
      const nextAvatar = updated[0] || DEFAULT_AVATAR;
      setFormData((prev) => ({ ...prev, avatarUrl: nextAvatar }));
      setSelectedPortraitForDelete(nextAvatar);
    } else if (selectedPortraitForDelete === portraitUrl) {
      setSelectedPortraitForDelete(null);
    }
  };

  // Handle gallery photo upload
  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          sound.playSuccess();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove a photo from recent photos
  const handleRemoveRecentPhoto = (indexToRemove: number) => {
    sound.playTap();
    const updated = recentPhotos.filter((_, idx) => idx !== indexToRemove);
    setRecentPhotos(updated);
    localStorage.setItem('shilpsetu_recent_photos', JSON.stringify(updated));
  };

  // Remove profile picture (reset to clean default avatar)
  const handleRemoveProfilePicture = () => {
    sound.playTap();
    setFormData((prev) => ({ ...prev, avatarUrl: DEFAULT_AVATAR }));
    setSelectedPortraitForDelete(DEFAULT_AVATAR);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    sound.playSuccess();

    const combinedLocation = `${selectedCity}, ${selectedState}`;

    // Ensure recentPhotos contains NO uploaded portraits
    const cleanedRecentPhotos = recentPhotos.filter(
      (p) => p !== formData.avatarUrl && !uploadedPortraits.includes(p)
    );

    setTimeout(() => {
      const updatedProfile: ArtisanProfile = {
        ...formData,
        name: formData.name.trim(),
        mobile: formData.mobile?.trim() || artisan.mobile,
        email: formData.email?.trim() ? formData.email.trim() : undefined,
        location: combinedLocation,
        recentPhotos: cleanedRecentPhotos,
        completeness: Math.min(
          100,
          70 + (formData.udyamNumber ? 15 : 0) + (formData.bio.length > 30 ? 15 : 0)
        ),
      };
      onSave(updatedProfile);
      localStorage.setItem('shilpsetu_artisan', JSON.stringify(updatedProfile));
      localStorage.setItem('shilpsetu_recent_photos', JSON.stringify(cleanedRecentPhotos));
      setIsSaving(false);
      onClose();
    }, 400);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border my-8 relative overflow-hidden max-h-[90vh] overflow-y-auto ${
            isDark
              ? 'bg-[#1C221A] text-[#F4ECDE] border-[#2D3A2B]'
              : 'bg-[#F4ECDE] text-[#1A1815] border-[#22331E]/15'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#22331E]/10 mb-4 sticky top-0 bg-inherit z-20">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#B5451B] text-2xl">
                account_circle
              </span>
              <div>
                <h3 className="font-serif font-bold text-lg leading-none">
                  {t('edit_profile', 'Edit Profile & Lineage')}
                </h3>
                <p className="text-[11px] opacity-70 mt-0.5">
                  {t('edit_heritage_desc', 'Update public craft identity & verified credentials')}
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
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Choose Artisan Portrait section - all uploaded profile pics to be shown there only with delete icon on click */}
            <div className="space-y-2.5 bg-black/5 dark:bg-white/5 p-3.5 rounded-2xl border border-[#22331E]/10">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold font-serif uppercase tracking-wider text-[#B5451B]">
                    {t('choose_portrait', 'Choose Artisan Portrait')}
                  </label>
                  <p className="text-[10px] opacity-70">
                    {t('click_portrait_hint', 'Click an uploaded portrait to select or delete.')}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#B5451B] bg-[#B5451B]/10 hover:bg-[#B5451B]/20 px-2.5 py-1 rounded-full transition-colors cursor-pointer active:scale-95"
                  >
                    <span className="material-symbols-outlined text-sm">photo_camera</span>
                    <span>{t('upload_photo', 'Upload')}</span>
                  </button>

                  {/* Remove Profile Picture button */}
                  <button
                    type="button"
                    onClick={handleRemoveProfilePicture}
                    className="flex items-center gap-1 text-[11px] font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                    title={t('reset_default_portrait', 'Reset to default portrait')}
                  >
                    <span className="material-symbols-outlined text-sm">restart_alt</span>
                    <span>{t('reset', 'Reset')}</span>
                  </button>
                </div>
              </div>

              {/* Hidden file input for avatar */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                id="artisan-avatar-upload"
              />

              <div className="flex items-center gap-3 pt-1">
                {/* Active Main Avatar Preview */}
                <div className="relative shrink-0">
                  <img
                    src={formData.avatarUrl}
                    alt={formData.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#E8B84B] shadow-md shrink-0"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#B5451B] text-white flex items-center justify-center shadow-xs border border-white cursor-pointer"
                    title={t('upload_custom_photo', 'Upload Custom Photo')}
                  >
                    <span className="material-symbols-outlined text-[13px]">add_a_photo</span>
                  </button>
                </div>

                {/* Uploaded Portraits Gallery: All uploaded profile pics shown here only */}
                <div className="flex-1 overflow-x-auto py-2 flex gap-2.5 no-scrollbar items-center">
                  {uploadedPortraits.length === 0 ? (
                    <span className="text-xs opacity-60 italic">{t('no_uploaded_portraits', 'No uploaded portraits yet.')}</span>
                  ) : (
                    uploadedPortraits.map((portrait, idx) => {
                      const isSelected = formData.avatarUrl === portrait;
                      const isClicked = selectedPortraitForDelete === portrait || isSelected;

                      return (
                        <div key={idx} className="relative shrink-0 group">
                          <button
                            type="button"
                            onClick={() => {
                              sound.playTap();
                              setFormData((prev) => ({ ...prev, avatarUrl: portrait }));
                              setSelectedPortraitForDelete(portrait);
                            }}
                            className={`w-12 h-12 rounded-full overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                              isSelected
                                ? 'border-[#B5451B] scale-105 shadow-md ring-2 ring-[#B5451B]/40'
                                : 'border-transparent opacity-75 hover:opacity-100 hover:scale-105'
                            }`}
                            title={t('click_to_select_portrait', 'Click to select this portrait')}
                          >
                            <img
                              src={portrait}
                              alt={`Uploaded Portrait ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>

                          {/* Delete icon on the top right side of the pic when clicked */}
                          {isClicked && (
                            <button
                              type="button"
                              onClick={(e) => handleDeletePortrait(portrait, e)}
                              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-md z-10 active:scale-90 transition-transform cursor-pointer"
                              title={t('delete_portrait', 'Delete this portrait')}
                            >
                              <span className="material-symbols-outlined text-[12px] font-bold">close</span>
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Name, Gender & Craft Title */}
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-medium opacity-80 mb-1">
                  {t('full_name', 'Artisan Full Name')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-2xl border text-sm font-serif focus:outline-hidden focus:ring-2 focus:ring-[#B5451B] ${
                    isDark
                      ? 'bg-[#121411] border-[#2D3A2B] text-white'
                      : 'bg-white border-[#22331E]/20 text-[#1A1815]'
                  }`}
                  placeholder={t('placeholder_artisan_name', 'e.g. Ranjit Prajapati')}
                />
              </div>

              {/* Gender Selection: Male, Female, Others */}
              <div>
                <label className="block text-xs font-medium opacity-80 mb-1">
                  {t('gender', 'Gender / लिंग')} <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'male', label: 'Male', hindi: 'पुरुष', icon: 'male' },
                    { id: 'female', label: 'Female', hindi: 'महिला', icon: 'female' },
                    { id: 'other', label: 'Others', hindi: 'अन्य', icon: 'transgender' },
                  ].map((g) => {
                    const isSelected = (formData.gender || 'male') === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          sound.playTap();
                          setFormData((prev) => ({ ...prev, gender: g.id as 'male' | 'female' | 'other' }));
                        }}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-serif transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#B5451B] text-white border-[#B5451B] shadow-sm scale-[1.02]'
                            : isDark
                            ? 'bg-[#121411] border-[#2D3A2B] text-white/80 hover:bg-[#252E22]'
                            : 'bg-white border-[#22331E]/20 text-[#1A1815] hover:bg-[#FAF4E8]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">{g.icon}</span>
                        <span className="font-semibold">{g.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium opacity-80 mb-1">
                  {t('trade_designation', 'Craft Title / Trade Designation')}
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-2xl border text-sm focus:outline-hidden focus:ring-2 focus:ring-[#B5451B] ${
                    isDark
                      ? 'bg-[#121411] border-[#2D3A2B] text-white'
                      : 'bg-white border-[#22331E]/20 text-[#1A1815]'
                  }`}
                  placeholder={t('placeholder_trade_title', 'e.g. Master Clay Sculptor & Potter')}
                />
              </div>
            </div>

            {/* SEPARATE CONTACT EDIT OPTIONS: MOBILE NUMBER & EMAIL ADDRESS */}
            <div className="bg-black/5 dark:bg-white/5 p-3.5 rounded-2xl border border-[#22331E]/10 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold font-serif uppercase tracking-wider text-[#B5451B]">
                <span className="material-symbols-outlined text-base">contact_phone</span>
                <span>{t('contact_details', 'Contact Details (Mobile & Email)')}</span>
              </div>

              {/* 1. Mobile Number Option */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-medium opacity-80">
                    {t('reg_mobile_num', 'Registered Mobile Number')} <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#B5451B]/10 text-[#B5451B] font-bold">
                    {t('otp_login_badge', 'OTP Login')}
                  </span>
                </div>
                <div className="relative flex items-center">
                  <div className="absolute left-3 flex items-center gap-1 pointer-events-none text-xs font-mono font-bold opacity-75">
                    <span>🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    required
                    value={formData.mobile || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, mobile: val });
                    }}
                    className={`w-full pl-16 pr-3.5 py-2.5 rounded-2xl border text-xs font-mono tracking-wider focus:outline-hidden focus:ring-2 focus:ring-[#B5451B] ${
                      isDark
                        ? 'bg-[#121411] border-[#2D3A2B] text-white'
                        : 'bg-white border-[#22331E]/20 text-[#1A1815]'
                    }`}
                    placeholder={t('placeholder_mobile', '10-digit mobile number')}
                  />
                </div>
                <p className="text-[10px] opacity-60 mt-1">
                  {t('mobile_help_text', 'Primary mobile number used for OTP verification and GeM / buyer inquiries.')}
                </p>
              </div>

              {/* 2. Email Address Option */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-medium opacity-80">
                    {t('email_address', 'Email Address')} <span className="text-[10px] opacity-60 font-normal">{t('optional', '(Optional)')}</span>
                  </label>
                  {formData.email && formData.email.trim().length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        sound.playTap();
                        setFormData({ ...formData, email: '' });
                      }}
                      className="text-[10px] text-red-500 hover:text-red-600 font-medium underline flex items-center gap-0.5"
                    >
                      <span className="material-symbols-outlined text-[11px]">close</span>
                      <span>{t('remove_email', 'Remove Email')}</span>
                    </button>
                  )}
                </div>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-sm opacity-60 pointer-events-none">
                    mail
                  </span>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full pl-9 pr-3.5 py-2.5 rounded-2xl border text-xs font-sans focus:outline-hidden focus:ring-2 focus:ring-[#B5451B] ${
                      isDark
                        ? 'bg-[#121411] border-[#2D3A2B] text-white'
                        : 'bg-white border-[#22331E]/20 text-[#1A1815]'
                    }`}
                    placeholder={t('placeholder_email', 'Enter email address (leave empty if not applicable)')}
                  />
                </div>
                <p className="text-[10px] opacity-60 mt-1">
                  {t('email_help_text', 'Optional. If left blank, no email address will be displayed on your profile.')}
                </p>
              </div>
            </div>

            {/* LOCATION SECTION: SEPARATE STATE & CITY DROPDOWN MENUS */}
            <div className="bg-black/5 dark:bg-white/5 p-3.5 rounded-2xl border border-[#22331E]/10 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold font-serif uppercase tracking-wider text-[#B5451B]">
                <span className="material-symbols-outlined text-base">location_on</span>
                <span>{t('artisan_location_heading', 'Artisan Location (State & City)')}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* State Dropdown */}
                <div>
                  <label className="block text-[11px] font-medium opacity-80 mb-1">
                    {t('select_state', 'Select State')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedState}
                    onChange={(e) => handleStateChange(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-2xl border text-xs focus:outline-hidden focus:ring-2 focus:ring-[#B5451B] font-medium ${
                      isDark
                        ? 'bg-[#121411] border-[#2D3A2B] text-white'
                        : 'bg-white border-[#22331E]/20 text-[#1A1815]'
                    }`}
                  >
                    {INDIAN_STATES_AND_CITIES.map((s) => (
                      <option key={s.state} value={s.state}>
                        {s.state}
                      </option>
                    ))}
                  </select>
                </div>

                {/* City Dropdown (Filtered strictly by selected State) */}
                <div>
                  <label className="block text-[11px] font-medium opacity-80 mb-1">
                    {t('select_city', 'Select City')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedCity}
                    onChange={(e) => handleCityChange(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-2xl border text-xs focus:outline-hidden focus:ring-2 focus:ring-[#B5451B] font-medium ${
                      isDark
                        ? 'bg-[#121411] border-[#2D3A2B] text-white'
                        : 'bg-white border-[#22331E]/20 text-[#1A1815]'
                    }`}
                  >
                    {currentCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-[10px] opacity-70 italic">
                {t('active_location_label', 'Active Location:')} <strong>{selectedCity}, {selectedState}</strong>
              </p>
            </div>

            {/* RECENT WORKSHOP PICTURES (WITH CROSS BUTTON TO REMOVE AND PERSISTENCE) */}
            <div className="bg-black/5 dark:bg-white/5 p-3.5 rounded-2xl border border-[#22331E]/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold font-serif uppercase tracking-wider text-[#B5451B]">
                  <span className="material-symbols-outlined text-base">photo_library</span>
                  <span>{t('recent_workshop_pictures', 'Recent Workshop Pictures')} ({recentPhotos.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex items-center gap-1 text-[11px] font-bold text-[#B5451B] bg-[#B5451B]/10 hover:bg-[#B5451B]/20 px-2.5 py-1 rounded-full transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">add_photo_alternate</span>
                  <span>{t('add_photo', 'Add Photo')}</span>
                </button>
              </div>

              {/* Hidden file input for gallery */}
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handleGalleryUpload}
                className="hidden"
                id="artisan-gallery-upload"
              />

              {recentPhotos.length === 0 ? (
                <div className="p-4 text-center rounded-xl border border-dashed border-[#22331E]/20 text-xs opacity-70">
                  {t('no_workshop_pictures', 'No pictures uploaded yet. Tap "Add Photo" above.')}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {recentPhotos.map((photoUrl, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-xl overflow-hidden border border-[#22331E]/20 group shadow-xs bg-black/10"
                    >
                      <img
                        src={photoUrl}
                        alt={`Workshop ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {/* Prominent Cross / Delete Button on top right */}
                      <button
                        type="button"
                        onClick={() => handleRemoveRecentPhoto(idx)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md hover:bg-red-700 active:scale-90 transition-transform z-10"
                        title={t('delete_photo', 'Remove this photo')}
                      >
                        <span className="material-symbols-outlined text-sm font-bold">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Craft Category & Udyam Number */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium opacity-80 mb-1">
                  {t('craft_category_label', 'Craft Category')}
                </label>
                <select
                  value={formData.craft}
                  onChange={(e) => setFormData({ ...formData, craft: e.target.value })}
                  className={`w-full px-3 py-2.5 rounded-2xl border text-xs focus:outline-hidden focus:ring-2 focus:ring-[#B5451B] ${
                    isDark
                      ? 'bg-[#121411] border-[#2D3A2B] text-white'
                      : 'bg-white border-[#22331E]/20 text-[#1A1815]'
                  }`}
                >
                  <option value="Terracotta & Heritage Pottery">{t('craft_terracotta', 'Terracotta Pottery')}</option>
                  <option value="Banarasi Handloom Weaving">{t('craft_weaving', 'Handloom Weaving')}</option>
                  <option value="Channapatna Wooden Toys">{t('craft_wood', 'Wood Sculpture')}</option>
                  <option value="Madhubani Folk Painting">{t('craft_painting', 'Folk Painting')}</option>
                  <option value="Bidriware Metal Inlay">{t('craft_metal', 'Metalwork & Inlay')}</option>
                  <option value="Pashmina Shawls & Embroidery">{t('craft_embroidery', 'Textile & Zari')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium opacity-80 mb-1">
                  {t('udyam_number', 'MSME Udyam Number')}
                </label>
                <input
                  type="text"
                  value={formData.udyamNumber || ''}
                  onChange={(e) => setFormData({ ...formData, udyamNumber: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-[#B5451B] ${
                    isDark
                      ? 'bg-[#121411] border-[#2D3A2B] text-white'
                      : 'bg-white border-[#22331E]/20 text-[#1A1815]'
                  }`}
                  placeholder="UDYAM-UP-00-0000000"
                />
              </div>
            </div>

            {/* Story Quote & Bio */}
            <div>
              <label className="block text-xs font-medium opacity-80 mb-1">
                {t('lineage_quote', 'Artisan Lineage Quote / Philosophy')}
              </label>
              <input
                type="text"
                value={formData.storyQuote}
                onChange={(e) => setFormData({ ...formData, storyQuote: e.target.value })}
                className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs font-serif italic focus:outline-hidden focus:ring-2 focus:ring-[#B5451B] ${
                  isDark
                    ? 'bg-[#121411] border-[#2D3A2B] text-white'
                    : 'bg-white border-[#22331E]/20 text-[#1A1815]'
                }`}
                placeholder={t('placeholder_philosophy', 'Every lump of earth holds a song...')}
              />
            </div>

            <div>
              <label className="block text-xs font-medium opacity-80 mb-1">
                {t('workshop_bio', 'Artisan Workshop Bio')}
              </label>
              <textarea
                rows={2}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className={`w-full px-3.5 py-2 rounded-2xl border text-xs leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-[#B5451B] resize-none ${
                  isDark
                    ? 'bg-[#121411] border-[#2D3A2B] text-white'
                    : 'bg-white border-[#22331E]/20 text-[#1A1815]'
                }`}
                placeholder={t('placeholder_bio', 'Describe your craft tradition...')}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-2 sticky bottom-0 bg-inherit pb-2 z-20">
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  onClose();
                }}
                className="flex-1 py-3 rounded-2xl font-serif text-xs font-bold border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors active:scale-95 cursor-pointer"
              >
                {t('cancel', 'Cancel')}
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 bg-[#B5451B] hover:bg-[#9C3A14] text-white font-serif font-bold py-3 rounded-2xl text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">check</span>
                <span>{isSaving ? t('saving', 'Saving...') : t('save_changes', 'Save Changes')}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
