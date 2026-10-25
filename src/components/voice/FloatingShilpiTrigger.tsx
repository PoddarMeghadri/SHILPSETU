import React from 'react';
import { sound } from '../../services/sound';
import { useTranslation } from '../../services/translations';

export interface FloatingShilpiTriggerProps {
  onClick: () => void;
  isDark?: boolean;
  currentLanguage?: string;
  className?: string;
}

export const FloatingShilpiTrigger: React.FC<FloatingShilpiTriggerProps> = ({
  onClick,
  className = '',
}) => {
  const { t } = useTranslation();

  return (
    <div
      className={`hidden md:flex fixed md:bottom-6 md:right-6 z-40 pointer-events-auto select-none transition-all duration-300 ${className}`}
    >
      <button
        onClick={() => {
          sound.playVoiceStart();
          onClick();
        }}
        className="group flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-full bg-gradient-to-r from-[#B5451B] to-[#9C3A14] hover:from-[#C84F22] hover:to-[#B5451B] text-white shadow-xl shadow-black/25 active:scale-95 transition-all border border-[#E8B84B]/60 hover:shadow-2xl cursor-pointer"
        title={t('tap_to_speak', 'Tap to Interact with SHILPI AI')}
        aria-label="Interact with SHILPI AI"
      >
        {/* Pulsing Mic Circle */}
        <div className="relative w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-base text-white animate-pulse">
            mic
          </span>
          <div className="absolute inset-0 rounded-full border border-white/60 animate-ping opacity-40" />
        </div>

        <div className="flex flex-col text-left">
          <span className="font-serif font-bold text-xs leading-none tracking-wide text-[#FFEBB3]">
            SHILPI AI
          </span>
          <span className="text-[9.5px] font-sans opacity-90 leading-none mt-1">
            {t('tap_to_speak', 'Voice & AI Assistant')}
          </span>
        </div>
      </button>
    </div>
  );
};

export default FloatingShilpiTrigger;
