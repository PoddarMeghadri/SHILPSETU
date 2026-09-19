import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSignUp, useSignIn, useClerk } from '@clerk/clerk-react';
import { sound } from '../../services/sound';
import { ShilpSetuLogo } from '../common/ShilpSetuLogo';
import { INDIAN_STATES_AND_CITIES } from '../../data/indianLocations';
import { LanguageCode } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useAdminMode } from '../../context/AdminModeContext';
import { LanguageSelectionScreen } from './LanguageSelectionScreen';
import { CRAFT_OPTIONS, getLocalizedCraftName, getEnterWorkshopLabel } from '../../data/crafts';
import { fetchAuthRequest, withAuthRequestTimeout } from '../../services/authRequest';
import { sendSupabaseOtp, verifySupabaseOtp, upsertSupabaseProfile, getSupabase, signInSupabaseWithEmailOrMobile } from '../../services/supabase';
import { validatePassword, passwordsMatch, passwordStrength, PASSWORD_MAX_LENGTH } from '../../services/passwordValidation';

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
  const [signInIdentifier, setSignInIdentifier] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInError, setSignInError] = useState('');
  const [signInEmail, setSignInEmail] = useState('');

  // Clerk Auth Hooks
  const clerk = useClerk();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();
  const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn();

  // Form errors
  const [nameError, setNameError] = useState<string>('');
  const [stateError, setStateError] = useState<string>('');
  const [cityError, setCityError] = useState<string>('');
  const [mobileError, setMobileError] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');

  // Clerk Auth Flow & Cooldown State
  const [authFlowMode, setAuthFlowMode] = useState<'sign_up' | 'sign_in' | 'backend'>('sign_up');
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Available cities based on selected state
  const availableCities =
    INDIAN_STATES_AND_CITIES.find((s) => s.state === selectedState)?.cities || [];

  // Flexible OTP length state (supports both standard 6-digit and Supabase 8-digit OTPs)
  const [otpLength, setOtpLength] = useState<6 | 8>(6);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState<string>('');
  const [resendNotice, setResendNotice] = useState<string>('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [showSupabaseOtpTip, setShowSupabaseOtpTip] = useState<boolean>(true);
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
          sound.playSuccess();
          setCurrentStep(3);
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
      if (!identifier || !signInPassword) {
        setSignInError('Enter your registered email or mobile number and password.');
        return;
      }
      setIsSendingOtp(true);
      setSignInError('');
      try {
        // 1. Attempt Supabase direct sign-in if client exists
        let supabaseSuccess = false;
        let supabaseUser: any = null;
        try {
          const sbResult = await signInSupabaseWithEmailOrMobile(identifier, signInPassword);
          if (sbResult.signedIn) {
            supabaseSuccess = true;
            supabaseUser = sbResult.user;
          }
        } catch (sbErr) {
          console.warn('[Supabase Sign In Notice]:', sbErr);
        }

        // 2. Authenticate with backend /api/auth/login directly (no OTP required)
        const res = await fetchAuthRequest('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password: signInPassword }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok && !supabaseSuccess) {
          throw new Error(data.error || 'The email/mobile number or password is incorrect.');
        }

        // Successful direct sign-in! No OTP step needed.
        sound.playSuccess();
        if (data.token) {
          localStorage.setItem('shilpsetu_token', data.token);
        }

        const loggedIn = data.artisan || {};
        const artisanName = loggedIn.fullName || loggedIn.name || supabaseUser?.user_metadata?.full_name || 'Master Artisan';
        const artisanEmail = loggedIn.email || (identifier.includes('@') ? identifier : supabaseUser?.email) || '';
        const artisanMobile = loggedIn.mobile || (!identifier.includes('@') ? identifier : '') || '';
        const artisanState = loggedIn.state || 'Uttar Pradesh';
        const artisanCity = loggedIn.city || 'Varanasi';
        const storedCraft = String(loggedIn.craft || 'pottery').toLowerCase();
        const craftId = CRAFT_OPTIONS.find((c) =>
          storedCraft.includes(c.name.toLowerCase().split(' ')[0]) || storedCraft.includes(c.id.toLowerCase())
        )?.id || 'pottery';

        setFullName(artisanName);
        setEmail(artisanEmail);
        setMobile(artisanMobile);
        setSelectedState(artisanState);
        setSelectedCity(artisanCity);
        setSelectedCraft(craftId);

        // Directly complete sign-in and open dashboard!
        onComplete({
          fullName: artisanName,
          gender: loggedIn.gender || gender || 'prefer_not_to_say',
          state: artisanState,
          city: artisanCity,
          mobile: artisanMobile,
          email: artisanEmail || undefined,
          selectedCraft: craftId,
          selectedLanguage: language,
        });
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
      setResendNotice('Admin Mode: Network calls bypassed. Enter code 000000');
      setCurrentStep(2);
      return;
    }

    setIsSendingOtp(true);
    setOtpError('');
    setEmailError('');

    let sentViaClerk = false;
    let clerkErrorMessage = '';
    const supabaseOtp = await sendSupabaseOtp(cleanEmail);
    const sentViaSupabase = supabaseOtp.sent;

    // 1. Clerk Email Verification Flow (Dispatches the 6-digit OTP verification code)
    if (!sentViaSupabase && isSignUpLoaded && signUp) {
      try {
        console.log('[Clerk Auth] Current signUp status:', signUp.status, 'email:', signUp.emailAddress);

        // A. If an active sign-up is already in missing_requirements
        if (signUp.status === 'missing_requirements') {
          try {
            if (signUp.emailAddress && signUp.emailAddress.toLowerCase() !== cleanEmail) {
              await withAuthRequestTimeout(signUp.update({ emailAddress: cleanEmail }), 'Updating your verification email');
            }
            await withAuthRequestTimeout(
              signUp.prepareEmailAddressVerification({ strategy: 'email_code' }),
              'Sending your verification code'
            );
            sentViaClerk = true;
            setAuthFlowMode('sign_up');
            console.log('[Clerk Auth] OTP email successfully dispatched via existing sign_up');
          } catch (prepErr: any) {
            console.warn('[Clerk Auth] Existing prepare failed, will reset client:', prepErr?.message);
            try {
              if ((clerk.client as any)?.resetSignUp) {
                (clerk.client as any).resetSignUp();
              }
            } catch {}
          }
        }

        // B. If not dispatched, create a fresh sign up
        if (!sentViaClerk) {
          try {
            await withAuthRequestTimeout(
              signUp.create({
                emailAddress: cleanEmail,
                password,
                firstName: fullName.trim().split(' ')[0] || fullName.trim(),
                lastName: fullName.trim().split(' ').slice(1).join(' ') || undefined,
              }),
              'Creating your verification session'
            );

            await withAuthRequestTimeout(
              signUp.prepareEmailAddressVerification({ strategy: 'email_code' }),
              'Sending your verification code'
            );
            sentViaClerk = true;
            setAuthFlowMode('sign_up');
            console.log('[Clerk Auth] OTP email successfully dispatched via new sign_up');
          } catch (createErr: any) {
            const createMsg = createErr?.errors?.[0]?.message || createErr?.message || '';
            console.warn('[Clerk Auth] SignUp create error:', createMsg, createErr);
            clerkErrorMessage = createMsg;

            // If Clerk says a sign up is in progress, prepare verification on it
            if (signUp.status === 'missing_requirements') {
              try {
                if (signUp.emailAddress && signUp.emailAddress.toLowerCase() !== cleanEmail) {
                  await withAuthRequestTimeout(signUp.update({ emailAddress: cleanEmail }), 'Updating your verification email');
                }
                await withAuthRequestTimeout(
                  signUp.prepareEmailAddressVerification({ strategy: 'email_code' }),
                  'Sending your verification code'
                );
                sentViaClerk = true;
                setAuthFlowMode('sign_up');
                console.log('[Clerk Auth] OTP email dispatched via recovered sign_up');
              } catch (prepErr: any) {
                console.warn('[Clerk Auth] Recovered prepare failed:', prepErr);
              }
            }

            // C. If user is already registered in Clerk, use SignIn email_code factor
            if (!sentViaClerk && isSignInLoaded && signIn) {
              try {
                const signInAttempt = await withAuthRequestTimeout(
                  signIn.create({ identifier: cleanEmail }),
                  'Creating your sign-in session'
                );

                const emailFactor = signInAttempt.supportedFirstFactors?.find(
                  (f: any) => f.strategy === 'email_code'
                );

                if (emailFactor && 'emailAddressId' in emailFactor) {
                  await withAuthRequestTimeout(
                    signIn.prepareFirstFactor({
                      strategy: 'email_code',
                      emailAddressId: (emailFactor as any).emailAddressId,
                    }),
                    'Sending your verification code'
                  );
                  sentViaClerk = true;
                  setAuthFlowMode('sign_in');
                  console.log('[Clerk Auth] OTP email successfully dispatched via sign_in factor');
                }
              } catch (signInErr: any) {
                const signInMsg = signInErr?.errors?.[0]?.message || signInErr?.message || '';
                console.warn('[Clerk Auth] SignIn error:', signInMsg);
                if (!clerkErrorMessage) {
                  clerkErrorMessage = signInMsg;
                }
              }
            }
          }
        }
      } catch (overallClerkErr: any) {
        clerkErrorMessage = overallClerkErr?.errors?.[0]?.message || overallClerkErr?.message || '';
        console.error('[Clerk Auth] Overall error:', clerkErrorMessage);
      }
    }

    // 2. Notify backend session tracker
    let backendSuccess = false;
    let backendErrorMessage = '';
    try {
      const res = await fetchAuthRequest('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, mobile: cleanMobile }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        if (data?.success) {
          backendSuccess = true;
        }
      } else if (data?.error) {
        backendErrorMessage = data.error;
      }
    } catch (err: any) {
      console.warn('Backend OTP sync notice:', err);
      backendErrorMessage = err?.message || '';
    }

    // Stop only if both Clerk and Backend were unable to dispatch verification code
    if (!sentViaClerk && !backendSuccess && !sentViaSupabase) {
      setIsSendingOtp(false);
      setEmailError(
        clerkErrorMessage || supabaseOtp.error ||
        backendErrorMessage ||
        'Could not dispatch verification code to your email. Please check your email address or try again.'
      );
      return;
    }

    setIsSendingOtp(false);
    setResendCooldown(30);
    setResendNotice('');
    setCurrentStep(2);
  };

  // Resend verification code with cooldown protection
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isSendingOtp) return;
    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = mobile.replace(/\D/g, '');
    if (!cleanEmail) return;

    sound.playTap();

    if (isAdminMode) {
      sound.playSuccess();
      setOtpDigits(['', '', '', '', '', '']);
      setOtpError('');
      setResendNotice('Admin Mode: Use verification code 000000');
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 50);
      return;
    }

    setIsSendingOtp(true);
    setOtpError('');
    setResendNotice('');

    let resendSuccess = false;
    let resendError = '';

    // 1. If currently in Sign-In mode, attempt sign-in factor first
    if (authFlowMode === 'sign_in' && isSignInLoaded && signIn) {
      try {
        let factor = signIn.supportedFirstFactors?.find((f: any) => f.strategy === 'email_code');
        if (!factor) {
          const attempt = await withAuthRequestTimeout(
            signIn.create({ identifier: cleanEmail }),
            'Creating your sign-in session'
          );
          factor = attempt.supportedFirstFactors?.find((f: any) => f.strategy === 'email_code');
        }
        if (factor && 'emailAddressId' in factor) {
          await withAuthRequestTimeout(
            signIn.prepareFirstFactor({
              strategy: 'email_code',
              emailAddressId: (factor as any).emailAddressId,
            }),
            'Sending your verification code'
          );
          resendSuccess = true;
          console.log('[Clerk Resend] Dispatched via sign_in factor');
        }
      } catch (signInErr: any) {
        console.warn('[Clerk Resend Sign-In Notice]:', signInErr);
        resendError = signInErr?.errors?.[0]?.message || signInErr?.message || '';
      }
    }

    // 2. Resend via Clerk Sign-Up
    if (!resendSuccess && isSignUpLoaded && signUp) {
      try {
        if (signUp.status === 'missing_requirements') {
          if (signUp.emailAddress && signUp.emailAddress.toLowerCase() !== cleanEmail) {
            await withAuthRequestTimeout(signUp.update({ emailAddress: cleanEmail }), 'Updating your verification email');
          }
          await withAuthRequestTimeout(
            signUp.prepareEmailAddressVerification({ strategy: 'email_code' }),
            'Sending your verification code'
          );
          resendSuccess = true;
          setAuthFlowMode('sign_up');
          console.log('[Clerk Resend] Dispatched via existing sign_up');
        } else {
          try {
            if ((clerk.client as any)?.resetSignUp) {
              (clerk.client as any).resetSignUp();
            }
          } catch {}
          const newSignUp = await withAuthRequestTimeout(
            signUp.create({
              emailAddress: cleanEmail,
              password,
              firstName: fullName.trim().split(' ')[0] || fullName.trim(),
              lastName: fullName.trim().split(' ').slice(1).join(' ') || undefined,
            }),
            'Creating your verification session'
          );
          await withAuthRequestTimeout(
            newSignUp.prepareEmailAddressVerification({ strategy: 'email_code' }),
            'Sending your verification code'
          );
          resendSuccess = true;
          setAuthFlowMode('sign_up');
          console.log('[Clerk Resend] Dispatched via fresh sign_up');
        }
      } catch (signUpErr: any) {
        console.warn('[Clerk Resend Sign-Up Notice]:', signUpErr);
        if (!resendError) {
          resendError = signUpErr?.errors?.[0]?.message || signUpErr?.message || '';
        }
        // Fallback to sign-in if email already registered
        if (!resendSuccess && isSignInLoaded && signIn) {
          try {
            const attempt = await withAuthRequestTimeout(
              signIn.create({ identifier: cleanEmail }),
              'Creating your sign-in session'
            );
            const factor = attempt.supportedFirstFactors?.find((f: any) => f.strategy === 'email_code');
            if (factor && 'emailAddressId' in factor) {
              await withAuthRequestTimeout(
                signIn.prepareFirstFactor({
                  strategy: 'email_code',
                  emailAddressId: (factor as any).emailAddressId,
                }),
                'Sending your verification code'
              );
              resendSuccess = true;
              setAuthFlowMode('sign_in');
              console.log('[Clerk Resend] Recovered via sign_in');
            }
          } catch (recErr: any) {
            console.warn('[Clerk Resend Sign-In Recovery]:', recErr);
          }
        }
      }
    }

    // 3. Backend sync & Supabase Mailer
    try {
      const res = await fetchAuthRequest('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, mobile: cleanMobile }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        if (data?.success) {
          resendSuccess = true;
        }
      } else if (data?.error && !resendError) {
        resendError = data.error;
      }
    } catch (backendErr: any) {
      console.warn('[Backend Resend Sync Notice]:', backendErr);
      if (!resendError) {
        resendError = backendErr?.message || '';
      }
    }

    setIsSendingOtp(false);
    if (resendSuccess) {
      sound.playSuccess();
      setResendCooldown(30);
      setOtpDigits(['', '', '', '', '', '']);
      setOtpError('');
      setResendNotice('New verification code sent to your email!');
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 50);
    } else {
      setOtpError(resendError || 'Failed to resend verification code. Please wait a moment.');
    }
  };

  // Handle OTP digit changes with support for 6 or 8 digits
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const cleaned = value.replace(/\D/g, '');
      const targetLen: 6 | 8 = cleaned.length >= 8 ? 8 : 6;
      if (targetLen !== otpLength) {
        setOtpLength(targetLen);
      }
      const pasted = cleaned.slice(0, targetLen).split('');
      const newOtp = Array(targetLen).fill('');
      pasted.forEach((char, i) => {
        if (i < targetLen) newOtp[i] = char;
      });
      setOtpDigits(newOtp);
      const nextIndex = Math.min(pasted.length, targetLen - 1);
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
    if (digit && index < otpLength - 1) {
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

    let clerkSuccess = false;
    let clerkSessionId = '';
    let clerkVerificationError = '';

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

      // Keep admin onboarding in the shared flow so language and workshop selection
      // are completed before the app marks authentication as finished.
      setCurrentStep(3);
      return;
    }

    // 1. Verify 6-digit code with Supabase Auth
    let supabaseSuccess = false;
    let supabaseAccessToken = '';
    try {
      const supabaseVerification = await verifySupabaseOtp(cleanEmail, fullOtp);
      if (supabaseVerification.verified) {
        supabaseSuccess = true;
        supabaseAccessToken = supabaseVerification.session?.access_token || '';
      }
    } catch (sbErr: any) {
      console.warn('[Supabase client verification check]:', sbErr);
    }

    if (supabaseSuccess) {
      const supaToken = supabaseAccessToken || `artisan_supa_${Date.now()}`;
      localStorage.setItem('shilpsetu_token', supaToken);

      // Non-blocking backend registration with supabaseVerified flag
      try {
        const res = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            mobile: cleanMobile,
            otp: fullOtp,
            supabaseVerified: true,
            supabaseAccessToken: supabaseAccessToken || undefined,
            artisanDetails: {
              fullName: fullName.trim(),
              state: selectedState,
              city: effectiveCity,
              gender,
              email: cleanEmail,
              selectedLanguage: language,
              password,
            },
          }),
        });
        if (res.ok) {
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const data = await res.json().catch(() => null);
            if (data?.token) {
              localStorage.setItem('shilpsetu_token', data.token);
            }
          }
        }
      } catch (e) {
        console.warn('[Backend Sync Notice] Retained verified Supabase session token:', e);
      }

      try {
        await upsertSupabaseProfile({
          fullName: fullName.trim() || 'Master Artisan',
          email: cleanEmail,
          mobileNumber: cleanMobile,
          preferredLanguage: language,
          desiredWorkshop: selectedCraft,
          location: `${effectiveCity}, ${selectedState}`,
          craftSpecialty: getLocalizedCraftName(selectedCraft, language),
        });
      } catch (e) {
        console.warn('[Supabase Profile Sync Notice]:', e);
      }

      sound.playSuccess();
      setIsVerifyingOtp(false);
      setOtpError('');
      setResendNotice('');
      setCurrentStep(3); // Proceed to language selection
      return;
    }

    // 1. Verify with Clerk Sign-Up
    if (!clerkSuccess && isSignUpLoaded && signUp) {
      try {
        const completeSignUp = await signUp.attemptEmailAddressVerification({
          code: fullOtp,
        });
        const isEmailVerified =
          completeSignUp.status === 'complete' ||
          completeSignUp.verifications?.emailAddress?.status === 'verified';

        if (isEmailVerified) {
          clerkSuccess = true;
          clerkSessionId = completeSignUp.createdSessionId || '';
          if (completeSignUp.createdSessionId && setSignUpActive) {
            await setSignUpActive({ session: completeSignUp.createdSessionId });
          }
        }
      } catch (clerkErr: any) {
        clerkVerificationError = clerkErr?.errors?.[0]?.message || clerkErr?.message || '';
        console.warn('[Clerk Auth] Sign-up verification notice:', clerkVerificationError);
      }
    }

    // 2. Verify with Clerk Sign-In if Sign-Up was not completed
    if (!clerkSuccess && isSignInLoaded && signIn) {
      try {
        const completeSignIn = await signIn.attemptFirstFactor({
          strategy: 'email_code',
          code: fullOtp,
        });
        if (completeSignIn.status === 'complete') {
          clerkSuccess = true;
          clerkSessionId = completeSignIn.createdSessionId || '';
          if (completeSignIn.createdSessionId && setSignInActive) {
            await setSignInActive({ session: completeSignIn.createdSessionId });
          }
        }
      } catch (clerkErr: any) {
        if (!clerkVerificationError) {
          clerkVerificationError = clerkErr?.errors?.[0]?.message || clerkErr?.message || '';
        }
        console.warn('[Clerk Auth] Sign-in verification notice:', clerkErr);
      }
    }

    // 3. If Clerk successfully verified the OTP email code, authenticate user directly
    if (clerkSuccess) {
      const clerkToken = clerkSessionId || `artisan_clerk_${Date.now()}`;
      localStorage.setItem('shilpsetu_token', clerkToken);

      // Non-blocking backend registration
      try {
        const res = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            mobile: cleanMobile,
            otp: fullOtp,
            clerkVerified: true,
            clerkSessionId: clerkSessionId || undefined,
            artisanDetails: {
              fullName: fullName.trim(),
              state: selectedState,
              city: effectiveCity,
              gender,
              email: cleanEmail,
              selectedLanguage: language,
              password,
            },
          }),
        });
        if (res.ok) {
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const data = await res.json().catch(() => null);
            if (data?.token) {
              localStorage.setItem('shilpsetu_token', data.token);
            }
          }
        }
      } catch (e) {
        console.warn('[Backend Sync Notice] Retained verified Clerk session token:', e);
      }

      sound.playSuccess();
      setIsVerifyingOtp(false);
      setOtpError('');
      setResendNotice('');
      setCurrentStep(3); // Proceed to language selection
      return;
    }

    // 4. Backend verification fallback (for direct OTP or Supabase Auth mailer)
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          mobile: cleanMobile,
          otp: fullOtp,
          clerkVerified: false,
          artisanDetails: {
            fullName: fullName.trim(),
            state: selectedState,
            city: effectiveCity,
            gender,
            email: cleanEmail,
            selectedLanguage: language,
            password,
          },
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        // Backend returned HTML or 404 (e.g., static hosting)
        console.warn('Backend returned non-JSON response during OTP verify');
        setOtpError(
          clerkVerificationError ||
          'Verification service is updating. Please retry or request a new code.'
        );
        setIsVerifyingOtp(false);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || clerkVerificationError || 'Verification failed. Please check the code sent to your email.');
        setIsVerifyingOtp(false);
        return;
      }

      if (data.token) {
        localStorage.setItem('shilpsetu_token', data.token);
      }

      sound.playSuccess();
      setIsVerifyingOtp(false);
      setOtpError('');
      setResendNotice('');
      setCurrentStep(3); // Proceed to language selection
    } catch (err: any) {
      console.warn('Network error during OTP verify:', err);
      setOtpError(
        clerkVerificationError ||
        'Unable to connect to verification server. Please retry or request a new code.'
      );
      setIsVerifyingOtp(false);
    }
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
                  <div className="flex items-center justify-center gap-2.5">
                    <h1
                      className={`font-serif font-black text-3xl md:text-4xl tracking-wider uppercase ${
                        isAdminMode ? 'text-[#059669]' : 'text-[#B5451B]'
                      }`}
                    >
                      {t('app_title', 'SHILPSETU')}
                    </h1>
                    {isAdminMode && (
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-[#059669] text-white rounded-md shadow-xs flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 animate-pulse" />
                        ADMIN
                      </span>
                    )}
                  </div>
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

        {/* STEP 1: SIGN IN (IDENTIFIER + PASSWORD ONLY) */}
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
                <p className="text-xs text-black/70 dark:text-white/70">Enter your registered email or mobile number and password to sign in directly.</p>
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
                <div>
                  <label className="block text-xs font-bold font-serif uppercase tracking-wider text-[#B5451B] mb-1.5">Password</label>
                  <input type="password" required value={signInPassword}
                    onChange={(e) => { setSignInPassword(e.target.value); setSignInError(''); }}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 rounded-2xl border text-sm bg-white dark:bg-[#1C221A] border-[#22331E]/20 dark:border-[#2D3A2B] focus:outline-hidden focus:ring-2 focus:ring-[#B5451B]/30" />
                </div>
                {signInError && <p className="text-xs text-red-500 font-medium">{signInError}</p>}
              </form>
            </div>
            <div className="pt-6 pb-4">
              <button type="button" disabled={isSendingOtp} onClick={() => handleProceedToOtp({ preventDefault: () => {} } as React.FormEvent)}
                className="w-full py-4 bg-[#B5451B] hover:bg-[#9C3A14] text-white font-serif font-bold text-base rounded-full shadow-artisan disabled:opacity-50 cursor-pointer transition-all flex items-center justify-center gap-2">
                {isSendingOtp ? (
                  <>
                    <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                    <span>Signing In...</span>
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

        {/* STEP 1: PERSONAL DETAILS (FULL NAME*, MOBILE NUMBER*, EMAIL ADDRESS) */}
        {currentStep === 1 && authFlowMode !== 'sign_in' && (
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
                    {isAdminMode && (
                      <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-[#059669] text-white rounded-md shadow-xs">
                        Admin
                      </span>
                    )}
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
                  {mobileError ? (
                    <p className="text-[11px] text-red-500 mt-1 font-medium">{mobileError}</p>
                  ) : (
                    <p className="text-[10px] text-black/60 dark:text-white/60 mt-1">
                      {t('we_will_send_otp', 'We will send a 6-digit OTP to this number.')}
                    </p>
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
                    <p className="text-[11px] text-red-500 mt-1 font-medium">{emailError}</p>
                  ) : (
                    <p className="text-[10px] text-black/60 dark:text-white/60 mt-1">
                      {t('email_verification_notice', 'A 6-digit Clerk email verification code will be sent to this email.')}
                    </p>
                  )}
                </div>

                {!isAdminMode && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold font-serif uppercase tracking-wider text-[#B5451B]">
                      Create password <span className="text-red-500">*</span>
                    </label>
                    <input type="password" required minLength={8} maxLength={PASSWORD_MAX_LENGTH} value={password}
                      onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                      placeholder="8–16 characters" className="w-full px-4 py-3 rounded-2xl border text-sm bg-white dark:bg-[#1C221A]" />
                    <div className="flex gap-1" aria-label="Password strength">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <span key={level} className={`h-1.5 flex-1 rounded-full ${passwordStrength(password) >= level ? 'bg-[#B5451B]' : 'bg-black/10 dark:bg-white/10'}`} />
                      ))}
                    </div>
                    <p className="text-[10px] opacity-70">Use uppercase, lowercase, number, and special character.</p>
                    <input type="password" required minLength={8} maxLength={PASSWORD_MAX_LENGTH} value={passwordConfirmation}
                      onChange={(e) => { setPasswordConfirmation(e.target.value); setPasswordError(''); }}
                      placeholder="Confirm password" className="w-full px-4 py-3 rounded-2xl border text-sm bg-white dark:bg-[#1C221A]" />
                    {passwordError && <p className="text-[11px] text-red-500">{passwordError}</p>}
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
                      {t('app_title', 'SHILPSETU')} AUTH
                    </span>
                    {isAdminMode && (
                      <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-[#059669] text-white rounded-md shadow-xs">
                        Admin
                      </span>
                    )}
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
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner ${
                    isAdminMode ? 'bg-[#059669]/15 text-[#059669]' : 'bg-[#B5451B]/15 text-[#B5451B]'
                  }`}
                >
                  <span className="material-symbols-outlined text-3xl">
                    {isAdminMode ? 'admin_panel_settings' : 'mark_email_read'}
                  </span>
                </div>
                <h2 className="font-serif font-bold text-2xl mb-1">
                  {isAdminMode ? 'Admin Verification' : t('email_otp_verification', 'Email OTP Verification')}
                </h2>
                <p className="text-xs text-black/70 dark:text-white/70 font-sans max-w-xs mx-auto mb-1">
                  {t('enter_6_digit_otp_sent_to', 'Enter the 6-digit verification code sent to')}{' '}
                  <span
                    className={`font-mono font-bold break-all ${
                      isAdminMode ? 'text-[#059669]' : 'text-[#B5451B]'
                    }`}
                  >
                    {email || 'your email'}
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
                    <span>Wrong email? Click to change</span>
                  </button>
                </div>

                {/* Email Delivery Notice Banner */}
                {isAdminMode ? (
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/50 rounded-2xl p-3.5 text-center space-y-1 max-w-sm mx-auto shadow-xs">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                      <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
                      <span>Admin Bypass Mode Active</span>
                    </div>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 leading-snug">
                      External network calls are bypassed. Enter hardcoded verification code <strong className="font-mono text-emerald-900 dark:text-emerald-100 font-black">000000</strong> to authenticate.
                    </p>
                  </div>
                ) : (
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 rounded-xl p-3 text-center space-y-1.5 max-w-sm mx-auto shadow-xs">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200">
                      <span className="material-symbols-outlined text-sm">mark_email_read</span>
                      <span>Verification email dispatched</span>
                    </div>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-snug">
                      Please check your <strong>Inbox</strong> and <strong>Spam/Junk</strong> folder for the 6-digit verification code.
                    </p>
                  </div>
                )}

                {!isAdminMode && (
                  <div className="max-w-sm mx-auto mt-2">
                    <button
                      type="button"
                      onClick={() => setShowSupabaseOtpTip((prev) => !prev)}
                      className="text-[11px] font-semibold text-[#B5451B] dark:text-[#E8B84B] hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xs">help_outline</span>
                      <span>{showSupabaseOtpTip ? 'Hide OTP setup instructions' : 'Still receiving a login link instead of numeric OTP? Click here'}</span>
                    </button>
                    {showSupabaseOtpTip && (
                      <div className="mt-2 p-3.5 text-left rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] space-y-2 text-black/85 dark:text-white/85 shadow-xs">
                        <p className="font-bold text-[#B5451B] dark:text-[#E8B84B] text-xs">
                          How to make Supabase send strictly OTP (No Link):
                        </p>
                        <p className="leading-snug text-[11px]">
                          Supabase has <strong>two separate templates</strong>. New registrations trigger <strong>Confirm signup</strong> (not Magic Link):
                        </p>
                        <ol className="list-decimal list-inside space-y-1.5 pl-1 text-[10.5px]">
                          <li>
                            Open <strong>Supabase Dashboard</strong> &rarr; <strong>Authentication</strong> &rarr; <strong>Email Templates</strong>.
                          </li>
                          <li>
                            Click <strong>Confirm signup</strong>. Completely remove <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded font-mono text-[10px]">&lt;a href="&#123;&#123; .ConfirmationURL &#125;&#125;"&gt;Confirm your mail&lt;/a&gt;</code> and replace with:
                            <div className="mt-1 p-1.5 bg-black/10 dark:bg-black/40 rounded font-mono text-[10px] font-bold text-[#B5451B] dark:text-[#E8B84B]">
                              &#123;&#123; .Token &#125;&#125;
                            </div>
                          </li>
                          <li>
                            Click <strong>Magic Link</strong> and also ensure it uses <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded font-mono text-[10px] font-bold">&#123;&#123; .Token &#125;&#125;</code> instead of ConfirmationURL.
                          </li>
                          <li>
                            To set 6 digits: Under <strong>Authentication</strong> &rarr; <strong>Providers</strong> &rarr; <strong>Email</strong>, set <strong>OTP length</strong> to <strong>6</strong>.
                          </li>
                          <li>Click <strong>Save</strong>. Supabase will strictly send the numeric OTP code!</li>
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Code Length Toggle */}
              {!isAdminMode && (
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="text-[11px] text-black/50 dark:text-white/50">Code format:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpLength(6);
                      setOtpDigits((prev) => {
                        const next = prev.slice(0, 6);
                        while (next.length < 6) next.push('');
                        return next;
                      });
                    }}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      otpLength === 6
                        ? 'bg-[#B5451B] text-white shadow-xs'
                        : 'bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60 hover:bg-black/10'
                    }`}
                  >
                    6-Digit OTP
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpLength(8);
                      setOtpDigits((prev) => {
                        const next = [...prev];
                        while (next.length < 8) next.push('');
                        return next.slice(0, 8);
                      });
                    }}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      otpLength === 8
                        ? 'bg-[#B5451B] text-white shadow-xs'
                        : 'bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60 hover:bg-black/10'
                    }`}
                  >
                    8-Digit OTP
                  </button>
                </div>
              )}

              {/* Digit Input Boxes */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-center flex-wrap gap-2 max-w-sm mx-auto">
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
                          ? isAdminMode
                            ? 'border-[#059669] bg-white dark:bg-[#1C221A] text-[#059669] shadow-sm'
                            : 'border-[#B5451B] bg-white dark:bg-[#1C221A] text-[#B5451B] shadow-sm'
                          : 'border-[#22331E]/20 dark:border-[#2D3A2B] bg-white dark:bg-[#1C221A]'
                      }`}
                    />
                  ))}
                </div>

                {resendNotice && (
                  <div className="flex items-center justify-center gap-1.5 text-center text-xs text-emerald-600 dark:text-emerald-400 font-medium px-4">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    <span>{resendNotice}</span>
                  </div>
                )}

                {otpError && (
                  <p className="text-center text-xs text-red-500 font-medium px-4">{otpError}</p>
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
            initialLanguage="en"
            onSelectLanguage={(newLang) => {
              setLanguage(newLang);
              if (authFlowMode === 'sign_in') {
                onComplete({
                  fullName: fullName.trim(),
                  gender,
                  state: selectedState,
                  city: selectedCity === 'Other' ? customCity.trim() : selectedCity,
                  mobile: mobile.trim(),
                  email: email.trim() || undefined,
                  selectedCraft,
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
                      Network authentication is bypassed. Theme accent is set to emerald green.
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
                    Enter the authorized access code to bypass external Supabase and Clerk calls for offline testing.
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
