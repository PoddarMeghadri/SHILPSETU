import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { sound } from '../../services/sound';
import { ShilpSetuLogo } from '../common/ShilpSetuLogo';
import { INDIAN_STATES_AND_CITIES } from '../../data/indianLocations';
import { LanguageCode } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageSelectionScreen } from './LanguageSelectionScreen';
import { CRAFT_OPTIONS, getLocalizedCraftName, getEnterWorkshopLabel } from '../../data/crafts';

export interface OnboardingUserData {
  fullName: string;
  gender: 'male' | 'female' | 'other';
  state: string;
  city: string;
  mobile: string;
  email?: string;
  selectedCraft: string;
  selectedLanguage?: LanguageCode;
}

interface OnboardingFlowProps {
  onComplete: (data: OnboardingUserData) => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  onSetTheme?: (theme: 'light' | 'dark') => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  onComplete,
  isDark = false,
  onToggleTheme,
  onSetTheme,
}) => {
  const { language, setLanguage, t } = useLanguage();

  // Step 0: Splash / Logo Center Screen
  // Step 1: Personal Details (Full Name*, Mobile*, Email)
  // Step 2: 6-Digit Mock OTP Authorization
  // Step 3: Language Selection Screen (New)
  // Step 4: Craft Selection ('What is your heritage craft?')
  const [currentStep, setCurrentStep] = useState<number>(0);

  // User form data - initialized blank for user input
  const [fullName, setFullName] = useState<string>('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [customCity, setCustomCity] = useState<string>('');
  const [mobile, setMobile] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [selectedCraft, setSelectedCraft] = useState<string>('pottery');

  // Form errors
  const [nameError, setNameError] = useState<string>('');
  const [stateError, setStateError] = useState<string>('');
  const [cityError, setCityError] = useState<string>('');
  const [mobileError, setMobileError] = useState<string>('');

  // Available cities based on selected state
  const availableCities =
    INDIAN_STATES_AND_CITIES.find((s) => s.state === selectedState)?.cities || [];

  // 6-digit OTP state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState<string>('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto focus first OTP input when reaching OTP step
  useEffect(() => {
    if (currentStep === 2) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [currentStep]);

  // Handle personal details submission
  const handleProceedToOtp = (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;

    if (!fullName.trim()) {
      setNameError('Full name is mandatory');
      valid = false;
    } else {
      setNameError('');
    }

    if (!selectedState) {
      setStateError('Please select your state');
      valid = false;
    } else {
      setStateError('');
    }

    const effectiveCity = selectedCity === 'Other' ? customCity.trim() : selectedCity;
    if (!effectiveCity) {
      setCityError('Please select or specify your city');
      valid = false;
    } else {
      setCityError('');
    }

    const cleanMobile = mobile.replace(/\D/g, '');
    if (!cleanMobile || cleanMobile.length < 10) {
      setMobileError('Valid 10-digit mobile number is mandatory');
      valid = false;
    } else {
      setMobileError('');
    }

    if (valid) {
      sound.playTap();
      setCurrentStep(2);
    }
  };

  // Handle OTP digit changes
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pasted = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otpDigits];
      pasted.forEach((char, i) => {
        if (i < 6) newOtp[i] = char;
      });
      setOtpDigits(newOtp);
      const nextIndex = Math.min(pasted.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
      return;
    }

    const digit = value.replace(/\D/g, '');
    const newOtp = [...otpDigits];
    newOtp[index] = digit;
    setOtpDigits(newOtp);
    setOtpError('');

    // Auto advance to next box if digit typed
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Verify OTP
  const handleVerifyOtp = () => {
    const fullOtp = otpDigits.join('');
    if (fullOtp.length < 6) {
      setOtpError('Please enter all 6 digits of the OTP');
      return;
    }

    sound.playSuccess();
    setIsVerifyingOtp(true);

    setTimeout(() => {
      setIsVerifyingOtp(false);
      setCurrentStep(3); // Proceed to craft selection
    }, 600);
  };

  // Final completion
  const handleFinish = () => {
    sound.playSuccess();
    const effectiveCity = selectedCity === 'Other' ? customCity.trim() : selectedCity;
    onComplete({
      fullName: fullName.trim(),
      gender,
      state: selectedState,
      city: effectiveCity,
      mobile: mobile.trim(),
      email: email.trim() || undefined,
      selectedCraft,
      selectedLanguage: language,
    });
  };

  const handleSelectTheme = (theme: 'light' | 'dark') => {
    sound.playTap();
    if (onSetTheme) {
      onSetTheme(theme);
    } else if (onToggleTheme) {
      if ((theme === 'dark' && !isDark) || (theme === 'light' && isDark)) {
        onToggleTheme();
      }
    }
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('shilpsetu_theme', theme);
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto flex flex-col justify-between selection:bg-[#B5451B]/20 transition-colors duration-300 ${
        isDark ? 'bg-[#121411] text-[#F4ECDE]' : 'bg-[#F4ECDE] text-[#1A1815]'
      }`}
    >
      <AnimatePresence mode="wait">
        {/* STEP 0: SPLASH / LOGIN SCREEN (SHILPSETU LOGO AT CENTER AS IN PICTURE) */}
        {currentStep === 0 && (
          <motion.div
            key="splash-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="min-h-screen w-full flex flex-col items-center justify-between p-6 max-w-xl mx-auto relative"
          >
            {/* Top Bar: Light / Dark Mode Toggle Button in Top Right (Like Home Screen Top Bar) */}
            <div className="w-full flex items-center justify-end pt-2 sm:pt-4 px-2 z-20">
              <button
                id="btn-login-theme-toggle"
                type="button"
                onClick={() => {
                  handleSelectTheme(isDark ? 'light' : 'dark');
                }}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-xs border ${
                  isDark
                    ? 'text-[#E8B84B] bg-[#1C221A] hover:bg-[#2D3A2B] border-[#2D3A2B]'
                    : 'text-[#22331E] bg-[#EFE4CF]/80 hover:bg-[#EAE0CC] border-[#22331E]/10'
                }`}
                title={isDark ? t('switch_light_mode', 'Switch to Light Mode') : t('switch_dark_mode', 'Switch to Dark Mode')}
                aria-label={isDark ? t('switch_light_mode', 'Switch to Light Mode') : t('switch_dark_mode', 'Switch to Dark Mode')}
              >
                <span className="material-symbols-outlined text-lg">
                  {isDark ? 'light_mode' : 'dark_mode'}
                </span>
              </button>
            </div>

            {/* Center ShilpSetu Brand Card */}
            <div className="flex flex-col items-center text-center my-auto py-6">
              {/* ShilpSetu Logo Emblem */}
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6, type: 'spring' }}
                className="w-64 h-64 md:w-72 md:h-72 rounded-full relative p-3 shadow-2xl flex items-center justify-center overflow-hidden mb-6"
                style={{
                  background: 'radial-gradient(circle, #FAF6EE 0%, #F5ECDD 100%)',
                  border: '2px solid rgba(212, 167, 89, 0.4)',
                }}
              >
                <ShilpSetuLogo size="2xl" className="w-full h-full" />
              </motion.div>

              {/* Title & Tagline matching provided image */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="space-y-2.5"
              >
                <h1 className="font-serif font-black text-3xl md:text-4xl text-[#B5451B] tracking-wider uppercase">
                  SHILPSETU
                </h1>
                <p
                  className={`font-sans font-bold text-xs md:text-sm tracking-[0.18em] uppercase max-w-xs leading-relaxed ${
                    isDark ? 'text-[#E8B84B]' : 'text-[#22331E]'
                  }`}
                >
                  CONNECTING INDIA'S ARTISANS, PRESERVING HERITAGE
                </p>
                <p
                  className={`font-serif italic text-xs mt-1 ${
                    isDark ? 'text-[#FFA680]' : 'text-[#872E0E]'
                  }`}
                >
                  "हर हाथ की अपनी पहचान • Har Haath Ki Kahani"
                </p>
              </motion.div>
            </div>

            {/* Bottom Continue Action */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="w-full pb-6"
            >
              <button
                id="btn-login-get-started"
                onClick={() => {
                  sound.playTap();
                  setCurrentStep(1);
                }}
                className="w-full py-4 bg-[#B5451B] hover:bg-[#9C3A14] text-white font-serif font-bold text-base rounded-full shadow-artisan active:scale-95 transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>Get Started</span>
                <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* STEP 1: PERSONAL DETAILS (FULL NAME*, MOBILE NUMBER*, EMAIL ADDRESS) */}
        {currentStep === 1 && (
          <motion.div
            key="details-screen"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen w-full flex flex-col justify-between p-6 max-w-xl md:max-w-2xl mx-auto"
          >
            <div>
              {/* Header */}
              <div className="flex items-center gap-3 pt-2 mb-6">
                <button
                  onClick={() => {
                    sound.playTap();
                    setCurrentStep(0);
                  }}
                  className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-sm"
                >
                  <span className="material-symbols-outlined text-lg">arrow_back</span>
                </button>
                <div className="flex items-center gap-2">
                  <ShilpSetuLogo size="xs" />
                  <span className="font-serif font-bold text-base text-[#B5451B]">
                    SHILPSETU
                  </span>
                </div>
              </div>

              <div className="mb-6">
                <h2 className="font-serif font-bold text-2xl text-[#1A1815] dark:text-[#F4ECDE] mb-1">
                  Artisan Registration
                </h2>
                <p className="text-xs text-black/70 dark:text-white/70 font-sans">
                  Please provide your personal details to create your verified artisan profile.
                </p>
              </div>

              {/* Form Fields */}
              <form onSubmit={handleProceedToOtp} className="space-y-4">
                {/* Full Name (MANDATORY) */}
                <div>
                  <label className="block text-xs font-bold font-serif uppercase tracking-wider text-[#B5451B] mb-1.5">
                    Full Name / पूरा नाम <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-3 text-[#B5451B] text-lg">
                      person
                    </span>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (nameError) setNameError('');
                      }}
                      placeholder="Enter your full name"
                      className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-sm font-serif focus:outline-hidden focus:ring-2 focus:ring-[#B5451B] transition-all ${
                        nameError
                          ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                          : 'border-[#22331E]/20 dark:border-[#2D3A2B] bg-white dark:bg-[#1C221A]'
                      }`}
                    />
                  </div>
                  {nameError && (
                    <p className="text-[11px] text-red-500 mt-1 font-medium">{nameError}</p>
                  )}
                </div>

                {/* Gender Selection: Male, Female, Others */}
                <div>
                  <label className="block text-xs font-bold font-serif uppercase tracking-wider text-[#B5451B] mb-1.5">
                    Gender / लिंग <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'male', label: 'Male', hindi: 'पुरुष', icon: 'male' },
                      { id: 'female', label: 'Female', hindi: 'महिला', icon: 'female' },
                      { id: 'other', label: 'Others', hindi: 'अन्य', icon: 'transgender' },
                    ].map((g) => {
                      const isSelected = gender === g.id;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            sound.playTap();
                            setGender(g.id as 'male' | 'female' | 'other');
                          }}
                          className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl border text-xs font-serif transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#B5451B] text-white border-[#B5451B] shadow-md scale-[1.02]'
                              : isDark
                              ? 'bg-[#1C221A] border-[#2D3A2B] text-white/80 hover:bg-[#252E22]'
                              : 'bg-white border-[#22331E]/20 text-[#1A1815] hover:bg-[#FAF4E8]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-xl mb-0.5">{g.icon}</span>
                          <span className="font-bold">{g.label}</span>
                          <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'opacity-60'}`}>
                            {g.hindi}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* State & City / Craft Cluster (MANDATORY - USER SELECTED) */}
                <div className="space-y-3 p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-[#22331E]/10 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-serif uppercase tracking-wider text-[#B5451B] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">location_on</span>
                      <span>Artisan Location / स्थान</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#B5451B]/10 text-[#B5451B]">
                      Mandatory
                    </span>
                  </div>

                  {/* 1. State Selector */}
                  <div>
                    <label className="block text-[11px] font-medium opacity-80 mb-1">
                      State / राज्य <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#B5451B] text-base pointer-events-none">
                        travel_explore
                      </span>
                      <select
                        required
                        value={selectedState}
                        onChange={(e) => {
                          const newState = e.target.value;
                          setSelectedState(newState);
                          setSelectedCity('');
                          setCustomCity('');
                          if (stateError) setStateError('');
                          if (cityError) setCityError('');
                        }}
                        className={`w-full pl-9 pr-8 py-2.5 rounded-xl border text-xs font-serif appearance-none focus:outline-hidden focus:ring-2 focus:ring-[#B5451B] transition-all ${
                          stateError
                            ? 'border-red-500 bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-200'
                            : isDark
                            ? 'bg-[#121411] border-[#2D3A2B] text-white'
                            : 'bg-white border-[#22331E]/20 text-[#1A1815]'
                        }`}
                      >
                        <option value="">-- Select Your State / राज्य चुनें --</option>
                        {INDIAN_STATES_AND_CITIES.map((s) => (
                          <option key={s.state} value={s.state}>
                            {s.state}
                          </option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-xs opacity-60 pointer-events-none">
                        arrow_drop_down
                      </span>
                    </div>
                    {stateError && (
                      <p className="text-[11px] text-red-500 mt-1 font-medium">{stateError}</p>
                    )}
                  </div>

                  {/* 2. City Selector */}
                  <div>
                    <label className="block text-[11px] font-medium opacity-80 mb-1">
                      City / शहर <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#B5451B] text-base pointer-events-none">
                        location_city
                      </span>
                      <select
                        required
                        disabled={!selectedState}
                        value={selectedCity}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedCity(val);
                          if (val !== 'Other') setCustomCity('');
                          if (cityError) setCityError('');
                        }}
                        className={`w-full pl-9 pr-8 py-2.5 rounded-xl border text-xs font-serif appearance-none focus:outline-hidden focus:ring-2 focus:ring-[#B5451B] transition-all disabled:opacity-50 ${
                          cityError
                            ? 'border-red-500 bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-200'
                            : isDark
                            ? 'bg-[#121411] border-[#2D3A2B] text-white'
                            : 'bg-white border-[#22331E]/20 text-[#1A1815]'
                        }`}
                      >
                        <option value="">
                          {selectedState
                            ? '-- Select City / शहर चुनें --'
                            : '-- First select state above --'}
                        </option>
                        {availableCities.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                        {selectedState && (
                          <option value="Other">Other / अन्य (Type your city / village)</option>
                        )}
                      </select>
                      <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-xs opacity-60 pointer-events-none">
                        arrow_drop_down
                      </span>
                    </div>

                    {/* Custom City input if 'Other' selected */}
                    {selectedCity === 'Other' && (
                      <div className="mt-2 relative">
                        <span className="material-symbols-outlined absolute left-3 top-2 text-[#B5451B] text-sm pointer-events-none">
                          edit_location
                        </span>
                        <input
                          type="text"
                          required
                          value={customCity}
                          onChange={(e) => {
                            setCustomCity(e.target.value);
                            if (cityError) setCityError('');
                          }}
                          placeholder="Type your city or village name"
                          className={`w-full pl-8 pr-3 py-2 rounded-xl border text-xs font-serif focus:outline-hidden focus:ring-2 focus:ring-[#B5451B] ${
                            isDark
                              ? 'bg-[#121411] border-[#2D3A2B] text-white'
                              : 'bg-white border-[#22331E]/20 text-[#1A1815]'
                          }`}
                        />
                      </div>
                    )}

                    {cityError && (
                      <p className="text-[11px] text-red-500 mt-1 font-medium">{cityError}</p>
                    )}
                  </div>
                </div>

                {/* Mobile Number (MANDATORY) */}
                <div>
                  <label className="block text-xs font-bold font-serif uppercase tracking-wider text-[#B5451B] mb-1.5">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="px-3.5 py-3 rounded-2xl border border-[#22331E]/20 dark:border-[#2D3A2B] bg-white dark:bg-[#1C221A] text-sm font-bold flex items-center gap-1 shrink-0">
                      <span>🇮🇳</span>
                      <span className="font-mono text-xs">+91</span>
                    </div>
                    <div className="relative flex-1">
                      <span className="material-symbols-outlined absolute left-3.5 top-3 text-[#B5451B] text-lg">
                        phone_iphone
                      </span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={mobile}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setMobile(val);
                          if (mobileError) setMobileError('');
                        }}
                        placeholder="Enter 10-digit mobile number"
                        className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-sm font-mono tracking-wider focus:outline-hidden focus:ring-2 focus:ring-[#B5451B] transition-all ${
                          mobileError
                            ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                            : 'border-[#22331E]/20 dark:border-[#2D3A2B] bg-white dark:bg-[#1C221A]'
                        }`}
                      />
                    </div>
                  </div>
                  {mobileError ? (
                    <p className="text-[11px] text-red-500 mt-1 font-medium">{mobileError}</p>
                  ) : (
                    <p className="text-[10px] text-black/60 dark:text-white/60 mt-1">
                      We will send a 6-digit OTP to this number.
                    </p>
                  )}
                </div>

                {/* Email Address (OPTIONAL) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold font-serif uppercase tracking-wider text-[#B5451B]">
                      Email Address
                    </label>
                    <span className="text-[10px] text-black/50 dark:text-white/50 font-sans uppercase">
                      (Optional)
                    </span>
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-3 text-[#B5451B] text-lg">
                      mail
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email address (optional)"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#22331E]/20 dark:border-[#2D3A2B] bg-white dark:bg-[#1C221A] text-sm font-sans focus:outline-hidden focus:ring-2 focus:ring-[#B5451B] transition-all"
                    />
                  </div>
                </div>

                {/* Trust & Security Badge */}
                <div className="p-3.5 rounded-2xl bg-[#22331E]/10 dark:bg-[#2D3A2B]/40 border border-[#22331E]/15 flex items-center gap-2.5 mt-4">
                  <span className="material-symbols-outlined text-[#2E4638] dark:text-[#88C498] text-xl">
                    verified_user
                  </span>
                  <p className="text-[11px] leading-snug text-[#22331E] dark:text-[#E8B84B]">
                    Your data is secured and linked to your Artisan GeM & Udyam registration ID.
                  </p>
                </div>
              </form>
            </div>

            {/* Bottom Button */}
            <div className="pt-6 pb-4">
              <button
                type="button"
                onClick={handleProceedToOtp}
                className="w-full py-4 bg-[#B5451B] hover:bg-[#9C3A14] text-white font-serif font-bold text-base rounded-full shadow-artisan active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>Continue to OTP Verification</span>
                <span className="material-symbols-outlined text-lg">sms</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: 6-DIGIT OTP AUTHORIZATION PAGE */}
        {currentStep === 2 && (
          <motion.div
            key="otp-screen"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen w-full flex flex-col justify-between p-6 max-w-xl mx-auto"
          >
            <div>
              {/* Back button and header */}
              <div className="flex items-center gap-3 pt-2 mb-6">
                <button
                  onClick={() => {
                    sound.playTap();
                    setCurrentStep(1);
                  }}
                  className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-sm"
                >
                  <span className="material-symbols-outlined text-lg">arrow_back</span>
                </button>
                <div className="flex items-center gap-2">
                  <ShilpSetuLogo size="xs" />
                  <span className="font-serif font-bold text-base text-[#B5451B]">
                    SHILPSETU AUTH
                  </span>
                </div>
              </div>

              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-[#B5451B]/15 text-[#B5451B] flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <span className="material-symbols-outlined text-3xl">lock</span>
                </div>
                <h2 className="font-serif font-bold text-2xl mb-1">
                  6-Digit OTP Verification
                </h2>
                <p className="text-xs text-black/70 dark:text-white/70 font-sans max-w-xs mx-auto">
                  Enter the 6-digit OTP sent to{' '}
                  <span className="font-mono font-bold text-[#B5451B]">
                    +91 {mobile || 'XXXXXXXXXX'}
                  </span>
                </p>
              </div>

              {/* 6 Digit Input Boxes */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-between gap-2 max-w-xs mx-auto">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleVerifyOtp();
                        } else {
                          handleOtpKeyDown(idx, e);
                        }
                      }}
                      className={`w-12 h-14 text-center font-mono font-black text-xl rounded-2xl border-2 transition-all focus:outline-hidden focus:scale-105 ${
                        digit
                          ? 'border-[#B5451B] bg-white dark:bg-[#1C221A] text-[#B5451B] shadow-sm'
                          : 'border-[#22331E]/20 dark:border-[#2D3A2B] bg-white dark:bg-[#1C221A]'
                      }`}
                    />
                  ))}
                </div>

                {otpError && (
                  <p className="text-center text-xs text-red-500 font-medium">{otpError}</p>
                )}
              </div>
            </div>

            {/* Bottom Verify Button */}
            <div className="pt-4 pb-4">
              <button
                type="button"
                disabled={isVerifyingOtp}
                onClick={handleVerifyOtp}
                className="w-full py-4 bg-[#B5451B] hover:bg-[#9C3A14] text-white font-serif font-bold text-base rounded-full shadow-artisan active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isVerifyingOtp ? (
                  <>
                    <span className="material-symbols-outlined text-lg animate-spin">
                      progress_activity
                    </span>
                    <span>Verifying OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Continue</span>
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: LANGUAGE SELECTION (NEW STEP) */}
        {currentStep === 3 && (
          <LanguageSelectionScreen
            initialLanguage="en"
            onSelectLanguage={(newLang) => {
              setLanguage(newLang);
              setCurrentStep(4);
            }}
            onBack={() => {
              sound.playTap();
              setCurrentStep(2);
            }}
            isDark={isDark}
          />
        )}

        {/* STEP 4: CRAFT SELECTION */}
        {currentStep === 4 && (
          <motion.div
            key="craft-selection"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen w-full bg-[#F4ECDE] dark:bg-[#121411] text-[#1A1815] dark:text-[#F4ECDE] flex flex-col justify-between p-4 sm:p-6 max-w-xl md:max-w-2xl mx-auto"
          >
            <div>
              {/* Top Navigation & Stepper Header */}
              <div className="flex items-center justify-between pt-2 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setCurrentStep(3);
                  }}
                  className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 hover:bg-[#B5451B]/10 hover:text-[#B5451B] flex items-center justify-center text-sm transition-colors"
                  title="Back to language selection"
                  aria-label="Back to language selection"
                >
                  <span className="material-symbols-outlined text-lg">arrow_back</span>
                </button>
                <div className="flex items-center gap-2">
                  <ShilpSetuLogo size="xs" isDark={isDark} />
                  <span className="font-serif font-bold text-sm sm:text-base tracking-tight text-[#B5451B]">
                    SHILPSETU
                  </span>
                </div>
              </div>

              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-[#B5451B] text-[#FFEBB3] flex items-center justify-center mx-auto mb-3 shadow-md">
                  <span className="material-symbols-outlined text-2xl">interests</span>
                </div>
                <h2 className="font-serif font-bold text-2xl mb-1 text-[#22331E] dark:text-[#F4ECDE]">
                  {t('what_is_your_craft', 'What is your heritage craft?')}
                </h2>
                <p className="text-xs opacity-75 font-sans">
                  Welcome <strong className="text-[#B5451B]">{fullName}</strong>! Select your craft to personalize your AI Studio.
                </p>
              </div>

              {/* 6 Craft Options Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 mb-6">
                {CRAFT_OPTIONS.map((craft) => {
                  const isSelected = selectedCraft === craft.id;
                  const localizedName = getLocalizedCraftName(craft.id, language);

                  return (
                    <button
                      key={craft.id}
                      type="button"
                      onClick={() => {
                        sound.playTap();
                        setSelectedCraft(craft.id);
                      }}
                      className={`relative rounded-2xl p-3 flex flex-col items-center text-center transition-all duration-200 border-2 overflow-hidden group cursor-pointer ${
                        isSelected
                          ? 'bg-[#EAE0CC] dark:bg-[#1C221A] border-[#B5451B] shadow-lg scale-[1.02]'
                          : 'bg-white dark:bg-[#1C221A]/60 border-[#22331E]/15 dark:border-[#2D3A2B] hover:border-[#E8B84B]'
                      }`}
                    >
                      {/* Thumbnail Image */}
                      <div className="w-full h-20 rounded-xl overflow-hidden mb-2 relative">
                        <img
                          src={craft.image}
                          alt={craft.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#B5451B] text-white flex items-center justify-center shadow-md">
                            <span className="material-symbols-outlined text-sm font-bold">
                              check
                            </span>
                          </div>
                        )}
                      </div>

                      <h4 className="font-serif font-bold text-xs leading-tight text-[#1A1815] dark:text-[#F4ECDE]">
                        {craft.name}
                      </h4>
                      <p className="text-[10px] text-[#B5451B] dark:text-[#FFA680] font-serif font-medium mt-0.5">
                        {localizedName}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Action: Enter Workshop */}
            <div className="pt-2 pb-4">
              <button
                type="button"
                onClick={handleFinish}
                className="w-full bg-[#B5451B] hover:bg-[#9C3A14] text-white font-serif font-bold text-base py-4 rounded-full shadow-artisan transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{getEnterWorkshopLabel(language)}</span>
                <span className="material-symbols-outlined text-xl">store</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
