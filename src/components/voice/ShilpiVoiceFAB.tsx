import React from 'react';
import { sound } from '../../services/sound';
import { useTranslation } from '../../services/translations';

interface ShilpiVoiceFABProps {
  onClick: () => void;
  isDark?: boolean;
  currentLanguage?: string;
}

export const ShilpiVoiceFAB: React.FC<ShilpiVoiceFABProps> = ({
  onClick,
}) => {
  const { t } = useTranslation();
  return (
    <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-40">
      <button
        onClick={() => {
          sound.playVoiceStart();
          onClick();
        }}
        className="group flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-full bg-[#B5451B] hover:bg-[#9C3A14] text-white shadow-2xl active:scale-95 transition-all border border-[#E8B84B]/50 hover:shadow-[#B5451B]/40"
        title="Tap to interact with SHILPI AI"
      >
        {/* Pulsing Mic Circle */}
        <div className="relative w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-base text-white animate-pulse">
            mic
          </span>
          <div className="absolute inset-0 rounded-full border border-white/60 animate-ping opacity-50" />
        </div>

        <div className="flex flex-col text-left">
          <span className="font-serif font-bold text-xs leading-none tracking-wide text-[#FFEBB3]">
            SHILPI AI
          </span>
          <span className="text-[9px] font-sans opacity-90 leading-none mt-0.5">
            {t('tap_to_speak', 'Tap to Interact with Shilpi AI')}
          </span>
        </div>
      </button>
    </div>
  );
};
