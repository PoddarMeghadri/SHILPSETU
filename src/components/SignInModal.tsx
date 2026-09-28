import React, { useState } from 'react';
import { CascadingOtpModal } from './CascadingOtpModal';
import { signInSupabaseWithEmailOrMobile, findProfileByIdentifier } from '../services/supabase';

export interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (artisan: any) => void;
}

export const SignInModal: React.FC<SignInModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cascading OTP Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [resolvedPhone, setResolvedPhone] = useState('');
  const [resolvedEmail, setResolvedEmail] = useState('');
  const [resolvedArtisan, setResolvedArtisan] = useState<any>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId || !password) {
      setError('Please enter your mobile number / email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const sbResult = await signInSupabaseWithEmailOrMobile(cleanId, password);
      if (!sbResult.signedIn) {
        setError(sbResult.error || 'The mobile number / email or password is incorrect.');
        setLoading(false);
        return;
      }

      // Resolve contact details
      let phone = sbResult.profile?.mobile_number || (!cleanId.includes('@') ? cleanId : '');
      let email = sbResult.profile?.email || (cleanId.includes('@') ? cleanId : sbResult.user?.email || '');

      if (!phone) {
        const lookup = await findProfileByIdentifier(cleanId);
        if (lookup.profile?.mobile_number) {
          phone = lookup.profile.mobile_number;
        }
      }

      setResolvedPhone(phone);
      setResolvedEmail(email);
      setResolvedArtisan(sbResult.profile || sbResult.user);
      setLoading(false);
      setShowOtpModal(true);
    } catch (err: any) {
      setError(err?.message || 'Unable to sign in. Please try again.');
      setLoading(false);
    }
  };

  const handleOtpSuccess = async () => {
    setShowOtpModal(false);
    onSuccess(resolvedArtisan);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-[#1C1714] border border-[#3A2D27] text-[#EDE8E3] rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-[#A89F91] hover:text-white p-1 rounded-full hover:bg-white/10 cursor-pointer"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>

          <div className="w-14 h-14 rounded-full bg-[#B5451B]/15 border border-[#B5451B]/40 flex items-center justify-center mx-auto mb-4 text-[#B5451B]">
            <span className="material-symbols-outlined text-3xl">login</span>
          </div>

          <h2 className="text-2xl font-serif font-bold text-center text-white mb-2">
            Artisan Sign In
          </h2>
          <p className="text-xs text-[#A89F91] text-center mb-6">
            Enter your registered credentials to access your craft workshop
          </p>

          {error && (
            <div className="text-xs text-red-400 bg-red-950/40 border border-red-800/60 rounded-xl p-3 mb-4 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#D5CEBA] mb-1.5">
                Mobile Number or Email
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. 9876543210 or artisan@craft.in"
                className="w-full px-4 py-3 bg-[#120F0D] border border-[#483931] rounded-2xl text-white text-sm focus:border-[#B5451B] outline-none shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#D5CEBA] mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
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
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <span>Continue to Verification</span>
              )}
            </button>
          </form>
        </div>
      </div>

      {showOtpModal && (
        <CascadingOtpModal
          isOpen={showOtpModal}
          onClose={() => setShowOtpModal(false)}
          phone={resolvedPhone}
          email={resolvedEmail}
          artisanName={resolvedArtisan?.full_name || 'Artisan'}
          onVerificationSuccess={handleOtpSuccess}
        />
      )}
    </>
  );
};
