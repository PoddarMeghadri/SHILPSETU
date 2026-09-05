import React from 'react';

interface PotterWheelSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const PotterWheelSpinner: React.FC<PotterWheelSpinnerProps> = ({
  size = 'md',
  text,
  className = '',
}) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className={`relative ${sizeMap[size]} flex items-center justify-center`}>
        {/* Outer potter wheel disc */}
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full animate-spin-potter"
        >
          {/* Outer Wheel Rim */}
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="#D9A441"
            strokeWidth="3"
            strokeDasharray="6 4"
            opacity="0.8"
          />
          {/* Inner Wheel Groove */}
          <circle
            cx="50"
            cy="50"
            r="36"
            fill="#EAE0CC"
            stroke="#9C3F1E"
            strokeWidth="2"
          />
          {/* Rotating Concentric Clay Grooves */}
          <path
            d="M50 20 C65 20 78 33 78 50 C78 67 65 80 50 80 C35 80 22 67 22 50 C22 38 30 28 42 22"
            fill="none"
            stroke="#9C3F1E"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Center Axle / Clay Core */}
          <circle cx="50" cy="50" r="10" fill="#9C3F1E" />
          <circle cx="50" cy="50" r="4" fill="#D9A441" />
        </svg>

        {/* Pulsing center clay glow */}
        <div className="absolute inset-2 rounded-full bg-[#D9A441]/10 animate-pulse pointer-events-none" />
      </div>

      {text && (
        <p className="text-xs font-semibold tracking-wider text-[#9C3F1E] uppercase font-sans animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
};
