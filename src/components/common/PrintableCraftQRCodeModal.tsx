import React from 'react';
import { QrHangtagModal, QrHangtagModalProps, useArtisanProfile } from './QrHangtagModal';

export { QrHangtagModal, useArtisanProfile };
export type { QrHangtagModalProps };

export const PrintableCraftQRCodeModal: React.FC<QrHangtagModalProps> = (props) => {
  return <QrHangtagModal {...props} />;
};

export default PrintableCraftQRCodeModal;
