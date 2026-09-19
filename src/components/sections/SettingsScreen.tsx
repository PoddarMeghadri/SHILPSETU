import React, { useState } from 'react';
import { LanguageCode, ScreenId } from '../../types';
import { sound } from '../../services/sound';
import { useTranslation } from '../../services/translations';
import { useAdminMode } from '../../context/AdminModeContext';
import { useUser } from '@clerk/clerk-react';
import { validatePassword, passwordsMatch } from '../../services/passwordValidation';
import { sendSupabasePasswordReset } from '../../services/supabase';

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
  const { isAdminMode } = useAdminMode();
  const { user } = useUser();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const panelClass = `rounded-3xl p-5 border shadow-xs space-y-3 ${
    isDark
      ? 'bg-[#1C221A] border-[#2D3A2B] text-[#F4ECDE]'
      : 'bg-[#EAE0CC] border-[#22331E]/15 text-[#1D1C14]'
  }`;
  const rowClass = `p-3 rounded-2xl border ${
    isDark ? 'bg-[#121411] border-[#2D3A2B]' : 'bg-white border-[#22331E]/10'
  }`;

  return (
    <div className="w-full max-w-4xl mx-auto pb-28 md:pb-12 pt-2 px-3 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center gap-3 px-1">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
            isAdminMode
              ? 'bg-emerald-500/15 text-emerald-500'
              : 'bg-[#B5451B]/15 text-[#B5451B]'
          }`}>
            <span className="material-symbols-outlined text-2xl">settings</span>
          </div>
          <div>
            <h2 className="font-serif font-bold text-xl">{t('settings', 'Settings')}</h2>
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <h4 className="font-serif font-bold text-base">{t('workshop_settings', 'Workshop Settings')}</h4>
        <div className="space-y-2">
          {onToggleTheme && (
            <div className={`${rowClass} p-3.5 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isDark ? 'bg-[#E8B84B] text-[#1A1815]' : 'bg-[#22331E] text-white'
                }`}>
                  <span className="material-symbols-outlined text-lg">{isDark ? 'dark_mode' : 'light_mode'}</span>
                </div>
                <div>
                  <p className="font-serif font-bold text-xs">{t('theme_mode', 'Theme Appearance')}</p>
                  <p className="text-[10px] opacity-70">
                    {isDark ? t('dark_mode_active_label', 'Heritage Dark Mode Active') : t('light_mode_active_label', 'Warm Sandalwood Light Active')}
                  </p>
                </div>
              </div>
              <div className="flex items-center p-0.5 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
                <button type="button" onClick={() => isDark && (sound.playTap(), onToggleTheme())}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${!isDark ? 'bg-white text-[#B5451B] shadow-xs' : 'text-neutral-400'}`}
                >
                  {t('light_mode_btn', 'Light')}
                </button>
                <button type="button" onClick={() => !isDark && (sound.playTap(), onToggleTheme())}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${isDark ? 'bg-[#B5451B] text-white shadow-xs' : 'text-neutral-500'}`}
                >
                  {t('dark_mode_btn', 'Dark')}
                </button>
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
        {!isAdminMode && user && (
          <>
            <button
              type="button"
              onClick={async () => {
                const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses?.[0]?.emailAddress;
                if (!email) {
                  setResetMessage('No email address is linked to this account.');
                  return;
                }
                const result = await sendSupabasePasswordReset(email);
                setResetMessage(result.sent ? 'Password reset instructions sent to your email.' : (result.error || 'Unable to send reset instructions.'));
              }}
              className={`${rowClass} w-full p-3.5 flex items-center justify-between text-left hover:bg-black/5`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#E8B84B] text-[#1A1815] flex items-center justify-center"><span className="material-symbols-outlined text-lg">mail_lock</span></div>
                <div><p className="font-serif font-bold text-xs">Reset password by email</p><p className="text-[10px] opacity-75">Send a secure reset link</p></div>
              </div>
              <span className="material-symbols-outlined text-sm opacity-70">arrow_forward_ios</span>
            </button>
            {resetMessage && <p role="status" className="text-xs text-[#B5451B] px-2">{resetMessage}</p>}
          </>
        )}
        {!isAdminMode && user && (
          <button type="button" onClick={() => { sound.playTap(); setPasswordMessage(''); setShowPasswordModal(true); }}
            className={`${rowClass} w-full p-3.5 flex items-center justify-between text-left hover:bg-black/5`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#B5451B] text-white flex items-center justify-center"><span className="material-symbols-outlined text-lg">lock_reset</span></div>
              <div><p className="font-serif font-bold text-xs">Change password</p><p className="text-[10px] opacity-75">Use a strong password for your account</p></div>
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
            if (!passwordsMatch(newPassword, passwordConfirmation)) { setPasswordMessage('Passwords do not match.'); return; }
            if (!user?.updatePassword) { setPasswordMessage('Password changes are unavailable for this sign-in method.'); return; }
            setIsSavingPassword(true);
            try {
              await user.updatePassword({ currentPassword, newPassword });
              setPasswordMessage('Password updated successfully.');
              setCurrentPassword(''); setNewPassword(''); setPasswordConfirmation('');
              setTimeout(() => setShowPasswordModal(false), 900);
            } catch (error: any) { setPasswordMessage(error?.errors?.[0]?.message || 'Unable to update password.'); }
            finally { setIsSavingPassword(false); }
          }} className={`w-full max-w-sm rounded-3xl p-6 border shadow-2xl space-y-3 ${isDark ? 'bg-[#1C221A] border-[#2D3A2B] text-[#F4ECDE]' : 'bg-[#F4ECDE] border-[#22331E]/20 text-[#1A1815]'}`}>
            <h4 className="font-serif font-bold text-lg">Change password</h4>
            <input aria-label="Current password" type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" className="w-full rounded-xl border p-2.5 bg-transparent text-sm" />
            <input aria-label="New password" type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" className="w-full rounded-xl border p-2.5 bg-transparent text-sm" />
            <input aria-label="Confirm new password" type="password" required value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} placeholder="Confirm new password" className="w-full rounded-xl border p-2.5 bg-transparent text-sm" />
            {passwordMessage && <p role="status" className="text-xs text-[#B5451B]">{passwordMessage}</p>}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 py-2.5 rounded-2xl border text-xs font-bold">Cancel</button>
              <button disabled={isSavingPassword} type="submit" className="flex-1 py-2.5 rounded-2xl bg-[#B5451B] text-white text-xs font-bold">{isSavingPassword ? 'Saving…' : 'Update password'}</button>
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
