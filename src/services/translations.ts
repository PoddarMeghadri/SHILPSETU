import { LanguageCode } from '../types';
import { ALL_TRANSLATIONS } from './locales';

export const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = ALL_TRANSLATIONS;

export function getTranslation(key: string, language: LanguageCode | string = 'hi'): string {
  const langKey = (language as LanguageCode);
  const langDict = TRANSLATIONS[langKey];
  if (langDict && langDict[key]) return langDict[key];

  // If user selected English, don't fall back to Hindi
  if (langKey === 'en') {
    return key;
  }

  // For non-Devanagari script languages (Urdu, Kashmiri, Sindhi, Tamil, Telugu, Kannada, Malayalam, Bengali, Assamese, Odia, Punjabi, Gujarati),
  // prioritize English fallback over Hindi to avoid jarring script mixes
  const nonDevanagariLangs: LanguageCode[] = [
    'ur', 'ks', 'sd', 'ta', 'te', 'kn', 'ml', 'bn', 'as', 'or', 'pa', 'gu'
  ];

  if (nonDevanagariLangs.includes(langKey)) {
    if (TRANSLATIONS['en'] && TRANSLATIONS['en'][key]) return TRANSLATIONS['en'][key];
    if (TRANSLATIONS['hi'] && TRANSLATIONS['hi'][key]) return TRANSLATIONS['hi'][key];
    return key;
  }

  // For Devanagari or other related languages, fall back to Hindi then English
  if (TRANSLATIONS['hi'] && TRANSLATIONS['hi'][key]) return TRANSLATIONS['hi'][key];
  if (TRANSLATIONS['en'] && TRANSLATIONS['en'][key]) return TRANSLATIONS['en'][key];
  return key;
}

// Re-export context, provider, and unified hooks for seamless reactive translations
export {
  LanguageContext,
  LanguageProvider,
  useLanguage,
  useTranslation,
} from '../context/LanguageContext';

