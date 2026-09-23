import { translateDynamicAIContent } from './aiTranslationService';
import { LanguageCode } from '../types';

export interface IndicTranslateParams {
  text: string;
  sourceLang: string;
  targetLang: string;
}

// In-memory cache for fast UI rendering
const translationCache = new Map<string, string>();

/**
 * Translates dynamic Indic text using Government of India Bhashini ULCA NMT Pipeline
 * with automatic fallback to Google Cloud Translation API and offline domain dictionaries.
 */
export const translateIndicContent = async ({
  text,
  sourceLang,
  targetLang,
}: IndicTranslateParams): Promise<string> => {
  if (!text || sourceLang === targetLang) return text;

  const cacheKey = `${sourceLang}_${targetLang}_${text.trim()}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // 1. Try Bhashini ULCA Pipeline (Trained specifically for 22 scheduled Indian languages)
  const bhashiniKey = import.meta.env.VITE_BHASHINI_API_KEY;
  if (bhashiniKey) {
    try {
      const bhashiniRes = await fetch('https://dhruva-api.bhashini.gov.in/services/inference/translation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': bhashiniKey,
        },
        body: JSON.stringify({
          pipelineTasks: [
            {
              taskType: 'translation',
              config: {
                language: {
                  sourceLanguage: sourceLang,
                  targetLanguage: targetLang,
                },
              },
            },
          ],
          inputData: { input: [{ source: text }] },
        }),
      });

      if (bhashiniRes.ok) {
        const data = await bhashiniRes.json();
        const translated = data?.pipelineResponse?.[0]?.output?.[0]?.target;
        if (translated && typeof translated === 'string') {
          translationCache.set(cacheKey, translated);
          return translated;
        }
      }
    } catch (bhashiniErr) {
      console.warn('Bhashini unavailable, routing to translation fallback...', bhashiniErr);
    }
  }

  // 2. Fallback: Google Cloud Translation API
  const googleKey = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY;
  if (googleKey) {
    try {
      const googleRes = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${googleKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: text,
            source: sourceLang,
            target: targetLang,
            format: 'text',
          }),
        }
      );

      if (googleRes.ok) {
        const gData = await googleRes.json();
        const translatedText = gData?.data?.translations?.[0]?.translatedText;
        if (translatedText && typeof translatedText === 'string') {
          translationCache.set(cacheKey, translatedText);
          return translatedText;
        }
      }
    } catch (gErr) {
      console.error('All cloud translation APIs failed. Falling back to offline engine.', gErr);
    }
  }

  // 3. Resilient Offline Craft Fallback
  try {
    const offlineTranslated = translateDynamicAIContent(text, targetLang as LanguageCode);
    if (offlineTranslated && offlineTranslated !== text) {
      translationCache.set(cacheKey, offlineTranslated);
      return offlineTranslated;
    }
  } catch {
    // ignore offline parse errors
  }

  // 4. Zero-Break Fallback: Return original text safely
  translationCache.set(cacheKey, text);
  return text;
};
