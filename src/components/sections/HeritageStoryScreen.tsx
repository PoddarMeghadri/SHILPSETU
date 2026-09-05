import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArtisanProfile, ScreenId, LanguageCode } from '../../types';
import { sound } from '../../services/sound';
import { SuccessModal } from '../common/SuccessModal';
import { useTranslation } from '../../services/translations';

interface HeritageStoryProps {
  artisan: ArtisanProfile;
  onUpdateArtisanBio?: (newBio: string, newQuote: string) => void;
  onNavigate: (screen: ScreenId) => void;
  language?: LanguageCode;
  isDark?: boolean;
}

type StoryAngle = 'lineage' | 'technique' | 'earth' | 'folklore';

interface StoryPrompt {
  id: StoryAngle;
  title: string;
  tagline: string;
  generatedStory: string;
  quote: string;
}

const STORY_PROMPTS: Record<StoryAngle, StoryPrompt> = {
  lineage: {
    id: 'lineage',
    title: 'Three Generations of Clay',
    tagline: 'Ancestral Lineage & Heritage',
    generatedStory:
      'My grandfather learned the wheel from the village elders by the banks of the Ganges in 1948. He taught my father, who placed his hands over mine when I was seven years old. Today, every pot I throw carries the warmth of three generations of patience, river silt, and woodsmoke.',
    quote: 'We do not just shape clay; we keep the memory of our ancestors alive.',
  },
  technique: {
    id: 'technique',
    title: 'The Art of River Pebble Burnishing',
    tagline: 'Master Craft Technique',
    generatedStory:
      'Before our terracotta enters the wood kiln, we hand-rub each vessel with smooth riverbed pebbles for three hours. This closes the microscopic pores of the clay, creating a natural waterproof sheen and metallic acoustic ring without any synthetic chemical glaze.',
    quote: 'True strength comes not from modern paints, but from earth and patient friction.',
  },
  earth: {
    id: 'earth',
    title: 'Rooted in Sacred Alluvial Soil',
    tagline: 'Ecological & Sustainable Roots',
    generatedStory:
      'We harvest our clay strictly after the monsoon floods when the river deposits its richest fine sediment. Our wood kilns are fueled with fallen branches and mustard husk, returning 100% back to the soil at the end of its lifecycle.',
    quote: 'From dust it rises, to dust it gently returns.',
  },
  folklore: {
    id: 'folklore',
    title: 'The Song of the Potter’s Wheel',
    tagline: 'Myths & Local Folklore',
    generatedStory:
      'In our village, the wheel is considered an avatar of the spinning universe. We never touch the clay in the morning without first offering a prayer to Prajapati. Each vessel is sculpted with an intention of peace and prosperity for the family that welcomes it.',
    quote: 'Every hum of the wheel is a prayer for the home that receives our craft.',
  },
};

export const HeritageStoryScreen: React.FC<HeritageStoryProps> = ({
  artisan,
  onNavigate,
  isDark = false,
}) => {
  const { t } = useTranslation();
  const [selectedAngle, setSelectedAngle] = useState<StoryAngle>('lineage');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeStory, setActiveStory] = useState<StoryPrompt>(STORY_PROMPTS.lineage);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);

  const handleStartVoice = () => {
    sound.playMicStart();
    setIsRecording(true);

    setTimeout(() => {
      setIsRecording(false);
      setIsGenerating(true);

      setTimeout(() => {
        setIsGenerating(false);
        setActiveStory(STORY_PROMPTS[selectedAngle]);
        sound.playSuccess();
      }, 1500);
    }, 2500);
  };

  const handleSelectAngle = (angle: StoryAngle) => {
    sound.playTap();
    setSelectedAngle(angle);
    setActiveStory(STORY_PROMPTS[angle]);
  };

  const handlePublish = () => {
    sound.playSuccess();
    setShowSuccess(true);
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-28 md:pb-12 pt-2 px-3 sm:px-6 lg:px-8 space-y-6">
      {/* Top Banner */}
      <div
        className={`rounded-3xl p-6 border shadow-2xl relative overflow-hidden ${
          isDark
            ? 'bg-[#1C221A] text-[#F4ECDE] border-[#2D3A2B]'
            : 'bg-[#22331E] text-[#F4ECDE] border-[#E8B84B]/40'
        }`}
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#E8B84B]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="material-symbols-outlined text-[#E8B84B] text-2xl">history_edu</span>
            <span className="text-xs uppercase font-bold tracking-widest text-[#E8B84B]">
              {t('heritage_story_builder', 'Heritage Story Builder')}
            </span>
          </div>
          <h3 className="font-serif font-bold text-xl sm:text-2xl text-white">
            {t('tell_artisan_journey', 'Tell Your Artisan Journey')}
          </h3>
          <p className="text-xs sm:text-sm text-white/80 font-sans mt-1.5 leading-relaxed">
            {t(
              'story_journey_desc',
              "Buyers don't just buy a product—they buy your lineage, heritage, and soul. Narrate your story in your own words."
            )}
          </p>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Story Angles & Voice Recorder */}
        <div className="lg:col-span-5 space-y-5">
          {/* Angle Selector Tabs */}
          <div className="space-y-2.5">
            <span className="text-xs uppercase font-bold tracking-widest text-[#B5451B]">
              {t('choose_story_angle', 'Choose Story Angle:')}
            </span>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { id: 'lineage', label: t('three_generations', '3 Generations'), icon: 'family_restroom' },
                  { id: 'technique', label: t('craft_technique', 'Craft Technique'), icon: 'handyman' },
                  { id: 'earth', label: t('sacred_earth', 'Sacred Earth'), icon: 'eco' },
                  { id: 'folklore', label: t('folklore_song', 'Folklore & Song'), icon: 'music_note' },
                ] as const
              ).map((angle) => {
                const isSelected = selectedAngle === angle.id;
                return (
                  <button
                    key={angle.id}
                    onClick={() => handleSelectAngle(angle.id)}
                    className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                      isSelected
                        ? 'bg-[#B5451B] text-white border-[#B5451B] shadow-xs font-bold'
                        : isDark
                        ? 'bg-[#1C221A] text-[#F4ECDE] border-[#2D3A2B] hover:bg-[#252E22]'
                        : 'bg-[#EFE4CF] text-[#1A1815] border-[#22331E]/10 hover:bg-[#E8DAC2]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">{angle.icon}</span>
                    <span className="text-xs font-serif font-semibold">{angle.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Voice Recording Card */}
          <div
            className={`rounded-3xl p-6 text-center relative overflow-hidden border shadow-2xl ${
              isDark
                ? 'bg-[#1C221A] text-[#F4ECDE] border-[#2D3A2B]'
                : 'bg-[#22331E] text-[#F4ECDE] border-[#E8B84B]/30'
            }`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#E8B84B]/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 space-y-3.5">
              <p className="text-xs uppercase tracking-widest text-[#E8B84B] font-bold">
                {isRecording
                  ? t('listening_narrative', 'Listening to Your Heritage Narrative...')
                  : isGenerating
                  ? t('ai_crafting_bio', 'AI Crafting Your Editorial Biography...')
                  : t('tap_mic_speak_craft', 'Tap Mic to Speak About Your Craft')}
              </p>

              {/* Pulsing Mic Button */}
              <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                {isRecording && (
                  <div className="absolute inset-0 rounded-full border-2 border-[#E8B84B] animate-ping opacity-50" />
                )}

                <button
                  onClick={handleStartVoice}
                  disabled={isRecording || isGenerating}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-2xl ${
                    isRecording
                      ? 'bg-[#B5451B] text-white scale-105'
                      : 'bg-[#E8B84B] hover:bg-[#E8B84B]/90 text-[#1A1815] active:scale-90 font-bold'
                  }`}
                >
                  <span className="material-symbols-outlined text-4xl">
                    {isRecording ? 'graphic_eq' : 'mic'}
                  </span>
                </button>
              </div>

              <div className="p-3.5 bg-black/30 rounded-2xl border border-white/10 text-xs text-white/80 italic font-serif">
                Prompt: "Who taught you your craft and how does it connect to your village?"
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Editorial Story Preview Card */}
        <div className="lg:col-span-7 space-y-5">
          <div
            className={`rounded-3xl p-6 border shadow-xs space-y-5 ${
              isDark
                ? 'bg-[#1C221A] border-[#2D3A2B] text-[#F4ECDE]'
                : 'bg-[#EFE4CF] border-[#22331E]/10 text-[#1A1815]'
            }`}
          >
            {/* Header with Artisan Avatar & Title */}
            <div className="flex items-center gap-4 pb-4 border-b border-black/10">
              <img
                src={artisan.avatarUrl}
                alt={artisan.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-[#B5451B]"
              />
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-[#B5451B]">
                  {activeStory.tagline}
                </span>
                <h4 className="font-serif font-bold text-lg sm:text-xl leading-tight">{activeStory.title}</h4>
                <p className="text-xs opacity-70 font-sans mt-0.5">
                  {artisan.name} • {artisan.location}
                </p>
              </div>
            </div>

            {/* Narrative Paragraph */}
            <motion.div
              key={activeStory.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <p className="font-serif text-base leading-relaxed">{activeStory.generatedStory}</p>

              {/* Cinematic Quote Callout */}
              <div className="bg-[#22331E] text-[#F4ECDE] p-5 rounded-2xl border border-[#E8B84B]/40 relative">
                <span className="material-symbols-outlined text-3xl text-[#E8B84B] mb-1 block">
                  format_quote
                </span>
                <p className="font-serif italic text-lg text-[#FFEBB3] leading-snug">
                  "{activeStory.quote}"
                </p>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  sound.playTap();
                  onNavigate('social');
                }}
                className={`flex-1 border font-serif font-bold py-3.5 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xs ${
                  isDark
                    ? 'bg-[#121411] border-[#2D3A2B] text-[#F4ECDE] hover:bg-[#222720]'
                    : 'bg-white border-[#22331E]/15 text-[#22331E] hover:bg-[#FAF4E8]'
                }`}
              >
                <span className="material-symbols-outlined text-base">share</span>
                <span>{t('share_on_social', 'Share on Social')}</span>
              </button>

              <button
                onClick={handlePublish}
                className="flex-1 bg-[#B5451B] hover:bg-[#9C3A14] text-white font-serif font-bold py-3.5 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-base">verified</span>
                <span>{t('save_to_storefront', 'Save to Storefront')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        title={t('heritage_story_published', 'Heritage Story Published!')}
        subtitle={t(
          'heritage_story_sub',
          'Your biography is now featured on your public storefront and GeM vendor portfolio.'
        )}
        actionLabel={t('view_profile', 'View Profile')}
        onAction={() => {
          setShowSuccess(false);
          onNavigate('profile');
        }}
        isDark={isDark}
      />
    </div>
  );
};
