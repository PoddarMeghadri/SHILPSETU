import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { LanguageCode } from '../../types';
import { ONBOARDING_LANGUAGES, OnboardingLanguage, getOnboardingLanguage } from '../../data/languages';
import { ttsService } from '../../services/ttsService';
import { sound } from '../../services/sound';
import { ShilpSetuLogo } from '../common/ShilpSetuLogo';

interface LanguageSelectionScreenProps {
  initialLanguage?: LanguageCode;
  onSelectLanguage: (language: LanguageCode) => void;
  onBack: () => void;
  isDark?: boolean;
}

export const LanguageSelectionScreen: React.FC<LanguageSelectionScreenProps> = ({
  initialLanguage = 'en',
  onSelectLanguage,
  onBack,
  isDark = false,
}) => {
  const [selectedLang, setSelectedLang] = useState<LanguageCode>(initialLanguage);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const audioTimeoutRef = useRef<number | null>(null);

  // Active language metadata for real-time dynamic preview
  const activeMeta: OnboardingLanguage = useMemo(
    () => getOnboardingLanguage(selectedLang),
    [selectedLang]
  );

  // Stop speech when unmounting
  useEffect(() => {
    return () => {
      ttsService.stop();
      if (audioTimeoutRef.current) {
        window.clearTimeout(audioTimeoutRef.current);
      }
    };
  }, []);

  // Pre-fetch greeting audio for selected language and key Indic languages for instantaneous playback
  useEffect(() => {
    ttsService.preload(activeMeta.code, activeMeta.welcomeGreeting);
    const popularCodes = ['en', 'hi', 'bn', 'ta', 'te', 'mr', 'gu', 'ur', 'pa', 'kn', 'ml', 'or'];
    popularCodes.forEach((c) => {
      const meta = getOnboardingLanguage(c);
      if (meta) {
        ttsService.preload(meta.code, meta.welcomeGreeting);
      }
    });
  }, [activeMeta]);

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

  // Handle vocalizing the greeting across all 23 official Indian languages
  const handlePlayGreeting = (langMeta: OnboardingLanguage = activeMeta) => {
    sound.playTap();
    setAudioError(null);

    // Stop current speech
    ttsService.stop();
    setIsPlayingAudio(true);

    const success = ttsService.speak({
      text: langMeta.welcomeGreeting,
      locale: langMeta.bcp47,
      langCode: langMeta.code,
      rate: 0.92,
      onStart: () => {
        setIsPlayingAudio(true);
      },
      onEnd: () => {
        setIsPlayingAudio(false);
      },
      onError: () => {
        setIsPlayingAudio(false);
        setAudioError('Audio playback temporarily unavailable');
      },
    });

    if (!success) {
      setIsPlayingAudio(false);
      setAudioError('Voice audio is unavailable in current preview mode');
    }

    // Safety timeout in case speech engine hangs
    if (audioTimeoutRef.current) {
      window.clearTimeout(audioTimeoutRef.current);
    }
    audioTimeoutRef.current = window.setTimeout(() => {
      setIsPlayingAudio(false);
    }, 7000);
  };

  // Card click handler: updates selection and immediately triggers spoken greeting
  const handleCardClick = (lang: OnboardingLanguage) => {
    sound.playTap();
    setSelectedLang(lang.code);
    setAudioError(null);
    handlePlayGreeting(lang);
  };

  // Continue CTA handler: commits selection and advances
  const handleContinue = () => {
    ttsService.stop();
    sound.playSuccess();
    onSelectLanguage(selectedLang);
  };

  return (
    <motion.div
      key="language-selection-screen"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="min-h-screen w-full flex flex-col justify-between p-4 sm:p-6 max-w-5xl mx-auto selection:bg-[#B5451B]/20"
      dir={activeMeta.isRtl ? 'rtl' : 'ltr'}
    >
      <div>
        {/* Top Navigation & Stepper Header */}
        <div className="flex items-center justify-between pt-2 mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                ttsService.stop();
                sound.playTap();
                onBack();
              }}
              className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 hover:bg-[#B5451B]/10 hover:text-[#B5451B] flex items-center justify-center text-sm transition-colors"
              title="Back to OTP verification"
              aria-label="Back to OTP verification"
            >
              <span className="material-symbols-outlined text-lg">
                {activeMeta.isRtl ? 'arrow_forward' : 'arrow_back'}
              </span>
            </button>
            <div className="flex items-center gap-2">
              <ShilpSetuLogo size="xs" isDark={isDark} />
              <span className="font-serif font-bold text-sm sm:text-base tracking-tight text-[#B5451B]">
                SHILPSETU
              </span>
            </div>
          </div>

          {/* Current Selection Locale Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B5451B]/10 dark:bg-[#B5451B]/25 border border-[#B5451B]/20 text-[#B5451B] dark:text-[#FFA680] text-xs font-serif font-bold">
            <span className="w-2 h-2 rounded-full bg-[#B5451B] animate-pulse" />
            <span>{activeMeta.nativeName}</span>
          </div>
        </div>

        {/* Dynamic Header Section (Real-Time Preview on Selection) */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#B5451B]/10 dark:bg-[#B5451B]/25 text-[#B5451B] dark:text-[#FFA680] flex items-center justify-center mx-auto mb-3 shadow-inner">
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

          {/* Dedicated Spoken Audio Greeting Pill Button */}
          <div className="mt-3.5 flex flex-col items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => handlePlayGreeting(activeMeta)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-serif font-bold transition-all cursor-pointer shadow-xs ${
                isPlayingAudio
                  ? 'bg-[#B5451B] text-white ring-2 ring-[#B5451B]/40 scale-102 shadow-md'
                  : 'bg-[#B5451B]/10 hover:bg-[#B5451B]/20 text-[#B5451B] dark:bg-[#B5451B]/25 dark:text-[#FFA680]'
              }`}
              title={activeMeta.audioButtonLabel}
              aria-label={activeMeta.audioButtonLabel}
            >
              <span className="material-symbols-outlined text-base">
                {isPlayingAudio ? 'graphic_eq' : 'volume_up'}
              </span>
              <span>
                {isPlayingAudio ? activeMeta.welcomeGreeting : activeMeta.audioButtonLabel}
              </span>
              {isPlayingAudio && (
                <span className="flex items-center gap-0.5 ml-1">
                  <span className="w-1 h-3 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1 h-4 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1 h-2.5 bg-white rounded-full animate-bounce" />
                </span>
              )}
            </button>
            {audioError && (
              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-sans">
                {audioError}
              </p>
            )}
          </div>
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
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#22331E]/15 dark:border-[#2D3A2B] bg-white dark:bg-[#1C221A] text-xs font-serif focus:outline-hidden focus:ring-2 focus:ring-[#B5451B] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          )}
        </div>

        {/* 23 Languages Sequential Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-8">
          {filteredLanguages.map((lang) => {
            const isSelected = selectedLang === lang.code;
            // Original 1-based index in the exact 23 sequence
            const sequentialNumber =
              ONBOARDING_LANGUAGES.findIndex((l) => l.code === lang.code) + 1;
            const isThisCardPlaying = isSelected && isPlayingAudio;

            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleCardClick(lang)}
                className={`relative rounded-2xl p-3.5 text-left flex flex-col justify-between transition-all duration-200 border-2 cursor-pointer group ${
                  isSelected
                    ? 'bg-[#FAF6EE] dark:bg-[#1F271C] border-[#B5451B] shadow-md ring-2 ring-[#B5451B]/20 scale-[1.01]'
                    : 'bg-white dark:bg-[#1C221A] border-[#22331E]/15 dark:border-[#2D3A2B] hover:border-[#B5451B]/50 hover:shadow-xs'
                }`}
              >
                {/* Card Top: Number & Active Tick / Audio Preview */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                        isSelected
                          ? 'bg-[#B5451B] text-white'
                          : 'bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60'
                      }`}
                    >
                      #{sequentialNumber}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Speaker trigger button */}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCardClick(lang);
                      }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        isThisCardPlaying
                          ? 'bg-[#B5451B] text-white scale-110 shadow-xs'
                          : 'hover:bg-[#B5451B]/15 hover:text-[#B5451B] text-black/50 dark:text-white/50'
                      }`}
                      title={`Listen in ${lang.englishName}`}
                      aria-label={`Listen in ${lang.englishName}`}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {isThisCardPlaying ? 'graphic_eq' : 'volume_up'}
                      </span>
                    </span>

                    {/* Selected Checkmark Badge */}
                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-[#B5451B] text-white flex items-center justify-center shadow-xs">
                        <span className="material-symbols-outlined text-sm font-bold">check</span>
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border border-black/15 dark:border-white/15 group-hover:border-[#B5451B]/40" />
                    )}
                  </div>
                </div>

                {/* Card Middle: Native Script Name (Prominent Display) */}
                <div className="mt-1">
                  <h3
                    className={`font-serif font-black text-lg sm:text-xl tracking-tight leading-snug ${
                      isSelected
                        ? 'text-[#B5451B] dark:text-[#FFA680]'
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
            className="w-full py-4 bg-[#B5451B] hover:bg-[#9C3A14] text-white font-serif font-bold text-base rounded-full shadow-artisan active:scale-95 transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>{activeMeta.continueButton}</span>
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
