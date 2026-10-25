import React from 'react';

interface ShilpSetuLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  withText?: boolean;
  withTagline?: boolean;
  className?: string;
  isDark?: boolean;
}

export const ShilpSetuLogo: React.FC<ShilpSetuLogoProps> = ({
  size = 'md',
  withText = false,
  withTagline = false,
  className = '',
  isDark = false,
}) => {
  const sizeMap = {
    xs: 'w-7 h-7',
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
    '2xl': 'w-56 h-56 md:w-64 md:h-64',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Official ShilpSetu Circular Emblem */}
      <div
        className={`${sizeMap[size]} shrink-0 relative flex items-center justify-center`}
      >
        <img
          src="/app-logo.png"
          alt="ShilpSetu Emblem"
          className="w-full h-full object-contain select-none drop-shadow-sm pointer-events-none"
          draggable={false}
          loading="eager"
        />
      </div>

      {/* Optional Typography Brand Block */}
      {withText && (
        <div className="flex flex-col text-left leading-none">
          <span className="font-serif font-black text-lg tracking-tight leading-none text-[#B5451B]">
            SHILPSETU
          </span>
          {withTagline ? (
            <span
              className={`font-serif italic text-[11px] opacity-75 truncate mt-0.5 ${
                isDark ? 'text-[#F4ECDE]' : 'text-[#1A1815]'
              }`}
            >
              CONNECTING INDIA'S ARTISANS
            </span>
          ) : (
            <span
              className={`font-serif italic text-[11px] opacity-75 truncate mt-0.5 ${
                isDark ? 'text-[#F4ECDE]' : 'text-[#1A1815]'
              }`}
            >
              Har Haath Ki Kahani
            </span>
          )}
        </div>
      )}
    </div>
  );
};
