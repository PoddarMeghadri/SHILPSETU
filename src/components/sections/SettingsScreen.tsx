import React, { useState } from 'react';
import { LanguageCode, ScreenId } from '../../types';
import { sound } from '../../services/sound';
import { useTranslation } from '../../services/translations';
import { useAdminMode, ADMIN_COLOR_PRESETS } from '../../context/AdminModeContext';
import { validatePassword, passwordsMatch, passwordStrength, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from '../../services/passwordValidation';
import { updateSupabasePassword } from '../../services/supabase';

interface SettingsScreenProps {
  isOffline: boolean;
  onToggleOffline: () => void;
  onNavigate: (screen: ScreenId) => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  language?: LanguageCode;
  onLogout?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  isOffline,
  onToggleOffline,
  onNavigate,
  isDark = false,
  onToggleTheme,
  language,
  onLogout,
}) => {
  const { t } = useTranslation(language);
  const {
    isAdminMode,
    adminAccentColor,
    setAdminAccentColor,
    resetAdminAccentColor,
  } = useAdminMode();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const panelClass = `rounded-3xl p-5 border shadow-xs space-y-3 ${
    isDark
      ? 'bg-[#1C221A] border-[#2D3A2B] text-[#F4ECDE]'
      : 'bg-[#EAE0CC] border-[#22331E]/15 text-[#1D1C14]'
  }`;
  const rowClass = `p-3 rounded-2xl border ${
    isDark ? 'bg-[#121411] border-[#2D3A2B]' : 'bg-white border-[#22331E]/10'
  }`;

  const isPresetActive = ADMIN_COLOR_PRESETS.some(
    (preset) => preset.hex.toLowerCase() === adminAccentColor.toLowerCase()
  );

  return (
    <div className="w-full max-w-4xl mx-auto pb-28 md:pb-12 pt-2 px-3 sm:px-6 lg:px-8 space-y-6">
      <div className={panelClass}>
        <h4 className="font-serif font-bold text-base">{t('workshop_settings', 'Workshop Settings')}</h4>
        <div className="space-y-2.5">
          {/* Option 1: "App Interface" (Replaces "Theme Appearance") */}
          {onToggleTheme && (
            <div className={`${rowClass} p-3.5 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isDark ? 'bg-[#E8B84B] text-[#1A1815]' : 'bg-[#22331E] text-white'
                  }`}
                  style={isAdminMode ? { backgroundColor: 'var(--admin-accent)', color: '#FFFFFF' } : undefined}
                >
                  <span className="material-symbols-outlined text-lg">{isDark ? 'dark_mode' : 'light_mode'}</span>
                </div>
                <div>
                  <p className="font-serif font-bold text-xs">
                    {isAdminMode ? t('app_interface', 'App Interface') : t('theme_mode', 'Theme Appearance')}
                  </p>
                  <p className="text-[10px] opacity-70">
                    {isAdminMode
                      ? t('app_interface_sub', 'Switch between Heritage Dark and Light Mode')
                      : isDark
                      ? t('dark_mode_active_label', 'Heritage Dark Mode Active')
                      : t('light_mode_active_label', 'Warm Sandalwood Light Active')}
                  </p>
                </div>
              </div>
              <div className="flex items-center p-0.5 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
                <button
                  type="button"
                  onClick={() => isDark && (sound.playTap(), onToggleTheme())}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                    !isDark ? 'bg-white text-[#B5451B] shadow-xs' : 'text-neutral-400'
                  }`}
                  style={!isDark && isAdminMode ? { color: 'var(--admin-accent)' } : undefined}
                >
                  {t('light', 'Light')}
                </button>
                <button
                  type="button"
                  onClick={() => !isDark && (sound.playTap(), onToggleTheme())}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                    isDark ? 'bg-[#B5451B] text-white shadow-xs' : 'text-neutral-500'
                  }`}
                  style={isDark && isAdminMode ? { backgroundColor: 'var(--admin-accent)' } : undefined}
                >
                  {t('dark', 'Dark')}
                </button>
              </div>
            </div>
          )}

          {/* Option 2: "Themes" (New Admin Feature) */}
          {isAdminMode && (
            <div className={`${rowClass} p-4 space-y-3.5`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                    style={{ backgroundColor: 'var(--admin-accent, #10b981)' }}
                  >
                    <span className="material-symbols-outlined text-lg">palette</span>
                  </div>
                  <div>
                    <h5 className="font-serif font-bold text-xs">{t('themes', 'Themes')}</h5>
                    <p className="text-[10px] opacity-70">
                      {t('themes_sub', 'Customize the primary accent theme color for Admin Mode')}
                    </p>
                  </div>
                </div>
              </div>

              {/* 10 Preset Color Swatches + Interactive Custom Color Picker */}
              <div className="pt-1">
                <div className="flex flex-wrap items-center gap-2.5">
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
                        className={`group relative w-8 h-8 rounded-full transition-transform active:scale-90 flex items-center justify-center cursor-pointer shadow-xs ${
                          isActive
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-900 scale-110 shadow-md'
                            : 'hover:scale-105 opacity-90 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: preset.hex }}
                        title={preset.name}
                        aria-label={preset.name}
                      >
                        {isActive && (
                          <span className="material-symbols-outlined text-white text-sm font-bold drop-shadow-xs">
                            check
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* Interactive Custom Color Palette Picker */}
                  <div className="relative flex items-center">
                    <label
                      htmlFor="admin-custom-color-picker"
                      className={`relative w-8 h-8 rounded-full border border-black/15 dark:border-white/20 flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xs overflow-hidden ${
                        !isPresetActive
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-900 scale-110'
                          : 'bg-black/5 dark:bg-white/10 hover:bg-black/10'
                      }`}
                      style={!isPresetActive ? { backgroundColor: adminAccentColor } : undefined}
                      title={t('color_palette', 'Color Palette')}
                    >
                      {!isPresetActive ? (
                        <span className="material-symbols-outlined text-white text-sm font-bold drop-shadow-xs pointer-events-none">
                          check
                        </span>
                      ) : (
                        <span className="material-symbols-outlined text-neutral-600 dark:text-neutral-300 text-base pointer-events-none">
                          palette
                        </span>
                      )}
                      <input
                        id="admin-custom-color-picker"
                        type="color"
                        value={adminAccentColor}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAdminAccentColor(val);
                        }}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        aria-label={t('color_palette', 'Color Palette')}
                      />
                    </label>
                  </div>
                </div>

                {/* State Feedback Footer with Active Name & Reset Option */}
                <div className="mt-3 flex items-center justify-between text-[11px] pt-2 border-t border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-xs border border-white/20"
                      style={{ backgroundColor: adminAccentColor }}
                    />
                    <span className="font-mono font-semibold uppercase tracking-wider text-[10px] opacity-80">
                      {ADMIN_COLOR_PRESETS.find(
                        (p) => p.hex.toLowerCase() === adminAccentColor.toLowerCase()
                      )?.name || `Custom (${adminAccentColor})`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      resetAdminAccentColor();
                    }}
                    className={`text-[10px] font-bold flex items-center gap-1 transition-opacity ${
                      adminAccentColor.toLowerCase() === '#10b981'
                        ? 'opacity-40 cursor-default'
                        : 'opacity-80 hover:opacity-100 hover:underline cursor-pointer'
                    }`}
                    disabled={adminAccentColor.toLowerCase() === '#10b981'}
                  >
                    <span className="material-symbols-outlined text-xs">restart_alt</span>
                    <span>{t('reset_default', 'Reset to Default')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <button onClick={() => { sound.playTap(); onNavigate('story'); }}
            className={`${rowClass} w-full flex items-center justify-between text-left hover:bg-black/5 transition-colors`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#B5451B] text-white flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">history_edu</span>
              </div>
              <div>
                <p className="font-serif font-bold text-xs">{t('edit_heritage_story', 'Edit Heritage Story')}</p>
                <p className="text-[10px] opacity-70">{t('edit_lineage_desc', 'Update ancestral lineage & craft philosophy')}</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-sm opacity-60">arrow_forward_ios</span>
          </button>

          <div className={`${rowClass} flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${isOffline ? 'bg-amber-600' : 'bg-[#2E4638]'}`}>
                <span className="material-symbols-outlined text-lg">{isOffline ? 'cloud_off' : 'cloud_done'}</span>
              </div>
              <div>
                <p className="font-serif font-bold text-xs">{t('simulate_offline', 'Simulate Offline Mode')}</p>
                <p className="text-[10px] opacity-70">{t('offline_resilience_desc', 'Test cached offline resilience')}</p>
              </div>
            </div>
            <button onClick={() => { sound.playTap(); onToggleOffline(); }}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${isOffline ? 'bg-[#B5451B]' : 'bg-[#DDC0B8]'}`}>
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${isOffline ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <h4 className="font-serif font-bold text-base">{t('account_settings', 'Account Settings')}</h4>
        {!isAdminMode && (
          <button type="button" onClick={() => { sound.playTap(); setPasswordMessage(''); setShowPasswordModal(true); }}
            className={`${rowClass} w-full p-3.5 flex items-center justify-between text-left hover:bg-black/5`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#B5451B] text-white flex items-center justify-center"><span className="material-symbols-outlined text-lg">lock_reset</span></div>
              <div><p className="font-serif font-bold text-xs">{t('change_password', 'Change password')}</p><p className="text-[10px] opacity-75">{t('change_password_sub', 'Use a strong password for your account')}</p></div>
            </div>
            <span className="material-symbols-outlined text-sm opacity-70">arrow_forward_ios</span>
          </button>
        )}
        <button type="button" onClick={() => { sound.playTap(); setShowLogoutModal(true); }}
          className={`w-full ${rowClass} p-3.5 flex items-center justify-between text-left ${
            isDark ? 'text-red-300 hover:bg-red-950/40' : 'text-red-700 hover:bg-red-100/90'
          }`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center"><span className="material-symbols-outlined text-lg">logout</span></div>
            <div>
              <p className="font-serif font-bold text-xs">{t('logout', 'Log Out')}</p>
              <p className="text-[10px] opacity-75">{t('logout_desc', 'Sign out of your artisan account on this device')}</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-sm opacity-70">arrow_forward_ios</span>
        </button>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form onSubmit={async (event) => {
            event.preventDefault();
            const validation = validatePassword(newPassword);
            if (validation) { setPasswordMessage(validation); return; }
            if (!passwordsMatch(newPassword, passwordConfirmation)) { setPasswordMessage(t('password_mismatch', 'Passwords do not match.')); return; }
            setIsSavingPassword(true);
            try {
              const result = await updateSupabasePassword(newPassword);
              if (!result.updated) throw new Error(result.error || t('unable_update_password', 'Unable to update password.'));
              setPasswordMessage(t('password_updated', 'Password updated successfully.'));
              setCurrentPassword(''); setNewPassword(''); setPasswordConfirmation('');
              setTimeout(() => setShowPasswordModal(false), 900);
            } catch (error: any) { setPasswordMessage(error?.message || t('unable_update_password', 'Unable to update password.')); }
            finally { setIsSavingPassword(false); }
          }} className={`w-full max-w-sm rounded-3xl p-6 border shadow-2xl space-y-3 ${isDark ? 'bg-[#1C221A] border-[#2D3A2B] text-[#F4ECDE]' : 'bg-[#F4ECDE] border-[#22331E]/20 text-[#1A1815]'}`}>
            <h4 className="font-serif font-bold text-lg">{t('change_password', 'Change password')}</h4>
            <div className="relative"><input aria-label={t('current_password', 'Current password')} type={showCurrentPassword ? 'text' : 'password'} required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder={t('current_password', 'Current password')} className="w-full rounded-xl border p-2.5 pr-10 bg-transparent text-sm" /><button type="button" aria-label={t('toggle_password', 'Toggle password')} onClick={() => setShowCurrentPassword((value) => !value)} className="absolute right-2 top-2"><span className="material-symbols-outlined text-sm">{showCurrentPassword ? 'visibility_off' : 'visibility'}</span></button></div>
            <div className="relative"><input aria-label={t('new_password', 'New password')} type={showNewPassword ? 'text' : 'password'} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t('new_password', 'New password')} className="w-full rounded-xl border p-2.5 pr-10 bg-transparent text-sm" /><button type="button" aria-label={t('toggle_password', 'Toggle password')} onClick={() => setShowNewPassword((value) => !value)} className="absolute right-2 top-2"><span className="material-symbols-outlined text-sm">{showNewPassword ? 'visibility_off' : 'visibility'}</span></button></div>
            <div className="flex gap-1" aria-label="Password strength meter">{[1, 2, 3, 4, 5].map((level) => <span key={level} className={`h-1.5 flex-1 rounded-full ${passwordStrength(newPassword) >= level ? 'bg-[#B5451B]' : 'bg-black/10 dark:bg-white/10'}`} />)}</div>
            <ul className="text-[10px] opacity-70 space-y-0.5"><li>{newPassword.length >= PASSWORD_MIN_LENGTH && newPassword.length <= PASSWORD_MAX_LENGTH ? '✓' : '○'} 8–16 characters</li><li>{/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? '✓' : '○'} Uppercase and lowercase</li><li>{/\d/.test(newPassword) ? '✓' : '○'} Number</li><li>{/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? '✓' : '○'} Special character</li></ul>
            <div className="relative"><input aria-label={t('confirm_new_password', 'Confirm new password')} type={showPasswordConfirmation ? 'text' : 'password'} required value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} placeholder={t('confirm_new_password', 'Confirm new password')} className="w-full rounded-xl border p-2.5 pr-10 bg-transparent text-sm" /><button type="button" aria-label={t('toggle_password', 'Toggle password')} onClick={() => setShowPasswordConfirmation((value) => !value)} className="absolute right-2 top-2"><span className="material-symbols-outlined text-sm">{showPasswordConfirmation ? 'visibility_off' : 'visibility'}</span></button></div>
            {passwordMessage && <p role="status" className="text-xs text-[#B5451B]">{passwordMessage}</p>}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 py-2.5 rounded-2xl border text-xs font-bold">{t('cancel', 'Cancel')}</button>
              <button disabled={isSavingPassword} type="submit" className="flex-1 py-2.5 rounded-2xl bg-[#B5451B] text-white text-xs font-bold">{isSavingPassword ? t('saving', 'Saving…') : t('update_password', 'Update password')}</button>
            </div>
          </form>
        </div>
      )}

      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`w-full max-w-sm rounded-3xl p-6 border shadow-2xl space-y-4 text-center ${
            isDark ? 'bg-[#1C221A] border-[#2D3A2B] text-[#F4ECDE]' : 'bg-[#F4ECDE] border-[#22331E]/20 text-[#1A1815]'
          }`}>
            <div className="w-14 h-14 mx-auto rounded-full bg-red-500/15 border border-red-500/30 text-red-500 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">logout</span>
            </div>
            <h4 className="font-serif font-bold text-lg">{t('logout_confirm_title', 'Log Out of ShilpSetu?')}</h4>
            <p className="text-xs opacity-75 font-sans leading-relaxed">{t('logout_confirm_desc', 'You will be returned to the launch registration screen. You can sign back in anytime using your registered mobile number.')}</p>
            <div className="flex gap-2.5 pt-2">
              <button type="button" onClick={() => { sound.playTap(); setShowLogoutModal(false); }}
                className="flex-1 py-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-serif font-bold">{t('cancel', 'Cancel')}</button>
              <button type="button" onClick={() => { sound.playTap(); setShowLogoutModal(false); onLogout?.(); }}
                className="flex-1 py-2.5 rounded-2xl bg-red-600 text-white text-xs font-serif font-bold">{t('yes_logout', 'Yes, Log Out')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
