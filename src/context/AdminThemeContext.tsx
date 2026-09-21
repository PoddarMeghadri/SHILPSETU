import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AdminColorPreset {
  id: string;
  name: string;
  hex: string;
}

export const DEFAULT_ADMIN_ACCENT = '#10b981';

// 10 curated colors strictly excluding Terracotta Orange (#B5451B / #ea580c)
export const ADMIN_COLOR_PRESETS: AdminColorPreset[] = [
  { id: 'emerald', name: 'Emerald / Forest Green', hex: '#10b981' },
  { id: 'indigo', name: 'Royal Indigo', hex: '#6366f1' },
  { id: 'sapphire', name: 'Deep Sapphire / Blue', hex: '#2563eb' },
  { id: 'purple', name: 'Amethyst Purple', hex: '#9333ea' },
  { id: 'crimson', name: 'Ruby Crimson', hex: '#e11d48' },
  { id: 'teal', name: 'Teal Breeze', hex: '#14b8a6' },
  { id: 'cyan', name: 'Cyan / Sky', hex: '#06b6d4' },
  { id: 'amber', name: 'Amber Gold', hex: '#d97706' },
  { id: 'rose', name: 'Rose Quartz', hex: '#f43f5e' },
  { id: 'slate', name: 'Slate / Charcoal Silver', hex: '#64748b' },
];

export function adjustBrightness(hex: string, percent: number): string {
  const cleanHex = hex.replace('#', '');
  const expanded = cleanHex.length === 3 ? cleanHex.split('').map((c) => c + c).join('') : cleanHex;
  const num = parseInt(expanded, 16);
  if (isNaN(num)) return hex;
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const expanded = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const r = parseInt(expanded.substring(0, 2), 16) || 0;
  const g = parseInt(expanded.substring(2, 4), 16) || 0;
  const b = parseInt(expanded.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export interface AdminThemeContextType {
  adminAccentColor: string;
  setAdminAccentColor: (hex: string) => void;
  resetAdminAccentColor: () => void;
  isDefaultAccent: boolean;
  activePresetId: string | null;
  presets: AdminColorPreset[];
}

export const AdminThemeContext = createContext<AdminThemeContextType | undefined>(undefined);

export const useAdminTheme = (): AdminThemeContextType => {
  const context = useContext(AdminThemeContext);
  if (!context) {
    throw new Error('useAdminTheme must be used within an AdminThemeProvider or AdminModeProvider');
  }
  return context;
};
