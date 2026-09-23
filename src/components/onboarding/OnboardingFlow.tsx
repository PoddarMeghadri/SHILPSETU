import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { sound } from '../../services/sound';
import { ShilpSetuLogo } from '../common/ShilpSetuLogo';
import { INDIAN_STATES_AND_CITIES } from '../../data/indianLocations';
import { LanguageCode } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useAdminMode } from '../../context/AdminModeContext';
import { LanguageSelectionScreen } from './LanguageSelectionScreen';
import { CRAFT_OPTIONS, getLocalizedCraftName, getEnterWorkshopLabel } from '../../data/crafts';
import {
  sendSupabaseOtp,
  verifySupabaseOtp,
  upsertSupabaseProfile,
  getSupabase,
  signInSupabaseWithEmailOrMobile,
  findProfileByIdentifier,
  updateSupabasePassword,
  checkAccountUniqueness,
} from '../../services/supabase';
import { validatePassword, passwordsMatch, passwordStrength, PASSWORD_MAX_LENGTH } from '../../services/passwordValidation';
import { ForgotPasswordFlow } from './ForgotPasswordFlow';
import {
  clearPhoneRecaptcha,
  sendFirebasePhoneOtp,
} from '../../services/firebase';
import { formatToE164, maskPhone, maskEmail } from '../../utils/phoneUtils';
import { DualOtpVerificationModal } from '../DualOtpVerificationModal';

export interface OnboardingUserData {
  fullName: string;
  gender: 'male' | 'female' | 'other';
  state: string;
  city: string;
  mobile: string;
  email?: string;
  password?: string;
  selectedCraft: string;
  selectedLanguage?: LanguageCode;
}

interface OnboardingFlowProps {
  onComplete: (data: OnboardingUserData) => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  onSetTheme?: (theme: 'light' | 'dark') => void;
}

const cleanAuthError = (raw: string): string => {
  if (!raw) return '';
  let cleaned = raw
    .replace(/Firebase:\s*Error\s*\([^)]*\)\.?/gi, '')
    .replace(/Firebase/gi, '')
    .replace(/Supabase/gi, '')
    .replace(/\(auth\/[a-z0-9-_]+\)/gi, '')
    .trim();
  if (!cleaned) return 'Verification service is temporarily unavailable. Please verify via email or try again.';
  return cleaned;
};

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  onComplete,
  isDark = false,
  onToggleTheme,
  onSetTheme,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { isAdminMode, enterAdminMode, exitAdminMode } = useAdminMode();

  // Admin Mode Prompt Modal State
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [adminCodeInput, setAdminCodeInput] = useState<string>('');
  const [adminCodeError, setAdminCodeError] = useState<string>('');
  const [showAdminCodePassword, setShowAdminCodePassword] = useState<boolean>(false);

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
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [signInIdentifier, setSignInIdentifier] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInError, setSignInError] = useState('');
  const [signInEmail, setSignInEmail] = useState('');
  // Sign-in accepts either a registered email or mobile number, then requires
  // the account password before sending the verification OTP.
  const signInOtpOnly = false;

  // Clerk Auth Hooks

  // Form errors
  const [nameError, setNameError] = useState<string>('');
  const [stateError, setStateError] = useState<string>('');
  const [cityError, setCityError] = useState<string>('');
  const [mobileError, setMobileError] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');

  // Clerk Auth Flow & Cooldown State
  const [authFlowMode, setAuthFlowMode] = useState<'sign_up' | 'sign_in' | 'forgot_password' | 'backend'>('sign_up');
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Available cities based on selected state
  const availableCities =
    INDIAN_STATES_AND_CITIES.find((s) => s.state === selectedState)?.cities || [];

  // Flexible 6-digit numeric OTP code support
  const [otpLength] = useState<number>(6);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState<string>('');
  const [resendNotice, setResendNotice] = useState<string>('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [showSignInPassword, setShowSignInPassword] = useState<boolean>(false);
  const [otpChannel, setOtpChannel] = useState<'sms' | 'email'>('sms');
  const [phoneConfirmation, setPhoneConfirmation] = useState<{
    confirm: (code: string) => Promise<unknown>;
  } | null>(null);
  const [pendingSignInData, setPendingSignInData] = useState<{
    user?: any;
    session?: any;
    profile?: any;
    identifier?: string;
    targetEmail?: string;
  } | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Listen for Supabase authenticated session (e.g., if user clicked an email link)
  useEffect(() => {
    const client = getSupabase();
    if (!client) return;

    client.auth.getSession().then(({ data }) => {
      if (data?.session?.user) {
        const supaUser = data.session.user;
        const supaEmail = supaUser.email || '';
        if (supaEmail) {
          setEmail(supaEmail);
          localStorage.setItem('shilpsetu_token', data.session.access_token);
        }
      }
    }).catch(console.warn);

    const { data: authSub } = client.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        const supaEmail = session.user.email || '';
        if (supaEmail) {
          setEmail(supaEmail);
          localStorage.setItem('shilpsetu_token', session.access_token);
        }
      }
    });

    return () => {
      authSub?.subscription?.unsubscribe();
    };
  }, []);

  // Auto focus first OTP input when reaching OTP step
  useEffect(() => {
    if (currentStep === 2) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [currentStep]);

  useEffect(() => () => clearPhoneRecaptcha(), []);

  // Resend code countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Handle personal details submission and initiate Clerk Email OTP
  const handleProceedToOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authFlowMode === 'sign_in') {
      const identifier = signInIdentifier.trim();
      if (!identifier || (!signInOtpOnly && !signInPassword)) {
        setSignInError(signInOtpOnly
          ? 'Enter your registered email or mobile number.'
          : 'Enter your registered email or mobile number and password.');
        return;
      }
      setIsSendingOtp(true);
      setSignInError('');
      localStorage.setItem('shilpsetu_pending_signin_otp', 'true');

      if (signInOtpOnly) {
        const lookup = await findProfileByIdentifier(identifier);
        if (!lookup.profile) {
          setSignInError(lookup.error || 'No registered account was found with those details.');
          setIsSendingOtp(false);
          localStorage.removeItem('shilpsetu_pending_signin_otp');
          return;
        }
        const profile = lookup.profile;
        const targetEmail = String(profile.email || (identifier.includes('@') ? identifier : '')).toLowerCase();
        const registeredMobile = profile.mobile_number || (!identifier.includes('@') ? identifier : '');
        let sent = false;
        if (registeredMobile) {
          const smsResult = await sendFirebasePhoneOtp(registeredMobile);
          if (smsResult.sent && smsResult.confirmation) {
            setOtpChannel('sms');
            setPhoneConfirmation(smsResult.confirmation);
            sent = true;
          }
        }
        if (!sent) {
          const emailResult = await sendSupabaseOtp(targetEmail, false);
          if (!emailResult.sent) {
            setSignInError(emailResult.error || 'Unable to send a verification code.');
            setIsSendingOtp(false);
            localStorage.removeItem('shilpsetu_pending_signin_otp');
            return;
          }
          setOtpChannel('email');
          setPhoneConfirmation(null);
        }
        setPendingSignInData({ profile, identifier, targetEmail });
        setEmail(targetEmail);
        setMobile(String(registeredMobile || ''));
        setFullName(profile.full_name || 'Master Artisan');
        setOtpDigits(['', '', '', '', '', '']);
        setResendCooldown(30);
        setResendNotice(sent ? 'A 6-digit verification code was sent by SMS.' : 'A 6-digit verification code was sent to your email.');
        setCurrentStep(2);
        setIsSendingOtp(false);
        return;
      }

      // Admin bypass mode
      if (isAdminMode) {
        const targetEmail = identifier.includes('@') ? identifier.toLowerCase() : 'admin@shilpsetu.in';
        setEmail(targetEmail);
        setOtpDigits(['', '', '', '', '', '']);
        setResendCooldown(30);
        setResendNotice('Admin Mode: Network calls bypassed.');
        setCurrentStep(2);
        setIsSendingOtp(false);
        sound.playSuccess();
        return;
      }

      try {
        // 1. Verify credentials with Supabase password sign-in
        let supabaseSuccess = false;
        let supabaseUser: any = null;
        let supabaseSession: any = null;
        let supabaseProfile: any = null;
        try {
          const sbResult = await signInSupabaseWithEmailOrMobile(identifier, signInPassword);
          if (sbResult.signedIn) {
            supabaseSuccess = true;
            supabaseUser = sbResult.user;
            supabaseSession = sbResult.session;
            supabaseProfile = sbResult.profile;
          } else if (sbResult.isEmailNotConfirmed) {
            sound.playError();
            setSignInError(sbResult.error || 'Your email is not yet confirmed. Please verify the code sent to your email.');
            setIsSendingOtp(false);
            localStorage.removeItem('shilpsetu_pending_signin_otp');
            return;
          } else {
            sound.playError();
            setSignInError(sbResult.error || 'The email/mobile number or password is incorrect.');
            setIsSendingOtp(false);
            localStorage.removeItem('shilpsetu_pending_signin_otp');
            return;
          }
        } catch (sbErr: any) {
          console.warn('[Supabase Sign In Notice]:', sbErr);
          sound.playError();
          setSignInError(sbErr?.message || 'The email/mobile number or password is incorrect.');
          setIsSendingOtp(false);
          localStorage.removeItem('shilpsetu_pending_signin_otp');
          return;
        }

        if (!supabaseSuccess) {
          sound.playError();
          setSignInError('The email/mobile number or password is incorrect.');
          setIsSendingOtp(false);
          localStorage.removeItem('shilpsetu_pending_signin_otp');
          return;
        }

        // 2. Resolve registered mobile number (First option) and email address (Fallback)
        let registeredMobile = (
          supabaseProfile?.mobile_number ||
          (!identifier.includes('@') ? identifier.replace(/\D/g, '') : '') ||
          ''
        ).trim();

        if (!registeredMobile) {
          const profileLookup = await findProfileByIdentifier(identifier);
          registeredMobile = profileLookup.profile?.mobile_number || '';
          if (profileLookup.profile && !supabaseProfile) {
            supabaseProfile = profileLookup.profile;
          }
        }

        const targetEmail = (
          supabaseProfile?.email ||
          (identifier.includes('@') ? identifier.trim().toLowerCase() : supabaseUser?.email) ||
          ''
        ).trim().toLowerCase();

        // 3. FIRST OPTION: Send 6-digit OTP through mobile number verification (SMS)
        let sentBySms = false;
        let smsErrorMessage = '';
        let smsDemoOtp = '';
        if (registeredMobile && registeredMobile.replace(/\D/g, '').length >= 10) {
          const smsResult = await sendFirebasePhoneOtp(registeredMobile);
          if (smsResult.sent && smsResult.confirmation) {
            sentBySms = true;
            setOtpChannel('sms');
            setPhoneConfirmation(smsResult.confirmation);
            if (smsResult.demoOtp) smsDemoOtp = smsResult.demoOtp;
          } else {
            smsErrorMessage = smsResult.error || '';
          }
        }

        // FALLBACK: Verify through email if mobile SMS was not sent or is unavailable
        if (!sentBySms) {
          if (!targetEmail) {
            sound.playError();
            setSignInError(
              smsErrorMessage || 'Unable to send SMS verification code and no registered email is associated with this account.'
            );
            setIsSendingOtp(false);
            localStorage.removeItem('shilpsetu_pending_signin_otp');
            return;
          }
          const emailResult = await sendSupabaseOtp(targetEmail, false);
          if (!emailResult.sent) {
            sound.playError();
            setSignInError(emailResult.error || smsErrorMessage || 'Unable to send a verification code.');
            setIsSendingOtp(false);
            localStorage.removeItem('shilpsetu_pending_signin_otp');
            return;
          }
          setOtpChannel('email');
          setPhoneConfirmation(null);
        }

        // 4. Stash sign-in metadata and transition to 6-digit OTP verification screen
        setPendingSignInData({
          user: supabaseUser,
          session: supabaseSession,
          profile: supabaseProfile,
          identifier,
          targetEmail,
        });

        const artisanName =
          supabaseProfile?.full_name ||
          supabaseUser?.user_metadata?.full_name ||
          'Master Artisan';
        const artisanMobile =
          supabaseProfile?.mobile_number ||
          (!identifier.includes('@') ? identifier : '') ||
          '';

        setFullName(artisanName);
        setEmail(targetEmail);
        setMobile(artisanMobile);

        sound.playSuccess();
        setIsSendingOtp(false);
        setResendCooldown(30);
        setResendNotice(
          sentBySms
            ? smsDemoOtp
              ? `A 6-digit verification code was sent by SMS. (Test OTP: ${smsDemoOtp})`
              : 'A 6-digit verification code was sent by SMS.'
            : 'A 6-digit verification code was sent to your email.'
        );
        setOtpDigits(['', '', '', '', '', '']);
        setOtpError('');
        setCurrentStep(2);
        return;
      } catch (error: any) {
        sound.playError();
        setSignInError(error.message || 'Unable to sign in. Please try again.');
      } finally {
        setIsSendingOtp(false);
      }
      return;
    }
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

    // Strictly mandatory Email ID validation
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail) {
      setEmailError('Email address is strictly mandatory for artisan verification');
      valid = false;
    } else if (!emailRegex.test(cleanEmail)) {
      setEmailError('Please enter a valid email address (e.g. artisan@craft.in)');
      valid = false;
    } else {
      setEmailError('');
    }

    const passwordValidation = !isAdminMode ? validatePassword(password) : null;
    if (passwordValidation) {
      setPasswordError(passwordValidation);
      valid = false;
    } else if (!isAdminMode && !passwordsMatch(password, passwordConfirmation)) {
      setPasswordError('Passwords do not match.');
      valid = false;
    } else {
      setPasswordError('');
    }

    if (!valid) {
      return;
    }

    sound.playTap();

    // Isolated Mock Auth: In Admin Mode, completely bypass all calls to Clerk and Supabase auth APIs
    if (isAdminMode) {
      setIsSendingOtp(false);
      setOtpError('');
      setEmailError('');
      setOtpDigits(['', '', '', '', '', '']);
      setResendNotice('Admin Mode: Network calls bypassed.');
      setCurrentStep(2);
      return;
    }

    setIsSendingOtp(true);
    setOtpError('');
    setEmailError('');

    // Pre-Registration Check: Before initiating Sign-Up or dispatching OTP,
    // verify account uniqueness (1 email & 1 mobile per user)
    try {
      const uniqueness = await checkAccountUniqueness(cleanEmail, cleanMobile);
      if (!uniqueness.unique) {
        setIsSendingOtp(false);
        sound.playError();
        if (uniqueness.field === 'mobile' || uniqueness.error?.includes('mobile')) {
          setMobileError(uniqueness.error || 'An account is already registered with this mobile number. Please sign in.');
        } else {
          setEmailError(uniqueness.error || 'An account is already registered with this email address. Please sign in.');
        }
        return;
      }
    } catch (uniquenessErr: any) {
      console.warn('[Uniqueness Check]:', uniquenessErr);
      setIsSendingOtp(false);
      sound.playError();
      setEmailError(uniquenessErr?.message || 'Verification failed. Please try again.');
      return;
    }

    const smsResult = await sendFirebasePhoneOtp(cleanMobile);
    if (!smsResult.sent || !smsResult.confirmation) {
      const emailResult = await sendSupabaseOtp(cleanEmail, authFlowMode === 'sign_up');
      if (!emailResult.sent) {
        setIsSendingOtp(false);
        setEmailError(emailResult.error || smsResult.error || 'Unable to send your verification code.');
        return;
      }
      setOtpChannel('email');
      setPhoneConfirmation(null);
    } else {
      setOtpChannel('sms');
      setPhoneConfirmation(smsResult.confirmation);
    }
    setIsSendingOtp(false);
    setResendCooldown(30);
    setResendNotice(
      smsResult.sent && smsResult.confirmation
        ? smsResult.demoOtp
          ? `A 6-digit verification code was sent by SMS. (Test OTP: ${smsResult.demoOtp})`
          : 'A 6-digit verification code was sent by SMS.'
        : 'A 6-digit verification code was sent to your email.'
    );
    setOtpDigits(['', '', '', '', '', '']);
    setOtpError('');
    setCurrentStep(2);
    return;
  };

  const switchOtpChannel = async () => {
    if (isSendingOtp) return;
    setIsSendingOtp(true);
    setOtpError('');
    const nextChannel = otpChannel === 'sms' ? 'email' : 'sms';
    let result: { sent: boolean; error?: string } = { sent: false };
    if (nextChannel === 'sms') {
      clearPhoneRecaptcha();
      const smsResult = await sendFirebasePhoneOtp(mobile);
      result = smsResult;
      if (smsResult.sent && smsResult.confirmation) {
        setPhoneConfirmation(smsResult.confirmation);
      }
    } else {
      result = await sendSupabaseOtp(email.trim().toLowerCase(), authFlowMode === 'sign_up');
      setPhoneConfirmation(null);
    }
    setIsSendingOtp(false);
    if (!result.sent) {
      setOtpError(result.error || 'Unable to send a verification code.');
      return;
    }
    setOtpChannel(nextChannel);
    setOtpDigits(['', '', '', '', '', '']);
    setResendCooldown(30);
    setResendNotice(
      nextChannel === 'sms'
        ? ('demoOtp' in result && result.demoOtp)
          ? `A 6-digit code was sent by SMS. (Test OTP: ${result.demoOtp})`
          : 'A 6-digit code was sent by SMS.'
        : 'A 6-digit code was sent to your email.'
    );
  };

  // Resend verification code with cooldown protection
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isSendingOtp) return;
    if (isAdminMode) {
      setResendCooldown(30);
      setResendNotice('Admin Mode: Network calls bypassed.');
      setOtpDigits(['', '', '', '', '', '']);
      return;
    }
    setIsSendingOtp(true);
    setOtpError('');
    const cleanEmail = email.trim().toLowerCase();
    let result: { sent: boolean; demoOtp?: string; error?: string } = { sent: false };
    if (otpChannel === 'sms') {
      clearPhoneRecaptcha();
      const smsResult = await sendFirebasePhoneOtp(mobile);
      result = smsResult;
      if (smsResult.sent && smsResult.confirmation) {
        setPhoneConfirmation(smsResult.confirmation);
      }
    } else if (cleanEmail) {
      result = await sendSupabaseOtp(cleanEmail, authFlowMode === 'sign_up');
    }
    setIsSendingOtp(false);
    if (!result.sent) {
      setOtpError(result.error || 'Unable to resend your verification code.');
      return;
    }
    setResendCooldown(30);
    setResendNotice(
      otpChannel === 'sms' && result.demoOtp
        ? `New 6-digit verification code sent. (Test OTP: ${result.demoOtp})`
        : 'New 6-digit verification code sent.'
    );
    setOtpDigits(['', '', '', '', '', '']);
  };

  // Handle OTP digit changes for strictly 6 digits
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste of strictly 6-digit numeric OTP
      const cleaned = value.replace(/\D/g, '').slice(0, 6);
      if (!cleaned) return;
      const newOtp = Array(6).fill('');
      cleaned.split('').forEach((char, i) => {
        if (i < 6) newOtp[i] = char;
      });
      setOtpDigits(newOtp);
      const nextIndex = Math.min(cleaned.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
      return;
    }

    const digit = value.replace(/\D/g, '');
    const newOtp = [...otpDigits];
    newOtp[index] = digit;
    setOtpDigits(newOtp);
    setOtpError('');
    setResendNotice('');

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

  // Verify Email OTP with Clerk, Supabase, and Backend
  const handleVerifyOtp = async () => {
    const fullOtp = otpDigits.join('');
    if (fullOtp.length < otpLength) {
      setOtpError(`Please enter all ${otpLength} digits of your verification code`);
      return;
    }

    sound.playSuccess();
    setIsVerifyingOtp(true);
    setOtpError('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = mobile.replace(/\D/g, '');
    const effectiveCity = selectedCity === 'Other' ? customCity.trim() : selectedCity;

    // Enforce isolated Admin Mode OTP validation (No Clerk / No Supabase calls)
    if (isAdminMode) {
      if (fullOtp !== '000000') {
        sound.playError();
        setOtpError('Invalid verification code');
        setIsVerifyingOtp(false);
        return;
      }

      // Hardcoded Admin Mode OTP 000000 accepted!
      sound.playSuccess();
      setIsVerifyingOtp(false);
      setOtpError('');
      setResendNotice('');

      const adminMockToken = `admin_bypass_session_${Date.now()}_mock`;
      localStorage.setItem('shilpsetu_token', adminMockToken);
      if (authFlowMode !== 'sign_in') {
        localStorage.setItem('shilpsetu_auth_done', 'true');
      }

      if (authFlowMode === 'sign_in') {
        const artisanProfile = {
          name: fullName.trim() || 'Admin Artisan',
          email: cleanEmail || 'admin@shilpsetu.in',
          mobile: cleanMobile || '9999999999',
          craft: getLocalizedCraftName(selectedCraft || 'pottery', language),
          location: `${selectedCity || 'Varanasi'}, ${selectedState || 'Uttar Pradesh'}`,
          state: selectedState || 'Uttar Pradesh',
          city: selectedCity || 'Varanasi',
          desiredWorkshop: selectedCraft || 'pottery',
          preferredLanguage: language,
        };
        localStorage.setItem('shilpsetu_artisan', JSON.stringify(artisanProfile));
        setCurrentStep(3);
        return;
      }

      // Keep admin onboarding in the shared flow so language and workshop selection
      // are completed before the app marks authentication as finished.
      setCurrentStep(3);
      return;
    }

    if (otpChannel === 'sms') {
      if (!phoneConfirmation) {
        setOtpError('Please request a new mobile verification code.');
        setIsVerifyingOtp(false);
        return;
      }
      try {
        await phoneConfirmation.confirm(fullOtp);
        setPhoneConfirmation(null);
      } catch (error) {
        sound.playError();
        setOtpError(error instanceof Error ? error.message : 'Invalid or expired mobile verification code.');
        setIsVerifyingOtp(false);
        return;
      }
    }

    const supabaseVerification = otpChannel === 'sms'
      ? {
          verified: true,
          session: pendingSignInData?.session,
          user: pendingSignInData?.user,
        }
      : await verifySupabaseOtp(
          cleanEmail,
          fullOtp,
          authFlowMode === 'sign_up' ? 'signup' : 'email'
        );
    if (!supabaseVerification.verified) {
      sound.playError();
      setOtpError(
        ('error' in supabaseVerification && supabaseVerification.error) ||
        'Invalid or expired 6-digit verification code. Please try again.'
      );
      setIsVerifyingOtp(false);
      return;
    }
    const activeToken =
      supabaseVerification.session?.access_token ||
      pendingSignInData?.session?.access_token ||
      supabaseVerification.user?.id ||
      'shilpsetu_session';
    localStorage.setItem('shilpsetu_token', activeToken);
    if (authFlowMode !== 'sign_in') {
      localStorage.setItem('shilpsetu_auth_done', 'true');
    }

    if (authFlowMode === 'sign_in') {
      sound.playSuccess();
      const profile = pendingSignInData?.profile;
      const user = supabaseVerification.user || pendingSignInData?.user;

      const artisanName =
        profile?.full_name ||
        user?.user_metadata?.full_name ||
        fullName.trim() ||
        'Master Artisan';
      const artisanEmail =
        profile?.email ||
        cleanEmail ||
        '';
      const artisanMobile =
        profile?.mobile_number ||
        mobile.trim() ||
        cleanMobile ||
        '';
      const rawLocation = profile?.location || user?.user_metadata?.location || '';
      const artisanState =
        profile?.state ||
        user?.user_metadata?.state ||
        (rawLocation.includes(',') ? rawLocation.split(',')[1].trim() : '') ||
        selectedState ||
        'Uttar Pradesh';
      const artisanCity =
        profile?.city ||
        user?.user_metadata?.city ||
        (rawLocation.includes(',') ? rawLocation.split(',')[0].trim() : rawLocation) ||
        selectedCity ||
        'Varanasi';
      const storedCraft = String(
        profile?.desired_workshop ||
        profile?.craft_specialty ||
        selectedCraft ||
        'pottery'
      ).toLowerCase();
      const craftId =
        CRAFT_OPTIONS.find(
          (c) =>
            storedCraft.includes(c.name.toLowerCase().split(' ')[0]) ||
            storedCraft.includes(c.id.toLowerCase())
        )?.id || 'pottery';

      setFullName(artisanName);
      setEmail(artisanEmail);
      setMobile(artisanMobile);
      setSelectedState(artisanState);
      setSelectedCity(artisanCity);
      setSelectedCraft(craftId);

      const artisanProfile = {
        id: user?.id,
        name: artisanName,
        email: artisanEmail,
        mobile: artisanMobile,
        craft: getLocalizedCraftName(craftId, language),
        location: `${artisanCity}, ${artisanState}`,
        state: artisanState,
        city: artisanCity,
        desiredWorkshop: craftId,
        preferredLanguage: profile?.preferred_language || language,
        avatarUrl: profile?.avatar_url || undefined,
        bio: profile?.bio || undefined,
      };
      localStorage.setItem('shilpsetu_artisan', JSON.stringify(artisanProfile));
      localStorage.setItem('shilpsetu_user_profile', JSON.stringify({
        id: user?.id,
        full_name: artisanName,
        email: artisanEmail,
        mobile_number: artisanMobile,
        city: artisanCity,
        state: artisanState,
        location: `${artisanCity}, ${artisanState}`,
        avatar_url: profile?.avatar_url || undefined,
        preferred_language: profile?.preferred_language || language,
        desired_workshop: craftId,
      }));

      setIsVerifyingOtp(false);
      setOtpError('');
      setResendNotice('');

      // Navigate to Step 3: Language Selection screen
      setCurrentStep(3);
      return;
    }

    if (authFlowMode === 'sign_up') {
      const client = getSupabase();
      if (otpChannel === 'sms') {
        if (client) {
          try {
            const { data: signUpData } = await client.auth.signUp({
              email: cleanEmail,
              password: password,
              options: {
                data: {
                  full_name: fullName.trim(),
                  mobile_number: cleanMobile,
                },
              },
            });
            if (signUpData?.session?.access_token) {
              localStorage.setItem('shilpsetu_token', signUpData.session.access_token);
            }
          } catch (signUpErr) {
            console.warn('[Sign up creation notice]:', signUpErr);
          }
        }
      } else {
        const passwordResult = await updateSupabasePassword(password);
        if (!passwordResult.updated) {
          console.warn('[Password update notice]:', passwordResult.error);
        }
      }
      try {
        if (client) {
          await client.auth.updateUser({
            data: {
              full_name: fullName.trim(),
              mobile_number: cleanMobile,
            },
          });
        }
      } catch (metaErr) {
        console.warn('[User Metadata Update]:', metaErr);
      }
    }
    const profileResult = await upsertSupabaseProfile({
      userId: supabaseVerification.session?.user?.id || supabaseVerification.user?.id,
      fullName: fullName.trim() || 'Master Artisan',
      email: cleanEmail,
      mobileNumber: cleanMobile,
      preferredLanguage: language,
      desiredWorkshop: selectedCraft,
      city: effectiveCity,
      location: `${effectiveCity}, ${selectedState}`,
      craftSpecialty: getLocalizedCraftName(selectedCraft, language),
    });
    if (!profileResult.saved) {
      setOtpError(profileResult.error || 'Unable to save your profile.');
      setIsVerifyingOtp(false);
      return;
    }

    const artisanProfile = {
      name: fullName.trim() || 'Master Artisan',
      email: cleanEmail,
      mobile: cleanMobile,
      craft: getLocalizedCraftName(selectedCraft, language),
      location: `${effectiveCity}, ${selectedState}`,
      state: selectedState,
      city: effectiveCity,
      desiredWorkshop: selectedCraft,
      preferredLanguage: language,
    };
    localStorage.setItem('shilpsetu_artisan', JSON.stringify(artisanProfile));
    localStorage.setItem('shilpsetu_user_profile', JSON.stringify({
      id: supabaseVerification.session?.user?.id || supabaseVerification.user?.id,
      full_name: artisanProfile.name,
      email: cleanEmail,
      mobile_number: cleanMobile,
      city: effectiveCity,
      state: selectedState,
      location: `${effectiveCity}, ${selectedState}`,
      preferred_language: language,
      desired_workshop: selectedCraft,
    }));

    sound.playSuccess();
    setIsVerifyingOtp(false);
    setOtpError('');
    setResendNotice('');
    setCurrentStep(3);
  };

  // Final completion
  const handleFinish = () => {
    sound.playSuccess();
    const effectiveCity = selectedCity === 'Other' ? customCity.trim() : selectedCity;
    localStorage.setItem('shilpsetu_auth_done', 'true');
    localStorage.setItem('shilpsetu_user_profile', JSON.stringify({
      full_name: fullName.trim(),
      email: email.trim() || undefined,
      mobile_number: mobile.trim(),
      city: effectiveCity,
      state: selectedState,
      location: `${effectiveCity}, ${selectedState}`,
      preferred_language: language,
      desired_workshop: selectedCraft,
    }));
    onComplete({
      fullName: fullName.trim(),
      gender,
      state: selectedState,
      city: effectiveCity,
      mobile: mobile.trim(),
      email: email.trim() || undefined,
      password: password || undefined,
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
      className={`fixed inset-0 z-50 overflow-y-auto flex flex-col justify-between transition-colors duration-300 ${
        isAdminMode ? 'selection:bg-emerald-600/20' : 'selection:bg-[#B5451B]/20'
      } ${
        isDark ? 'bg-[#121212] text-[#F4ECDE]' : 'bg-[#F4ECDE] text-[#1A1815]'
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
            className={`min-h-screen w-full flex flex-col items-center justify-between p-6 max-w-xl mx-auto relative transition-colors duration-300 ${
              isDark ? 'bg-[#121212] text-[#F4ECDE]' : 'bg-[#F4ECDE] text-[#1A1815]'
            }`}
          >
            {/* Top Bar: Discreet Admin Mode Trigger at Top Left, Light/Dark Toggle at Top Right */}
            <div className="w-full flex items-center justify-between pt-2 sm:pt-4 px-2 z-20">
              {/* Discreet Admin Mode Trigger */}
              <div className="flex items-center gap-2">
                <button
                  id="btn-admin-bypass-trigger"
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setAdminCodeInput('');
                    setAdminCodeError('');
                    setShowAdminModal(true);
                  }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
                    isAdminMode
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-300 opacity-50 hover:opacity-100'
                  }`}
                  title={isAdminMode ? 'Admin Bypass Mode Active (Click to manage)' : 'Admin Access'}
                  aria-label="Admin Access"
                >
                  <span className="material-symbols-outlined text-base">
                    {isAdminMode ? 'admin_panel_settings' : 'shield'}
                  </span>
                </button>
                {isAdminMode && (
                  <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-[#059669] text-white rounded-md shadow-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 animate-pulse" />
                    Admin
                  </span>
                )}
              </div>

              {/* Light / Dark Mode Toggle Button */}
              <button
                id="btn-login-theme-toggle"
                type="button"
                onClick={() => {
                  handleSelectTheme(isDark ? 'light' : 'dark');
                }}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-xs border ${
                  isDark
                    ? 'text-[#E8B84B] bg-[#1A1A1A] hover:bg-[#252525] border-[#E8B84B]/30'
                    : isAdminMode
                    ? 'text-[#059669] bg-[#E8F5E9] hover:bg-[#C8E6C9] border-[#059669]/30'
                    : 'text-[#B5451B] bg-[#FAF6EE] hover:bg-[#EFE4CF] border-[#B5451B]/30'
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
              {/* ShilpSetu Logo Emblem - Exact original artwork preserved without tint */}
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

              {/* Title & Tagline: Emerald in Admin Mode, Signature Terracotta Orange for Normal User */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="space-y-2.5"
              >
                <div className="flex flex-col items-center justify-center gap-1">
                  <h1
                    className={`font-serif font-black text-3xl md:text-4xl tracking-wider uppercase ${
                      isAdminMode ? 'text-[#059669]' : 'text-[#B5451B]'
                    }`}
                  >
                    {t('app_title', 'SHILPSETU')}
                  </h1>
                </div>
                <p className={`font-sans font-bold text-xs md:text-sm tracking-[0.18em] uppercase max-w-xs leading-relaxed ${
                  isDark ? 'text-[#E8B84B]' : 'text-[#8C6B1B]'
                }`}>
                  {t('tagline_header', "CONNECTING INDIA'S ARTISANS, PRESERVING HERITAGE")}
                </p>
                <p
                  className={`font-serif italic text-xs mt-1 ${
                    isAdminMode
                      ? isDark ? 'text-[#A7F3D0]' : 'text-[#047857]'
                      : isDark ? 'text-[#FFA680]' : 'text-[#B5451B]'
                  }`}
                >
                  "Every Hand Has A Story"
                </p>
              </motion.div>
            </div>

            {/* Normal users choose an auth flow; admin keeps its existing bypass entry. */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="w-full pb-6"
            >
              {isAdminMode ? (
                <button
                  id="btn-login-get-started"
                  onClick={() => {
                    sound.playTap();
                    setCurrentStep(1);
                  }}
                  className="w-full py-4 bg-[#059669] hover:bg-[#047857] text-white font-serif font-bold text-base rounded-full shadow-artisan active:scale-95 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span>{t('get_started_btn', 'Get Started')}</span>
                  <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    id="btn-login-sign-in"
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      setAuthFlowMode('sign_in');
                      setCurrentStep(1);
                    }}
                    className="py-4 rounded-full border border-[#B5451B]/40 text-[#B5451B] bg-[#FAF6EE] hover:bg-[#EFE4CF] font-serif font-bold text-sm transition-all"
                  >
                    {t('sign_in', 'Sign In')}
                  </button>
                  <button
                    id="btn-login-sign-up"
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      setAuthFlowMode('sign_up');
                      setCurrentStep(1);
                    }}
                    className="py-4 rounded-full bg-[#B5451B] hover:bg-[#9C3A14] text-white font-serif font-bold text-sm shadow-artisan transition-all"
                  >
                    {t('sign_up', 'Sign Up')}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* STEP 1: SIGN IN (IDENTIFIER + PASSWORD) */}
        {currentStep === 1 && authFlowMode === 'sign_in' && (
          <motion.div
            key="sign-in-screen"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen w-full flex flex-col justify-between p-6 max-w-xl md:max-w-2xl mx-auto"
          >
            <div>
              <div className="flex items-center gap-3 pt-2 mb-10">
                <button type="button" onClick={() => setCurrentStep(0)}
                  className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center cursor-pointer">
                  <span className="material-symbols-outlined text-lg">arrow_back</span>
                </button>
                <div className="flex items-center gap-2">
                  <ShilpSetuLogo size="xs" isDark={isDark} />
                  <span className="font-serif font-bold text-base text-[#B5451B]">{t('app_title', 'SHILPSETU')}</span>
                </div>
              </div>
              <div className="mb-8">
                <h2 className="font-serif font-bold text-2xl mb-1">Sign In</h2>
                <p className="text-xs text-black/70 dark:text-white/70">
                  Enter your registered email or mobile number and password to continue.
                </p>
              </div>
              <form onSubmit={handleProceedToOtp} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold font-serif uppercase tracking-wider text-[#B5451B] mb-1.5">
                    Email or mobile number
                  </label>
                  <input autoFocus required value={signInIdentifier}
                    onChange={(e) => { setSignInIdentifier(e.target.value); setSignInError(''); }}
                    placeholder="Enter email or 10-digit mobile number"
                    className="w-full px-4 py-3 rounded-2xl border text-sm bg-white dark:bg-[#1C221A] border-[#22331E]/20 dark:border-[#2D3A2B] focus:outline-hidden focus:ring-2 focus:ring-[#B5451B]/30" />
                </div>
                {!signInOtpOnly && <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold font-serif uppercase tracking-wider text-[#B5451B]">
                      Password
                    </label>
                    <button
                      type="button"
                      id="signin-forgot-password-link"
                      onClick={() => {
                        sound.playTap();
                        setAuthFlowMode('forgot_password');
                        setSignInError('');
                      }}
                      className="text-[11px] text-[#B5451B] dark:text-[#E8B84B] font-semibold hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showSignInPassword ? 'text' : 'password'}
                      required
                      value={signInPassword}
                      onChange={(e) => { setSignInPassword(e.target.value); setSignInError(''); }}
                      placeholder="Enter your password"
                      className="w-full pl-4 pr-11 py-3 rounded-2xl border text-sm bg-white dark:bg-[#1C221A] border-[#22331E]/20 dark:border-[#2D3A2B] focus:outline-hidden focus:ring-2 focus:ring-[#B5451B]/30"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowSignInPassword((prev) => !prev)}
                      className="absolute right-3.5 top-3 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                      aria-label={showSignInPassword ? 'Hide password' : 'Show password'}
                    >
                      <span className="material-symbols-outlined text-lg">
                        {showSignInPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>}
                {signInError && <p className="text-xs text-red-500 font-medium">{signInError}</p>}
              </form>
            </div>
            <div className="pt-6 pb-4">
              <button type="button" disabled={isSendingOtp} onClick={() => handleProceedToOtp({ preventDefault: () => {} } as React.FormEvent)}
                className="w-full py-4 bg-[#B5451B] hover:bg-[#9C3A14] text-white font-serif font-bold text-base rounded-full shadow-artisan disabled:opacity-50 cursor-pointer transition-all flex items-center justify-center gap-2">
                {isSendingOtp ? (
                  <>
                    <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                    <span>Sending 6-Digit OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <span className="material-symbols-outlined text-lg">login</span>
                  </>
                )}
              </button>
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setAuthFlowMode('sign_up');
                    setSignInError('');
                  }}
                  className="text-xs text-[#B5451B] dark:text-[#E8B84B] font-semibold hover:underline cursor-pointer"
                >
                  Don't have an account? Sign Up
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* FORGOT PASSWORD FLOW (STRICT 6-DIGIT OTP + NEW PASSWORD CONFIRMATION) */}
        {authFlowMode === 'forgot_password' && (
          <motion.div
            key="forgot-password-screen"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            <ForgotPasswordFlow
              isDark={isDark}
              initialEmail={signInIdentifier.includes('@') ? signInIdentifier.trim() : email}
              onSuccess={(recoveredEmail) => {
                setSignInIdentifier(recoveredEmail);
                setSignInPassword('');
                setAuthFlowMode('sign_in');
                setCurrentStep(1);
              }}
              onCancel={() => {
                setAuthFlowMode('sign_in');
                setCurrentStep(1);
              }}
              onToggleTheme={() => handleSelectTheme(isDark ? 'light' : 'dark')}
            />
          </motion.div>
        )}

        {/* STEP 1: PERSONAL DETAILS (FULL NAME*, MOBILE NUMBER*, EMAIL ADDRESS) */}
        {currentStep === 1 && authFlowMode === 'sign_up' && (
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
              <div className="flex items-center justify-between pt-2 mb-6">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      setCurrentStep(0);
                    }}
                    className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-sm cursor-pointer hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <ShilpSetuLogo size="xs" isDark={isDark} />
                    <span
                      className={`font-serif font-bold text-base ${
                        isAdminMode ? 'text-[#059669]' : 'text-[#B5451B]'
                      }`}
                    >
                      {t('app_title', 'SHILPSETU')}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectTheme(isDark ? 'light' : 'dark')}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-xs border ${
                    isDark
                      ? 'text-[#E8B84B] bg-[#1A1A1A] hover:bg-[#252525] border-[#E8B84B]/30'
                      : isAdminMode
                      ? 'text-[#059669] bg-[#E8F5E9] hover:bg-[#C8E6C9] border-[#059669]/30'
                      : 'text-[#B5451B] bg-[#FAF6EE] hover:bg-[#EFE4CF] border-[#B5451B]/30'
                  }`}
                  title={isDark ? t('switch_light_mode', 'Switch to Light Mode') : t('switch_dark_mode', 'Switch to Dark Mode')}
                  aria-label={isDark ? t('switch_light_mode', 'Switch to Light Mode') : t('switch_dark_mode', 'Switch to Dark Mode')}
                >
                  <span className="material-symbols-outlined text-base">
                    {isDark ? 'light_mode' : 'dark_mode'}
                  </span>
                </button>
              </div>

              <div className="mb-6">
                <h2 className="font-serif font-bold text-2xl text-[#1A1815] dark:text-[#F4ECDE] mb-1">
                  {t('artisan_registration', 'Artisan Registration')}
                </h2>
                <p className="text-xs text-black/70 dark:text-white/70 font-sans">
                  {t('artisan_reg_desc', 'Please provide your personal details to create your verified artisan profile.')}
                </p>
              </div>

              {/* Form Fields */}
              <form onSubmit={handleProceedToOtp} className="space-y-4">
                {/* Full Name (MANDATORY) */}
                <div>
                  <label
                    className={`block text-xs font-bold font-serif uppercase tracking-wider mb-1.5 ${
                      isAdminMode ? 'text-[#059669]' : 'text-[#B5451B]'
                    }`}
                  >
                    {t('full_name_label', 'Full Name')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span
                      className={`material-symbols-outlined absolute left-3.5 top-3 text-lg ${
                        isAdminMode ? 'text-[#059669]' : 'text-[#B5451B]'
                      }`}
                    >
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
                      placeholder={t('enter_full_name', 'Enter your full name')}
                      className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-sm font-serif focus:outline-hidden focus:ring-2 transition-all ${
                        isAdminMode ? 'focus:ring-[#059669]' : 'focus:ring-[#B5451B]'
                      } ${
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
                  <label
                    className={`block text-xs font-bold font-serif uppercase tracking-wider mb-1.5 ${
                      isAdminMode ? 'text-[#059669]' : 'text-[#B5451B]'
                    }`}
                  >
                    {t('gender', 'Gender')} <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'male', label: t('gender_male', 'Male'), icon: 'male' },
                      { id: 'female', label: t('gender_female', 'Female'), icon: 'female' },
                      { id: 'other', label: t('gender_other', 'Others'), icon: 'transgender' },
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
                              ? isAdminMode
                                ? 'bg-[#059669] text-white border-[#059669] shadow-md scale-[1.02]'
                                : 'bg-[#B5451B] text-white border-[#B5451B] shadow-md scale-[1.02]'
                              : isDark
                              ? 'bg-[#1C221A] border-[#2D3A2B] text-white/80 hover:bg-[#252E22]'
                              : 'bg-white border-[#22331E]/20 text-[#1A1815] hover:bg-[#FAF4E8]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-xl mb-0.5">{g.icon}</span>
                          <span className="font-bold">{g.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* State & City / Craft Cluster (MANDATORY - USER SELECTED) */}
                <div className="space-y-3 p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-[#22331E]/10 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold font-serif uppercase tracking-wider flex items-center gap-1.5 ${
                        isAdminMode ? 'text-[#059669]' : 'text-[#B5451B]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">location_on</span>
                      <span>{t('artisan_location', 'Artisan Location')}</span>
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isAdminMode
                          ? 'bg-[#059669]/10 text-[#059669]'
                          : 'bg-[#B5451B]/10 text-[#B5451B]'
                      }`}
                    >
                      {t('mandatory', 'Mandatory')}
                    </span>
                  </div>

                  {/* 1. State Selector */}
                  <div>
                    <label className="block text-[11px] font-medium opacity-80 mb-1">
                      {t('select_state', 'State')} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span
                        className={`material-symbols-outlined absolute left-3 top-2.5 text-base pointer-events-none ${
                          isAdminMode ? 'text-[#059669]' : 'text-[#B5451B]'
                        }`}
                      >
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
                        className={`w-full pl-9 pr-8 py-2.5 rounded-xl border text-xs font-serif appearance-none focus:outline-hidden focus:ring-2 transition-all ${
                          isAdminMode ? 'focus:ring-[#059669]' : 'focus:ring-[#B5451B]'
                        } ${
                          stateError
                            ? 'border-red-500 bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-200'
                            : isDark
                            ? 'bg-[#121411] border-[#2D3A2B] text-white'
                            : 'bg-white border-[#22331E]/20 text-[#1A1815]'
                        }`}
                      >
                        <option value="">-- {t('select_state', 'Select State')} --</option>
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
                      {t('city_or_village', 'City / Village')} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span
                        className={`material-symbols-outlined absolute left-3 top-2.5 text-base pointer-events-none ${
                          isAdminMode ? 'text-[#059669]' : 'text-[#B5451B]'
                        }`}
                      >
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
                        className={`w-full pl-9 pr-8 py-2.5 rounded-xl border text-xs font-serif appearance-none focus:outline-hidden focus:ring-2 transition-all disabled:opacity-50 ${
                          isAdminMode ? 'focus:ring-[#059669]' : 'focus:ring-[#B5451B]'
                        } ${
                          cityError
                            ? 'border-red-500 bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-200'
                            : isDark
                            ? 'bg-[#121411] border-[#2D3A2B] text-white'
                            : 'bg-white border-[#22331E]/20 text-[#1A1815]'
                        }`}
                      >
                        <option value="">
                          {selectedState
                            ? `-- ${t('city_or_village', 'Select City')} --`
                            : '-- First select state above --'}
                        </option>
                        {availableCities.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                        {selectedState && (
                          <option value="Other">{t('other', 'Other')} ({t('type_city_village', 'Type your city / village')})</option>
                        )}
                      </select>
                      <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-xs opacity-60 pointer-events-none">
                        arrow_drop_down
                      </span>
                    </div>

                    {/* Custom City input if 'Other' selected */}
                    {selectedCity === 'Other' && (
                      <div className="mt-2 relative">
                        <span
                          className={`material-symbols-outlined absolute left-3 top-2 text-sm pointer-events-none ${
                            isAdminMode ? 'text-[#059669]' : 'text-[#B5451B]'
                          }`}
                        >
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
                          placeholder={t('type_city_village', 'Type your city or village name')}
                          className={`w-full pl-8 pr-3 py-2 rounded-xl border text-xs font-serif focus:outline-hidden focus:ring-2 ${
                            isAdminMode ? 'focus:ring-[#059669]' : 'focus:ring-[#B5451B]'
                          } ${
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
                  <label
                    className={`block text-xs font-bold font-serif uppercase tracking-wider mb-1.5 ${
                      isAdminMode ? 'text-[#059669]' : 'text-[#B5451B]'
                    }`}
                  >
                    {t('mobile_number', 'Mobile Number')} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="px-3.5 py-3 rounded-2xl border border-[#22331E]/20 dark:border-[#2D3A2B] bg-white dark:bg-[#1C221A] text-sm font-bold flex items-center gap-1 shrink-0">
                      <span>🇮🇳</span>
                      <span className="font-mono text-xs">+91</span>
                    </div>
                    <div className="relative flex-1">
                      <span
                        className={`material-symbols-outlined absolute left-3.5 top-3 text-lg ${
                          isAdminMode ? 'text-[#059669]' : 'text-[#B5451B]'
                        }`}
                      >
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
                        onBlur={async () => {
                          const clean = mobile.replace(/\D/g, '');
                          if (clean.length === 10 && !isAdminMode) {
                            try {
                              const check = await checkAccountUniqueness(undefined, clean);
                              if (!check.unique) {
                                setMobileError(
                                  check.error ||
                                    'An account is already registered with this mobile number. Please sign in.'
                                );
                              }
                            } catch (_) {}
                          }
                        }}
                        placeholder={t('enter_10_digit_mobile', 'Enter 10-digit mobile number')}
                        className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-sm font-mono tracking-wider focus:outline-hidden focus:ring-2 transition-all ${
                          isAdminMode ? 'focus:ring-[#059669]' : 'focus:ring-[#B5451B]'
                        } ${
                          mobileError
                            ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                            : 'border-[#22331E]/20 dark:border-[#2D3A2B] bg-white dark:bg-[#1C221A]'
                        }`}
                      />
                    </div>
                  </div>
                  {mobileError && (
                    <div className="mt-1 space-y-1">
                      <p className="text-[11px] text-red-500 font-medium">{mobileError}</p>
                      {(mobileError.includes('already registered') || mobileError.includes('sign in')) && (
                        <button
                          type="button"
                          onClick={() => {
                            sound.playTap();
                            setAuthFlowMode('sign_in');
                            setSignInIdentifier(mobile.trim());
                            setMobileError('');
                          }}
                          className="text-left text-xs font-semibold text-[#B5451B] dark:text-[#E8B84B] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Sign in with this mobile number instead</span>
                          <span className="material-symbols-outlined text-xs">arrow_forward</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Email Address (MANDATORY FOR CLERK VERIFICATION) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      className={`text-xs font-bold font-serif uppercase tracking-wider flex items-center gap-1 ${
                        isAdminMode ? 'text-[#059669]' : 'text-[#B5451B]'
                      }`}
                    >
                      <span>{t('email_address', 'Email Address')}</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isAdminMode
                          ? 'bg-[#059669]/10 text-[#059669]'
                          : 'bg-[#B5451B]/10 text-[#B5451B]'
                      }`}
                    >
                      {t('mandatory', 'Mandatory')}
                    </span>
                  </div>
                  <div className="relative">
                    <span
                      className={`material-symbols-outlined absolute left-3.5 top-3 text-lg ${
                        isAdminMode ? 'text-[#059669]' : 'text-[#B5451B]'
                      }`}
                    >
                      mail
                    </span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError('');
                      }}
                      onBlur={async () => {
                        const clean = email.trim().toLowerCase();
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (clean && emailRegex.test(clean) && !isAdminMode) {
                          try {
                            const check = await checkAccountUniqueness(clean, undefined);
                            if (!check.unique) {
                              setEmailError(
                                check.error ||
                                  'An account is already registered with this email address. Please sign in.'
                              );
                            }
                          } catch (_) {}
                        }
                      }}
                      placeholder={t('enter_email_mandatory', 'Enter email address (e.g. artisan@craft.in)')}
                      className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-sm font-sans focus:outline-hidden focus:ring-2 transition-all ${
                        isAdminMode ? 'focus:ring-[#059669]' : 'focus:ring-[#B5451B]'
                      } ${
                        emailError
                          ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                          : 'border-[#22331E]/20 dark:border-[#2D3A2B] bg-white dark:bg-[#1C221A]'
                      }`}
                    />
                  </div>
                  {emailError ? (
                    <div className="mt-1 space-y-1">
                      <p className="text-[11px] text-red-500 font-medium">{emailError}</p>
                      {(emailError.includes('already registered') ||
                        emailError.includes('already exists') ||
                        emailError.includes('sign in')) && (
                        <button
                          type="button"
                          onClick={() => {
                            sound.playTap();
                            setAuthFlowMode('sign_in');
                            setSignInIdentifier(email.trim());
                            setEmailError('');
                          }}
                          className="text-left text-xs font-semibold text-[#B5451B] dark:text-[#E8B84B] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Sign in with this email instead</span>
                          <span className="material-symbols-outlined text-xs">arrow_forward</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] text-black/60 dark:text-white/60 mt-1">
                      {t('we_will_send_email_otp', 'we will send a 6 digit OTP to this email address')}
                    </p>
                  )}
                </div>

                {!isAdminMode && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold font-serif uppercase tracking-wider text-[#B5451B]">
                      Create password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      maxLength={PASSWORD_MAX_LENGTH}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (passwordError) setPasswordError('');
                      }}
                      placeholder="8–16 characters"
                      className={`w-full px-4 py-3 rounded-2xl border text-sm font-sans focus:outline-hidden focus:ring-2 transition-all ${
                        passwordError
                          ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                          : 'border-[#22331E]/20 dark:border-[#2D3A2B] bg-white dark:bg-[#1C221A]'
                      }`}
                    />
                    <button type="button" aria-label="Toggle password visibility" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-3"><span className="material-symbols-outlined text-sm">{showPassword ? 'visibility_off' : 'visibility'}</span></button>
                    </div>
                    <div className="flex gap-1" aria-label="Password strength">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <span
                          key={level}
                          className={`h-1.5 flex-1 rounded-full ${
                            passwordStrength(password) >= level
                              ? 'bg-[#B5451B]'
                              : 'bg-black/10 dark:bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                    <ul className="text-[10px] text-black/60 dark:text-white/60 space-y-0.5" aria-label="Password requirements">
                      <li>✓ 8–16 characters</li><li>✓ Uppercase and lowercase letter</li><li>✓ Number</li><li>✓ Special character (!@#$%^&amp;*(),.?":&#123;&#125;|&lt;&gt;)</li>
                    </ul>
                    <div className="relative">
                    <input
                      type={showPasswordConfirmation ? 'text' : 'password'}
                      required
                      minLength={8}
                      maxLength={PASSWORD_MAX_LENGTH}
                      value={passwordConfirmation}
                      onChange={(e) => {
                        setPasswordConfirmation(e.target.value);
                        if (passwordError) setPasswordError('');
                      }}
                      placeholder="Confirm password"
                      className={`w-full px-4 py-3 rounded-2xl border text-sm font-sans focus:outline-hidden focus:ring-2 transition-all ${
                        passwordError
                          ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                          : 'border-[#22331E]/20 dark:border-[#2D3A2B] bg-white dark:bg-[#1C221A]'
                      }`}
                    />
                    <button type="button" aria-label="Toggle password confirmation visibility" onClick={() => setShowPasswordConfirmation((value) => !value)} className="absolute right-3 top-3"><span className="material-symbols-outlined text-sm">{showPasswordConfirmation ? 'visibility_off' : 'visibility'}</span></button>
                    </div>
                    {passwordError && (
                      <div className="mt-1 flex items-start gap-1.5 p-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400">
                        <span className="material-symbols-outlined text-xs mt-0.5 shrink-0">error</span>
                        <p className="text-[11px] font-medium leading-tight">{passwordError}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Trust & Security Badge */}
                <div className="p-3.5 rounded-2xl bg-[#22331E]/10 dark:bg-[#2D3A2B]/40 border border-[#22331E]/15 flex items-center gap-2.5 mt-4">
                  <span className="material-symbols-outlined text-[#2E4638] dark:text-[#88C498] text-xl">
                    verified_user
                  </span>
                  <p className="text-[11px] leading-snug text-[#22331E] dark:text-[#E8B84B]">
                    {t('data_secured_desc', 'Your data is secured and linked to your Artisan GeM & Udyam registration ID.')}
                  </p>
                </div>
              </form>
            </div>

            {/* Bottom Button */}
            <div className="pt-6 pb-4">
              <button
                type="button"
                disabled={isSendingOtp}
                onClick={handleProceedToOtp}
                className={`w-full py-4 text-white font-serif font-bold text-base rounded-full shadow-artisan active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer ${
                  isAdminMode
                    ? 'bg-[#059669] hover:bg-[#047857]'
                    : 'bg-[#B5451B] hover:bg-[#9C3A14]'
                }`}
              >
                {isSendingOtp ? (
                  <>
                    <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                    <span>{t('sending_otp', 'Sending Verification Code...')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('continue_to_otp', 'Continue to Email OTP Verification')}</span>
                    <span className="material-symbols-outlined text-lg">mark_email_read</span>
                  </>
                )}
              </button>
              {!isAdminMode && (
                <div className="text-center mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      setAuthFlowMode('sign_in');
                      setNameError('');
                      setMobileError('');
                      setEmailError('');
                    }}
                    className="text-xs text-[#B5451B] dark:text-[#E8B84B] font-semibold hover:underline cursor-pointer"
                  >
                    Already have an account? Sign In directly
                  </button>
                </div>
              )}
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
              <div className="flex items-center justify-between pt-2 mb-6">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      setCurrentStep(1);
                    }}
                    className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-sm cursor-pointer hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <ShilpSetuLogo size="xs" isDark={isDark} />
                    <span
                      className={`font-serif font-bold text-base ${
                        isAdminMode ? 'text-[#059669]' : 'text-[#B5451B]'
                      }`}
                    >
                      {isAdminMode ? t('app_title', 'SHILPSETU') : `${t('app_title', 'SHILPSETU')} AUTH`}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectTheme(isDark ? 'light' : 'dark')}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-xs border ${
                    isDark
                      ? 'text-[#E8B84B] bg-[#1A1A1A] hover:bg-[#252525] border-[#E8B84B]/30'
                      : isAdminMode
                      ? 'text-[#059669] bg-[#E8F5E9] hover:bg-[#C8E6C9] border-[#059669]/30'
                      : 'text-[#B5451B] bg-[#FAF6EE] hover:bg-[#EFE4CF] border-[#B5451B]/30'
                  }`}
                  title={isDark ? t('switch_light_mode', 'Switch to Light Mode') : t('switch_dark_mode', 'Switch to Dark Mode')}
                  aria-label={isDark ? t('switch_light_mode', 'Switch to Light Mode') : t('switch_dark_mode', 'Switch to Dark Mode')}
                >
                  <span className="material-symbols-outlined text-base">
                    {isDark ? 'light_mode' : 'dark_mode'}
                  </span>
                </button>
              </div>

              <div className="text-center mb-6">
                <div id="recaptcha-container" aria-hidden="true" />
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner ${
                    isAdminMode ? 'bg-[#059669]/15 text-[#059669]' : 'bg-[#B5451B]/15 text-[#B5451B]'
                  }`}
                >
                  <span className="material-symbols-outlined text-3xl">
                    {isAdminMode ? 'admin_panel_settings' : otpChannel === 'sms' ? 'sms' : 'mark_email_read'}
                  </span>
                </div>
                <h2 className="font-serif font-bold text-2xl mb-1">
                  {isAdminMode
                    ? 'Admin Verification'
                    : otpChannel === 'sms'
                    ? t('mobile_otp_verification', 'Verify Your Mobile Number')
                    : t('email_otp_verification', 'Verify Your Email Address')}
                </h2>
                <p className="text-xs text-black/70 dark:text-white/70 font-sans max-w-xs mx-auto mb-1">
                  {t('enter_6_digit_otp_sent_to', 'A 6-digit verification code was sent to')}{' '}
                  <span
                    className={`font-mono font-bold break-all ${
                      isAdminMode ? 'text-[#059669]' : 'text-[#B5451B]'
                    }`}
                  >
                    {otpChannel === 'sms'
                      ? maskPhone(mobile)
                      : maskEmail(email || 'your email')}
                  </span>
                </p>
                <div className="mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      setCurrentStep(1);
                    }}
                    className={`text-[11px] font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer ${
                      isAdminMode ? 'text-[#059669]' : 'text-[#B5451B]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">edit</span>
                    <span>{otpChannel === 'sms' ? 'Wrong mobile number? Click to change' : 'Wrong email? Click to change'}</span>
                  </button>
                </div>

                {/* Email Delivery Notice Banner */}
                {isAdminMode ? null : (
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 rounded-xl p-3 text-center space-y-1.5 max-w-sm mx-auto shadow-xs">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200">
                      <span className="material-symbols-outlined text-sm">mark_email_read</span>
                      <span>{otpChannel === 'sms' ? 'Verification SMS dispatched' : 'Verification email dispatched'}</span>
                    </div>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-snug">
                      {otpChannel === 'sms'
                        ? 'Enter the six-digit code received on your mobile number.'
                        : <>Please check your <strong>Inbox</strong> and <strong>Spam/Junk</strong> folder for the 6-digit verification code.</>}
                    </p>
                  </div>
                )}

              </div>

              {/* Digit Input Boxes */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-center gap-2 max-w-sm mx-auto">
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
                      className={`w-12 h-14 text-xl text-center font-mono font-black rounded-2xl border-2 transition-all focus:outline-hidden focus:scale-105 ${
                        digit
                          ? isAdminMode
                            ? 'border-[#059669] bg-white dark:bg-[#1C221A] text-[#059669] shadow-sm'
                            : 'border-[#B5451B] bg-white dark:bg-[#1C221A] text-[#B5451B] shadow-sm'
                          : 'border-[#22331E]/20 dark:border-[#2D3A2B] bg-white dark:bg-[#1C221A]'
                      }`}
                    />
                  ))}
                </div>

                {resendNotice && (
                  <div className="flex items-center justify-center gap-1.5 text-center text-xs text-emerald-600 dark:text-emerald-400 font-medium px-4 max-w-sm mx-auto">
                    <span className="material-symbols-outlined text-sm shrink-0">check_circle</span>
                    <span className="leading-normal">{resendNotice}</span>
                  </div>
                )}

                {otpError && (
                  <div className="text-center px-4 space-y-1">
                    <p className="text-xs text-red-500 font-medium">{cleanAuthError(otpError)}</p>
                    {otpError.includes('already exists') && (
                      <button
                        type="button"
                        onClick={() => {
                          sound.playTap();
                          setAuthFlowMode('sign_in');
                          setSignInIdentifier(email.trim());
                          setCurrentStep(1);
                        }}
                        className="text-xs font-semibold text-[#B5451B] dark:text-[#E8B84B] hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Sign in directly</span>
                        <span className="material-symbols-outlined text-xs">arrow_forward</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Resend Code Button with Cooldown Timer */}
                <div className="flex items-center justify-center gap-1.5 pt-2">
                  <span className="text-xs text-black/60 dark:text-white/60">
                    {t('didnt_receive_code', "Didn't receive the code?")}
                  </span>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || isSendingOtp}
                    onClick={handleResendOtp}
                    className={`text-xs font-bold hover:underline disabled:opacity-50 disabled:no-underline flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed ${
                      isAdminMode ? 'text-[#059669]' : 'text-[#B5451B]'
                    }`}
                  >
                    {isSendingOtp ? (
                      <span>{t('sending', 'Sending...')}</span>
                    ) : resendCooldown > 0 ? (
                      <>
                        <span className="material-symbols-outlined text-sm">timer</span>
                        <span>{t('resend_in', 'Resend in')} {resendCooldown}s</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">refresh</span>
                        <span>{t('resend_code', 'Resend Code')}</span>
                      </>
                    )}
                  </button>
                </div>
                {!isAdminMode && (
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      disabled={isSendingOtp}
                      onClick={switchOtpChannel}
                      className="text-xs font-semibold text-[#B5451B] hover:underline disabled:opacity-50 cursor-pointer"
                    >
                      {otpChannel === 'sms'
                        ? "Didn't receive SMS? Verify through Email instead (Fallback)"
                        : 'Verify through Mobile No. instead'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Verify Button */}
            <div className="pt-4 pb-4">
              <button
                type="button"
                disabled={isVerifyingOtp}
                onClick={handleVerifyOtp}
                className={`w-full py-4 text-white font-serif font-bold text-base rounded-full shadow-artisan active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer ${
                  isAdminMode
                    ? 'bg-[#059669] hover:bg-[#047857]'
                    : 'bg-[#B5451B] hover:bg-[#9C3A14]'
                }`}
              >
                {isVerifyingOtp ? (
                  <>
                    <span className="material-symbols-outlined text-lg animate-spin">
                      progress_activity
                    </span>
                    <span>{t('verifying_otp', 'Verifying OTP...')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('verify_continue', 'Verify & Continue')}</span>
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
            initialLanguage={authFlowMode === 'sign_in' ? 'en' : language || 'en'}
            isSignIn={authFlowMode === 'sign_in'}
            continueButtonText={authFlowMode === 'sign_in' ? 'Continue' : undefined}
            onSelectLanguage={(newLang) => {
              setLanguage(newLang);
              if (authFlowMode === 'sign_in') {
                const storedArtisan = localStorage.getItem('shilpsetu_artisan');
                if (storedArtisan) {
                  try {
                    const parsed = JSON.parse(storedArtisan);
                    parsed.preferredLanguage = newLang;
                    parsed.craft = getLocalizedCraftName(selectedCraft || parsed.desiredWorkshop || 'pottery', newLang);
                    localStorage.setItem('shilpsetu_artisan', JSON.stringify(parsed));
                  } catch (e) {
                    console.warn(e);
                  }
                }
                localStorage.setItem('shilpsetu_auth_done', 'true');
                localStorage.removeItem('shilpsetu_pending_signin_otp');
                onComplete({
                  fullName: fullName.trim(),
                  gender,
                  state: selectedState,
                  city: selectedCity === 'Other' ? customCity.trim() : selectedCity,
                  mobile: mobile.trim(),
                  email: email.trim() || undefined,
                  selectedCraft: selectedCraft || 'pottery',
                  selectedLanguage: newLang,
                });
              } else {
                setCurrentStep(4);
              }
            }}
            onBack={() => {
              sound.playTap();
              setCurrentStep(2);
            }}
            isDark={isDark}
            onToggleTheme={() => handleSelectTheme(isDark ? 'light' : 'dark')}
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
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      setCurrentStep(3);
                    }}
                    className={`w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-sm transition-colors cursor-pointer ${
                      isAdminMode
                        ? 'hover:bg-[#059669]/10 hover:text-[#059669]'
                        : 'hover:bg-[#B5451B]/10 hover:text-[#B5451B]'
                    }`}
                    title="Back to language selection"
                    aria-label="Back to language selection"
                  >
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
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

                <button
                  type="button"
                  onClick={() => handleSelectTheme(isDark ? 'light' : 'dark')}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-xs border ${
                    isDark
                      ? 'text-[#E8B84B] bg-[#1A1A1A] hover:bg-[#252525] border-[#E8B84B]/30'
                      : isAdminMode
                      ? 'text-[#059669] bg-[#E8F5E9] hover:bg-[#C8E6C9] border-[#059669]/30'
                      : 'text-[#B5451B] bg-[#FAF6EE] hover:bg-[#EFE4CF] border-[#B5451B]/30'
                  }`}
                  title={isDark ? t('switch_light_mode', 'Switch to Light Mode') : t('switch_dark_mode', 'Switch to Dark Mode')}
                  aria-label={isDark ? t('switch_light_mode', 'Switch to Light Mode') : t('switch_dark_mode', 'Switch to Dark Mode')}
                >
                  <span className="material-symbols-outlined text-base">
                    {isDark ? 'light_mode' : 'dark_mode'}
                  </span>
                </button>
              </div>

              {/* Header */}
              <div className="text-center mb-6">
                <div
                  className={`w-12 h-12 rounded-full text-white flex items-center justify-center mx-auto mb-3 shadow-md ${
                    isAdminMode ? 'bg-[#059669]' : 'bg-[#B5451B]'
                  }`}
                >
                  <span className="material-symbols-outlined text-2xl">interests</span>
                </div>
                <h2 className="font-serif font-bold text-2xl mb-1 text-[#22331E] dark:text-[#F4ECDE]">
                  {t('what_is_your_craft', 'What is your heritage craft?')}
                </h2>
                <p className="text-xs opacity-75 font-sans">
                  Welcome{' '}
                  <strong className={isAdminMode ? 'text-[#059669]' : 'text-[#B5451B]'}>
                    {fullName}
                  </strong>
                  ! Select your craft to personalize your AI Studio.
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
                          ? isAdminMode
                            ? 'bg-[#EAE0CC] dark:bg-[#1C221A] border-[#059669] shadow-lg scale-[1.02]'
                            : 'bg-[#EAE0CC] dark:bg-[#1C221A] border-[#B5451B] shadow-lg scale-[1.02]'
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
                          <div
                            className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full text-white flex items-center justify-center shadow-md ${
                              isAdminMode ? 'bg-[#059669]' : 'bg-[#B5451B]'
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm font-bold">
                              check
                            </span>
                          </div>
                        )}
                      </div>

                      <h4 className="font-serif font-bold text-xs leading-tight text-[#1A1815] dark:text-[#F4ECDE]">
                        {craft.name}
                      </h4>
                      <p
                        className={`text-[10px] font-serif font-medium mt-0.5 ${
                          isAdminMode
                            ? 'text-[#059669] dark:text-emerald-400'
                            : 'text-[#B5451B] dark:text-[#FFA680]'
                        }`}
                      >
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
                className={`w-full text-white font-serif font-bold text-base py-4 rounded-full shadow-artisan transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
                  isAdminMode
                    ? 'bg-[#059669] hover:bg-[#047857]'
                    : 'bg-[#B5451B] hover:bg-[#9C3A14]'
                }`}
              >
                <span>{getEnterWorkshopLabel(language)}</span>
                <span className="material-symbols-outlined text-xl">store</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Mode Verification Prompt Modal */}
      <AnimatePresence>
        {showAdminModal && (
          <div
            id="admin-auth-modal-overlay"
            className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowAdminModal(false);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm rounded-3xl p-6 shadow-2xl border bg-[#FAF5EC] dark:bg-[#1C221A] border-[#22331E]/20 dark:border-[#2D3A2B] text-[#1A1815] dark:text-[#F4ECDE] relative"
            >
              {/* Close Button */}
              <button
                id="btn-close-admin-modal"
                type="button"
                onClick={() => {
                  sound.playTap();
                  setShowAdminModal(false);
                }}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer"
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>

              {/* Icon & Title */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg leading-tight">
                    Admin / Bypass Mode
                  </h3>
                  <p className="text-xs text-black/60 dark:text-white/60 font-sans">
                    Development and end-to-end testing
                  </p>
                </div>
              </div>

              {/* Current Status */}
              {isAdminMode ? (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold mb-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Admin Mode is currently ACTIVE</span>
                    </div>
                    <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
                      Network authentication is bypassed.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      id="btn-deactivate-admin-mode"
                      type="button"
                      onClick={() => {
                        sound.playTap();
                        exitAdminMode();
                        setShowAdminModal(false);
                      }}
                      className="flex-1 py-3 rounded-2xl border border-red-500/30 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-600 dark:text-red-400 font-serif font-bold text-xs transition-all active:scale-95 cursor-pointer"
                    >
                      Deactivate Admin Mode
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        sound.playTap();
                        setShowAdminModal(false);
                      }}
                      className="px-4 py-3 rounded-2xl bg-black/5 dark:bg-white/10 hover:bg-black/10 text-xs font-bold transition-all cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (enterAdminMode(adminCodeInput)) {
                      sound.playSuccess();
                      setAdminCodeError('');
                      setShowAdminModal(false);
                    } else {
                      sound.playError();
                      setAdminCodeError('Invalid access code. Please verify credentials and try again.');
                    }
                  }}
                  className="space-y-4"
                >
                  <p className="text-xs text-black/70 dark:text-white/70 font-sans leading-relaxed">
                    Enter the authorized access code to bypass database calls for offline testing.
                  </p>

                  <div>
                    <label className="block text-xs font-bold font-serif uppercase tracking-wider text-black/80 dark:text-white/80 mb-1.5">
                      Access Code
                    </label>
                    <div className="relative">
                      <input
                        id="input-admin-code"
                        type={showAdminCodePassword ? 'text' : 'password'}
                        autoFocus
                        value={adminCodeInput}
                        onChange={(e) => {
                          setAdminCodeInput(e.target.value);
                          if (adminCodeError) setAdminCodeError('');
                        }}
                        placeholder="Enter access code"
                        className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-sm font-mono tracking-wider focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all ${
                          adminCodeError
                            ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                            : 'border-[#22331E]/20 dark:border-[#2D3A2B] bg-white dark:bg-[#121411]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminCodePassword(!showAdminCodePassword)}
                        className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                        title={showAdminCodePassword ? 'Hide' : 'Show'}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {showAdminCodePassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                    {adminCodeError && (
                      <p className="text-[11px] text-red-500 mt-1 font-medium">
                        {adminCodeError}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      id="btn-submit-admin-code"
                      type="submit"
                      className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-serif font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">verified_user</span>
                      <span>Verify & Enter Admin</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAdminModal(false)}
                      className="px-4 py-3 rounded-2xl bg-black/5 dark:bg-white/10 hover:bg-black/10 text-xs font-bold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
