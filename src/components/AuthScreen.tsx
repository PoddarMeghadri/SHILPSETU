import React, { useState } from 'react';
import { SignInModal } from './SignInModal';
import { SignUpForm } from './SignUpForm';

export interface AuthScreenProps {
  onSuccess: (artisan: any) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [showSignInModal, setShowSignInModal] = useState(true);

  return (
    <div className="min-h-screen bg-[#120F0D] flex items-center justify-center p-4">
      {tab === 'signin' ? (
        <SignInModal
          isOpen={showSignInModal}
          onClose={() => setTab('signup')}
          onSuccess={onSuccess}
        />
      ) : (
        <SignUpForm
          onSuccess={onSuccess}
          onSwitchToSignIn={() => {
            setTab('signin');
            setShowSignInModal(true);
          }}
        />
      )}
    </div>
  );
};
