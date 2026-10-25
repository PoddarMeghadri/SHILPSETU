import React from 'react';
import { FloatingShilpiTrigger, FloatingShilpiTriggerProps } from './FloatingShilpiTrigger';

export { FloatingShilpiTrigger };
export type { FloatingShilpiTriggerProps };

export const ShilpiVoiceFAB: React.FC<FloatingShilpiTriggerProps> = (props) => {
  return <FloatingShilpiTrigger {...props} />;
};

export default ShilpiVoiceFAB;
