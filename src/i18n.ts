import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { ALL_TRANSLATIONS } from './services/locales';

export const supportedLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'हिन्दी', nativeName: 'हिन्दी' },
  { code: 'bn', name: 'বাংলা', nativeName: 'বাংলা' },
  { code: 'kn', name: 'ಕನ್ನಡ', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'മലയാളം', nativeName: 'മലയാളം' },
  { code: 'or', name: 'ଓଡ଼ିଆ', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'ta', name: 'தமிழ்', nativeName: 'தமிழ்' },
  { code: 'te', name: 'తెలుగు', nativeName: 'తెలుగు' },
  { code: 'ur', name: 'اُردُو', nativeName: 'اُردُو' },
];

const resources = Object.fromEntries(
  Object.entries(ALL_TRANSLATIONS).map(([code, bundle]) => [code, { translation: bundle }])
);

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: ['hi', 'en'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'shilpsetu_lang',
    },
    react: { useSuspense: false },
    parseMissingKeyHandler: (key: string) => {
      return key
        .replace(/^(nav_|btn_|lbl_|hdr_)/, '')
        .replace(/[_-]+/g, ' ')
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .replace(/\bOtp\b/gi, 'OTP')
        .replace(/\bSms\b/gi, 'SMS')
        .replace(/\bId\b/gi, 'ID');
    },
  });

export default i18n;
