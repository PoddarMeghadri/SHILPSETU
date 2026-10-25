import React, { useState } from 'react';
import { StoryAvatar } from '../../types';
import { sound } from '../../services/sound';
import { useTranslation } from '../../services/translations';
import { StoryModal, Story } from './StoryModal';
import { AvatarImage } from './AvatarImage';

export interface ArtisanStoriesRowProps {
  stories: StoryAvatar[];
  isDark?: boolean;
  onAddStory?: () => void;
  onVisitStorefront?: (story: Story) => void;
}

export const ArtisanStoriesRow: React.FC<ArtisanStoriesRowProps> = ({
  stories,
  isDark = false,
  onAddStory,
  onVisitStorefront,
}) => {
  const { t } = useTranslation();
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3
          className={`font-serif font-bold text-lg flex items-center gap-1.5 ${
            isDark ? 'text-[#F4ECDE]' : 'text-[#22331E]'
          }`}
        >
          <span className="material-symbols-outlined text-xl text-[#B5451B]">auto_stories</span>
          {t('artisan_stories', 'Artisan Stories')}
        </h3>
        <span className="text-xs text-[#B5451B] font-semibold">
          {t('tap_to_view', 'Tap to view')}
        </span>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-1 no-scrollbar">
        {/* Create / Add My Story Avatar */}
        {onAddStory && (
          <button
            onClick={() => {
              sound.playTap();
              onAddStory();
            }}
            className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
            aria-label="Add your artisan story"
          >
            <div
              className={`w-16 h-16 rounded-full border-2 border-dashed border-[#B5451B] flex items-center justify-center text-[#B5451B] transition-colors shadow-xs ${
                isDark ? 'bg-[#1C221A] hover:bg-[#252E22]' : 'bg-[#EFE4CF] hover:bg-[#EAE0CC]'
              }`}
            >
              <span className="material-symbols-outlined text-2xl">add</span>
            </div>
            <span className="text-[11px] font-sans font-semibold text-center max-w-[64px] truncate opacity-90">
              {t('your_story', 'Your Story')}
            </span>
          </button>
        )}

        {/* Other Artisans Stories */}
        {stories.map((story) => (
          <button
            key={story.id}
            onClick={() => {
              sound.playTap();
              setSelectedStory(story);
            }}
            className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
            aria-label={`View story of ${story.artisanName}`}
          >
            <div
              className={`w-16 h-16 rounded-full p-0.5 transition-transform group-hover:scale-105 active:scale-95 ${
                story.isViewed
                  ? 'bg-[#22331E]/20'
                  : 'bg-gradient-to-tr from-[#B5451B] via-[#E8B84B] to-[#22331E]'
              }`}
            >
              <div
                className={`w-full h-full rounded-full overflow-hidden border-2 ${
                  isDark ? 'border-[#1C221A]' : 'border-[#F4ECDE]'
                }`}
              >
                <AvatarImage
                  src={story.avatarUrl}
                  alt={story.artisanName}
                  className="w-full h-full object-cover"
                  fallbackSrc="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80"
                />
              </div>
            </div>
            <span className="text-[11px] font-sans font-semibold text-center max-w-[68px] truncate opacity-90">
              {story.artisanName.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>

      {/* Story Modal Viewer */}
      <StoryModal
        story={selectedStory}
        onClose={() => setSelectedStory(null)}
        onVisitStorefront={onVisitStorefront}
      />
    </div>
  );
};

export default ArtisanStoriesRow;
