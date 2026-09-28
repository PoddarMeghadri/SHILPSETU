import React from 'react';
import { CascadingOtpModal } from './CascadingOtpModal';

export interface DualOtpProps {
  isOpen: boolean;
  onClose: () => void;
  phone: string;
  email: string;
  artisanName?: string;
  onVerificationSuccess: () => Promise<void> | void;
}

export const DualOtpVerificationModal: React.FC<DualOtpProps> = (props) => {
  return <CascadingOtpModal {...props} />;
};
