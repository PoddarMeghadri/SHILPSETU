import React, { createContext, useContext, useState, useEffect } from 'react';
import { sound } from '../services/sound';
import {
  AdminColorPreset,
  ADMIN_COLOR_PRESETS,
  DEFAULT_ADMIN_ACCENT,
  adjustBrightness,
  hexToRgba,
  AdminThemeContext,
  AdminThemeContextType,
} from './AdminThemeContext';

export {
  ADMIN_COLOR_PRESETS,
  DEFAULT_ADMIN_ACCENT,
  adjustBrightness,
  hexToRgba,
  useAdminTheme,
} from './AdminThemeContext';

export type { AdminColorPreset, AdminThemeContextType } from './AdminThemeContext';

interface AdminModeContextType {
  isAdminMode: boolean;
  setIsAdminMode: (val: boolean) => void;
  enterAdminMode: (code: string) => { success: boolean; message?: string };
  exitAdminMode: () => void;
  adminAccentColor: string;
  setAdminAccentColor: (val: string) => void;
  resetAdminAccentColor: () => void;
  isDefaultAccent: boolean;
  isAdminSessionActive: boolean;
  setIsAdminSessionActive: (val: boolean) => void;
}

const AdminModeContext = createContext<AdminModeContextType | undefined>(undefined);

export const AdminModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdminMode, setIsAdminModeState] = useState<boolean>(() => {
    return localStorage.getItem('shilpsetu_admin_mode') === 'true';
  });

  const [isAdminSessionActive, setIsAdminSessionActive] = useState<boolean>(() => {
    return localStorage.getItem('shilpsetu_onboarding_completed') === 'true';
  });

  const [adminAccentColor, setAdminAccentColorState] = useState<string>(() => {
    return localStorage.getItem('shilpsetu_admin_accent') || DEFAULT_ADMIN_ACCENT;
  });

  const isDefaultAccent = adminAccentColor.toLowerCase() === DEFAULT_ADMIN_ACCENT.toLowerCase();

  const setAdminAccentColor = (hex: string) => {
    const cleanHex = hex.trim();
    // Normal User Mode Guard: Terracotta Orange is strictly reserved for normal user mode
    const lower = cleanHex.toLowerCase();
    if (lower === '#b5451b' || lower === '#9c3a14' || lower === '#ea580c' || lower === '#9e3913') {
      return;
    }
    setAdminAccentColorState(cleanHex);
    localStorage.setItem('shilpsetu_admin_accent', cleanHex);
  };

  const resetAdminAccentColor = () => {
    setAdminAccentColorState(DEFAULT_ADMIN_ACCENT);
    localStorage.setItem('shilpsetu_admin_accent', DEFAULT_ADMIN_ACCENT);
  };

  // Keep DOM class, attributes, and CSS variables in sync with admin mode & authentication state
  useEffect(() => {
    const root = document.documentElement;

    if (isAdminMode) {
      localStorage.setItem('shilpsetu_admin_mode', 'true');
      root.classList.add('admin-mode');

      // Strict Protection for Onboarding & Login:
      // Under no circumstances should custom colors bleed into Onboarding, Sign-Up, Sign-In, or OTP screens.
      // Only set data-theme="admin" and dynamic CSS variables when the admin session is inside the main workspace!
      if (isAdminSessionActive) {
        root.setAttribute('data-theme', 'admin');

        const hover = adjustBrightness(adminAccentColor, -15);
        const light = hexToRgba(adminAccentColor, 0.15);
        const glow = hexToRgba(adminAccentColor, 0.25);
        const subtle = hexToRgba(adminAccentColor, 0.08);
        const darkText = adjustBrightness(adminAccentColor, 35);

        root.style.setProperty('--admin-accent', adminAccentColor);
        root.style.setProperty('--admin-accent-hover', hover);
        root.style.setProperty('--admin-accent-light', light);
        root.style.setProperty('--admin-accent-glow', glow);
        root.style.setProperty('--admin-accent-subtle', subtle);
        root.style.setProperty('--admin-accent-dark-text', darkText);

        root.style.setProperty('--color-primary', adminAccentColor);
        root.style.setProperty('--color-primary-hover', hover);
        root.style.setProperty('--color-primary-light', light);
        root.style.setProperty('--color-accent', adminAccentColor);
      } else {
        // Pristine base aesthetics for Onboarding & Login in Admin Mode (Default emerald green)
        root.removeAttribute('data-theme');
        root.style.removeProperty('--admin-accent');
        root.style.removeProperty('--admin-accent-hover');
        root.style.removeProperty('--admin-accent-light');
        root.style.removeProperty('--admin-accent-glow');
        root.style.removeProperty('--admin-accent-subtle');
        root.style.removeProperty('--admin-accent-dark-text');

        root.style.setProperty('--color-primary', '#059669');
        root.style.setProperty('--color-primary-hover', '#047857');
        root.style.setProperty('--color-primary-light', 'rgba(16, 185, 129, 0.15)');
        root.style.setProperty('--color-accent', '#34D399');
      }
    } else {
      // Normal User Mode: Locked strictly to Varanasi Terracotta Orange
      root.classList.remove('admin-mode');
      root.removeAttribute('data-theme');
      root.style.removeProperty('--admin-accent');
      root.style.removeProperty('--admin-accent-hover');
      root.style.removeProperty('--admin-accent-light');
      root.style.removeProperty('--admin-accent-glow');
      root.style.removeProperty('--admin-accent-subtle');
      root.style.removeProperty('--admin-accent-dark-text');

      localStorage.setItem('shilpsetu_palette_id', 'terracotta');
      root.style.setProperty('--color-primary', '#B5451B');
      root.style.setProperty('--color-primary-hover', '#9C3A14');
      root.style.setProperty('--color-primary-light', 'rgba(181, 69, 27, 0.15)');
      root.style.setProperty('--color-accent', '#E8B84B');
      localStorage.removeItem('shilpsetu_admin_mode');
    }
  }, [isAdminMode, isAdminSessionActive, adminAccentColor]);

  const enterAdminMode = (code: string): { success: boolean; message?: string } => {
    if (code.trim() === 'randu07') {
      sound.playSuccess();
      setIsAdminModeState(true);
      return { success: true };
    } else {
      sound.playError();
      return {
        success: false,
        message: 'Invalid access code. Please verify credentials and try again.',
      };
    }
  };

  const exitAdminMode = () => {
    sound.playTap();
    setIsAdminModeState(false);
  };

  const setIsAdminMode = (val: boolean) => {
    setIsAdminModeState(val);
  };

  const matchedPreset = ADMIN_COLOR_PRESETS.find(
    (p) => p.hex.toLowerCase() === adminAccentColor.toLowerCase()
  );

  const themeContextValue: AdminThemeContextType = {
    adminAccentColor,
    setAdminAccentColor,
    resetAdminAccentColor,
    isDefaultAccent,
    activePresetId: matchedPreset ? matchedPreset.id : null,
    presets: ADMIN_COLOR_PRESETS,
  };

  return (
    <AdminModeContext.Provider
      value={{
        isAdminMode,
        setIsAdminMode,
        enterAdminMode,
        exitAdminMode,
        adminAccentColor,
        setAdminAccentColor,
        resetAdminAccentColor,
        isDefaultAccent,
        isAdminSessionActive,
        setIsAdminSessionActive,
      }}
    >
      <AdminThemeContext.Provider value={themeContextValue}>
        {children}
      </AdminThemeContext.Provider>
    </AdminModeContext.Provider>
  );
};

export const useAdminMode = (): AdminModeContextType => {
  const context = useContext(AdminModeContext);
  if (!context) {
    throw new Error('useAdminMode must be used within an AdminModeProvider');
  }
  return context;
};

