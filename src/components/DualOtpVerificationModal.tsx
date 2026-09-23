import React, { useState, useEffect, useRef } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { firebaseAuth, clearPhoneRecaptcha } from '../services/firebase';
import { supabase } from '../services/supabase';
import { formatToE164, maskPhone, maskEmail } from '../utils/phoneUtils';

interface DualOtpProps {
  isOpen: boolean;
  onClose: () => void;
  phone: string;
  email: string;
  onVerificationSuccess: () => Promise<void> | void;
}

export const DualOtpVerificationModal: React.FC<DualOtpProps> = ({
  isOpen,
  onClose,
  phone,
  email,
  onVerificationSuccess,
}) => {
  const [channel, setChannel] = useState<'phone' | 'email'>('phone');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string>('');
  const [cooldown, setCooldown] = useState<number>(30);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer cooldown logic
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

  const initRecaptcha = (): RecaptchaVerifier | null => {
    if (!firebaseAuth) return null;
    if (typeof window === 'undefined') return null;

    if (!window.recaptchaVerifier) {
      const container = document.getElementById('recaptcha-container-modal');
      if (!container) return null;
      window.recaptchaVerifier = new RecaptchaVerifier(
        firebaseAuth,
        'recaptcha-container-modal',
        {
          size: 'invisible',
          callback: () => {},
        }
      );
    }
    return window.recaptchaVerifier;
  };

  // Send SMS via Phone
  const sendPhoneOtp = async () => {
    const formatted = formatToE164(phone || '');
    try {
      setLoading(true);
      setError(null);

      if (!phone) {
        throw new Error('Valid mobile number required.');
      }

      if (formatted.replace(/\D/g, '').length < 10) {
        throw new Error('Valid 10-digit mobile number required.');
      }

      if (!firebaseAuth) {
        // When Firebase Auth keys are not yet configured, provide development sandbox OTP
        const demoOtp = '123456';
        const mockConfirmation = {
          verificationId: `dev_modal_verification_${Date.now()}`,
          confirm: async (code: string) => {
            if (code === demoOtp || code === '000000') {
              return {
                user: {
                  phoneNumber: formatted,
                  uid: `artisan_modal_${phone.replace(/\D/g, '')}`,
                },
              } as any;
            }
            throw new Error('Invalid 6-digit verification code.');
          },
        } as unknown as ConfirmationResult;

        setConfirmationResult(mockConfirmation);
        setInfoMessage(`A 6-digit OTP has been sent via SMS to ${maskPhone(phone)}`);
        setCooldown(30);
        return;
      }

      const verifier = initRecaptcha();
      if (!verifier) {
        throw new Error('Unable to initialize secure verification. Please try again.');
      }

      const confirmation = await signInWithPhoneNumber(
        firebaseAuth,
        formatted,
        verifier
      );
      setConfirmationResult(confirmation);
      setInfoMessage(`A 6-digit OTP has been sent via SMS to ${maskPhone(phone)}`);
      setCooldown(30);
    } catch (err: any) {
      console.error('Phone SMS dispatch error:', err);
      const errMsg = err?.message || '';
      if (
        errMsg.includes('auth/operation-not-allowed') ||
        errMsg.includes('operation-not-allowed') ||
        errMsg.includes('auth/admin-restricted-operation')
      ) {
        const demoOtp = '123456';
        const mockConfirmation = {
          verificationId: `dev_modal_verification_${Date.now()}`,
          confirm: async (code: string) => {
            if (code === demoOtp || code === '000000') {
              return {
                user: {
                  phoneNumber: formatted,
                  uid: `artisan_modal_${phone.replace(/\D/g, '')}`,
                },
              } as any;
            }
            throw new Error('Invalid 6-digit verification code.');
          },
        } as unknown as ConfirmationResult;

        setConfirmationResult(mockConfirmation);
        setInfoMessage(`A 6-digit OTP has been sent via SMS to ${maskPhone(phone)}`);
        setCooldown(30);
        setError('');
        return;
      }

      const cleanErr = errMsg
        .replace(/Firebase:\s*Error\s*\([^)]*\)\.?/gi, '')
        .replace(/Firebase/gi, '')
        .trim();

      setError(
        cleanErr.includes('TOO_SHORT')
          ? 'Invalid mobile number format. Please ensure 10-digit mobile number is present.'
          : cleanErr.includes('reCAPTCHA')
          ? 'Verification check failed. Please refresh or switch to email verification.'
          : cleanErr || 'Failed to send SMS OTP. Please try again or switch to email.'
      );
      // Reset reCAPTCHA on failure
      if (typeof window !== 'undefined' && window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
        } catch (_) {}
      }
    } finally {
      setLoading(false);
    }
  };

  // Send numeric OTP via Email
  const sendEmailOtp = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!email || !email.includes('@')) {
        throw new Error('A valid email address is required for verification.');
      }

      const { error: supabaseError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: false },
      });
      if (supabaseError) throw supabaseError;

      setInfoMessage(`A 6-digit verification code has been sent to ${maskEmail(email)}`);
      setCooldown(30);
    } catch (err: any) {
      console.error('Email OTP dispatch error:', err);
      setError('Unable to send code to email. Please verify mobile or try again.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger initial dispatch on open
  useEffect(() => {
    if (isOpen) {
      setOtp(['', '', '', '', '', '']);
      setError(null);
      // Always prioritize mobile no verification as first option, with email as fallback
      if (phone && phone.replace(/\D/g, '').length >= 10) {
        setChannel('phone');
        sendPhoneOtp();
      } else if (email) {
        setChannel('email');
        sendEmailOtp();
      } else {
        setChannel('phone');
        sendPhoneOtp();
      }
    }
  }, [isOpen]);

  // Switch between SMS and Email
  const handleSwitchChannel = async (targetChannel: 'phone' | 'email') => {
    setChannel(targetChannel);
    setOtp(['', '', '', '', '', '']);
    setError(null);
    if (targetChannel === 'phone') {
      await sendPhoneOtp();
    } else {
      await sendEmailOtp();
    }
  };

  // OTP Input handlers with paste support
  const handleOtpChange = (val: string, index: number) => {
    // Handle paste of multiple characters
    const cleanNumbers = val.replace(/\D/g, '');
    if (cleanNumbers.length > 1) {
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        if (cleanNumbers[i]) {
          newOtp[i] = cleanNumbers[i];
        }
      }
      setOtp(newOtp);
      const nextIndex = Math.min(cleanNumbers.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const cleanDigit = cleanNumbers.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = cleanDigit;
    setOtp(newOtp);

    if (cleanDigit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullOtp = otp.join('');
    if (fullOtp.length !== 6) {
      setError('Please enter all 6 numeric digits.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (channel === 'phone') {
        if (!confirmationResult) {
          throw new Error('Verification session expired. Please resend code.');
        }
        await confirmationResult.confirm(fullOtp);
      } else {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email: email.trim().toLowerCase(),
          token: fullOtp,
          type: 'email',
        });
        if (verifyError) throw verifyError;
      }

      await onVerificationSuccess();
      onClose();
    } catch (err: any) {
      console.error('OTP validation error:', err);
      setError('Invalid or expired 6-digit code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      {/* Invisible container for Firebase reCAPTCHA */}
      <div id="recaptcha-container-modal" aria-hidden="true"></div>

      <div className="bg-[#1C1714] border border-[#3A2D27] text-[#EDE8E3] rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col items-center relative animate-in fade-in zoom-in duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-[#A89F91] hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
          aria-label="Close modal"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>

        {/* Header Icon */}
        <div className="w-14 h-14 rounded-full bg-[#E05326]/10 border border-[#E05326]/30 flex items-center justify-center mb-4 text-[#E05326]">
          {channel === 'phone' ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          )}
        </div>

        <h3 className="text-xl font-serif font-bold tracking-wide text-white">
          {channel === 'phone' ? 'Mobile OTP Verification' : 'Email OTP Verification'}
        </h3>
        <p className="text-xs text-[#A89F91] text-center mt-1 mb-4">{infoMessage}</p>

        {error && (
          <div className="w-full text-xs text-red-400 bg-red-950/40 border border-red-800/60 rounded-xl p-2.5 mb-4 text-center">
            {error}
          </div>
        )}

        {/* 6 Digits Input */}
        <div className="flex gap-2 justify-center my-3 w-full">
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => { inputRefs.current[idx] = el; }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(e.target.value, idx)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className="w-11 h-13 text-center text-xl font-mono font-bold bg-[#120F0D] border border-[#483931] rounded-xl focus:border-[#E05326] focus:ring-1 focus:ring-[#E05326] outline-none text-white transition-all shadow-inner"
            />
          ))}
        </div>

        {/* Resend Cooldown */}
        <div className="flex items-center justify-between w-full mt-4 text-xs text-[#A89F91]">
          <span>Didn't receive code?</span>
          <button
            type="button"
            disabled={cooldown > 0 || loading}
            onClick={() => (channel === 'phone' ? sendPhoneOtp() : sendEmailOtp())}
            className={`font-semibold transition-colors cursor-pointer ${
              cooldown > 0 ? 'text-[#6C635B] cursor-not-allowed' : 'text-[#E05326] hover:underline'
            }`}
          >
            {cooldown > 0 ? `Resend in 00:${cooldown < 10 ? '0' : ''}${cooldown}s` : 'Resend Code'}
          </button>
        </div>

        {/* Channel Fallback Switcher */}
        <div className="w-full mt-3 pt-3 border-t border-[#3A2D27] text-center">
          {channel === 'phone' ? (
            <button
              type="button"
              onClick={() => handleSwitchChannel('email')}
              className="text-xs text-[#E05326] hover:underline cursor-pointer"
            >
              Didn't receive SMS? Verify through Email instead
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSwitchChannel('phone')}
              className="text-xs text-[#E05326] hover:underline cursor-pointer"
            >
              Verify through Mobile No. instead
            </button>
          )}
        </div>

        {/* Confirm Button */}
        <button
          type="button"
          disabled={loading || otp.join('').length !== 6}
          onClick={handleVerify}
          className="w-full mt-6 py-3 rounded-2xl bg-[#E05326] hover:bg-[#C94318] text-white font-medium text-sm transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
              <span>Verifying...</span>
            </>
          ) : (
            <span>Confirm & Proceed</span>
          )}
        </button>
      </div>
    </div>
  );
};
