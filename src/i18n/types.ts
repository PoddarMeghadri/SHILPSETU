import { LanguageCode } from '../types';

export type TextDirection = 'ltr' | 'rtl';

export type IndicScript =
  | 'Devanagari'
  | 'Bengali'
  | 'Tamil'
  | 'Telugu'
  | 'Kannada'
  | 'Malayalam'
  | 'Gujarati'
  | 'Gurmukhi'
  | 'Oriya'
  | 'Perso-Arabic'
  | 'Ol-Chiki'
  | 'Latin';

export interface LanguageMeta {
  code: LanguageCode;
  name: string;
  nativeName: string;
  script: IndicScript;
  direction: TextDirection;
  speechLocale: string;
  fontFamily: string;
}

export const RTL_LANGUAGES: LanguageCode[] = ['ur', 'ks', 'sd'];

export function isRtlLanguage(code: LanguageCode | string): boolean {
  return RTL_LANGUAGES.includes(code as LanguageCode);
}

export const ALL_INDIAN_LANGUAGES: Record<LanguageCode, LanguageMeta> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    script: 'Latin',
    direction: 'ltr',
    speechLocale: 'en-IN',
    fontFamily: '"Be Vietnam Pro", system-ui, sans-serif',
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    script: 'Devanagari',
    direction: 'ltr',
    speechLocale: 'hi-IN',
    fontFamily: '"Noto Sans Devanagari", system-ui, sans-serif',
  },
  bn: {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    script: 'Bengali',
    direction: 'ltr',
    speechLocale: 'bn-IN',
    fontFamily: '"Noto Sans Bengali", system-ui, sans-serif',
  },
  ta: {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    script: 'Tamil',
    direction: 'ltr',
    speechLocale: 'ta-IN',
    fontFamily: '"Noto Sans Tamil", system-ui, sans-serif',
  },
  te: {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    script: 'Telugu',
    direction: 'ltr',
    speechLocale: 'te-IN',
    fontFamily: '"Noto Sans Telugu", system-ui, sans-serif',
  },
  mr: {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    script: 'Devanagari',
    direction: 'ltr',
    speechLocale: 'mr-IN',
    fontFamily: '"Noto Sans Devanagari", system-ui, sans-serif',
  },
  gu: {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    script: 'Gujarati',
    direction: 'ltr',
    speechLocale: 'gu-IN',
    fontFamily: '"Noto Sans Gujarati", system-ui, sans-serif',
  },
  kn: {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    script: 'Kannada',
    direction: 'ltr',
    speechLocale: 'kn-IN',
    fontFamily: '"Noto Sans Kannada", system-ui, sans-serif',
  },
  ml: {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    script: 'Malayalam',
    direction: 'ltr',
    speechLocale: 'ml-IN',
    fontFamily: '"Noto Sans Malayalam", system-ui, sans-serif',
  },
  pa: {
    code: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    script: 'Gurmukhi',
    direction: 'ltr',
    speechLocale: 'pa-IN',
    fontFamily: '"Noto Sans Gurmukhi", system-ui, sans-serif',
  },
  or: {
    code: 'or',
    name: 'Odia',
    nativeName: 'ଓଡ଼ିଆ',
    script: 'Oriya',
    direction: 'ltr',
    speechLocale: 'or-IN',
    fontFamily: '"Noto Sans Oriya", system-ui, sans-serif',
  },
  as: {
    code: 'as',
    name: 'Assamese',
    nativeName: 'অসমীয়া',
    script: 'Bengali',
    direction: 'ltr',
    speechLocale: 'as-IN',
    fontFamily: '"Noto Sans Bengali", system-ui, sans-serif',
  },
  ur: {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو',
    script: 'Perso-Arabic',
    direction: 'rtl',
    speechLocale: 'ur-IN',
    fontFamily: '"Noto Nastaliq Urdu", "Noto Sans Arabic", system-ui, sans-serif',
  },
  sa: {
    code: 'sa',
    name: 'Sanskrit',
    nativeName: 'संस्कृतम्',
    script: 'Devanagari',
    direction: 'ltr',
    speechLocale: 'sa-IN',
    fontFamily: '"Noto Sans Devanagari", system-ui, sans-serif',
  },
  mai: {
    code: 'mai',
    name: 'Maithili',
    nativeName: 'मैथिली',
    script: 'Devanagari',
    direction: 'ltr',
    speechLocale: 'mai-IN',
    fontFamily: '"Noto Sans Devanagari", system-ui, sans-serif',
  },
  kok: {
    code: 'kok',
    name: 'Konkani',
    nativeName: 'कोंकणी',
    script: 'Devanagari',
    direction: 'ltr',
    speechLocale: 'kok-IN',
    fontFamily: '"Noto Sans Devanagari", system-ui, sans-serif',
  },
  ks: {
    code: 'ks',
    name: 'Kashmiri',
    nativeName: 'کٲشُر',
    script: 'Perso-Arabic',
    direction: 'rtl',
    speechLocale: 'ks-IN',
    fontFamily: '"Noto Nastaliq Urdu", "Noto Sans Arabic", system-ui, sans-serif',
  },
  ne: {
    code: 'ne',
    name: 'Nepali',
    nativeName: 'नेपाली',
    script: 'Devanagari',
    direction: 'ltr',
    speechLocale: 'ne-NP',
    fontFamily: '"Noto Sans Devanagari", system-ui, sans-serif',
  },
  sd: {
    code: 'sd',
    name: 'Sindhi',
    nativeName: 'سنڌي',
    script: 'Perso-Arabic',
    direction: 'rtl',
    speechLocale: 'sd-IN',
    fontFamily: '"Noto Nastaliq Urdu", "Noto Sans Arabic", system-ui, sans-serif',
  },
  doi: {
    code: 'doi',
    name: 'Dogri',
    nativeName: 'डोगरी',
    script: 'Devanagari',
    direction: 'ltr',
    speechLocale: 'doi-IN',
    fontFamily: '"Noto Sans Devanagari", system-ui, sans-serif',
  },
  mni: {
    code: 'mni',
    name: 'Manipuri',
    nativeName: 'মৈতৈলোন্',
    script: 'Bengali',
    direction: 'ltr',
    speechLocale: 'mni-IN',
    fontFamily: '"Noto Sans Bengali", system-ui, sans-serif',
  },
  brx: {
    code: 'brx',
    name: 'Bodo',
    nativeName: 'बर’',
    script: 'Devanagari',
    direction: 'ltr',
    speechLocale: 'brx-IN',
    fontFamily: '"Noto Sans Devanagari", system-ui, sans-serif',
  },
  sat: {
    code: 'sat',
    name: 'Santali',
    nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ',
    script: 'Ol-Chiki',
    direction: 'ltr',
    speechLocale: 'sat-IN',
    fontFamily: '"Noto Sans Ol Chiki", system-ui, sans-serif',
  },
};

export function getScriptForLanguage(code: LanguageCode | string): IndicScript {
  return ALL_INDIAN_LANGUAGES[code as LanguageCode]?.script || 'Devanagari';
}

export function getLanguageMeta(code: LanguageCode | string): LanguageMeta {
  return ALL_INDIAN_LANGUAGES[code as LanguageCode] || ALL_INDIAN_LANGUAGES.hi;
}
