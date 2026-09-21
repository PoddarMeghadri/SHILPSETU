import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { LanguageCode } from '../../types';
import { ONBOARDING_LANGUAGES, OnboardingLanguage, getOnboardingLanguage } from '../../data/languages';
import { sound } from '../../services/sound';
import { ShilpSetuLogo } from '../common/ShilpSetuLogo';
import { useAdminMode } from '../../context/AdminModeContext';

interface LanguageSelectionScreenProps {
  initialLanguage?: LanguageCode;
  onSelectLanguage: (language: LanguageCode) => void;
  onBack: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  isSignIn?: boolean;
  continueButtonText?: string;
}

export const LanguageSelectionScreen: React.FC<LanguageSelectionScreenProps> = ({
  initialLanguage = 'en',
  onSelectLanguage,
  onBack,
  isDark = false,
  onToggleTheme,
  isSignIn = false,
  continueButtonText,
}) => {
  const { isAdminMode } = useAdminMode();
  const [selectedLang, setSelectedLang] = useState<LanguageCode>(initialLanguage);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active language metadata for real-time dynamic preview
  const activeMeta: OnboardingLanguage = useMemo(
    () => getOnboardingLanguage(selectedLang),
    [selectedLang]
  );

  // Filter languages while maintaining the strict sequential order
  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) {
      return ONBOARDING_LANGUAGES;
    }
    const q = searchQuery.toLowerCase().trim();
    return ONBOARDING_LANGUAGES.filter(
      (lang) =>
        lang.englishName.toLowerCase().includes(q) ||
        lang.nativeName.toLowerCase().includes(q) ||
        lang.region.toLowerCase().includes(q) ||
        lang.bcp47.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Card click handler: updates selection
  const handleCardClick = (lang: OnboardingLanguage) => {
    sound.playTap();
    setSelectedLang(lang.code);
  };

  // Continue handler
  const handleContinue = () => {
    sound.playSuccess();
    onSelectLanguage(selectedLang);
  };

  return (
    <motion.div
      key="language-selection"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`min-h-screen w-full flex flex-col justify-between p-4 sm:p-6 max-w-5xl mx-auto ${
        isAdminMode ? 'selection:bg-[#059669]/20' : 'selection:bg-[#B5451B]/20'
      }`}
      dir={activeMeta.isRtl ? 'rtl' : 'ltr'}
    >
      <div>
        {/* Top Navigation & Stepper Header */}
        <div className="flex items-center justify-between pt-2 mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                sound.playTap();
                onBack();
              }}
              className={`w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-sm transition-colors cursor-pointer ${
                isAdminMode
                  ? 'hover:bg-[#059669]/10 hover:text-[#059669]'
                  : 'hover:bg-[#B5451B]/10 hover:text-[#B5451B]'
              }`}
              title="Back to OTP verification"
              aria-label="Back to OTP verification"
            >
              <span className="material-symbols-outlined text-lg">
                {activeMeta.isRtl ? 'arrow_forward' : 'arrow_back'}
              </span>
            </button>
            <div className="flex items-center gap-2">
              <ShilpSetuLogo size="xs" isDark={isDark} />
              <span
                className={`font-serif font-bold text-sm sm:text-base tracking-tight ${
                  isAdminMode ? 'text-[#059669]' : 'text-[#B5451B]'
                }`}
              >
                SHILPSETU
              </span>
            </div>
          </div>

          {/* Right Header Controls: Theme Toggle & Current Selection Locale Pill */}
          <div className="flex items-center gap-2">
            {onToggleTheme && (
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  onToggleTheme();
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-xs border ${
                  isDark
                    ? 'text-[#E8B84B] bg-[#1A1A1A] hover:bg-[#252525] border-[#E8B84B]/30'
                    : isAdminMode
                    ? 'text-[#059669] bg-[#E8F5E9] hover:bg-[#C8E6C9] border-[#059669]/30'
                    : 'text-[#B5451B] bg-[#FAF6EE] hover:bg-[#EFE4CF] border-[#B5451B]/30'
                }`}
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                <span className="material-symbols-outlined text-base">
                  {isDark ? 'light_mode' : 'dark_mode'}
                </span>
              </button>
            )}

            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-serif font-bold ${
                isAdminMode
                  ? 'bg-[#059669]/10 dark:bg-[#059669]/25 border-[#059669]/20 text-[#059669] dark:text-emerald-400'
                  : 'bg-[#B5451B]/10 dark:bg-[#B5451B]/25 border-[#B5451B]/20 text-[#B5451B] dark:text-[#FFA680]'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full animate-pulse ${
                  isAdminMode ? 'bg-[#059669]' : 'bg-[#B5451B]'
                }`}
              />
              <span>{activeMeta.nativeName}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Header Section (Real-Time Preview on Selection) */}
        <div className="text-center mb-6 sm:mb-8">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner ${
              isAdminMode
                ? 'bg-[#059669]/10 dark:bg-[#059669]/25 text-[#059669] dark:text-emerald-400'
                : 'bg-[#B5451B]/10 dark:bg-[#B5451B]/25 text-[#B5451B] dark:text-[#FFA680]'
            }`}
          >
            <span className="material-symbols-outlined text-3xl">translate</span>
          </div>

          <h2
            key={`title-${selectedLang}`}
            className="font-serif font-black text-2xl sm:text-3xl text-[#22331E] dark:text-[#F4ECDE] mb-1.5 tracking-tight transition-all duration-300"
          >
            {activeMeta.headerTitle}
          </h2>

          <p
            key={`sub-${selectedLang}`}
            className="text-xs sm:text-sm text-black/70 dark:text-white/70 max-w-md mx-auto transition-all duration-300"
          >
            {activeMeta.headerSubtitle}
          </p>
        </div>

        {/* Search / Filter bar for convenient lookup */}
        <div className="relative mb-4">
          <span className="material-symbols-outlined absolute left-3.5 top-3 text-black/40 dark:text-white/40 text-lg">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search languages"
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#22331E]/15 dark:border-[#2D3A2B] bg-white dark:bg-[#1C221A] text-xs font-serif focus:outline-hidden focus:ring-2 transition-all ${
              isAdminMode ? 'focus:ring-[#059669]' : 'focus:ring-[#B5451B]'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          )}
        </div>

        {/* 23 Official Indian Languages Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
          {filteredLanguages.map((lang) => {
            const isSelected = selectedLang === lang.code;
            // Original 1-based index in the exact 23 sequence
            const sequentialNumber =
              ONBOARDING_LANGUAGES.findIndex((l) => l.code === lang.code) + 1;

            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleCardClick(lang)}
                className={`relative rounded-2xl p-3.5 text-left flex flex-col justify-between transition-all duration-200 border-2 cursor-pointer group ${
                  isSelected
                    ? isAdminMode
                      ? 'bg-[#FAF6EE] dark:bg-[#1F271C] border-[#059669] shadow-md ring-2 ring-[#059669]/20 scale-[1.01]'
                      : 'bg-[#FAF6EE] dark:bg-[#1F271C] border-[#B5451B] shadow-md ring-2 ring-[#B5451B]/20 scale-[1.01]'
                    : isAdminMode
                    ? 'bg-white dark:bg-[#1C221A] border-[#22331E]/15 dark:border-[#2D3A2B] hover:border-[#059669]/50 hover:shadow-xs'
                    : 'bg-white dark:bg-[#1C221A] border-[#22331E]/15 dark:border-[#2D3A2B] hover:border-[#B5451B]/50 hover:shadow-xs'
                }`}
              >
                {/* Card Top: Number & Active Tick */}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                      isSelected
                        ? isAdminMode
                          ? 'bg-[#059669] text-white'
                          : 'bg-[#B5451B] text-white'
                        : 'bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60'
                    }`}
                  >
                    #{sequentialNumber}
                  </span>

                  {/* Selected Checkmark Badge */}
                  {isSelected ? (
                    <div
                      className={`w-6 h-6 rounded-full text-white flex items-center justify-center shadow-xs ${
                        isAdminMode ? 'bg-[#059669]' : 'bg-[#B5451B]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm font-bold">check</span>
                    </div>
                  ) : (
                    <div
                      className={`w-6 h-6 rounded-full border border-black/15 dark:border-white/15 ${
                        isAdminMode
                          ? 'group-hover:border-[#059669]/40'
                          : 'group-hover:border-[#B5451B]/40'
                      }`}
                    />
                  )}
                </div>

                {/* Card Middle: Native Script Name (Prominent Display) */}
                <div className="mt-1">
                  <h3
                    className={`font-serif font-black text-lg sm:text-xl tracking-tight leading-snug ${
                      isSelected
                        ? isAdminMode
                          ? 'text-[#059669] dark:text-emerald-400'
                          : 'text-[#B5451B] dark:text-[#FFA680]'
                        : 'text-[#1A1815] dark:text-[#F4ECDE]'
                    }`}
                  >
                    {lang.nativeName}
                  </h3>
                  <p className="font-sans font-bold text-xs text-black/80 dark:text-white/80 mt-0.5">
                    {lang.englishName}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sticky Bottom Action Bar with Dynamic CTA Button */}
      <div className="sticky bottom-0 z-30 pt-3 pb-4 bg-gradient-to-t from-[#F4ECDE] via-[#F4ECDE]/95 to-transparent dark:from-[#121411] dark:via-[#121411]/95">
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleContinue}
            className={`w-full py-4 text-white font-serif font-bold text-base rounded-full shadow-artisan active:scale-95 transition-all flex items-center justify-center gap-2 group cursor-pointer ${
              isAdminMode
                ? 'bg-[#059669] hover:bg-[#047857]'
                : 'bg-[#B5451B] hover:bg-[#9C3A14]'
            }`}
          >
            <span>{isSignIn ? (continueButtonText || 'Continue') : activeMeta.continueButton}</span>
            <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">
              {activeMeta.isRtl ? 'arrow_backward' : 'arrow_forward'}
            </span>
          </button>

          <p className="text-[11px] text-black/60 dark:text-white/60 font-sans text-center">
            You can change your language anytime from the top bar • शीर्ष बार से कभी भी भाषा बदलें
          </p>
        </div>
      </div>
    </motion.div>
  );
};
