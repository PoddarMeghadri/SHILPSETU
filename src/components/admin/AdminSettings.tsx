import React, { useState, useRef } from 'react';
import { useAdminMode, ADMIN_COLOR_PRESETS } from '../../context/AdminModeContext';
import { sound } from '../../services/sound';
import { uploadAvatarToSupabase, upsertSupabaseProfile } from '../../services/supabase';
import { ImageCropModal, validateAvatarFile } from '../profile/ImageCropModal';
import { AdminSettingsFeedbackSection } from '../sections/SettingsScreen';
import { Camera, Check, AlertCircle, Palette, RotateCcw } from 'lucide-react';
import { DEFAULT_ARTISAN_AVATAR } from '../../data/mockData';
import { AvatarImage } from '../common/AvatarImage';

interface AdminSettingsProps {
  isDark?: boolean;
  onToggleTheme?: () => void;
  isOffline?: boolean;
  onToggleOffline?: () => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  isDark = true,
  onToggleTheme,
  isOffline = false,
  onToggleOffline,
}) => {
  const {
    adminAccentColor,
    setAdminAccentColor,
    resetAdminAccentColor,
  } = useAdminMode();

  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('shilpsetu_admin_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.avatarUrl) return parsed.avatarUrl;
      }
    } catch (_) {}
    return DEFAULT_ARTISAN_AVATAR;
  });

  const [cropModalSrc, setCropModalSrc] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // File Input Interception
  const handleAvatarFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      sound.playError();
      setValidationError(validation.error || 'Invalid file');
      return;
    }

    setValidationError(null);
    sound.playTap();
    const objectUrl = URL.createObjectURL(file);
    setCropModalSrc(objectUrl);
  };

  // Canvas Export & Cloud Storage Sync
  const handleCropComplete = async (croppedBlob: Blob, croppedDataUrl: string) => {
    setIsUploading(true);
    try {
      const uploadRes = await uploadAvatarToSupabase(croppedBlob, 'admin_master');
      const finalUrl = uploadRes.publicUrl || croppedDataUrl;

      setAvatarUrl(finalUrl);

      try {
        const saved = localStorage.getItem('shilpsetu_admin_profile');
        const parsed = saved ? JSON.parse(saved) : {};
        parsed.avatarUrl = finalUrl;
        localStorage.setItem('shilpsetu_admin_profile', JSON.stringify(parsed));
      } catch (_) {}

      try {
        await upsertSupabaseProfile({
          userId: 'admin_master',
          fullName: 'Administrator',
          avatarUrl: finalUrl,
        });
      } catch (_) {}

      sound.playSuccess();
      setToastMessage('Admin avatar updated successfully');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.warn('[Admin avatar upload error]:', err);
      setAvatarUrl(croppedDataUrl);
    } finally {
      setIsUploading(false);
      if (cropModalSrc) URL.revokeObjectURL(cropModalSrc);
      setCropModalSrc(null);
    }
  };

  const isPresetActive = ADMIN_COLOR_PRESETS.some(
    (preset) => preset.hex.toLowerCase() === adminAccentColor.toLowerCase()
  );

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-20">
      {/* 1. Admin Avatar & Profile Photo Section */}
      <div className="rounded-3xl p-6 bg-[#131E18] border border-[#233C2E] text-[#E2F1E8] shadow-lg space-y-4">
        <h4 className="font-serif font-bold text-base text-white">Admin Profile Photo</h4>
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-emerald-600 via-teal-400 to-emerald-800 shadow-md overflow-hidden relative">
              <AvatarImage
                src={avatarUrl}
                alt="Admin avatar"
                className="w-full h-full rounded-full object-cover border-2 border-[#131E18]"
              />
              {isUploading && (
                <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-lg animate-spin">
                    progress_activity
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="absolute top-0 right-0 w-7 h-7 rounded-full bg-[#10B981] text-white flex items-center justify-center shadow-md border-2 border-[#131E18] cursor-pointer hover:bg-[#059669] transition-transform active:scale-95 disabled:opacity-50"
              title="Change Profile Photo"
              aria-label="Upload Admin Photo"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarFileSelected}
            />
          </div>

          <div className="space-y-1 text-center sm:text-left flex-1">
            <p className="text-xs font-semibold text-white">Adjust Avatar with 1:1 Circular Cropping</p>
            <p className="text-[11px] text-[#8BA496]">
              Choose a photo (.jpg, .jpeg, .png, or .webp up to 5MB). The crop modal will let you scale, rotate, and center your avatar.
            </p>
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 py-1.5 px-3.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold cursor-pointer transition-colors shadow-xs"
            >
              Select New Photo
            </button>

            {validationError && (
              <div className="mt-2 p-2 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Theme Customization */}
      <div className="rounded-3xl p-6 bg-[#131E18] border border-[#233C2E] text-[#E2F1E8] shadow-lg space-y-4">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
            style={{ backgroundColor: 'var(--admin-accent, #10b981)' }}
          >
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h5 className="font-serif font-bold text-xs">Admin Theme Accent</h5>
            <p className="text-[10px] text-[#8BA496]">
              Select presets or pick a custom hex color for the admin workspace
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {ADMIN_COLOR_PRESETS.map((preset) => {
            const isActive = adminAccentColor.toLowerCase() === preset.hex.toLowerCase();
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  sound.playTap();
                  setAdminAccentColor(preset.hex);
                }}
                className={`w-8 h-8 rounded-full transition-transform active:scale-90 flex items-center justify-center cursor-pointer shadow-xs ${
                  isActive
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-[#131E18] scale-110 shadow-md'
                    : 'hover:scale-105 opacity-90 hover:opacity-100'
                }`}
                style={{ backgroundColor: preset.hex }}
                title={preset.name}
              >
                {isActive && <Check className="w-4 h-4 text-white drop-shadow-xs" />}
              </button>
            );
          })}

          {/* Custom Color Picker */}
          <label
            htmlFor="admin-custom-picker-settings"
            className="relative w-8 h-8 rounded-full border border-white/20 flex items-center justify-center cursor-pointer transition-all hover:scale-105 overflow-hidden"
            style={!isPresetActive ? { backgroundColor: adminAccentColor } : undefined}
            title="Custom Hex Color"
          >
            <Palette className="w-4 h-4 text-white/80 pointer-events-none" />
            <input
              id="admin-custom-picker-settings"
              type="color"
              value={adminAccentColor}
              onChange={(e) => setAdminAccentColor(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
          </label>
        </div>

        <div className="flex items-center justify-between text-[11px] pt-3 border-t border-[#233C2E]">
          <span className="font-mono text-[10px] uppercase text-[#8BA496]">
            Active: {adminAccentColor}
          </span>
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              resetAdminAccentColor();
            }}
            className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </button>
        </div>
      </div>

      {/* 3. Community & Feedback */}
      <AdminSettingsFeedbackSection />

      {/* Image Crop Modal */}
      {cropModalSrc && (
        <ImageCropModal
          isOpen={Boolean(cropModalSrc)}
          imageSrc={cropModalSrc}
          mode="admin"
          onClose={() => {
            if (cropModalSrc) URL.revokeObjectURL(cropModalSrc);
            setCropModalSrc(null);
          }}
          onCropComplete={handleCropComplete}
          isProcessing={isUploading}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[160] flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#131E18] text-[#E2F1E8] border border-[#233C2E] shadow-2xl backdrop-blur-md">
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold">{toastMessage}</p>
        </div>
      )}
    </div>
  );
};
