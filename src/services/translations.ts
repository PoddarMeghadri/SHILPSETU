import { LanguageCode } from '../types';
import { ALL_TRANSLATIONS } from './locales';

export const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = ALL_TRANSLATIONS;

function cleanedKeyFallback(key: string): string {
  return key
    .replace(/^(nav_|btn_|lbl_|hdr_)/, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function getTranslation(key: string, language: LanguageCode | string = 'hi'): string {
  const normalizedKey = typeof key === 'string' ? key.trim() : '';
  if (!normalizedKey) return '';

  const langKey = language as LanguageCode;
  const dictionaries = [TRANSLATIONS[langKey], TRANSLATIONS.hi, TRANSLATIONS.en];
  for (const dictionary of dictionaries) {
    const value = dictionary?.[normalizedKey];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return cleanedKeyFallback(normalizedKey);
}

// Re-export context, provider, and unified hooks for seamless reactive translations
export {
  LanguageContext,
  LanguageProvider,
  useLanguage,
  useTranslation,
} from '../context/LanguageContext';
