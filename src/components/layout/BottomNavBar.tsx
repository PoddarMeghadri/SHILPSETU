import React from 'react';
import { BottomNav, BottomNavProps } from './BottomNav';

export { BottomNav };
export type { BottomNavProps };

export const BottomNavBar: React.FC<BottomNavProps> = (props) => {
  return <BottomNav {...props} />;
};

export default BottomNavBar;
