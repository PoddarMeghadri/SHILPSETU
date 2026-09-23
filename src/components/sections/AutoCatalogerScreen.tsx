import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ProductItem, LanguageCode, ScreenId } from '../../types';
import { LANGUAGES } from '../../data/mockData';
import { sound } from '../../services/sound';
import { SuccessModal } from '../common/SuccessModal';
import { PrintableCraftQRCodeModal } from '../common/PrintableCraftQRCodeModal';
import { useTranslation } from '../../services/translations';
import { generateLocalizedListing } from '../../services/aiTranslationService';
import { isRtlLanguage } from '../../i18n/types';
import { uploadCraftToSupabase } from '../../services/supabase';
import { translateIndicContent } from '../../services/indicTranslation';

interface AutoCatalogerProps {
  products: ProductItem[];
  onAddProduct: (newProduct: ProductItem) => void;
  onNavigate: (screen: ScreenId) => void;
  language?: LanguageCode;
  isDark?: boolean;
}

interface SampleVoicePrompt {
  lang: LanguageCode;
  nativeTranscript: string;
  category: string;
  materials: string[];
  suggestedPrice: number;
}

const SPEECH_LANG_MAP: Partial<Record<LanguageCode, string>> = {
  hi: 'hi-IN',
  bn: 'bn-IN',
  ta: 'ta-IN',
  mr: 'mr-IN',
  te: 'te-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  pa: 'pa-IN',
  or: 'or-IN',
  as: 'as-IN',
  ur: 'ur-IN',
  en: 'en-IN',
};

const SAMPLE_TRANSCRIPTS: Partial<Record<LanguageCode, SampleVoicePrompt>> = {
  hi: {
    lang: 'hi',
    nativeTranscript:
      'यह लाल मिट्टी का कलश और सुराही है, जिसे हमने गंगा की बालू और नदी की चिकनी मिट्टी मिलाकर चाक पर गढ़ा है। इस पर सरसों के तेल की मालिश करके धीमी लकड़ी की भट्टी में पकाया गया है।',
    category: 'Pottery & Earthenware',
    materials: ['Alluvial Riverbed Clay', 'Natural River Silt', 'Organic Mustard Oil Polish'],
    suggestedPrice: 1250,
  },
  bn: {
    lang: 'bn',
    nativeTranscript:
      'এটি একটি হস্তনির্মিত পোড়ামাটির পুতুল ও ফুলদানি। লাল মাটি ও নদীর পলি দিয়ে তৈরি, নিখুঁত খোদাই করা হয়েছে এবং কাঠের আগুনে পোড়ানো হয়েছে।',
    category: 'Terracotta Craft',
    materials: ['Red Clay Earth', 'Organic Mineral Wash', 'Wood Ash Glaze'],
    suggestedPrice: 1100,
  },
  ta: {
    lang: 'ta',
    nativeTranscript:
      'இது பாரம்பரிய சுடுமண் கலசம் மற்றும் அலங்கார பாத்திரம். ஆற்று களிமண் கொண்டு சக்கரத்தால் உருவாக்கப்பட்டு மரச் சூளையில் சுடப்பட்டது.',
    category: 'Heritage Pottery',
    materials: ['Riverbed Silt', 'Natural Earth Clay', 'Herbal Polish'],
    suggestedPrice: 1350,
  },
  mr: {
    lang: 'mr',
    nativeTranscript:
      'हा पारंपरिक लाल मातीचा कलश आहे. चाकावर हाताने घडवलेला आणि लाकडाच्या मंद भट्टीत भाजलेला आहे.',
    category: 'Pottery',
    materials: ['Natural Red Clay', 'River Sand', 'Organic Glaze'],
    suggestedPrice: 950,
  },
  te: {
    lang: 'te',
    nativeTranscript:
      'ఇది సంప్రదాయ ఎర్రమట్టి కుండ. నది ఒండ్రు మట్టితో చేతితో చక్రంపై తయారుచేయబడి సహజమైన పొయ్యిలో కాల్చబడింది.',
    category: 'Terracotta',
    materials: ['Alluvial Clay', 'Natural River Soil'],
    suggestedPrice: 1050,
  },
  gu: {
    lang: 'gu',
    nativeTranscript:
      'આ પરંપરાગત હાથથી બનાવેલી લાલ માટીની સુરાહી છે. નદીની ચીકણી માટીમાંથી ચાકડા પર તૈયાર કરી લાકડાની ભઠ્ઠીમાં પકવવામાં આવી છે.',
    category: 'Pottery & Clay Art',
    materials: ['River Clay', 'Natural Mineral Glaze'],
    suggestedPrice: 1150,
  },
  kn: {
    lang: 'kn',
    nativeTranscript:
      'ಇದು ಸಾಂಪ್ರದಾಯಿಕ ಕೈಯಿಂದ ಮಾಡಿದ ಜೇಡಿಮಣ್ಣಿನ ಮಡಕೆ ಮತ್ತು ಹೂಕುಂಡ. ನದಿಯ ಮಣ್ಣಿನಲ್ಲಿ ಚಕ್ರದ ಮೇಲೆ ತಯಾರಿಸಿ ಮರದ ಬೆಂಕಿಯಲ್ಲಿ ಸುಡಲಾಗಿದೆ.',
    category: 'Pottery Craft',
    materials: ['Riverbed Clay', 'Natural Glaze'],
    suggestedPrice: 1200,
  },
  ml: {
    lang: 'ml',
    nativeTranscript:
      'ഇത് പരമ്പരാഗത കളിമൺ പാത്രവും പൂപ്പാത്രവുമാണ്. പുഴയിലെ കളിമണ്ണിൽ ചക്രത്തിൽ കൈകൊണ്ട് നിർമ്മിച്ച് വിറക് അടുപ്പിൽ ചുട്ടെടുത്തത്.',
    category: 'Pottery & Ceramics',
    materials: ['Natural River Clay', 'Herbal Finish'],
    suggestedPrice: 1280,
  },
  pa: {
    lang: 'pa',
    nativeTranscript:
      'ਇਹ ਹੱਥ ਨਾਲ ਬਣਿਆ ਲਾਲ ਮਿੱਟੀ ਦਾ ਘੜਾ ਅਤੇ ਫੁੱਲਦਾਨ ਹੈ, ਜੋ ਕੁਦਰਤੀ ਮਿੱਟੀ ਨਾਲ ਚੱਕ ਉੱਤੇ ਤਿਆਰ ਕੀਤਾ ਗਿਆ ਹੈ।',
    category: 'Pottery',
    materials: ['River Silt Clay', 'Organic Wash'],
    suggestedPrice: 1020,
  },
  or: {
    lang: 'or',
    nativeTranscript:
      'ଏହା ପାରମ୍ପରିକ ମାଟିର ପାତ୍ର ଏବଂ କଳସ, ଯାହା ନଦୀର ଚିକ୍କଣ ମାଟିରେ ଚକରେ ହାତରେ ତିଆରି ହୋଇ କାଠ ନିଆଁରେ ପୋଡାଯାଇଛି।',
    category: 'Pottery & Earthenware',
    materials: ['Alluvial Clay', 'Natural Polish'],
    suggestedPrice: 1120,
  },
  as: {
    lang: 'as',
    nativeTranscript:
      'এইটো ব্ৰহ্মপুত্ৰৰ পলি মাটিৰে হাতেৰে তৈয়াৰ কৰা পোৰামাটিৰ পাত্ৰ আৰু ফুলদানি, যিটো কাঠৰ জুয়েৰে পুৰি মজবুত কৰা হৈছে।',
    category: 'Terracotta Craft',
    materials: ['Riverbed Clay', 'Wood Ash Finish'],
    suggestedPrice: 1150,
  },
  ur: {
    lang: 'ur',
    nativeTranscript:
      'یہ سرخ مٹی کا روایتی صراحی اور گلدان ہے جسے ندی کی مٹی سے چاک پر ہاتھ سے تراشا گیا ہے اور دھیمی آنچ پر پکایا گیا ہے۔',
    category: 'Pottery & Ceramics',
    materials: ['Red Alluvial Clay', 'Natural Polish'],
    suggestedPrice: 1200,
  },
  en: {
    lang: 'en',
    nativeTranscript:
      'This is a hand-thrown red clay terracotta vase crafted from local riverbed clay and wood-fired in an open kiln with organic oil polish.',
    category: 'Pottery & Earthenware',
    materials: ['Alluvial Riverbed Clay', 'Natural Silt', 'Organic Oil Polish'],
    suggestedPrice: 1250,
  },
};

export const AutoCatalogerScreen: React.FC<AutoCatalogerProps> = ({
  onAddProduct,
  language = 'hi',
  isDark = false,
}) => {
  const { t } = useTranslation();
  const [selectedLang, setSelectedLang] = useState<LanguageCode>(language);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'native' | 'english'>('native');

  // Localized AI form fields
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [materials, setMaterials] = useState<string>('');
  const [englishTitle, setEnglishTitle] = useState<string>('');
  const [englishDescription, setEnglishDescription] = useState<string>('');

  const [price, setPrice] = useState<number>(1250);
  const [materialCost, setMaterialCost] = useState<number>(350);
  const [hoursWorked, setHoursWorked] = useState<number>(8);
  const [spokenTranscript, setSpokenTranscript] = useState<string>('');
  const [isLiveSpeech, setIsLiveSpeech] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [showQRModal, setShowQRModal] = useState<boolean>(false);

  const [craftImageUrl, setCraftImageUrl] = useState<string>(
    'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=800&auto=format&fit=crop&q=80'
  );
  const [isUploadingCraftImage, setIsUploadingCraftImage] = useState<boolean>(false);
  const craftFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleCraftImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    sound.playTap();
    setIsUploadingCraftImage(true);
    try {
      const uploadRes = await uploadCraftToSupabase(file);
      if (uploadRes.publicUrl) {
        setCraftImageUrl(uploadRes.publicUrl);
        sound.playSuccess();
      }
    } catch (err) {
      console.warn('[Craft upload error]:', err);
    } finally {
      setIsUploadingCraftImage(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const capturedTextRef = useRef<string>('');
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize when app-level language changes
  useEffect(() => {
    if (language && language !== selectedLang) {
      setSelectedLang(language);
    }
  }, [language]);

  // Initialize or re-populate when language changes
  useEffect(() => {
    const prompt = SAMPLE_TRANSCRIPTS[selectedLang] || SAMPLE_TRANSCRIPTS.hi!;
    setSpokenTranscript(prompt.nativeTranscript);
    capturedTextRef.current = prompt.nativeTranscript;

    const generated = generateLocalizedListing({
      craftId: 'pottery',
      targetLanguage: selectedLang,
      suggestedPrice: prompt.suggestedPrice,
    });

    setTitle(generated.title);
    setDescription(generated.description);
    setCategory(generated.category);
    setMaterials(generated.materials.join(', '));
    setEnglishTitle(generated.englishExportTitle);
    setEnglishDescription(generated.englishExportDesc);
    setPrice(generated.suggestedPrice);

    // Call real-time Indic translation pipeline (Bhashini + Google fallback)
    let isCancelled = false;
    translateIndicContent({
      text: generated.englishExportDesc || generated.description,
      sourceLang: 'en',
      targetLang: selectedLang,
    }).then((dynamicTranslated) => {
      if (!isCancelled && dynamicTranslated && dynamicTranslated.trim()) {
        setDescription(dynamicTranslated);
      }
    }).catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [selectedLang]);

  const isCurrentLangRtl = isRtlLanguage(selectedLang);

  const handleLanguageChange = (code: LanguageCode) => {
    sound.playTap();
    setSelectedLang(code);
  };

  const stopRecordingAndProcess = useCallback(() => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    setIsRecording(false);
    setIsTranslating(true);

    setTimeout(() => {
      setIsTranslating(false);

      const textToUse = capturedTextRef.current.trim() || spokenTranscript;
      const generated = generateLocalizedListing({
        craftId: 'pottery',
        spokenText: textToUse,
        targetLanguage: selectedLang,
        suggestedPrice: 1250,
      });

      setTitle(generated.title);
      setDescription(generated.description);
      setCategory(generated.category);
      setPrice(generated.suggestedPrice);
      setMaterials(generated.materials.join(', '));
      setEnglishTitle(generated.englishExportTitle);
      setEnglishDescription(generated.englishExportDesc);

      sound.playSuccess();
    }, 1200);
  }, [selectedLang, spokenTranscript]);

  const handleToggleVoice = () => {
    if (isTranslating) return;

    if (isRecording) {
      // User pressed to stop recording and process immediately
      sound.playTap();
      stopRecordingAndProcess();
      return;
    }

    // Start voice recording
    sound.playVoiceStart();
    setIsRecording(true);
    setIsLiveSpeech(false);
    capturedTextRef.current = '';

    // Check Web Speech API availability
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch {
            // ignore
          }
        }
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.lang = SPEECH_LANG_MAP[selectedLang] || 'hi-IN';
        recognition.continuous = true;
        recognition.interimResults = true;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript + ' ';
          }
          if (currentTranscript.trim()) {
            capturedTextRef.current = currentTranscript.trim();
            setSpokenTranscript(currentTranscript.trim());
            setIsLiveSpeech(true);
          }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (err: any) => {
          console.warn('Speech recognition warning:', err?.error);
        };

        recognition.onend = () => {
          // If still recording state, we keep UI ready
        };

        recognition.start();
      } catch (err) {
        console.warn('Speech recognition not available:', err);
      }
    }

    // Safety timeout: 25 seconds for generous speech input before auto-stop
    recordingTimeoutRef.current = setTimeout(() => {
      stopRecordingAndProcess();
    }, 25000);
  };

  const handlePublish = () => {
    sound.playTap();
    const newProd: ProductItem = {
      id: `prod-${Date.now()}`,
      title: activeTab === 'native' ? title : englishTitle,
      description: activeTab === 'native' ? description : englishDescription,
      category: category || 'Handcrafted Heritage',
      price,
      materialCost,
      hoursWorked,
      stock: 12,
      rawImageUrl: craftImageUrl,
      polishedImageUrl: craftImageUrl,
      materials: materials.split(',').map((m) => m.trim()),
      status: 'live',
      dateAdded: 'Just now',
      gemSyncStatus: 'synced',
    };

    onAddProduct(newProd);
    setShowSuccess(true);
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-28 md:pb-12 pt-2 px-3 sm:px-6 lg:px-8 space-y-6">
      {/* Top Banner */}
      <div
        className={`rounded-3xl p-4 sm:p-5 border flex items-center gap-3 shadow-xs ${
          isDark
            ? 'bg-[#1C221A] text-[#F4ECDE] border-[#2D3A2B]'
            : 'bg-[#EFE4CF] text-[#22331E] border-[#22331E]/10'
        }`}
      >
        <div className="w-11 h-11 rounded-2xl bg-[#B5451B] text-white flex items-center justify-center shrink-0 shadow-xs">
          <span className="material-symbols-outlined text-2xl">translate</span>
        </div>
        <div>
          <h3 className="font-serif font-bold text-base sm:text-lg">
            {t('speak_mother_tongue', 'Speak in Your Mother Tongue')}
          </h3>
          <p className="text-xs sm:text-sm opacity-75 font-sans leading-relaxed mt-0.5 max-w-3xl">
            {t(
              'speak_mother_tongue_sub',
              'AI instantly translates your speech into polished SEO listings ready for GeM & global buyers.'
            )}
          </p>
        </div>
      </div>

      {/* Language Selector Pills */}
      <div className="space-y-2">
        <span className="text-[10px] sm:text-xs uppercase font-bold tracking-widest text-[#B5451B] block">
          {t('select_speaking_lang', 'Select Speaking Language:')}
        </span>
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar flex-wrap sm:flex-nowrap">
          {LANGUAGES.map((lang) => {
            const isSelected = selectedLang === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`relative px-3.5 py-1.5 rounded-full text-xs font-sans font-medium shrink-0 transition-all ${
                  isSelected
                    ? 'bg-[#B5451B] text-white font-semibold shadow-xs'
                    : isDark
                    ? 'bg-[#1C221A] text-[#F4ECDE] hover:bg-[#252E22] border border-[#2D3A2B]'
                    : 'bg-[#EFE4CF] text-[#1A1815] hover:bg-[#EAE0CC]'
                }`}
              >
                <span>{lang.nativeLabel}</span>
                <span className="text-[10px] opacity-70 ml-1 font-normal">({lang.label})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Responsive Split: Left Speech Recording, Right Listing Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Microphone & Live Spoken Transcript */}
        <div className="lg:col-span-5 space-y-4">
          <div
            className={`rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden border shadow-2xl ${
              isDark
                ? 'bg-[#1C221A] text-[#F4ECDE] border-[#2D3A2B]'
                : 'bg-[#22331E] text-[#F4ECDE] border-[#E8B84B]/30'
            }`}
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#E8B84B]/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 space-y-4">
              <p className="text-xs sm:text-sm uppercase tracking-widest text-[#E8B84B] font-semibold">
                {isRecording
                  ? t('recording_dialect', 'Listening to your voice...')
                  : isTranslating
                  ? t('analyzing_voice', 'Crafting native and export listings...')
                  : t('tap_to_record_craft', 'Tap to Record Craft Details')}
              </p>

              {/* Concentric Pulsing Mic Button */}
              <div className="relative mx-auto w-28 h-28 flex items-center justify-center py-2">
                {isRecording && (
                  <>
                    <div className="absolute inset-0 rounded-full border-2 border-[#E8B84B] animate-ping opacity-50" />
                    <div className="absolute -inset-3 rounded-full border border-[#B5451B] animate-pulse opacity-40" />
                  </>
                )}

                <button
                  onClick={handleToggleVoice}
                  disabled={isTranslating}
                  className={`w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-all cursor-pointer ${
                    isRecording
                      ? 'bg-[#E8B84B] text-[#1A1815] scale-105 ring-4 ring-[#E8B84B]/50'
                      : 'bg-[#B5451B] text-white hover:bg-[#9C3A14] active:scale-95'
                  }`}
                  title={isRecording ? 'Tap to Stop & Generate Listing' : 'Tap to Speak'}
                >
                  <span className="material-symbols-outlined text-5xl">
                    {isRecording ? 'stop_circle' : 'mic'}
                  </span>
                </button>
              </div>

              {isRecording && (
                <p className="text-xs text-[#E8B84B] font-bold animate-pulse font-sans">
                  {t('tap_to_finish', 'Tap mic again to finish speaking')}
                </p>
              )}

              {/* Animated Waveform Visualizer */}
              {isRecording && (
                <div className="flex items-center justify-center gap-1.5 h-10">
                  {[14, 32, 18, 36, 24, 16, 34, 20, 28, 14].map((height, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-[#E8B84B] rounded-full wave-bar"
                      style={{
                        animationDelay: `${i * 0.1}s`,
                        height: `${height}px`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Spoken Native Script Transcript Preview */}
              <div
                dir={isCurrentLangRtl ? 'rtl' : 'ltr'}
                className="p-4 bg-black/40 rounded-2xl border border-white/10 text-left space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs text-[#E8B84B] uppercase tracking-wider font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs rtl-flip">record_voice_over</span>
                    {t('spoken_transcript', 'Spoken Transcript')} (
                    {LANGUAGES.find((l) => l.code === selectedLang)?.nativeLabel}):
                  </span>
                  {isLiveSpeech && (
                    <span className="text-[9px] bg-[#B5451B] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
                      {t('live_speech_detected', 'Live Voice')}
                    </span>
                  )}
                </div>
                <p className="font-serif italic text-sm text-white/95 leading-relaxed">
                  "{spokenTranscript}"
                </p>
              </div>
            </div>
          </div>

          {/* Voice Prompt Guidance Card */}
          <div
            className={`p-4 rounded-3xl border text-xs space-y-1.5 ${
              isDark ? 'bg-[#1C221A] border-[#2D3A2B] text-[#F4ECDE]' : 'bg-[#EFE4CF] border-[#22331E]/10 text-[#22331E]'
            }`}
          >
            <div className="flex items-center gap-1.5 text-[#B5451B] font-serif font-bold">
              <span className="material-symbols-outlined text-sm">tips_and_updates</span>
              <span>Artisan Voice Tips</span>
            </div>
            <p className="text-[11px] opacity-80 leading-relaxed font-sans">
              Mention the clay or yarn source, technique (wheel, handloom, pit furnace), dimensions, and hours taken. ShilpSetu AI formats these directly into official export specifications.
            </p>
          </div>
        </div>

        {/* Right Column: Bilingual Listing Editor */}
        <div className="lg:col-span-7 space-y-4">
          {/* Bilingual Toggle: Native Listing vs English SEO Export */}
          <div
            className={`flex p-1 rounded-2xl border ${
              isDark ? 'bg-[#1C221A] border-[#2D3A2B]' : 'bg-[#EFE4CF] border-[#22331E]/10'
            }`}
          >
            <button
              onClick={() => {
                sound.playTap();
                setActiveTab('native');
              }}
              className={`flex-1 py-2.5 text-xs font-serif font-bold rounded-xl transition-all ${
                activeTab === 'native'
                  ? 'bg-[#B5451B] text-white shadow-xs'
                  : isDark
                  ? 'text-[#F4ECDE]/70 hover:text-white'
                  : 'text-[#22331E]/70 hover:text-[#1A1815]'
              }`}
            >
              {t('view_native_listing', 'Native Listing')} ({LANGUAGES.find((l) => l.code === selectedLang)?.nativeLabel})
            </button>

            <button
              onClick={() => {
                sound.playTap();
                setActiveTab('english');
              }}
              className={`flex-1 py-2.5 text-xs font-serif font-bold rounded-xl transition-all ${
                activeTab === 'english'
                  ? 'bg-[#22331E] text-[#F4ECDE] shadow-xs'
                  : isDark
                  ? 'text-[#F4ECDE]/70 hover:text-white'
                  : 'text-[#22331E]/70 hover:text-[#1A1815]'
              }`}
            >
              {t('view_english_seo', 'English SEO Export (GeM / B2B)')}
            </button>
          </div>

          {/* Generated Listing Card */}
          <div
            dir={activeTab === 'native' && isCurrentLangRtl ? 'rtl' : 'ltr'}
            className={`rounded-3xl p-5 sm:p-6 border shadow-xs space-y-4 ${
              isDark
                ? 'bg-[#1C221A] text-[#F4ECDE] border-[#2D3A2B]'
                : 'bg-[#EFE4CF] text-[#22331E] border-[#22331E]/10'
            }`}
          >
        <div className="flex items-center justify-between pb-2 border-b border-[#22331E]/10">
          <h4 className="font-serif font-bold text-base flex items-center gap-1.5">
            <span className="material-symbols-outlined text-lg text-[#B5451B]">verified</span>
            {activeTab === 'native'
              ? t('ai_generated_listing', 'AI Generated Native Listing')
              : t('view_english_seo', 'GeM / Global B2B Export')}
          </h4>
          <span className="px-2.5 py-0.5 bg-[#22331E]/10 text-[#22331E] dark:text-[#E8B84B] dark:bg-[#E8B84B]/10 text-[10px] font-bold uppercase rounded-full border border-[#22331E]/20">
            {activeTab === 'native'
              ? LANGUAGES.find((l) => l.code === selectedLang)?.nativeLabel
              : t('seo_optimized', 'SEO Optimized')}
          </span>
        </div>

        {/* Form Fields */}
        <div className="space-y-3.5">
          {/* Craft Photo Upload & Live Preview */}
          <div className="rounded-2xl p-3 bg-black/5 dark:bg-white/5 border border-[#22331E]/10 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#B5451B] block">
                {t('craft_photo', 'Craft Photo')}
              </label>
              <button
                type="button"
                disabled={isUploadingCraftImage}
                onClick={() => craftFileInputRef.current?.click()}
                className="flex items-center gap-1 text-[11px] font-bold text-[#B5451B] bg-[#B5451B]/10 hover:bg-[#B5451B]/20 px-2.5 py-1 rounded-full transition-colors cursor-pointer disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-sm ${isUploadingCraftImage ? 'animate-spin' : ''}`}>
                  {isUploadingCraftImage ? 'progress_activity' : 'add_photo_alternate'}
                </span>
                <span>{isUploadingCraftImage ? t('uploading', 'Uploading...') : t('upload_craft_photo', 'Upload Craft Photo')}</span>
              </button>
              <input
                ref={craftFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCraftImageUpload}
              />
            </div>
            <div className="relative h-36 sm:h-44 rounded-xl overflow-hidden border border-[#22331E]/15 bg-black/10 flex items-center justify-center">
              <img
                src={craftImageUrl}
                alt={title || 'Craft'}
                className="w-full h-full object-cover"
              />
              {isUploadingCraftImage && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-2xl animate-spin">
                    progress_activity
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#B5451B] block mb-1">
              {t('craft_title', 'Craft Title')}
            </label>
            <input
              type="text"
              value={activeTab === 'native' ? title : englishTitle}
              onChange={(e) =>
                activeTab === 'native' ? setTitle(e.target.value) : setEnglishTitle(e.target.value)
              }
              className={`w-full px-3.5 py-2.5 rounded-2xl border text-sm font-serif focus:outline-hidden focus:ring-2 focus:ring-[#B5451B] ${
                isDark
                  ? 'bg-[#121411] border-[#2D3A2B] text-white'
                  : 'bg-white border-[#22331E]/20 text-[#1A1815]'
              }`}
            />
          </div>

          {/* Category & Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#B5451B] block mb-1">
                {t('craft_category', 'Category')}
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs focus:outline-hidden focus:ring-2 focus:ring-[#B5451B] ${
                  isDark
                    ? 'bg-[#121411] border-[#2D3A2B] text-white'
                    : 'bg-white border-[#22331E]/20 text-[#1A1815]'
                }`}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#B5451B] block mb-1">
                {t('calculated_fair_price', 'Fair Price (₹)')}
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-[#B5451B] ${
                  isDark
                    ? 'bg-[#121411] border-[#2D3A2B] text-[#FFEBB3]'
                    : 'bg-white border-[#22331E]/20 text-[#22331E]'
                }`}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#B5451B] block mb-1">
              {t('craft_description', 'Story & Description')}
            </label>
            <textarea
              rows={3}
              value={activeTab === 'native' ? description : englishDescription}
              onChange={(e) =>
                activeTab === 'native'
                  ? setDescription(e.target.value)
                  : setEnglishDescription(e.target.value)
              }
              className={`w-full px-3.5 py-2 rounded-2xl border text-xs leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-[#B5451B] resize-none ${
                isDark
                  ? 'bg-[#121411] border-[#2D3A2B] text-white'
                  : 'bg-white border-[#22331E]/20 text-[#1A1815]'
              }`}
            />
          </div>

          {/* Materials Used */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#B5451B] block mb-1">
              {t('materials_used', 'Materials Used')}
            </label>
            <input
              type="text"
              value={materials}
              onChange={(e) => setMaterials(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs focus:outline-hidden focus:ring-2 focus:ring-[#B5451B] ${
                isDark
                  ? 'bg-[#121411] border-[#2D3A2B] text-white'
                  : 'bg-white border-[#22331E]/20 text-[#1A1815]'
              }`}
            />
          </div>

          {/* Hours of Work & Material Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#B5451B] block mb-1">
                {t('hours_worked', 'Hours Worked')}
              </label>
              <input
                type="number"
                value={hoursWorked}
                onChange={(e) => setHoursWorked(Number(e.target.value))}
                className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs focus:outline-hidden focus:ring-2 focus:ring-[#B5451B] ${
                  isDark
                    ? 'bg-[#121411] border-[#2D3A2B] text-white'
                    : 'bg-white border-[#22331E]/20 text-[#1A1815]'
                }`}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#B5451B] block mb-1">
                {t('material_cost', 'Material Cost (₹)')}
              </label>
              <input
                type="number"
                value={materialCost}
                onChange={(e) => setMaterialCost(Number(e.target.value))}
                className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs focus:outline-hidden focus:ring-2 focus:ring-[#B5451B] ${
                  isDark
                    ? 'bg-[#121411] border-[#2D3A2B] text-white'
                    : 'bg-white border-[#22331E]/20 text-[#1A1815]'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Info Note */}
        <p className="text-[11px] opacity-75 italic text-center">
          {t(
            'bilingual_export_note',
            'AI generates your craft story in your mother tongue and creates an English export for GeM & global buyers.'
          )}
        </p>

        {/* Action Buttons: Publish + Print Physical QR Label */}
        <div className="space-y-2 pt-2">
          <button
            onClick={handlePublish}
            className="w-full bg-[#B5451B] hover:bg-[#9C3A14] text-white font-serif font-bold py-3.5 rounded-2xl text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">cloud_upload</span>
            <span>{t('publish_craft', 'Publish to GeM & Storefront')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setShowQRModal(true);
            }}
            className={`w-full py-2.5 px-4 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 active:scale-98 transition-all ${
              isDark
                ? 'bg-[#1C221A] border-[#D4A759]/40 text-[#F4ECDE] hover:bg-[#252E22]'
                : 'bg-white border-[#D4A759]/60 text-[#1A1815] hover:bg-[#FAF4E8]'
            }`}
          >
            <span className="material-symbols-outlined text-lg text-[#B5451B]">qr_code_2</span>
            <span>{t('generate_qr_label', 'Print Physical QR Label')}</span>
          </button>
        </div>
      </div>
    </div>
  </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        title={t('listing_published_success', 'Product Published Successfully!')}
        subtitle={t('listing_published_sub', 'Your listing is now live on GeM and your digital storefront.')}
        actionLabel={t('done', 'Done')}
        onAction={() => setShowSuccess(false)}
        isDark={isDark}
      />

      {/* Printable Physical Craft Hangtag Modal */}
      <PrintableCraftQRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        craftTitle={activeTab === 'native' ? title : englishTitle || title}
        category={category}
        price={price}
        artisanName="Rameshwar Prasad"
        artisanLocation="Jaipur, Rajasthan"
        materials={materials}
        craftId="craft-terracotta-vase-98"
        isDark={isDark}
      />
    </div>
  );
};
