import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { sound } from '../../services/sound';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAction?: () => void;
  title: string;
  subtitle?: string;
  actionText?: string;
  actionLabel?: string;
  badge?: string;
  isDark?: boolean;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  onAction,
  title,
  subtitle,
  actionText,
  actionLabel,
  badge = 'Success',
}) => {
  const resolvedActionText = actionLabel || actionText || 'Continue';
  useEffect(() => {
    if (isOpen) {
      sound.playSuccess();
      // Brand-colored confetti: terracotta (#9C3F1E), turmeric gold (#D9A441), moss green (#2E4638), ivory (#F5EFE3)
      try {
        confetti({
          particleCount: 65,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#9C3F1E', '#D9A441', '#2E4638', '#EAE0CC', '#BC5634'],
          ticks: 200,
        });
      } catch {
        // Ignored if canvas-confetti is not available
      }
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="relative w-full max-w-sm bg-[#F4ECDE] rounded-3xl p-6 shadow-2xl border border-[#22331E]/15 text-center overflow-hidden z-10"
          >
            {/* Background Decorative Arch Motif */}
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-[#E8B84B]/15 blur-xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-[#B5451B]/15 blur-xl pointer-events-none" />

            {/* Checkmark Burst Animation */}
            <div className="relative mx-auto w-20 h-20 mb-4 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.25, 1] }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="w-16 h-16 rounded-full bg-[#22331E] text-[#F4ECDE] flex items-center justify-center shadow-lg border-2 border-[#E8B84B]"
              >
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="material-symbols-outlined text-3xl font-bold"
                >
                  check
                </motion.span>
              </motion.div>

              {/* Pulsing ring */}
              <div className="absolute inset-0 rounded-full border-2 border-[#E8B84B] animate-ping opacity-40" />
            </div>

            {/* Badge */}
            {badge && (
              <span className="inline-block px-3 py-1 bg-[#E8B84B]/20 text-[#B5451B] border border-[#E8B84B]/40 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                {badge}
              </span>
            )}

            {/* Title */}
            <h3 className="font-serif text-2xl font-bold text-[#1A1815] mb-2 leading-tight">
              {title}
            </h3>

            {/* Subtitle */}
            {subtitle && (
              <p className="text-sm text-[#22331E]/75 mb-6 leading-relaxed">
                {subtitle}
              </p>
            )}

            {/* Action Button */}
            <button
              onClick={() => {
                sound.playTap();
                if (onAction) {
                  onAction();
                } else {
                  onClose();
                }
              }}
              className="w-full bg-[#B5451B] hover:bg-[#9C3A14] text-white font-serif font-bold py-3.5 px-6 rounded-2xl shadow-md transition-transform active:scale-95 duration-150 flex items-center justify-center gap-2"
            >
              <span>{resolvedActionText}</span>
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
