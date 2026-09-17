import { LanguageCode } from '../types';
import { ALL_TRANSLATIONS } from './locales';

export const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = ALL_TRANSLATIONS;

export function getTranslation(key: string, language: LanguageCode | string = 'hi'): string {
  const langKey = (language as LanguageCode);
  const langDict = TRANSLATIONS[langKey];
  if (langDict && langDict[key] && langDict[key].trim() !== '') {
    return langDict[key];
  }

  // If user selected English, return the English translation if present, or key
  if (langKey === 'en') {
    return TRANSLATIONS['en']?.[key] || key;
  }

  // If missing for an Indic language, do not silently masquerade in the wrong language without notice
  // If an English key exists, we clearly mark it as untranslated so the issue is transparent and never silent
  if (TRANSLATIONS['en'] && TRANSLATIONS['en'][key]) {
    return `[Not translated: ${TRANSLATIONS['en'][key]}]`;
  }

  return `[Not translated: ${key}]`;
}

// Re-export context, provider, and unified hooks for seamless reactive translations
export {
  LanguageContext,
  LanguageProvider,
  useLanguage,
  useTranslation,
} from '../context/LanguageContext';

