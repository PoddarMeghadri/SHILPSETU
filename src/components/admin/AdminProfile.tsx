import React, { useState, useRef } from 'react';
import { ArtisanProfile } from '../../types';
import { sound } from '../../services/sound';
import { uploadAvatarToSupabase, upsertSupabaseProfile } from '../../services/supabase';
import { ImageCropModal, validateAvatarFile } from '../profile/ImageCropModal';
import { ShieldCheck, Camera, Check, AlertCircle } from 'lucide-react';
import { DEFAULT_ARTISAN_AVATAR } from '../../data/mockData';
import { AvatarImage } from '../common/AvatarImage';

interface AdminProfileProps {
  admin?: Partial<ArtisanProfile>;
  onUpdateAdmin?: (updated: Partial<ArtisanProfile>) => void;
  isDark?: boolean;
}

export const AdminProfile: React.FC<AdminProfileProps> = ({
  admin = {
    name: 'Administrator',
    title: 'System Administrator & Master Curator',
    email: 'admin@shilpsetu.in',
    mobile: '9999999999',
    location: 'New Delhi, Delhi',
    avatarUrl: DEFAULT_ARTISAN_AVATAR,
  },
  onUpdateAdmin,
  isDark = true,
}) => {
  const [adminState, setAdminState] = useState<Partial<ArtisanProfile>>({
    name: admin.name || 'Administrator',
    title: admin.title || 'System Administrator & Master Curator',
    email: admin.email || 'admin@shilpsetu.in',
    mobile: admin.mobile || '9999999999',
    location: admin.location || 'New Delhi, Delhi',
    avatarUrl: admin.avatarUrl || DEFAULT_ARTISAN_AVATAR,
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

    // Reset input so re-selecting same file works
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

      const updated = {
        ...adminState,
        avatarUrl: finalUrl,
      };
      setAdminState(updated);
      onUpdateAdmin?.(updated);

      try {
        localStorage.setItem('shilpsetu_admin_profile', JSON.stringify(updated));
      } catch (_) {}

      try {
        await upsertSupabaseProfile({
          userId: 'admin_master',
          fullName: updated.name || 'Administrator',
          avatarUrl: finalUrl,
          email: updated.email,
          mobileNumber: updated.mobile,
        });
      } catch (_) {}

      sound.playSuccess();
      setToastMessage('Admin avatar updated successfully');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.warn('[Admin avatar upload error]:', err);
      // Fallback to local cropped image
      const updated = { ...adminState, avatarUrl: croppedDataUrl };
      setAdminState(updated);
      onUpdateAdmin?.(updated);
    } finally {
      setIsUploading(false);
      if (cropModalSrc) URL.revokeObjectURL(cropModalSrc);
      setCropModalSrc(null);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5">
      {/* Admin Profile Card with Emerald Theme */}
      <div className="rounded-3xl p-6 bg-[#131E18] border border-[#233C2E] text-[#E2F1E8] shadow-xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar with Circular Mask and Quick Upload Button */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-emerald-600 via-teal-400 to-emerald-800 shadow-lg relative overflow-hidden">
              <AvatarImage
                src={adminState.avatarUrl}
                alt={adminState.name || 'Admin'}
                className="w-full h-full rounded-full object-cover border-2 border-[#131E18]"
              />
              {isUploading && (
                <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-xl animate-spin">
                    progress_activity
                  </span>
                </div>
              )}
            </div>

            {/* Quick Upload Button */}
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="absolute top-0 right-0 w-8 h-8 rounded-full bg-[#10B981] text-white flex items-center justify-center shadow-md border-2 border-[#131E18] cursor-pointer hover:bg-[#059669] transition-transform active:scale-95 disabled:opacity-50"
              title="Change Profile Photo"
              aria-label="Upload Admin Avatar"
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarFileSelected}
            />
          </div>

          {/* Admin Info */}
          <div className="flex-1 text-center sm:text-left space-y-1.5">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h3 className="font-serif font-bold text-xl text-white">{adminState.name}</h3>
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            </div>
            <p className="text-xs font-serif font-semibold text-emerald-400">
              {adminState.title}
            </p>
            <div className="text-xs text-[#8BA496] flex items-center justify-center sm:justify-start gap-2 flex-wrap pt-0.5">
              <span>{adminState.location}</span>
              <span>·</span>
              <span>{adminState.email}</span>
            </div>

            {/* Validation Error Banner */}
            {validationError && (
              <div className="mt-2 p-2 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dedicated Image Crop Modal */}
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
