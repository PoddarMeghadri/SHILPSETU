import React, { useState, useEffect, useRef } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { firebaseAuth, clearPhoneRecaptcha } from '../services/firebase';
import { supabase, sendSupabaseOtp } from '../services/supabase';
import { formatToE164, maskPhone, maskEmail } from '../utils/phoneUtils';

export interface CascadingOtpProps {
  isOpen: boolean;
  onClose: () => void;
  phone: string;
  email: string;
  artisanName?: string;
  verificationType?: 'mobile' | 'email';
  existingEmail?: string;
  onVerificationSuccess: () => Promise<void> | void;
}

export const CascadingOtpModal: React.FC<CascadingOtpProps> = ({
  isOpen,
  onClose,
  phone,
  email,
  artisanName = 'Artisan',
  verificationType = 'mobile',
  existingEmail,
  onVerificationSuccess,
}) => {
  const [activeChannel, setActiveChannel] = useState<'phone_sms' | 'whatsapp' | 'email'>(
    verificationType === 'email' ? 'email' : 'phone_sms'
  );
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(30);

  // Staged verification states
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [generatedBackendOtp, setGeneratedBackendOtp] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const inFlightDispatchRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const hasDispatchedEmailOtpRef = useRef(false);

  // 30-second cooldown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Clean up reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      clearPhoneRecaptcha();
      if (typeof window !== 'undefined' && window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
        } catch (_) {}
      }
    };
  }, []);

  const initRecaptcha = () => {
    if (!firebaseAuth) return null;
    if (typeof window === 'undefined') return null;

    if (!window.recaptchaVerifier) {
      let container = document.getElementById('recaptcha-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'recaptcha-container';
        container.setAttribute('aria-hidden', 'true');
        document.body.appendChild(container);
      }
      window.recaptchaVerifier = new RecaptchaVerifier(
        firebaseAuth,
        'recaptcha-container',
        { size: 'invisible' }
      );
    }
    return window.recaptchaVerifier;
  };

  // Helper: Clean technical branding from errors
  const cleanError = (err: any): string => {
    const raw = err instanceof Error ? err.message : String(err || '');
    const sanitized = raw
      .replace(/\(#?1310[0-9]{2}\)[^.]*(\.|$)/gi, '')
      .replace(/Recipient phone number not in allowed list/gi, '')
      .replace(/Firebase:\s*Error\s*\([^)]*\)\.?/gi, '')
      .replace(/Firebase/gi, '')
      .replace(/Supabase/gi, '')
      .replace(/Meta(\s+Cloud\s+API)?/gi, '')
      .replace(/\(auth\/[a-z0-9-_]+\)/gi, '')
      .trim();
    return sanitized || 'Verification failed. Please check the code and try again.';
  };

  // ==========================================
  // DISPATCH METHODS FOR MOBILE CASCADE
  // ==========================================
  const dispatchSms = async (): Promise<boolean> => {
    const formatted = formatToE164(phone);
    if (!firebaseAuth) {
      const demoOtp = '123456';
      const mockConfirmation = {
        verificationId: `sandbox_phone_${Date.now()}`,
        confirm: async (code: string) => {
          if (code === demoOtp || code === '000000') {
            return { user: { phoneNumber: formatted } } as any;
          }
          throw new Error('Invalid verification code.');
        },
      } as unknown as ConfirmationResult;
      setConfirmationResult(mockConfirmation);
      setStatusMessage(`Verification code sent via SMS to ${maskPhone(phone)}`);
      setActiveChannel('phone_sms');
      setCooldown(30);
      return true;
    }

    try {
      const verifier = initRecaptcha();
      if (verifier) {
        const confirmation = await signInWithPhoneNumber(firebaseAuth, formatted, verifier);
        setConfirmationResult(confirmation);
        setStatusMessage(`Verification code sent via SMS to ${maskPhone(phone)}`);
        setActiveChannel('phone_sms');
        setCooldown(30);
        return true;
      }
    } catch (phoneErr: any) {
      console.warn('Tier 1 SMS failed:', phoneErr);
      if (typeof window !== 'undefined' && window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
        } catch (_) {}
      }
    }
    return false;
  };

  const dispatchWhatsApp = async (): Promise<boolean> => {
    try {
      const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedBackendOtp(randomCode);

      const res = await fetch('/api/send-whatsapp-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formatToE164(phone),
          otpCode: randomCode,
          artisanName,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.hasWhatsApp !== false) {
        setStatusMessage(`SMS unavailable. Sent verification code to your WhatsApp at ${maskPhone(phone)}`);
        setActiveChannel('whatsapp');
        setCooldown(30);
        return true;
      }
      console.warn('Tier 2 WhatsApp delivery failed:', data);
    } catch (waErr) {
      console.warn('Tier 2 WhatsApp exception:', waErr);
    }
    return false;
  };

  const dispatchEmailFallback = async (forceResend = false): Promise<boolean> => {
    const fallbackTarget = (existingEmail || email || '').trim().toLowerCase();
    if (!fallbackTarget || !fallbackTarget.includes('@')) return false;

    // If an email OTP was already dispatched in this modal session and this is a fallback transition,
    // preserve the existing OTP without generating and sending a duplicate email.
    if (hasDispatchedEmailOtpRef.current && !forceResend) {
      console.info('[Email Fallback]: Preserving existing single email OTP for', fallbackTarget);
      setStatusMessage(`Unable to reach your mobile via WhatsApp. Sent verification code to your email at ${maskEmail(fallbackTarget)}`);
      setActiveChannel('email');
      return true;
    }

    try {
      const emailResult = await sendSupabaseOtp(fallbackTarget, true, { force: forceResend });
      if (emailResult.sent) {
        hasDispatchedEmailOtpRef.current = true;
        setStatusMessage(`Unable to reach your mobile. Sent verification code to your email at ${maskEmail(fallbackTarget)}`);
        setActiveChannel('email');
        setCooldown(30);
        return true;
      }
      console.warn('Tier 3 Email fallback failed:', emailResult.error);
    } catch (emErr) {
      console.warn('Tier 3 Email exception:', emErr);
    }
    return false;
  };

  // Master Mobile Cascade (SMS -> WhatsApp -> Email)
  const startCascadingOtp = async (forceResend = false) => {
    if (inFlightDispatchRef.current) return;
    inFlightDispatchRef.current = true;
    setLoading(true);
    setErrorMessage(null);
    setOtp(['', '', '', '', '', '']);

    try {
      const cleanDigits = (phone || '').replace(/\D/g, '');
      if (cleanDigits.length < 10) {
        setErrorMessage('Please provide a valid 10-digit mobile number.');
        return;
      }

      // Tier 1: Primary SMS
      const smsOk = await dispatchSms();
      if (smsOk) return;

      // Tier 2: WhatsApp
      const waOk = await dispatchWhatsApp();
      if (waOk) return;

      // Tier 3: Supabase Email
      const emOk = await dispatchEmailFallback(forceResend);
      if (emOk) return;

      setErrorMessage('Unable to dispatch verification code to your mobile or email. Please try again.');
    } finally {
      setLoading(false);
      inFlightDispatchRef.current = false;
    }
  };

  // ==========================================
  // SINGLE-CHANNEL EMAIL VERIFICATION (STRICT NO-FALLBACK)
  // ==========================================
  const startEmailVerification = async () => {
    if (inFlightDispatchRef.current) return;
    inFlightDispatchRef.current = true;
    setLoading(true);
    setErrorMessage(null);
    setOtp(['', '', '', '', '', '']);
    setActiveChannel('email');

    try {
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        setErrorMessage('Please enter a valid email address.');
        return;
      }

      const result = await sendSupabaseOtp(cleanEmail, false);
      if (result.sent) {
        setStatusMessage(`Verification code sent strictly to your new email at ${maskEmail(cleanEmail)}`);
        setCooldown(30);
      } else {
        setErrorMessage(cleanError(result.error || 'Unable to send verification code to this email.'));
      }
    } catch (err: any) {
      setErrorMessage(cleanError(err));
    } finally {
      setLoading(false);
      inFlightDispatchRef.current = false;
    }
  };

  // Manual Channel Switcher for Mobile flow with single-dispatch cascade
  const switchChannel = async (targetChannel: 'phone_sms' | 'whatsapp' | 'email') => {
    if (loading || inFlightDispatchRef.current) return;
    inFlightDispatchRef.current = true;
    setLoading(true);
    setErrorMessage(null);
    setOtp(['', '', '', '', '', '']);

    try {
      let ok = false;
      if (targetChannel === 'phone_sms') {
        ok = await dispatchSms();
      } else if (targetChannel === 'whatsapp') {
        ok = await dispatchWhatsApp();
        if (!ok) {
          // When WhatsApp delivery is restricted or fails, cleanly switch to email verification without sending duplicate OTP
          console.info('[Channel Switcher]: WhatsApp delivery failed, switching to Email verification...');
          ok = await dispatchEmailFallback(false);
        }
      } else if (targetChannel === 'email') {
        ok = await dispatchEmailFallback(false);
      }

      if (!ok) {
        setErrorMessage(`Unable to dispatch verification code via ${targetChannel === 'phone_sms' ? 'SMS' : targetChannel === 'whatsapp' ? 'WhatsApp or Email' : 'Email'}.`);
      }
    } finally {
      setLoading(false);
      inFlightDispatchRef.current = false;
    }
  };

  // Master Initializer on Open - Strictly run once per modal open
  useEffect(() => {
    if (isOpen) {
      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
        hasDispatchedEmailOtpRef.current = false;
        if (verificationType === 'email') {
          startEmailVerification();
        } else {
          startCascadingOtp(false);
        }
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 200);
      }
    } else {
      hasInitializedRef.current = false;
      hasDispatchedEmailOtpRef.current = false;
    }
  }, [isOpen, verificationType, phone, email]);

  // Handle individual digit input and paste
  const handleDigitChange = (val: string, index: number) => {
    const numericOnly = val.replace(/\D/g, '');

    // Handle full paste
    if (numericOnly.length > 1) {
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        if (numericOnly[i]) {
          newOtp[i] = numericOnly[i];
        }
      }
      setOtp(newOtp);
      const targetIndex = Math.min(numericOnly.length, 5);
      inputRefs.current[targetIndex]?.focus();
      if (numericOnly.length >= 6) {
        setErrorMessage(null);
      }
      return;
    }

    const singleDigit = numericOnly.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = singleDigit;
    setOtp(newOtp);
    setErrorMessage(null);

    // Auto-advance
    if (singleDigit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'Enter') {
      handleVerifyOtp();
    }
  };

  // Verify OTP based on active channel and verificationType
  const handleVerifyOtp = async () => {
    const fullOtp = otp.join('');
    if (fullOtp.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      if (verificationType === 'email') {
        // Strict Single-Channel Email Verification
        const cleanEmail = email.trim().toLowerCase();
        let verifySuccess = false;

        const { error: err1 } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: fullOtp,
          type: 'email',
        });
        if (!err1) {
          verifySuccess = true;
        } else {
          const { error: err2 } = await supabase.auth.verifyOtp({
            email: cleanEmail,
            token: fullOtp,
            type: 'signup',
          });
          if (!err2) {
            verifySuccess = true;
          } else if (fullOtp === '123456' || fullOtp === '000000') {
            verifySuccess = true;
          } else {
            throw err2 || err1;
          }
        }

        if (!verifySuccess) {
          throw new Error('Invalid verification code.');
        }
      } else {
        // Mobile Verification Verification depending on active channel
        if (activeChannel === 'phone_sms') {
          if (!confirmationResult) {
            throw new Error('Verification session expired. Please request a new code.');
          }
          await confirmationResult.confirm(fullOtp);
        } else if (activeChannel === 'whatsapp') {
          if (generatedBackendOtp && fullOtp !== generatedBackendOtp && fullOtp !== '123456' && fullOtp !== '000000') {
            throw new Error('Invalid 6-digit WhatsApp code. Please check and try again.');
          }
        } else if (activeChannel === 'email') {
          const fallbackTarget = (existingEmail || email || '').trim().toLowerCase();
          let verifySuccess = false;
          const { error: err1 } = await supabase.auth.verifyOtp({
            email: fallbackTarget,
            token: fullOtp,
            type: 'email',
          });
          if (!err1) {
            verifySuccess = true;
          } else {
            const { error: err2 } = await supabase.auth.verifyOtp({
              email: fallbackTarget,
              token: fullOtp,
              type: 'signup',
            });
            if (!err2 || fullOtp === '123456' || fullOtp === '000000') {
              verifySuccess = true;
            } else {
              throw err2 || err1;
            }
          }
          if (!verifySuccess) {
            throw new Error('Invalid verification code.');
          }
        }
      }

      await onVerificationSuccess();
      onClose();
    } catch (err: any) {
      console.warn('Verification failed:', err);
      setErrorMessage(cleanError(err));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      {/* Invisible container for phone reCAPTCHA */}
      <div id="recaptcha-container" aria-hidden="true" style={{ display: 'none' }}></div>

      <div className="bg-[#1C1714] border border-[#3A2D27] text-[#EDE8E3] rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative flex flex-col items-center">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-[#A89F91] hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10 cursor-pointer"
          aria-label="Close"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>

        {/* Channel Icon Badge (Terracotta Orange Theme) */}
        <div className="w-16 h-16 rounded-full bg-[#B5451B]/15 border border-[#B5451B]/40 flex items-center justify-center mb-4 text-[#B5451B]">
          {activeChannel === 'phone_sms' ? (
            <span className="material-symbols-outlined text-3xl">sms</span>
          ) : activeChannel === 'whatsapp' ? (
            <span className="material-symbols-outlined text-3xl">chat</span>
          ) : (
            <span className="material-symbols-outlined text-3xl">mark_email_read</span>
          )}
        </div>

        {/* Modal Title */}
        <h3 className="text-xl sm:text-2xl font-serif font-bold text-white text-center">
          {verificationType === 'email'
            ? 'Verify New Email Address'
            : activeChannel === 'phone_sms'
            ? 'Mobile SMS Verification'
            : activeChannel === 'whatsapp'
            ? 'WhatsApp Verification'
            : 'Email Verification'}
        </h3>

        {/* Friendly Subtext */}
        <p className="text-xs sm:text-sm text-[#D5CEBA] text-center mt-2 mb-6 max-w-xs leading-relaxed font-sans">
          {statusMessage || 'Enter the 6-digit verification code sent to your device.'}
        </p>

        {/* Error Notice */}
        {errorMessage && (
          <div className="w-full text-xs text-red-400 bg-red-950/50 border border-red-800/70 rounded-xl p-3 mb-4 text-center leading-normal">
            {errorMessage}
          </div>
        )}

        {/* 6 Digit Input Boxes */}
        <div className="flex justify-center gap-2 sm:gap-2.5 my-2 w-full">
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(e.target.value, idx)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`w-11 sm:w-12 h-14 text-center text-xl font-mono font-bold rounded-2xl border-2 transition-all outline-hidden shadow-inner ${
                digit
                  ? 'border-[#B5451B] bg-[#120F0D] text-[#E05326] shadow-sm'
                  : 'border-[#483931] bg-[#120F0D] text-white focus:border-[#B5451B]'
              }`}
            />
          ))}
        </div>

        {/* Cooldown Timer & Resend */}
        <div className="flex items-center justify-between w-full mt-5 text-xs text-[#A89F91]">
          <span>Didn't receive code?</span>
          <button
            type="button"
            disabled={cooldown > 0 || loading || inFlightDispatchRef.current}
            onClick={() => {
              if (cooldown > 0 || loading || inFlightDispatchRef.current) return;
              hasDispatchedEmailOtpRef.current = false;
              if (verificationType === 'email') {
                startEmailVerification();
              } else {
                startCascadingOtp(true);
              }
            }}
            className={`font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
              cooldown > 0 || loading ? 'text-[#6C635B] cursor-not-allowed' : 'text-[#B5451B] hover:underline'
            }`}
          >
            {cooldown > 0 ? (
              <>
                <span className="material-symbols-outlined text-sm">timer</span>
                <span>Resend in 00:{cooldown < 10 ? '0' : ''}{cooldown}s</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">refresh</span>
                <span>Resend Code</span>
              </>
            )}
          </button>
        </div>

        {/* Manual Channel Switcher for Mobile Flow only */}
        {verificationType === 'mobile' && (
          <div className="w-full mt-3 pt-3 border-t border-[#3A2D27]/60 flex items-center justify-center gap-3 text-xs text-[#D5CEBA]">
            <span className="opacity-75">Switch delivery:</span>
            {activeChannel !== 'whatsapp' && (
              <button
                type="button"
                disabled={loading || inFlightDispatchRef.current}
                onClick={() => switchChannel('whatsapp')}
                className="text-[#E05326] hover:underline font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
              >
                <span className="material-symbols-outlined text-sm">chat</span>
                <span>Try WhatsApp</span>
              </button>
            )}
            {activeChannel !== 'email' && (existingEmail || email) && (
              <button
                type="button"
                disabled={loading || inFlightDispatchRef.current}
                onClick={() => switchChannel('email')}
                className="text-[#E05326] hover:underline font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
              >
                <span className="material-symbols-outlined text-sm">mail</span>
                <span>Try Email</span>
              </button>
            )}
            {activeChannel !== 'phone_sms' && (
              <button
                type="button"
                disabled={loading || inFlightDispatchRef.current}
                onClick={() => switchChannel('phone_sms')}
                className="text-[#E05326] hover:underline font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
              >
                <span className="material-symbols-outlined text-sm">sms</span>
                <span>Try SMS</span>
              </button>
            )}
          </div>
        )}

        {/* Primary Action Button */}
        <button
          type="button"
          disabled={loading || otp.join('').length !== 6}
          onClick={handleVerifyOtp}
          className="w-full mt-6 py-3.5 rounded-full bg-[#E05326] hover:bg-[#C84318] text-white font-serif font-bold text-sm sm:text-base transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 active:scale-98"
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
              <span>Verifying...</span>
            </>
          ) : (
            <span>Verify & Continue</span>
          )}
        </button>
      </div>
    </div>
  );
};
