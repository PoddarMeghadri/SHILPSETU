import React from 'react';
import { OnboardingFlow, OnboardingUserData } from './OnboardingFlow';
import { LanguageCode } from '../../types';

export interface AuthFlowProps {
  onComplete: (user: OnboardingUserData) => void;
  language?: LanguageCode;
  isDark?: boolean;
}

export const AuthFlow: React.FC<AuthFlowProps> = (props) => {
  return <OnboardingFlow {...props} />;
};

export default AuthFlow;
