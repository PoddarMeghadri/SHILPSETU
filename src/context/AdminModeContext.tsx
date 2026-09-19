import React, { createContext, useContext, useState, useEffect } from 'react';
import { sound } from '../services/sound';

interface AdminModeContextType {
  isAdminMode: boolean;
  setIsAdminMode: (val: boolean) => void;
  enterAdminMode: (code: string) => { success: boolean; message?: string };
  exitAdminMode: () => void;
}

const AdminModeContext = createContext<AdminModeContextType | undefined>(undefined);

export const AdminModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdminMode, setIsAdminModeState] = useState<boolean>(() => {
    return localStorage.getItem('shilpsetu_admin_mode') === 'true';
  });

  // Keep DOM class and CSS variables in sync with admin mode
  useEffect(() => {
    const root = document.documentElement;
    if (isAdminMode) {
      root.classList.add('admin-mode');
      root.style.setProperty('--color-primary', '#059669');
      root.style.setProperty('--color-primary-hover', '#047857');
      root.style.setProperty('--color-primary-light', 'rgba(16, 185, 129, 0.15)');
      root.style.setProperty('--color-accent', '#34D399');
      localStorage.setItem('shilpsetu_admin_mode', 'true');
    } else {
      root.classList.remove('admin-mode');
      localStorage.setItem('shilpsetu_palette_id', 'terracotta');
      root.style.setProperty('--color-primary', '#B5451B');
      root.style.setProperty('--color-primary-hover', '#9C3A14');
      root.style.setProperty('--color-primary-light', 'rgba(181, 69, 27, 0.15)');
      root.style.setProperty('--color-accent', '#E8B84B');
      localStorage.removeItem('shilpsetu_admin_mode');
    }
  }, [isAdminMode]);

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

  return (
    <AdminModeContext.Provider
      value={{
        isAdminMode,
        setIsAdminMode,
        enterAdminMode,
        exitAdminMode,
      }}
    >
      {children}
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
