import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StoryAvatar } from '../../types';
import { sound } from '../../services/sound';

export type Story = StoryAvatar & {
  lineageBadge?: string;
  audioUrl?: string;
  transcript?: string;
};

export interface StoryModalProps {
  story: Story | null;
  onClose: () => void;
  onVisitStorefront?: (story: Story) => void;
}

export const StoryModal: React.FC<StoryModalProps> = ({
  story,
  onClose,
  onVisitStorefront,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const audioIntervalRef = useRef<any>(null);

  // Generate craft lineage badge if not specified
  const lineage =
    story?.lineageBadge ||
    (story?.id === 'story-1'
      ? '5th Gen Madhubani Lineage'
      : story?.id === 'story-2'
      ? 'National Award Master Potter'
      : story?.id === 'story-3'
      ? 'Royal Chanderi Master Weaver'
      : 'Heritage Master Craftsman');

  // Handle Play/Pause simulation or real audio
  const togglePlayAudio = () => {
    sound.playTap();
    setIsPlaying((prev) => !prev);
  };

  useEffect(() => {
    if (isPlaying) {
      audioIntervalRef.current = setInterval(() => {
        setPlaybackProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1.25;
        });
      }, 250);
    } else {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    }
    return () => {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    };
  }, [isPlaying]);

  // Reset audio state when story changes
  useEffect(() => {
    setIsPlaying(false);
    setPlaybackProgress(0);
  }, [story]);

  if (!story) return null;

  const handleShareWhatsApp = () => {
    sound.playTap();
    const text = encodeURIComponent(
      `Discover the heritage craft story of ${story.artisanName} (${story.craftType}, ${story.location}) on ShilpSetu: "${story.quote}"\n\nSupport India's master artisans directly!`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-3 sm:p-4 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg max-h-[92vh] overflow-hidden rounded-3xl bg-[#1A1815] text-[#F5EFE3] flex flex-col shadow-2xl border border-white/15"
        >
          {/* Background Ambient Cover Art */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <img
              src={story.artisanPhotoUrl}
              alt={story.artisanName}
              className="w-full h-full object-cover opacity-35 filter brightness-90 scale-105"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.dataset.fallback) {
                  target.dataset.fallback = 'true';
                  target.src = 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80';
                }
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1A1815] via-[#1A1815]/80 to-black/80" />
          </div>

          {/* Top Bar with Artisan Header & Close */}
          <div className="relative z-10 p-5 pb-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-[#D9A441] shrink-0 shadow-md">
                <img
                  src={story.avatarUrl}
                  alt={story.artisanName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.dataset.fallback) {
                      target.dataset.fallback = 'true';
                      target.src = 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80';
                    }
                  }}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-lg text-white truncate">
                    {story.artisanName}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D9A441]/20 text-[#D9A441] border border-[#D9A441]/40 shrink-0">
                    {lineage}
                  </span>
                </div>
                <p className="text-xs text-[#D9A441] flex items-center gap-1 font-sans">
                  <span className="material-symbols-outlined text-xs">location_on</span>
                  <span>{story.location}</span>
                  <span className="opacity-40">•</span>
                  <span>{story.craftType}</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playTap();
                onClose();
              }}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer active:scale-90"
              aria-label="Close Story"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Story Body Content */}
          <div className="relative z-10 p-5 space-y-4 overflow-y-auto max-h-[calc(92vh-190px)]">
            {/* Artisan Quote Hero Card */}
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-sm">
              <span className="material-symbols-outlined text-3xl text-[#D9A441] block mb-1">
                format_quote
              </span>
              <p className="font-serif italic text-base sm:text-lg leading-relaxed text-white">
                "{story.quote}"
              </p>
            </div>

            {/* Oral Storytelling Audio Player */}
            <div className="p-3.5 rounded-2xl bg-[#231F19] border border-[#D9A441]/30 space-y-2.5 shadow-inner">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={togglePlayAudio}
                    className="w-10 h-10 rounded-full bg-[#D9A441] hover:bg-[#E8B84B] text-[#1A1815] flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer"
                    aria-label={isPlaying ? 'Pause Story Audio' : 'Play Story Audio'}
                  >
                    <span className="material-symbols-outlined text-2xl">
                      {isPlaying ? 'pause' : 'play_arrow'}
                    </span>
                  </button>
                  <div>
                    <span className="text-xs font-serif font-bold text-[#FFEBB3] block">
                      {isPlaying ? 'Playing Artisan Voice...' : 'Listen to Oral Story'}
                    </span>
                    <span className="text-[10px] text-white/60 font-sans">
                      Recorded in native mother tongue • 02:15
                    </span>
                  </div>
                </div>

                <span className="material-symbols-outlined text-lg text-[#D9A441] animate-pulse">
                  graphic_eq
                </span>
              </div>

              {/* Animated Progress Bar */}
              <div className="w-full bg-white/15 h-2 rounded-full overflow-hidden relative cursor-pointer">
                <div
                  className="h-full bg-gradient-to-r from-[#D9A441] to-[#E8B84B] transition-all duration-200 rounded-full"
                  style={{ width: `${playbackProgress}%` }}
                />
              </div>
            </div>

            {/* Craft Narrative Transcript */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[#D9A441]">
                <span className="material-symbols-outlined text-sm">history_edu</span>
                <span className="text-xs uppercase font-bold tracking-wider">
                  Heritage Craft Narrative Transcript
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 text-sm text-white/90 leading-relaxed font-sans space-y-2">
                <p>{story.fullStory}</p>
                <p className="text-xs text-white/60 italic">
                  "{story.storySnippet}"
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Action Buttons: Storefront & WhatsApp */}
          <div className="relative z-10 p-4 border-t border-white/10 bg-[#141210] grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                sound.playSuccess();
                if (onVisitStorefront) {
                  onVisitStorefront(story);
                }
                onClose();
              }}
              className="py-3 px-3 rounded-xl bg-[#D9A441] hover:bg-[#E8B84B] text-[#1A1815] font-serif font-bold text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-md"
            >
              <span className="material-symbols-outlined text-lg">storefront</span>
              <span className="truncate">Visit Storefront</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="py-3 px-3 rounded-xl bg-[#25D366] hover:bg-[#20BA5A] text-white font-serif font-bold text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-md"
            >
              <span className="material-symbols-outlined text-lg">share</span>
              <span className="truncate">Share on WhatsApp</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default StoryModal;
