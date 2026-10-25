import React from 'react';
import { Header, HeaderProps } from './Header';

export { Header };
export type { HeaderProps };

export const TopAppBar: React.FC<HeaderProps> = (props) => {
  return <Header {...props} />;
};

export default TopAppBar;
