import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StoryAvatar } from '../../types';
import { sound } from '../../services/sound';

interface StoryViewerModalProps {
  story: StoryAvatar | null;
  onClose: () => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  story,
  onClose,
}) => {
  return (
    <AnimatePresence>
      {story && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-md h-[88vh] max-h-[720px] rounded-3xl overflow-hidden bg-[#1A1815] text-[#F5EFE3] flex flex-col shadow-2xl border border-white/10"
          >
            {/* Background Artisan Photo */}
            <div className="absolute inset-0 z-0">
              <img
                src={story.artisanPhotoUrl}
                alt={story.artisanName}
                className="w-full h-full object-cover opacity-50 filter brightness-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1A1815] via-[#1A1815]/60 to-black/70" />
            </div>

            {/* Top Story Progress Bar & Header */}
            <div className="relative z-10 p-5 flex flex-col gap-3">
              {/* Progress Line */}
              <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 6, ease: 'linear' }}
                  onAnimationComplete={onClose}
                  className="h-full bg-[#D9A441]"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={story.avatarUrl}
                    alt={story.artisanName}
                    className="w-10 h-10 rounded-full object-cover border-2 border-[#D9A441]"
                  />
                  <div>
                    <h4 className="font-serif font-bold text-base text-white">
                      {story.artisanName}
                    </h4>
                    <p className="text-xs text-[#D9A441] font-sans">
                      {story.craftType} • {story.location}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    sound.playTap();
                    onClose();
                  }}
                  className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>
            </div>

            {/* Center / Body Quote */}
            <div className="relative z-10 flex-grow flex flex-col justify-end p-6 pb-8 space-y-4">
              <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15">
                <span className="material-symbols-outlined text-3xl text-[#D9A441] mb-1">
                  format_quote
                </span>
                <p className="font-serif italic text-lg leading-relaxed text-white">
                  "{story.quote}"
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] uppercase tracking-widest text-[#D9A441] font-semibold">
                  About the Maker
                </span>
                <p className="text-sm text-white/90 leading-relaxed font-sans">
                  {story.fullStory}
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => {
                    sound.playSuccess();
                    onClose();
                  }}
                  className="flex-1 bg-[#D9A441] text-[#1A1815] font-semibold py-3 px-4 rounded-xl text-sm hover:bg-[#E8B84B] transition-transform active:scale-95 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">storefront</span>
                  <span>View Artisan Catalog</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
