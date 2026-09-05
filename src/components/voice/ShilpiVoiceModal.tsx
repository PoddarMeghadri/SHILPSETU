import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScreenId, LanguageCode, ArtisanProfile, ProductItem } from '../../types';
import { sound } from '../../services/sound';
import { ShilpSetuLogo } from '../common/ShilpSetuLogo';
import { useTranslation } from '../../services/translations';
import {
  ChatMessage,
  ShilpiChatContext,
  sendShilpiChatMessage,
  generateArtisanAIResponse,
} from '../../services/shilpiAiService';

interface ShilpiVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: ScreenId) => void;
  onLanguageChange: (lang: LanguageCode) => void;
  onToggleTheme: () => void;
  currentLanguage: LanguageCode;
  artisan?: ArtisanProfile;
  products?: ProductItem[];
  isDark?: boolean;
}

interface CommandSuggestion {
  text: string;
  actionDesc: string;
  icon: string;
  action: () => void;
}

export const ShilpiVoiceModal: React.FC<ShilpiVoiceModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onLanguageChange,
  onToggleTheme,
  currentLanguage,
  artisan,
  products,
  isDark = false,
}) => {
  const { t, language } = useTranslation();
  const effectiveLanguage = currentLanguage || language;

  // Active interaction mode: 'chat' (like Gemini) or 'voice' (hands-free audio)
  const [activeTab, setActiveTab] = useState<'chat' | 'voice'>('chat');

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isCopiedId, setIsCopiedId] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Voice State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [isSpeakingResponse, setIsSpeakingResponse] = useState<boolean>(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const voiceTranscriptRef = useRef<string>('');
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const activeArtisan: ArtisanProfile = artisan || {
    name: 'Soumalya Pal',
    craft: 'Terracotta & Heritage Pottery',
    location: 'Bishnupur, West Bengal',
    trustScore: 98,
    bio: 'Master terracotta sculptor',
    experienceYears: 18,
    avatarUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&auto=format&fit=crop&q=80',
    mobile: '9876543210',
    badges: [],
  };

  const chatContext: ShilpiChatContext = {
    artisan: activeArtisan,
    language: effectiveLanguage,
    products,
    isDark,
  };

  // Pre-seed conversation with a welcoming greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeTemplate = t('shilpi_welcome_message', 'Namaste! I am SHILPI AI, your master craft intelligence partner. You can chat with me through text or talk with voice:\n\n• Fair craft pricing formulas & living wage calculations\n• 4K AI Photo Studio enhancement guidance\n• GeM bulk tenders & institutional procurement\n• High-converting Instagram & WhatsApp craft captions\n\nWhat would you like to explore today?');
      const firstName = activeArtisan.name.split(' ')[0] || '';
      const personalizedGreeting = welcomeTemplate.replace(/Namaste!|नमस्ते!|ਨਮਸਤੇ!|নমস্কার!|வணக்கம்!|నమస్కారం!|ನಮಸ್ಕಾರ!|നമസ്കാരം!|ନମସ୍କାର!|নমস্কাৰ!|آداب!/, (match) => `${match} **${firstName}** 🙏`);
      const welcomeMessage: ChatMessage = {
        id: 'welcome-1',
        sender: 'shilpi',
        text: personalizedGreeting,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, effectiveLanguage, t, activeArtisan.name]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeTab === 'chat' && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, activeTab]);

  // Voice Command Suggestions
  const suggestions: CommandSuggestion[] = [
    {
      text: t('voice_cmd_studio', 'Open AI Studio'),
      actionDesc: t('voice_cmd_studio_desc', 'Enhance craft photos to 4K'),
      icon: 'photo_camera',
      action: () => {
        respondAndExecute(t('voice_cmd_studio_feedback', 'Opening AI Photo Studio for 4K craft enhancement.'), 'studio');
      },
    },
    {
      text: t('voice_cmd_pricing', 'Calculate Fair Price'),
      actionDesc: t('voice_cmd_pricing_desc', 'Zero middleman craft pricing'),
      icon: 'calculate',
      action: () => {
        respondAndExecute(t('voice_cmd_pricing_feedback', 'Opening Fair Pricing algorithm.'), 'pricing');
      },
    },
    {
      text: t('voice_cmd_cataloger', 'Voice Catalog New Item'),
      actionDesc: t('voice_cmd_cataloger_desc', 'Speak craft specs in mother tongue'),
      icon: 'mic',
      action: () => {
        respondAndExecute(t('voice_cmd_cataloger_feedback', 'Starting multilingual voice cataloger.'), 'cataloger');
      },
    },
    {
      text: t('voice_cmd_dashboard', "Show Today's Sales"),
      actionDesc: t('voice_cmd_dashboard_desc', 'Revenue & pending dispatches'),
      icon: 'analytics',
      action: () => {
        respondAndExecute(t('voice_cmd_dashboard_feedback', "Fetching today's workshop revenue and orders."), 'dashboard');
      },
    },
    {
      text: t('voice_cmd_b2b', 'Check GeM B2B Tenders'),
      actionDesc: t('voice_cmd_b2b_desc', 'Direct institutional orders'),
      icon: 'gavel',
      action: () => {
        respondAndExecute(t('voice_cmd_b2b_feedback', 'Opening GeM Portal & direct buyer inquiries.'), 'b2b');
      },
    },
    {
      text: t('voice_cmd_social', 'Social Marketing Kit'),
      actionDesc: t('voice_cmd_social_desc', 'WhatsApp & Instagram posters'),
      icon: 'share',
      action: () => {
        respondAndExecute(t('voice_cmd_social_feedback', 'Generating Instagram & WhatsApp marketing kit.'), 'social');
      },
    },
    {
      text: t('voice_cmd_notifications', 'Check Notifications & Alerts'),
      actionDesc: t('voice_cmd_notifications_desc', 'Orders, tenders & studio alerts'),
      icon: 'notifications',
      action: () => {
        respondAndExecute(t('voice_cmd_notifications_feedback', 'Opening Notifications and Alerts tab.'), 'notifications');
      },
    },
    {
      text: t('voice_cmd_inventory', 'Check Low Stock Products'),
      actionDesc: t('voice_cmd_inventory_desc', 'Show products running low on stock'),
      icon: 'inventory_2',
      action: () => {
        respondAndExecute(t('voice_cmd_inventory_feedback', 'Checking workshop inventory for low stock items.'), 'dashboard');
      },
    },
  ];

  const quickPromptPills = [
    { label: t('quick_pill_inventory_label', '📦 Check low inventory'), query: t('quick_pill_inventory_query', 'Which product is low in my inventory?') },
    { label: t('quick_pill_price_label', '💡 Fair price formula'), query: t('quick_pill_price_query', 'How do I calculate fair price for my craft with zero middlemen?') },
    { label: t('quick_pill_studio_label', '📸 4K Studio tips'), query: t('quick_pill_studio_query', 'What are the best lighting tips for photographing my pottery craft?') },
    { label: t('quick_pill_gem_label', '🏛️ GeM bulk tenders'), query: t('quick_pill_gem_query', 'How can I bid on government tenders for handicrafts on GeM?') },
    { label: t('quick_pill_insta_label', '✍️ Instagram story caption'), query: t('quick_pill_insta_query', 'Write an authentic Instagram caption celebrating our 4-generation craft lineage') },
    { label: t('quick_pill_gi_label', '🏷️ What is GI tag?'), query: t('quick_pill_gi_query', 'What are the benefits of a Geographical Indication (GI) tag for my craft?') },
  ];

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      // Remove markdown bold / asterisks for clean pronunciation
      const clean = text.replace(/[*#_`]/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.0;
      utterance.pitch = 1.05;

      const langMap: Partial<Record<LanguageCode, string>> = {
        hi: 'hi-IN',
        bn: 'bn-IN',
        ta: 'ta-IN',
        te: 'te-IN',
        mr: 'mr-IN',
        gu: 'gu-IN',
        kn: 'kn-IN',
        ml: 'ml-IN',
        pa: 'pa-IN',
        or: 'or-IN',
        as: 'as-IN',
        ur: 'ur-IN',
        en: 'en-IN',
      };
      utterance.lang = langMap[currentLanguage] || 'en-IN';

      utterance.onstart = () => setIsSpeakingResponse(true);
      utterance.onend = () => setIsSpeakingResponse(false);
      utterance.onerror = () => setIsSpeakingResponse(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isTyping) return;

    sound.playTap();
    setInputText('');

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const replyMessage = await sendShilpiChatMessage(query, chatContext, messages);
      setMessages((prev) => [...prev, replyMessage]);
      sound.playSuccess();
    } catch (err) {
      const fallbackResult = generateArtisanAIResponse(query, chatContext, messages);
      setMessages((prev) => [
        ...prev,
        {
          id: `shilpi-${Date.now()}`,
          sender: 'shilpi',
          text: fallbackResult.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedAction: fallbackResult.suggestedAction,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    sound.playTap();
    navigator.clipboard.writeText(text);
    setIsCopiedId(id);
    setTimeout(() => setIsCopiedId(null), 1800);
  };

  const clearChatHistory = () => {
    sound.playTap();
    setMessages([]);
  };

  const respondAndExecute = (msg: string, screen?: ScreenId, extraAction?: () => void) => {
    setFeedbackMessage(msg);
    speakText(msg);
    sound.playSuccess();

    if (extraAction) extraAction();

    setTimeout(() => {
      if (screen) onNavigate(screen);
      onClose();
    }, 1100);
  };

  // Process freeform voice input query in voice mode
  const processVoiceQuery = (query: string) => {
    const q = query.toLowerCase();

    if (q.includes('studio') || q.includes('photo') || q.includes('camera') || q.includes('lighting') || q.includes('फोटो')) {
      respondAndExecute('Opening AI Artisan Photo Studio.', 'studio');
    } else if (q.includes('catalog') || q.includes('item') || q.includes('naya') || q.includes('add') || q.includes('समान') || q.includes('कैटलॉग')) {
      respondAndExecute('Launching Voice Auto-Cataloger.', 'cataloger');
    } else if (q.includes('price') || q.includes('dam') || q.includes('bhav') || q.includes('margin') || q.includes('मूल्य') || q.includes('भाव')) {
      respondAndExecute('Opening Fair Price Calculator.', 'pricing');
    } else if (q.includes('gem') || q.includes('tender') || q.includes('bulk') || q.includes('b2b') || q.includes('order') || q.includes('सरकारी')) {
      respondAndExecute('Opening B2B and GeM Portal Gateway.', 'b2b');
    } else if (q.includes('sales') || q.includes('dashboard') || q.includes('income') || q.includes('revenue') || q.includes('hisab') || q.includes('बिक्री')) {
      respondAndExecute('Loading your business revenue insights.', 'dashboard');
    } else if (q.includes('instagram') || q.includes('whatsapp') || q.includes('facebook') || q.includes('social') || q.includes('share') || q.includes('शेयर')) {
      respondAndExecute('Opening 1-Click Social Marketing Kit.', 'social');
    } else if (q.includes('story') || q.includes('lineage') || q.includes('kahani') || q.includes('virasat') || q.includes('कहानी')) {
      respondAndExecute('Opening Heritage Story Builder.', 'story');
    } else if (q.includes('notification') || q.includes('alert') || q.includes('soochana') || q.includes('suchana') || q.includes('सूचना') || q.includes('বিজ্ঞप्ति') || q.includes('அறிவிப்பு')) {
      respondAndExecute('Opening Notifications and Alerts.', 'notifications');
    } else if (q.includes('dark') || q.includes('light') || q.includes('theme') || q.includes('मोड')) {
      respondAndExecute('Toggling display theme.', undefined, () => onToggleTheme());
    } else if (q.includes('hindi') || q.includes('हिंदी')) {
      onLanguageChange('hi');
      respondAndExecute('भाषा बदलकर हिंदी कर दी गई है।');
    } else if (q.includes('english') || q.includes('अंग्रेजी')) {
      onLanguageChange('en');
      respondAndExecute('Language switched to English.');
    } else if (q.includes('bengali') || q.includes('বাংলা')) {
      onLanguageChange('bn');
      respondAndExecute('ভাষা পরিবর্তন করে বাংলা করা হয়েছে।');
    } else {
      // Switch to chat tab to show detailed Gemini answer
      setActiveTab('chat');
      handleSendMessage(query);
    }
  };

  const stopListeningAndCommit = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);

    const query = voiceTranscriptRef.current.trim();
    if (query) {
      voiceTranscriptRef.current = '';
      if (activeTab === 'chat') {
        handleSendMessage(query);
      } else {
        processVoiceQuery(query);
      }
    }
  }, [activeTab, handleSendMessage, processVoiceQuery]);

  const startListening = () => {
    sound.playVoiceStart();
    setIsListening(true);
    setTranscript('');
    voiceTranscriptRef.current = '';
    setFeedbackMessage(t('listening_state', 'Listening... Speak your command'));

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

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
        recognition.continuous = true;
        recognition.interimResults = true;

        const langMap: Partial<Record<LanguageCode, string>> = {
          hi: 'hi-IN',
          bn: 'bn-IN',
          ta: 'ta-IN',
          te: 'te-IN',
          mr: 'mr-IN',
          gu: 'gu-IN',
          kn: 'kn-IN',
          ml: 'ml-IN',
          pa: 'pa-IN',
          or: 'or-IN',
          as: 'as-IN',
          ur: 'ur-IN',
          en: 'en-IN',
        };
        recognition.lang = langMap[currentLanguage] || 'en-IN';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          let accumulated = '';
          for (let i = 0; i < event.results.length; i++) {
            accumulated += event.results[i][0].transcript + ' ';
          }
          const text = accumulated.trim();
          if (text) {
            voiceTranscriptRef.current = text;
            setTranscript(text);
            if (activeTab === 'chat') {
              setInputText(text);
            }

            // Auto commit after 1.8s of silence
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
              stopListeningAndCommit();
            }, 1800);
          }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (err: any) => {
          console.warn('Speech recognition status:', err?.error);
        };

        recognition.onend = () => {
          if (voiceTranscriptRef.current.trim()) {
            stopListeningAndCommit();
          } else {
            setIsListening(false);
          }
        };

        recognition.start();
        return;
      } catch (err) {
        console.warn('Microphone start error:', err);
      }
    }

    // Fallback simulation if browser mic permissions or Web Speech is blocked
    const samplePhrases = [
      t('voice_cmd_studio', 'Open AI Studio'),
      t('voice_cmd_dashboard', "Show today's sales"),
      t('voice_cmd_pricing', 'Calculate fair price'),
      t('voice_cmd_b2b', 'Check GeM bulk tenders'),
    ];
    const picked = samplePhrases[Math.floor(Math.random() * samplePhrases.length)];

    let currentChars = '';
    let index = 0;
    simulationIntervalRef.current = setInterval(() => {
      if (index < picked.length) {
        currentChars += picked[index];
        voiceTranscriptRef.current = currentChars;
        setTranscript(currentChars);
        if (activeTab === 'chat') {
          setInputText(currentChars);
        }
        index++;
      } else {
        if (simulationIntervalRef.current) {
          clearInterval(simulationIntervalRef.current);
          simulationIntervalRef.current = null;
        }
        setTimeout(() => {
          stopListeningAndCommit();
        }, 500);
      }
    }, 60);
  };

  useEffect(() => {
    if (!isOpen) {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
      setIsListening(false);
      setTranscript('');
      setFeedbackMessage('');
      voiceTranscriptRef.current = '';
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 30 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`w-full max-w-2xl h-[90vh] sm:h-[82vh] max-h-[780px] rounded-t-3xl sm:rounded-3xl shadow-2xl border flex flex-col relative overflow-hidden ${
            isDark
              ? 'bg-[#161B14] text-[#F4ECDE] border-[#2D3A2B]'
              : 'bg-[#FAF5ED] text-[#1A1815] border-[#22331E]/15'
          }`}
        >
          {/* Subtle Ambient Glows */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#E8B84B]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#B5451B]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Modal Header */}
          <div className="px-5 py-4 border-b border-current/10 flex items-center justify-between shrink-0 relative z-10">
            <div className="flex items-center gap-3">
              <ShilpSetuLogo size="sm" isDark={isDark} />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-black text-lg text-[#B5451B] leading-none">
                    SHILPI AI
                  </h3>
                </div>
                <p className="text-[11px] opacity-75 font-serif mt-0.5">
                  {t('shilpi_tagline', 'Conversational Assistant for Indian Artisans')}
                </p>
              </div>
            </div>

            {/* Top Right Controls (Mode Switcher, Clear, Close) */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Chat vs Voice Mode Pills */}
              <div className="flex items-center p-0.5 rounded-xl bg-black/5 dark:bg-white/5 border border-current/10">
                <button
                  onClick={() => {
                    sound.playTap();
                    setActiveTab('chat');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'chat'
                      ? 'bg-[#B5451B] text-white shadow-xs'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  id="tab-shilpi-chat"
                >
                  <span className="material-symbols-outlined text-[16px]">chat</span>
                  <span>Chat</span>
                </button>
                <button
                  onClick={() => {
                    sound.playTap();
                    setActiveTab('voice');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'voice'
                      ? 'bg-[#B5451B] text-white shadow-xs'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  id="tab-shilpi-voice"
                >
                  <span className="material-symbols-outlined text-[16px]">mic</span>
                  <span>Voice</span>
                </button>
              </div>

              {activeTab === 'chat' && messages.length > 1 && (
                <button
                  onClick={clearChatHistory}
                  className="p-1.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-colors"
                  title="Clear chat history"
                >
                  <span className="material-symbols-outlined text-lg">delete_sweep</span>
                </button>
              )}

              <button
                onClick={() => {
                  sound.playTap();
                  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                  onClose();
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                title="Close"
                id="btn-close-shilpi-ai"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          </div>

          {/* MAIN VIEWPORT: CHAT MODE (Gemini-like) */}
          {activeTab === 'chat' ? (
            <div className="flex-1 flex flex-col min-h-0 relative z-10">
              {/* Quick Prompts Carousel */}
              <div className="px-4 py-2 border-b border-current/5 overflow-x-auto no-scrollbar flex items-center gap-2 shrink-0">
                {quickPromptPills.map((pill, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(pill.query)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0 border transition-all cursor-pointer ${
                      isDark
                        ? 'bg-[#1C221A] border-[#2D3A2B] hover:border-[#E8B84B] text-[#F4ECDE]'
                        : 'bg-white border-[#22331E]/15 hover:border-[#B5451B] text-[#1A1815]'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {/* Chat Thread Messages */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar">
                {messages.map((msg) => {
                  const isUser = msg.sender === 'user';

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 max-w-[90%] sm:max-w-[82%] ${
                        isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                      }`}
                    >
                      {/* Avatar */}
                      {!isUser ? (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#B5451B] to-[#7F2A0B] text-[#FFEBB3] flex items-center justify-center shrink-0 shadow-xs mt-0.5 border border-[#E8B84B]/50">
                          <span className="material-symbols-outlined text-sm">auto_awesome</span>
                        </div>
                      ) : (
                        <img
                          src={activeArtisan.avatarUrl}
                          alt={activeArtisan.name}
                          className="w-8 h-8 rounded-full object-cover shrink-0 border border-[#E8B84B] mt-0.5"
                        />
                      )}

                      {/* Bubble */}
                      <div className="space-y-1">
                        <div
                          className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                            isUser
                              ? 'bg-[#B5451B] text-white rounded-tr-xs shadow-md'
                              : isDark
                              ? 'bg-[#1F261D] text-[#F4ECDE] border border-[#2D3A2B] rounded-tl-xs shadow-sm'
                              : 'bg-white text-[#1A1815] border border-[#22331E]/15 rounded-tl-xs shadow-sm'
                          }`}
                        >
                          {/* Markdown rendering with bold highlights and linebreaks */}
                          <div className="whitespace-pre-wrap font-sans space-y-2">
                            {msg.text.split('\n').map((line, lIdx) => {
                              if (!line.trim()) return <div key={lIdx} className="h-1" />;
                              // Parse bold formatting (**text**)
                              const parts = line.split(/(\*\*.*?\*\*)/g);
                              return (
                                <p key={lIdx} className="leading-relaxed">
                                  {parts.map((p, pIdx) => {
                                    if (p.startsWith('**') && p.endsWith('**')) {
                                      return (
                                        <strong
                                          key={pIdx}
                                          className={
                                            isUser
                                              ? 'font-bold underline decoration-white/40'
                                              : 'font-bold text-[#B5451B] dark:text-[#E8B84B]'
                                          }
                                        >
                                          {p.slice(2, -2)}
                                        </strong>
                                      );
                                    }
                                    return p;
                                  })}
                                </p>
                              );
                            })}
                          </div>

                          {/* Action Button Attachment if suggested */}
                          {msg.suggestedAction && (
                            <div className="mt-3 pt-2.5 border-t border-current/15 flex items-center justify-between">
                              <button
                                onClick={() => {
                                  sound.playTap();
                                  if (msg.suggestedAction?.screen) {
                                    onNavigate(msg.suggestedAction.screen);
                                    onClose();
                                  } else if (msg.suggestedAction?.callback) {
                                    msg.suggestedAction.callback();
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#B5451B] hover:bg-[#9C3A14] text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
                              >
                                {msg.suggestedAction.icon && (
                                  <span className="material-symbols-outlined text-sm">
                                    {msg.suggestedAction.icon}
                                  </span>
                                )}
                                <span>{msg.suggestedAction.label}</span>
                                <span className="material-symbols-outlined text-xs">arrow_forward</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Footer (timestamp + copy + read aloud) */}
                        <div
                          className={`flex items-center gap-2 px-1 text-[10px] opacity-60 ${
                            isUser ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <span>{msg.timestamp}</span>
                          {!isUser && (
                            <>
                              <span>•</span>
                              <button
                                onClick={() => copyToClipboard(msg.id, msg.text)}
                                className="hover:opacity-100 flex items-center gap-0.5 transition-opacity"
                                title={t('copy_answer', 'Copy answer')}
                              >
                                <span className="material-symbols-outlined text-[12px]">
                                  {isCopiedId === msg.id ? 'check' : 'content_copy'}
                                </span>
                                <span>{isCopiedId === msg.id ? t('copied', 'Copied') : t('copy', 'Copy')}</span>
                              </button>
                              <span>•</span>
                              <button
                                onClick={() => speakText(msg.text)}
                                className="hover:opacity-100 flex items-center gap-0.5 transition-opacity"
                                title={t('listen_response', 'Listen to response')}
                              >
                                <span className="material-symbols-outlined text-[12px]">volume_up</span>
                                <span>{t('listen', 'Listen')}</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex items-center gap-3 mr-auto max-w-[80%]">
                    <div className="w-8 h-8 rounded-full bg-[#B5451B] text-[#FFEBB3] flex items-center justify-center shrink-0 border border-[#E8B84B]/50 animate-pulse">
                      <span className="material-symbols-outlined text-sm">auto_awesome</span>
                    </div>
                    <div
                      className={`p-3 rounded-2xl rounded-tl-xs flex items-center gap-2 text-xs ${
                        isDark ? 'bg-[#1F261D] text-[#F4ECDE]' : 'bg-white text-[#1A1815]'
                      } border border-current/10 shadow-sm`}
                    >
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-[#B5451B] rounded-full animate-bounce" />
                        <span
                          className="w-1.5 h-1.5 bg-[#B5451B] rounded-full animate-bounce"
                          style={{ animationDelay: '0.15s' }}
                        />
                        <span
                          className="w-1.5 h-1.5 bg-[#B5451B] rounded-full animate-bounce"
                          style={{ animationDelay: '0.3s' }}
                        />
                      </div>
                      <span className="opacity-75 italic font-serif">
                        {t('shilpi_analyzing', 'SHILPI AI is analyzing craft intelligence...')}
                      </span>
                    </div>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Gemini-Style Chat Input Bar */}
              <div className="p-3 sm:p-4 border-t border-current/10 shrink-0 bg-black/5 dark:bg-white/5">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <div
                    className={`flex-1 flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all ${
                      isDark
                        ? 'bg-[#161B14] border-[#2D3A2B] focus-within:border-[#E8B84B]'
                        : 'bg-white border-[#22331E]/20 focus-within:border-[#B5451B]'
                    }`}
                  >
                    <input
                      ref={textInputRef}
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={t('ask_shilpi_placeholder', 'Ask Shilpi AI about craft, pricing, GeM tenders, or studio...')}
                      className="w-full bg-transparent text-xs sm:text-sm focus:outline-hidden"
                      id="input-shilpi-chat"
                    />

                    {/* Mic dictation button inside input bar */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isListening) {
                          stopListeningAndCommit();
                        } else {
                          startListening();
                        }
                      }}
                      className={`p-1.5 rounded-full transition-colors flex items-center justify-center shrink-0 ${
                        isListening
                          ? 'bg-[#B5451B] text-white animate-pulse'
                          : 'text-[#B5451B] hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                      title={t('dictate_voice', 'Dictate with voice')}
                      id="btn-dictate-shilpi"
                    >
                      <span className="material-symbols-outlined text-lg">
                        {isListening ? 'stop_circle' : 'mic'}
                      </span>
                    </button>
                  </div>

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isTyping}
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md transition-all ${
                      inputText.trim() && !isTyping
                        ? 'bg-[#B5451B] hover:bg-[#9C3A14] text-white cursor-pointer active:scale-95'
                        : 'bg-black/10 dark:bg-white/10 text-current/30 cursor-not-allowed'
                    }`}
                    title={t('send_message', 'Send message')}
                    id="btn-send-shilpi-chat"
                  >
                    <span className="material-symbols-outlined text-xl">send</span>
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* VOICE MODE: HANDS-FREE AUDIO INTERACTION */
            <div className="flex-1 flex flex-col justify-between p-6 relative z-10 overflow-y-auto no-scrollbar">
              <div className="my-auto text-center space-y-5">
                <div className="relative mx-auto w-28 h-28 flex items-center justify-center">
                  {/* Outer pulsing ripples */}
                  {isListening && (
                    <>
                      <div className="absolute inset-0 rounded-full border-2 border-[#E8B84B] animate-ping opacity-40" />
                      <div className="absolute -inset-3 rounded-full border border-[#B5451B] animate-pulse opacity-30" />
                    </>
                  )}

                  <button
                    onClick={() => {
                      if (isListening) {
                        stopListeningAndCommit();
                      } else {
                        startListening();
                      }
                    }}
                    className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all cursor-pointer ${
                      isListening
                        ? 'bg-[#B5451B] text-white scale-105 ring-4 ring-[#E8B84B]/40'
                        : 'bg-[#22331E] text-[#E8B84B] hover:scale-105 active:scale-95'
                    }`}
                    title={isListening ? t('tap_to_execute', 'Tap to finish & execute') : t('tap_to_speak', 'Tap to interact')}
                    id="btn-voice-mic-main"
                  >
                    <span className="material-symbols-outlined text-5xl">
                      {isListening ? 'stop_circle' : 'mic'}
                    </span>
                  </button>
                </div>

                {isListening && (
                  <p className="text-xs text-[#E8B84B] font-bold animate-pulse font-sans">
                    {t('tap_mic_to_finish', 'Tap mic to execute or pause to auto-send')}
                  </p>
                )}

                {/* Waveform visualizer bars */}
                {isListening && (
                  <div className="flex items-center justify-center gap-1.5 h-10">
                    {[14, 28, 36, 18, 32, 24, 40, 16, 26, 34, 18].map((height, i) => (
                      <div
                        key={i}
                        className="w-1.5 bg-[#B5451B] rounded-full wave-bar"
                        style={{
                          height: `${height}px`,
                          animationDelay: `${i * 0.1}s`,
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Transcript / Feedback */}
                <div className="min-h-[50px] flex flex-col items-center justify-center px-4">
                  {transcript ? (
                    <p className="font-serif text-base font-bold italic text-[#B5451B]">
                      "{transcript}"
                    </p>
                  ) : (
                    <p className="text-sm opacity-75 font-sans">
                      {isListening
                        ? t('listening', 'Listening to your voice...')
                        : t('speak_hint', 'Tap the mic to interact in any of 22 Indian languages')}
                    </p>
                  )}

                  {feedbackMessage && (
                    <p className="text-xs text-[#2E4638] dark:text-[#88C498] font-bold mt-2 animate-fade-in">
                      ✓ {feedbackMessage}
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Voice Command Chips */}
              <div className="space-y-2 mt-4">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#B5451B]">
                  {t('direct_voice_actions', 'Direct Voice Actions:')}
                </span>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto no-scrollbar">
                  {suggestions.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        sound.playTap();
                        item.action();
                      }}
                      className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all active:scale-95 ${
                        isDark
                          ? 'bg-[#121411] border-[#2D3A2B] hover:bg-[#222720]'
                          : 'bg-white border-[#22331E]/10 hover:bg-[#EFE4CF]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base text-[#B5451B]">
                        {item.icon}
                      </span>
                      <div className="truncate">
                        <p className="font-serif font-bold text-xs truncate">
                          {item.text}
                        </p>
                        <p className="text-[10px] opacity-65 truncate">
                          {item.actionDesc}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
