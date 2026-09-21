import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShilpSetuLogo } from '../common/ShilpSetuLogo';
import { sound } from '../../services/sound';
import {
  validatePassword,
  passwordStrength,
  passwordsMatch,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} from '../../services/passwordValidation';
import { sendSupabaseRecoveryOtp, verifySupabaseOtp, updateSupabasePassword } from '../../services/supabase';
import { useTranslation } from '../../services/translations';

interface ForgotPasswordFlowProps {
  isDark?: boolean;
  initialEmail?: string;
  onSuccess: (email: string) => void;
  onCancel: () => void;
  onToggleTheme?: () => void;
}

type Step = 'email' | 'otp' | 'new_password' | 'success';

export const ForgotPasswordFlow: React.FC<ForgotPasswordFlowProps> = ({
  isDark = false,
  initialEmail = '',
  onSuccess,
  onCancel,
  onToggleTheme,
}) => {
  const { t } = useTranslation();

  // Current step in the password recovery process
  const [currentStep, setCurrentStep] = useState<Step>('email');

  // Step 1: Email state
  const [email, setEmail] = useState<string>(initialEmail.includes('@') ? initialEmail.trim() : '');
  const [emailError, setEmailError] = useState<string>('');
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Step 2: Strict 6-Digit OTP state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState<string>('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [resetToken, setResetToken] = useState<string>('');
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 3: New Password state
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState<boolean>(false);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Auto focus first OTP box when entering OTP step
  useEffect(() => {
    if (currentStep === 'otp') {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [currentStep]);

  // Handle Step 1: Send OTP to email (Strictly 6-digit numeric OTP code)
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setEmailError('Please enter a valid registered email address.');
      sound.playTap();
      return;
    }

    setEmailError('');
    setIsSendingOtp(true);
    const supabaseResult = await sendSupabaseRecoveryOtp(cleanEmail);
    if (supabaseResult.sent) {
      setResendCooldown(30);
      setOtpDigits(['', '', '', '', '', '']);
      setOtpError('');
      setCurrentStep('otp');
      setIsSendingOtp(false);
      return;
    }

    setEmailError(supabaseResult.error || 'Unable to send verification code.');
    setIsSendingOtp(false);
  };

  // Handle OTP digit changes
  const handleOtpChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);
    setOtpError('');

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle OTP backspace
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle OTP paste
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const updated = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      updated[i] = pasted[i] || '';
    }
    setOtpDigits(updated);
    setOtpError('');

    const nextIndex = Math.min(pasted.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
  };

  // Handle Step 2: Strictly verify 6-digit OTP
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullOtp = otpDigits.join('');

    if (fullOtp.length !== 6 || !/^\d{6}$/.test(fullOtp)) {
      setOtpError('Please enter all 6 digits of the verification code.');
      sound.playTap();
      return;
    }

    setOtpError('');
    setIsVerifyingOtp(true);

    try {
      const supabaseResult = await verifySupabaseOtp(email.trim().toLowerCase(), fullOtp, 'email');
      if (supabaseResult.verified) {
        setCurrentStep('new_password');
        setResetToken('');
        return;
      }
      throw new Error(supabaseResult.error || 'The verification code is invalid or expired.');
    } catch (err: any) {
      sound.playTap();
      setOtpError(err.message || 'Incorrect verification code. Please check the code sent to your email.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Handle Step 3: Set New Password & Confirm It
  const handleResetPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // 1. Password validation
    const validationErr = validatePassword(newPassword);
    if (validationErr) {
      setPasswordError(validationErr);
      sound.playTap();
      return;
    }

    // 2. Confirmation check
    if (!passwordsMatch(newPassword, confirmPassword)) {
      setPasswordError('Passwords do not match. Please re-enter your confirm password.');
      sound.playTap();
      return;
    }

    setPasswordError('');
    setIsSubmittingPassword(true);

    try {
      const supabaseResult = await updateSupabasePassword(newPassword);
      if (supabaseResult.updated) {
        sound.playSuccess();
        setCurrentStep('success');
        return;
      }
      throw new Error(supabaseResult.error || 'Unable to update your password.');
    } catch (err: any) {
      sound.playTap();
      setPasswordError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // Password criteria checklist evaluations
  const criteria = [
    { label: '8 to 16 characters', met: newPassword.length >= PASSWORD_MIN_LENGTH && newPassword.length <= PASSWORD_MAX_LENGTH },
    { label: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(newPassword) },
    { label: 'One lowercase letter (a-z)', met: /[a-z]/.test(newPassword) },
    { label: 'One number (0-9)', met: /\d/.test(newPassword) },
    { label: 'One special character (!@#$%^&*)', met: /[^A-Za-z0-9]/.test(newPassword) },
  ];

  const strength = passwordStrength(newPassword);

  return (
    <div className="min-h-screen w-full flex flex-col justify-between p-4 sm:p-6 max-w-xl md:max-w-2xl mx-auto">
      <div>
        {/* Navigation & Header */}
        <div className="flex items-center justify-between pt-2 mb-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="forgot-password-back-button"
              onClick={() => {
                sound.playTap();
                if (currentStep === 'otp') setCurrentStep('email');
                else if (currentStep === 'new_password') setCurrentStep('otp');
                else onCancel();
              }}
              className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 flex items-center justify-center cursor-pointer transition-colors"
              title="Go back"
              aria-label="Go back"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
            </button>
            <div className="flex items-center gap-2">
              <ShilpSetuLogo size="xs" isDark={isDark} />
              <span className="font-serif font-bold text-base text-[#B5451B] tracking-tight">
                SHILPSETU
              </span>
            </div>
          </div>

          {onToggleTheme && (
            <button
              type="button"
              id="forgot-password-theme-toggle"
              onClick={onToggleTheme}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-xs border ${
                isDark
                  ? 'text-[#E8B84B] bg-[#1A1A1A] hover:bg-[#252525] border-[#E8B84B]/30'
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
        </div>

        {/* Step Indicator Badges */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              currentStep === 'email' ? 'w-8 bg-[#B5451B]' : 'w-2 bg-[#B5451B]/40'
            }`}
          />
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              currentStep === 'otp' ? 'w-8 bg-[#B5451B]' : 'w-2 bg-[#B5451B]/40'
            }`}
          />
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              currentStep === 'new_password' ? 'w-8 bg-[#B5451B]' : 'w-2 bg-[#B5451B]/40'
            }`}
          />
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              currentStep === 'success' ? 'w-8 bg-[#2E4638]' : 'w-2 bg-[#2E4638]/40'
            }`}
          />
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: ENTER REGISTERED EMAIL */}
          {currentStep === 'email' && (
            <motion.div
              key="step-email"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-6 text-center sm:text-left">
                <div className="w-12 h-12 rounded-2xl bg-[#B5451B]/10 text-[#B5451B] dark:bg-[#B5451B]/20 dark:text-[#E8B84B] flex items-center justify-center mb-3 mx-auto sm:mx-0">
                  <span className="material-symbols-outlined text-2xl">lock_reset</span>
                </div>
                <h2 className="font-serif font-bold text-2xl mb-1 text-[#22331E] dark:text-[#F4ECDE]">
                  Forgot Password?
                </h2>
                <p className="text-xs text-black/70 dark:text-white/70">
                  Enter your registered artisan email address. We will verify your identity strictly using a 6-digit OTP code before setting a new password.
                </p>
              </div>

              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label
                    htmlFor="forgot-password-email-input"
                    className="block text-xs font-bold font-serif uppercase tracking-wider text-[#B5451B] mb-1.5"
                  >
                    Registered Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="forgot-password-email-input"
                      type="email"
                      autoFocus
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError('');
                      }}
                      placeholder="e.g., artisan@shilpsetu.in"
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl border text-sm bg-white dark:bg-[#1C221A] border-[#22331E]/20 dark:border-[#2D3A2B] focus:outline-hidden focus:ring-2 focus:ring-[#B5451B]/30"
                    />
                    <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-black/40 dark:text-white/40 text-xl pointer-events-none">
                      mail
                    </span>
                  </div>
                  {emailError && (
                    <p className="text-xs text-red-500 font-medium mt-1.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">error</span>
                      <span>{emailError}</span>
                    </p>
                  )}
                </div>

                <div className="p-3.5 rounded-2xl bg-[#22331E]/5 dark:bg-[#2D3A2B]/40 border border-[#22331E]/10 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[#B5451B] text-lg shrink-0 mt-0.5">
                    verified_user
                  </span>
                  <p className="text-[11px] leading-relaxed text-[#22331E] dark:text-[#E8B84B]">
                    Strict 6-digit email OTP verification prevents unauthorized account resets and protects your artisan portfolio and GeM tenders.
                  </p>
                </div>

                <button
                  id="forgot-password-send-otp-btn"
                  type="submit"
                  disabled={isSendingOtp}
                  className="w-full py-4 bg-[#B5451B] hover:bg-[#9C3A14] text-white font-serif font-bold text-base rounded-full shadow-artisan disabled:opacity-50 cursor-pointer transition-all flex items-center justify-center gap-2 mt-4"
                >
                  {isSendingOtp ? (
                    <>
                      <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                      <span>Sending 6-Digit OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Send 6-Digit Verification Code</span>
                      <span className="material-symbols-outlined text-lg">mark_email_read</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* STEP 2: STRICT 6-DIGIT OTP VERIFICATION */}
          {currentStep === 'otp' && (
            <motion.div
              key="step-otp"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-6 text-center sm:text-left">
                <div className="w-12 h-12 rounded-2xl bg-[#B5451B]/10 text-[#B5451B] dark:bg-[#B5451B]/20 dark:text-[#E8B84B] flex items-center justify-center mb-3 mx-auto sm:mx-0">
                  <span className="material-symbols-outlined text-2xl">pin</span>
                </div>
                <h2 className="font-serif font-bold text-2xl mb-1 text-[#22331E] dark:text-[#F4ECDE]">
                  Enter 6-Digit OTP
                </h2>
                <p className="text-xs text-black/70 dark:text-white/70">
                  We have strictly sent a 6-digit verification code to{' '}
                  <strong className="text-[#B5451B] dark:text-[#E8B84B] font-semibold">{email}</strong>.
                  Please check your inbox or spam folder.
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                {/* 6 Individual Digit Inputs */}
                <div>
                  <label className="block text-xs font-bold font-serif uppercase tracking-wider text-[#B5451B] mb-2.5 text-center sm:text-left">
                    6-Digit Verification Code <span className="text-red-500">*</span>
                  </label>
                  <div
                    className="flex justify-center sm:justify-start gap-2 sm:gap-3"
                    onPaste={handleOtpPaste}
                  >
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => {
                          otpInputRefs.current[index] = el;
                        }}
                        id={`forgot-password-otp-digit-${index}`}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className={`w-11 h-14 sm:w-13 sm:h-16 text-center text-xl sm:text-2xl font-bold font-mono rounded-2xl border transition-all ${
                          digit
                            ? 'border-[#B5451B] bg-white dark:bg-[#1C221A] text-[#B5451B] dark:text-[#E8B84B] shadow-xs'
                            : 'border-[#22331E]/20 dark:border-[#2D3A2B] bg-black/5 dark:bg-white/5'
                        } focus:outline-hidden focus:ring-2 focus:ring-[#B5451B]/40 focus:border-[#B5451B]`}
                        aria-label={`Digit ${index + 1}`}
                      />
                    ))}
                  </div>

                  {otpError && (
                    <p className="text-xs text-red-500 font-medium mt-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">error</span>
                      <span>{otpError}</span>
                    </p>
                  )}
                </div>

                {/* Resend OTP Link */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-black/60 dark:text-white/60">Didn't receive the code?</span>
                  {resendCooldown > 0 ? (
                    <span className="text-[#B5451B] font-semibold">
                      Resend in {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      id="forgot-password-resend-otp-btn"
                      type="button"
                      disabled={isSendingOtp}
                      onClick={() => handleSendOtp()}
                      className="text-[#B5451B] dark:text-[#E8B84B] font-bold hover:underline cursor-pointer disabled:opacity-50"
                    >
                      Resend 6-Digit OTP
                    </button>
                  )}
                </div>

                <button
                  id="forgot-password-verify-otp-btn"
                  type="submit"
                  disabled={isVerifyingOtp || otpDigits.join('').length !== 6}
                  className="w-full py-4 bg-[#B5451B] hover:bg-[#9C3A14] text-white font-serif font-bold text-base rounded-full shadow-artisan disabled:opacity-50 cursor-pointer transition-all flex items-center justify-center gap-2 mt-4"
                >
                  {isVerifyingOtp ? (
                    <>
                      <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                      <span>Verifying OTP Strictly...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify Code & Continue</span>
                      <span className="material-symbols-outlined text-lg">check_circle</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* STEP 3: SET NEW PASSWORD AND CONFIRM IT */}
          {currentStep === 'new_password' && (
            <motion.div
              key="step-new-password"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-6 text-center sm:text-left">
                <div className="w-12 h-12 rounded-2xl bg-[#B5451B]/10 text-[#B5451B] dark:bg-[#B5451B]/20 dark:text-[#E8B84B] flex items-center justify-center mb-3 mx-auto sm:mx-0">
                  <span className="material-symbols-outlined text-2xl">key</span>
                </div>
                <h2 className="font-serif font-bold text-2xl mb-1 text-[#22331E] dark:text-[#F4ECDE]">
                  Set New Password
                </h2>
                <p className="text-xs text-black/70 dark:text-white/70">
                  Choose a new password for <strong className="text-[#B5451B] dark:text-[#E8B84B]">{email}</strong>. Password conditions are strictly enforced.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* New Password */}
                <div>
                  <label
                    htmlFor="forgot-password-new-input"
                    className="block text-xs font-bold font-serif uppercase tracking-wider text-[#B5451B] mb-1.5"
                  >
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="forgot-password-new-input"
                      type={showPassword ? 'text' : 'password'}
                      autoFocus
                      required
                      minLength={PASSWORD_MIN_LENGTH}
                      maxLength={PASSWORD_MAX_LENGTH}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setPasswordError('');
                      }}
                      placeholder="Enter 8–16 characters"
                      className="w-full pl-4 pr-11 py-3.5 rounded-2xl border text-sm bg-white dark:bg-[#1C221A] border-[#22331E]/20 dark:border-[#2D3A2B] focus:outline-hidden focus:ring-2 focus:ring-[#B5451B]/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <span className="material-symbols-outlined text-xl">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  <div className="flex gap-1.5 mt-2" aria-label="Password strength meter">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <span
                        key={level}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          strength >= level
                            ? strength >= 4
                              ? 'bg-[#2E4638] dark:bg-[#88C498]'
                              : 'bg-[#B5451B]'
                            : 'bg-black/10 dark:bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Password Criteria Checklist */}
                <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 space-y-1.5">
                  <p className="text-[11px] font-bold font-serif uppercase tracking-wider text-[#B5451B] mb-1">
                    Password Conditions:
                  </p>
                  {criteria.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <span
                        className={`material-symbols-outlined text-sm ${
                          item.met ? 'text-[#2E4638] dark:text-[#88C498] font-bold' : 'text-black/30 dark:text-white/30'
                        }`}
                      >
                        {item.met ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span className={item.met ? 'text-black/90 dark:text-white/90 font-medium' : 'text-black/50 dark:text-white/50'}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Confirm New Password */}
                <div>
                  <label
                    htmlFor="forgot-password-confirm-input"
                    className="block text-xs font-bold font-serif uppercase tracking-wider text-[#B5451B] mb-1.5"
                  >
                    Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="forgot-password-confirm-input"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={PASSWORD_MIN_LENGTH}
                      maxLength={PASSWORD_MAX_LENGTH}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setPasswordError('');
                      }}
                      placeholder="Re-enter your new password"
                      className="w-full pl-4 pr-11 py-3.5 rounded-2xl border text-sm bg-white dark:bg-[#1C221A] border-[#22331E]/20 dark:border-[#2D3A2B] focus:outline-hidden focus:ring-2 focus:ring-[#B5451B]/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-3.5 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white cursor-pointer"
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      <span className="material-symbols-outlined text-xl">
                        {showConfirmPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  {passwordError && (
                    <p className="text-xs text-red-500 font-medium mt-1.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">error</span>
                      <span>{passwordError}</span>
                    </p>
                  )}
                </div>

                <button
                  id="forgot-password-submit-btn"
                  type="submit"
                  disabled={isSubmittingPassword || !passwordsMatch(newPassword, confirmPassword) || strength < 5}
                  className="w-full py-4 bg-[#B5451B] hover:bg-[#9C3A14] text-white font-serif font-bold text-base rounded-full shadow-artisan disabled:opacity-50 cursor-pointer transition-all flex items-center justify-center gap-2 mt-4"
                >
                  {isSubmittingPassword ? (
                    <>
                      <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                      <span>Setting New Password...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm & Save New Password</span>
                      <span className="material-symbols-outlined text-lg">check</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* STEP 4: SUCCESS CONFIRMATION */}
          {currentStep === 'success' && (
            <motion.div
              key="step-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center py-6"
            >
              <div className="w-16 h-16 rounded-full bg-[#2E4638] text-white flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="material-symbols-outlined text-3xl">verified</span>
              </div>
              <h2 className="font-serif font-bold text-2xl mb-2 text-[#22331E] dark:text-[#F4ECDE]">
                Password Reset Successfully!
              </h2>
              <p className="text-xs text-black/75 dark:text-white/75 max-w-sm mx-auto leading-relaxed mb-6">
                Your account password for <strong className="text-[#B5451B] dark:text-[#E8B84B]">{email}</strong> has been securely updated. You can now sign in immediately.
              </p>

              <button
                id="forgot-password-success-signin-btn"
                type="button"
                onClick={() => {
                  sound.playTap();
                  onSuccess(email);
                }}
                className="w-full py-4 bg-[#B5451B] hover:bg-[#9C3A14] text-white font-serif font-bold text-base rounded-full shadow-artisan cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <span>Sign In with New Password</span>
                <span className="material-symbols-outlined text-lg">login</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Back to Sign In Link */}
      {currentStep !== 'success' && (
        <div className="text-center pt-6 pb-2">
          <button
            type="button"
            id="forgot-password-cancel-link"
            onClick={() => {
              sound.playTap();
              onCancel();
            }}
            className="text-xs text-[#B5451B] dark:text-[#E8B84B] font-semibold hover:underline cursor-pointer"
          >
            Remember your password? Return to Sign In
          </button>
        </div>
      )}
    </div>
  );
};
