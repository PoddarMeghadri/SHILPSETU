import React, { createContext, useContext, useState, useEffect } from 'react';
import { sound } from '../services/sound';

export interface ThemeColorPalette {
  id: string;
  name: string;
  nativeName: string;
  primary: string;
  primaryHover: string;
  primaryLight: string;
  accent: string;
  description: string;
}

export const FAMOUS_PALETTES: ThemeColorPalette[] = [
  {
    id: 'terracotta',
    name: 'Varanasi Terracotta',
    nativeName: 'काशी मृत्तिका',
    primary: '#B5451B',
    primaryHover: '#9C3A14',
    primaryLight: 'rgba(181, 69, 27, 0.15)',
    accent: '#E8B84B',
    description: 'Sacred riverbed clay & wood-fired terracotta warmth',
  },
  {
    id: 'forest_jade',
    name: 'Forest Jade & Neem',
    nativeName: 'वन्य हरित',
    primary: '#22331E',
    primaryHover: '#162313',
    primaryLight: 'rgba(34, 51, 30, 0.15)',
    accent: '#88C498',
    description: 'Vedic herbal greens and organic natural foliage',
  },
  {
    id: 'royal_indigo',
    name: 'Royal Ajrakh Indigo',
    nativeName: 'शाही नील',
    primary: '#1E3A8A',
    primaryHover: '#172554',
    primaryLight: 'rgba(30, 58, 138, 0.15)',
    accent: '#60A5FA',
    description: 'Heritage hand-block Ajrakh natural indigo vat dye',
  },
  {
    id: 'temple_marigold',
    name: 'Temple Marigold Gold',
    nativeName: 'गेंदा पीताम्बर',
    primary: '#D97706',
    primaryHover: '#B45309',
    primaryLight: 'rgba(217, 119, 6, 0.15)',
    accent: '#FDE68A',
    description: 'Auspicious festive marigold and hand-beaten brass',
  },
  {
    id: 'madder_crimson',
    name: 'Manjistha Crimson',
    nativeName: 'मंजीष्ठा रक्त',
    primary: '#991B1B',
    primaryHover: '#7F1D1D',
    primaryLight: 'rgba(153, 27, 27, 0.15)',
    accent: '#FCA5A5',
    description: 'Ancestral botanical root dye with deep ruby undertones',
  },
  {
    id: 'peacock_teal',
    name: 'Mayura Peacock Teal',
    nativeName: 'मयूर कंठ',
    primary: '#0F766E',
    primaryHover: '#115E59',
    primaryLight: 'rgba(15, 118, 110, 0.15)',
    accent: '#5EEAD4',
    description: 'Rajasthani miniature enameling & peacock feather',
  },
  {
    id: 'charcoal_slate',
    name: 'Kalamkari Charcoal',
    nativeName: 'लौह भस्म',
    primary: '#374151',
    primaryHover: '#1F2937',
    primaryLight: 'rgba(55, 65, 81, 0.15)',
    accent: '#D1D5DB',
    description: 'Natural fermented iron-jaggery black craft ink',
  },
];

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  setThemeMode: (dark: boolean) => void;
  activePalette: ThemeColorPalette;
  selectPalette: (paletteId: string) => void;
  customColor: string;
  setCustomColor: (hex: string) => void;
  isCustom: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper to calculate lighter/darker shades
function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem('shilpsetu_theme') === 'dark';
  });

  const [paletteId, setPaletteId] = useState<string>(() => {
    return localStorage.getItem('shilpsetu_palette_id') || 'terracotta';
  });

  const [customColor, setCustomColorState] = useState<string>(() => {
    return localStorage.getItem('shilpsetu_custom_color') || '#B5451B';
  });

  const isCustom = paletteId === 'custom';

  const activePalette: ThemeColorPalette = isCustom
    ? {
        id: 'custom',
        name: 'Custom Artisan Palette',
        nativeName: 'विशेष रंग',
        primary: customColor,
        primaryHover: adjustBrightness(customColor, -15),
        primaryLight: hexToRgba(customColor, 0.15),
        accent: adjustBrightness(customColor, 40),
        description: 'Personalized bespoke master artisan hue',
      }
    : FAMOUS_PALETTES.find((p) => p.id === paletteId) || FAMOUS_PALETTES[0];

  // Sync dark class on root document
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('shilpsetu_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // Sync CSS variables on root document
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', activePalette.primary);
    root.style.setProperty('--color-primary-hover', activePalette.primaryHover);
    root.style.setProperty('--color-primary-light', activePalette.primaryLight);
    root.style.setProperty('--color-accent', activePalette.accent);
  }, [activePalette]);

  const toggleTheme = () => {
    sound.vibrateTap();
    setIsDark((prev) => !prev);
  };

  const setThemeMode = (dark: boolean) => {
    sound.vibrateTap();
    setIsDark(dark);
  };

  const selectPalette = (id: string) => {
    sound.vibrateSelection();
    setPaletteId(id);
    localStorage.setItem('shilpsetu_palette_id', id);
  };

  const setCustomColor = (hex: string) => {
    sound.vibrateSelection();
    setCustomColorState(hex);
    setPaletteId('custom');
    localStorage.setItem('shilpsetu_palette_id', 'custom');
    localStorage.setItem('shilpsetu_custom_color', hex);
  };

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        toggleTheme,
        setThemeMode,
        activePalette,
        selectPalette,
        customColor,
        setCustomColor,
        isCustom,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
