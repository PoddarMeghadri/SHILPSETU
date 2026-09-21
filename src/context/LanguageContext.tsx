import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { LanguageCode } from '../types';
import { getTranslation } from '../services/translations';
import {
  isRtlLanguage,
  getScriptForLanguage,
  TextDirection,
  IndicScript,
  LanguageMeta,
  getLanguageMeta,
} from '../i18n/types';
import { translateDynamicAIContent } from '../services/aiTranslationService';

export interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  isRtl: boolean;
  dir: TextDirection;
  script: IndicScript;
  meta: LanguageMeta;
  t: (key: string, fallback?: string, params?: Record<string, string | number>) => string;
  translateDynamic: (
    text: string,
    contextHint?: 'title' | 'description' | 'material' | 'category'
  ) => string;
  formatCurrency: (amount: number) => string;
  formatNumber: (num: number) => string;
}

export const LanguageContext = createContext<LanguageContextType | null>(null);

interface LanguageProviderProps {
  children: React.ReactNode;
  initialLanguage?: LanguageCode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  children,
  initialLanguage,
}) => {
  // Check if an ancestor provider is already mounted
  const parentContext = useContext(LanguageContext);
  if (parentContext) {
    return <>{children}</>;
  }

  const [language, setLanguageState] = useState<LanguageCode>(() => {
    if (initialLanguage) return initialLanguage;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('shilpsetu_lang') as LanguageCode;
      if (stored) return stored;
      try {
        const artisanRaw = localStorage.getItem('shilpsetu_artisan');
        if (artisanRaw) {
          const parsed = JSON.parse(artisanRaw);
          if (parsed.preferredLanguage) return parsed.preferredLanguage as LanguageCode;
        }
      } catch (_) {}
    }
    return 'en';
  });

  const isRtl = useMemo(() => isRtlLanguage(language), [language]);
  const dir = useMemo<TextDirection>(() => (isRtl ? 'rtl' : 'ltr'), [isRtl]);
  const script = useMemo<IndicScript>(() => getScriptForLanguage(language), [language]);
  const meta = useMemo<LanguageMeta>(() => getLanguageMeta(language), [language]);

  // Synchronize document attributes for global RTL and Indic font rendering
  useEffect(() => {
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', language);
    document.documentElement.setAttribute('data-script', script);
    document.documentElement.style.setProperty('--active-direction', dir);
    if (isRtl) {
      document.body.classList.add('rtl-layout');
    } else {
      document.body.classList.remove('rtl-layout');
    }
  }, [dir, language, script, isRtl]);

  const setLanguage = useCallback((newLang: LanguageCode) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem('shilpsetu_lang', newLang);
      const storedArtisan = localStorage.getItem('shilpsetu_artisan');
      if (storedArtisan) {
        const parsed = JSON.parse(storedArtisan);
        parsed.preferredLanguage = newLang;
        localStorage.setItem('shilpsetu_artisan', JSON.stringify(parsed));
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  // Listen for storage changes across tabs/windows or external events
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'shilpsetu_lang' && e.newValue) {
        setLanguageState(e.newValue as LanguageCode);
      }
    };
    const handleCustomLang = (e: any) => {
      if (e.detail?.language) {
        setLanguageState(e.detail.language as LanguageCode);
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('shilpsetu:language-sync', handleCustomLang as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('shilpsetu:language-sync', handleCustomLang as EventListener);
    };
  }, []);

  const t = useCallback(
    (key: string, fallback?: string, params?: Record<string, string | number>): string => {
      let result = getTranslation(key, language);
      if (result === key && fallback !== undefined) {
        result = fallback;
      }
      if (params && typeof result === 'string') {
        Object.entries(params).forEach(([paramKey, paramVal]) => {
          result = result.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramVal));
        });
      }
      return result;
    },
    [language]
  );

  const translateDynamic = useCallback(
    (text: string, contextHint?: 'title' | 'description' | 'material' | 'category'): string => {
      return translateDynamicAIContent(text, language, contextHint);
    },
    [language]
  );

  const formatCurrency = useCallback(
    (amount: number): string => {
      try {
        return new Intl.NumberFormat(language === 'en' ? 'en-IN' : 'hi-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 0,
        }).format(amount);
      } catch {
        return `₹${amount.toLocaleString('en-IN')}`;
      }
    },
    [language]
  );

  const formatNumber = useCallback(
    (num: number): string => {
      try {
        return new Intl.NumberFormat(language === 'en' ? 'en-IN' : 'hi-IN').format(num);
      } catch {
        return num.toLocaleString('en-IN');
      }
    },
    [language]
  );

  const value = useMemo<LanguageContextType>(
    () => ({
      language,
      setLanguage,
      isRtl,
      dir,
      script,
      meta,
      t,
      translateDynamic,
      formatCurrency,
      formatNumber,
    }),
    [
      language,
      setLanguage,
      isRtl,
      dir,
      script,
      meta,
      t,
      translateDynamic,
      formatCurrency,
      formatNumber,
    ]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    const fallbackLang: LanguageCode = (localStorage.getItem('shilpsetu_lang') as LanguageCode) || 'en';
    const isRtl = isRtlLanguage(fallbackLang);
    return {
      language: fallbackLang,
      setLanguage: () => {},
      isRtl,
      dir: isRtl ? 'rtl' : 'ltr',
      script: getScriptForLanguage(fallbackLang),
      meta: getLanguageMeta(fallbackLang),
      t: (key: string, fallback?: string, params?: Record<string, string | number>) => {
        let result = getTranslation(key, fallbackLang);
        if (result === key && fallback !== undefined) result = fallback;
        if (params) {
          Object.entries(params).forEach(([paramKey, paramVal]) => {
            result = result.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramVal));
          });
        }
        return result;
      },
      translateDynamic: (text) => translateDynamicAIContent(text, fallbackLang),
      formatCurrency: (amount) => `₹${amount.toLocaleString('en-IN')}`,
      formatNumber: (num) => num.toLocaleString('en-IN'),
    };
  }
  return context;
}

export function useTranslation(overrideLang?: LanguageCode | string) {
  const context = useLanguage();
  const effectiveLanguage = (overrideLang || context.language || 'hi') as LanguageCode;
  const isRtl = isRtlLanguage(effectiveLanguage);

  const t = useCallback(
    (key: string, fallback?: string, params?: Record<string, string | number>): string => {
      if (!overrideLang) {
        return context.t(key, fallback, params);
      }
      let result = getTranslation(key, effectiveLanguage);
      if (result === key && fallback !== undefined) {
        result = fallback;
      }
      if (params && typeof result === 'string') {
        Object.entries(params).forEach(([paramKey, paramVal]) => {
          result = result.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramVal));
        });
      }
      return result;
    },
    [context, overrideLang, effectiveLanguage]
  );

  const translateDynamic = useCallback(
    (text: string, contextHint?: 'title' | 'description' | 'material' | 'category'): string => {
      return translateDynamicAIContent(text, effectiveLanguage, contextHint);
    },
    [effectiveLanguage]
  );

  return {
    t,
    language: effectiveLanguage,
    setLanguage: context.setLanguage,
    isRtl,
    dir: (isRtl ? 'rtl' : 'ltr') as TextDirection,
    script: getScriptForLanguage(effectiveLanguage),
    meta: getLanguageMeta(effectiveLanguage),
    translateDynamic,
    formatCurrency: context.formatCurrency,
    formatNumber: context.formatNumber,
  };
}
