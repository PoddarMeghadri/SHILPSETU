import React, { useState } from 'react';
import { CascadingOtpModal } from './CascadingOtpModal';
import { checkAccountUniqueness, upsertSupabaseProfile, getSupabase } from '../services/supabase';
import { DEFAULT_ARTISAN_AVATAR } from '../data/mockData';

export interface SignUpFormProps {
  onSuccess: (artisan: any) => void;
  onSwitchToSignIn?: () => void;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({
  onSuccess,
  onSwitchToSignIn,
}) => {
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [state, setState] = useState('Uttar Pradesh');
  const [city, setCity] = useState('Varanasi');
  const [craft, setCraft] = useState('pottery');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cascading OTP Modal
  const [showOtpModal, setShowOtpModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMobile = mobile.replace(/\D/g, '');
    const cleanEmail = email.trim().toLowerCase();

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (cleanMobile.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const uniqueness = await checkAccountUniqueness(cleanEmail, cleanMobile);
      if (!uniqueness.unique) {
        setError(uniqueness.error || 'An account with this email or mobile number already exists.');
        setLoading(false);
        return;
      }

      setLoading(false);
      setShowOtpModal(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize verification.');
      setLoading(false);
    }
  };

  const handleOtpSuccess = async () => {
    setShowOtpModal(false);
    const cleanMobile = mobile.replace(/\D/g, '');
    const cleanEmail = email.trim().toLowerCase();

    try {
      const client = getSupabase();
      if (client) {
        try {
          await client.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: {
                full_name: fullName.trim(),
                mobile_number: cleanMobile,
                avatar_url: DEFAULT_ARTISAN_AVATAR,
              },
            },
          });
        } catch (_) {}
      }

      const profile = {
        name: fullName.trim(),
        full_name: fullName.trim(),
        email: cleanEmail,
        mobile: cleanMobile,
        mobile_number: cleanMobile,
        state,
        city,
        craft,
        location: `${city}, ${state}`,
        avatarUrl: DEFAULT_ARTISAN_AVATAR,
        avatar_url: DEFAULT_ARTISAN_AVATAR,
      };

      await upsertSupabaseProfile({
        fullName: fullName.trim(),
        email: cleanEmail,
        mobileNumber: cleanMobile,
        city,
        state,
        location: `${city}, ${state}`,
        desiredWorkshop: craft,
        avatarUrl: DEFAULT_ARTISAN_AVATAR,
      }).catch(console.warn);

      onSuccess(profile);
    } catch (err) {
      console.warn('Profile creation error:', err);
      onSuccess({
        name: fullName.trim(),
        email: cleanEmail,
        mobile: cleanMobile,
      });
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-[#1C1714] border border-[#3A2D27] text-[#EDE8E3] rounded-3xl p-6 sm:p-8 shadow-2xl">
      <div className="w-14 h-14 rounded-full bg-[#B5451B]/15 border border-[#B5451B]/40 flex items-center justify-center mx-auto mb-4 text-[#B5451B]">
        <span className="material-symbols-outlined text-3xl">person_add</span>
      </div>

      <h2 className="text-2xl font-serif font-bold text-center text-white mb-2">
        Artisan Registration
      </h2>
      <p className="text-xs text-[#A89F91] text-center mb-6">
        Create your master artisan profile to join ShilpSetu
      </p>

      {error && (
        <div className="text-xs text-red-400 bg-red-950/40 border border-red-800/60 rounded-xl p-3 mb-4 text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#D5CEBA] mb-1">
            Full Name
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Master Ramachandran"
            className="w-full px-4 py-3 bg-[#120F0D] border border-[#483931] rounded-2xl text-white text-sm focus:border-[#B5451B] outline-none shadow-inner"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#D5CEBA] mb-1">
              Mobile Number
            </label>
            <input
              type="tel"
              required
              maxLength={10}
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
              placeholder="10-digit mobile"
              className="w-full px-4 py-3 bg-[#120F0D] border border-[#483931] rounded-2xl text-white text-sm focus:border-[#B5451B] outline-none shadow-inner"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#D5CEBA] mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="artisan@craft.in"
              className="w-full px-4 py-3 bg-[#120F0D] border border-[#483931] rounded-2xl text-white text-sm focus:border-[#B5451B] outline-none shadow-inner"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#D5CEBA] mb-1">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="w-full px-4 py-3 bg-[#120F0D] border border-[#483931] rounded-2xl text-white text-sm focus:border-[#B5451B] outline-none shadow-inner"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3.5 bg-[#B5451B] hover:bg-[#9C3A14] text-white font-serif font-bold text-sm sm:text-base rounded-full shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
              <span>Validating details...</span>
            </>
          ) : (
            <span>Proceed to Verification</span>
          )}
        </button>

        {onSwitchToSignIn && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onSwitchToSignIn}
              className="text-xs text-[#E05326] hover:underline cursor-pointer"
            >
              Already registered? Sign in to your workshop
            </button>
          </div>
        )}
      </form>

      {showOtpModal && (
        <CascadingOtpModal
          isOpen={showOtpModal}
          onClose={() => setShowOtpModal(false)}
          phone={mobile}
          email={email}
          artisanName={fullName}
          onVerificationSuccess={handleOtpSuccess}
        />
      )}
    </div>
  );
};
