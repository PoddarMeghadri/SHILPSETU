import { ALL_TRANSLATIONS } from '../src/services/locales';
import { LanguageCode } from '../src/types';

export interface DiffReport {
  totalBaseKeys: number;
  results: Record<
    LanguageCode,
    {
      totalKeys: number;
      missingKeys: string[];
      emptyKeys: string[];
      identicalToEnKeys: string[];
      completionPercentage: number;
    }
  >;
}

export function runLocaleDiff(): DiffReport {
  const en = ALL_TRANSLATIONS.en;
  const enKeys = Object.keys(en);
  const totalBaseKeys = enKeys.length;

  const report: DiffReport = {
    totalBaseKeys,
    results: {} as DiffReport['results'],
  };

  for (const [langKey, dict] of Object.entries(ALL_TRANSLATIONS)) {
    const lang = langKey as LanguageCode;
    const missingKeys: string[] = [];
    const emptyKeys: string[] = [];
    const identicalToEnKeys: string[] = [];

    for (const key of enKeys) {
      const val = dict[key];
      if (val === undefined) {
        missingKeys.push(key);
      } else if (val.trim() === '') {
        emptyKeys.push(key);
      } else if (lang !== 'en' && val === en[key] && /[a-zA-Z]/.test(val) && val.length > 2) {
        // Likely copied verbatim English
        identicalToEnKeys.push(key);
      }
    }

    const validTranslations = enKeys.length - missingKeys.length - emptyKeys.length - identicalToEnKeys.length;
    const completionPercentage = Math.round((validTranslations / enKeys.length) * 100);

    report.results[lang] = {
      totalKeys: Object.keys(dict).length,
      missingKeys,
      emptyKeys,
      identicalToEnKeys,
      completionPercentage: lang === 'en' ? 100 : completionPercentage,
    };
  }

  return report;
}

if (process.argv[1]?.includes('diff_locales')) {
  const report = runLocaleDiff();
  console.log(`=== ShilpSetu Locale Audit Report (Base: English with ${report.totalBaseKeys} keys) ===\n`);

  const priorityFocus: LanguageCode[] = ['brx', 'doi', 'sat', 'ks', 'mai'];
  console.log('--- Priority Focus Languages (Bodo, Dogri, Santali, Kashmiri, Maithili) ---');
  for (const lang of priorityFocus) {
    const res = report.results[lang];
    if (res) {
      console.log(
        `[${lang.toUpperCase()}] Total: ${res.totalKeys}, Missing: ${res.missingKeys.length}, Empty: ${res.emptyKeys.length}, Verbatim English: ${res.identicalToEnKeys.length} -> Completion: ${res.completionPercentage}%`
      );
      if (res.missingKeys.length > 0) {
        console.log(`   Sample missing: ${res.missingKeys.slice(0, 5).join(', ')}`);
      }
    }
  }

  console.log('\n--- All Languages Overview ---');
  for (const [lang, res] of Object.entries(report.results)) {
    console.log(
      `[${lang.padEnd(4)}] Total: ${String(res.totalKeys).padEnd(4)} | Missing: ${String(res.missingKeys.length).padEnd(3)} | Verbatim English: ${String(res.identicalToEnKeys.length).padEnd(3)} | Done: ${res.completionPercentage}%`
    );
  }
}
