import React, { useState, useEffect, useRef } from 'react';
import { ProductItem } from '../../types';
import { sound } from '../../services/sound';
import { useTranslation } from '../../services/translations';

interface AIProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  capturedImage: string;
  lightingFilterName: string;
  onSaveProduct: (product: ProductItem) => void;
  isDark?: boolean;
}

const CATEGORIES = [
  'Heritage Pottery',
  'Handloom Weaving',
  'Wood Carving',
  'Metalwork & Brass',
  'Dhokra Art',
  'Zari & Embroidery',
  'Stone Craft',
  'Terracotta',
  'Other Traditional Craft',
];

export const AIProductDetailsModal: React.FC<AIProductDetailsModalProps> = ({
  isOpen,
  onClose,
  capturedImage,
  lightingFilterName,
  onSaveProduct,
  isDark = false,
}) => {
  const { t } = useTranslation();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Heritage Pottery');
  const [price, setPrice] = useState<number>(1450);
  const [stock, setStock] = useState<number>(6);
  const [description, setDescription] = useState('');
  const [materials, setMaterials] = useState('Natural Clay, Organic Glaze');
  const [isGiCertified, setIsGiCertified] = useState(true);

  // Voice recognition states
  const [isListening, setIsListening] = useState(false);
  const [voiceTarget, setVoiceTarget] = useState<'all' | 'title' | 'description' | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Reset or initialize defaults when modal opens
  useEffect(() => {
    if (isOpen) {
      if (!title) {
        setTitle('Handcrafted Heritage Craft (4K Studio)');
      }
      if (!description) {
        setDescription(
          `Captured in AI Studio with ${lightingFilterName} lighting, 4K texture preservation, and neutral background.`
        );
      }
    }
  }, [isOpen, lightingFilterName, title, description]);

  // Check speech support
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setSpeechSupported(false);
    }
  }, []);

  // Cleanup speech recognition on unmount or close
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
    };
  }, []);

  // Parse spoken text for price, stock, and craft details
  const parseSpokenText = (text: string, target: 'all' | 'title' | 'description') => {
    if (target === 'title') {
      setTitle(text.trim());
      return;
    }

    if (target === 'description') {
      setDescription((prev) => (prev ? `${prev} ${text.trim()}` : text.trim()));
      return;
    }

    // Target is 'all': extract structured data from spoken sentence
    const lower = text.toLowerCase();

    // 1. Detect price (e.g., "1200 rupees", "rs 1500", "keemat 800", "price is 2400")
    const priceMatch =
      lower.match(/(?:price|keemat|rupees|rs\.?|₹|rate)\s*(?:is|hai)?\s*(\d{2,6})/i) ||
      lower.match(/(\d{2,6})\s*(?:rupees|rs\.?|₹)/i);
    if (priceMatch && priceMatch[1]) {
      const parsedPrice = parseInt(priceMatch[1], 10);
      if (!isNaN(parsedPrice) && parsedPrice > 0) {
        setPrice(parsedPrice);
      }
    }

    // 2. Detect stock (e.g., "stock 5", "5 pieces", "5 units", "6 nag")
    const stockMatch =
      lower.match(/(?:stock|quantity|units?|pieces?|nag)\s*(?:is|hai)?\s*(\d{1,4})/i) ||
      lower.match(/(\d{1,4})\s*(?:units?|pieces?|nag)/i);
    if (stockMatch && stockMatch[1]) {
      const parsedStock = parseInt(stockMatch[1], 10);
      if (!isNaN(parsedStock) && parsedStock > 0) {
        setStock(parsedStock);
      }
    }

    // 3. Detect category if mentioned
    if (lower.includes('wood') || lower.includes('lakdi')) setCategory('Wood Carving');
    else if (lower.includes('silk') || lower.includes('saree') || lower.includes('handloom') || lower.includes('bunkar')) setCategory('Handloom Weaving');
    else if (lower.includes('brass') || lower.includes('metal') || lower.includes('dhokra')) setCategory('Metalwork & Brass');
    else if (lower.includes('pottery') || lower.includes('mitti') || lower.includes('terracotta') || lower.includes('clay')) setCategory('Heritage Pottery');

    // 4. Update title or description
    if (text.length > 5) {
      setDescription((prev) => (prev ? `${prev}. ${text.trim()}` : text.trim()));
    }
  };

  const startVoiceInput = (target: 'all' | 'title' | 'description' = 'all') => {
    sound.playTap();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      alert('Voice dictation is not supported in this browser. You can type the details directly.');
      return;
    }

    if (isListening) {
      stopVoiceInput();
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }

      const recognition = new SpeechRec();
      recognitionRef.current = recognition;
      recognition.lang = 'hi-IN'; // Works great for Hindi + Indian English code-switching
      recognition.continuous = false;
      recognition.interimResults = true;

      setVoiceTarget(target);
      setIsListening(true);
      setLiveTranscript('Listening... Speak now / बोलिए...');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setLiveTranscript(transcript);
        if (event.results[0]?.isFinal) {
          parseSpokenText(transcript, target);
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (err: any) => {
        console.warn('Speech error:', err?.error);
        setIsListening(false);
        setLiveTranscript('');
      };

      recognition.onend = () => {
        setIsListening(false);
        setTimeout(() => setLiveTranscript(''), 2000);
      };

      recognition.start();
    } catch (err) {
      console.warn('Could not start recognition:', err);
      setIsListening(false);
      setLiveTranscript('');
    }
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
    setIsListening(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playSuccess();

    const newProduct: ProductItem = {
      id: `studio-${Date.now()}`,
      title: title.trim() || 'Handcrafted Heritage Craft',
      category: category || 'Heritage Pottery',
      price: Number(price) || 1200,
      stock: Number(stock) || 1,
      rawImageUrl: capturedImage,
      polishedImageUrl: capturedImage,
      description: description.trim() || 'Enhanced with AI Studio 4K lighting and preserved craftsmanship.',
      materials: materials.split(',').map((m) => m.trim()).filter(Boolean),
      hoursWorked: 8,
      materialCost: Math.round((Number(price) || 1200) * 0.35),
      status: 'live',
      dateAdded: 'Just now',
      gemSyncStatus: isGiCertified ? 'synced' : 'pending',
    };

    onSaveProduct(newProduct);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <div
        className={`w-full max-w-xl rounded-3xl p-5 sm:p-6 shadow-2xl border my-4 relative max-h-[92vh] overflow-y-auto ${
          isDark
            ? 'bg-[#1C221A] text-[#F4ECDE] border-[#2D3A2B]'
            : 'bg-[#FDFBF7] text-[#1A1815] border-[#22331E]/15'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#B5451B]/15 text-[#B5451B] flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-xl">draw</span>
            </div>
            <div>
              <h3 className="font-serif font-bold text-base sm:text-lg leading-tight">
                {t('craft_details_title', 'Craft Product Details')}
              </h3>
              <p className="text-[11px] opacity-70">
                {t('craft_details_sub', 'Fill details by typing or voice speaking')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Captured Product Image Preview & Badge */}
        <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 mb-4">
          <div className="w-20 h-20 rounded-2xl overflow-hidden relative shrink-0 border-2 border-[#E8B84B]/40 shadow-sm">
            <img
              src={capturedImage}
              alt="Enhanced Craft"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-1 left-1 px-1 py-0.5 bg-black/80 rounded text-[7px] font-bold text-[#E8B84B]">
              4K Studio
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#B5451B]/15 text-[#B5451B]">
                {lightingFilterName}
              </span>
              <span className="text-[10px] font-semibold opacity-75">
                AI Viewfinder Photo
              </span>
            </div>
            <p className="text-xs font-serif font-bold truncate">
              {title || 'New Craft Item'}
            </p>
            <p className="text-[11px] opacity-65 font-sans mt-0.5">
              ₹{price.toLocaleString('en-IN')} • {stock} in stock
            </p>
          </div>
        </div>

        {/* Master Voice Assistant Bar */}
        {speechSupported && (
          <div
            className={`p-3.5 rounded-2xl border mb-4 transition-all ${
              isListening && voiceTarget === 'all'
                ? 'bg-[#B5451B]/15 border-[#B5451B] ring-2 ring-[#B5451B]/40'
                : 'bg-[#E8B84B]/10 border-[#E8B84B]/30'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#B5451B] text-xl">
                  record_voice_over
                </span>
                <div>
                  <h4 className="text-xs font-bold font-serif">
                    {t('voice_fill_title', 'Speak to Auto-Fill Details')}
                  </h4>
                  <p className="text-[10px] opacity-70">
                    {t(
                      'voice_fill_desc',
                      'Tap mic and describe: name, price (e.g. ₹1500), stock & craft'
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => startVoiceInput('all')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold font-serif flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer ${
                  isListening && voiceTarget === 'all'
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-[#B5451B] text-white hover:bg-[#9E3913]'
                }`}
              >
                <span className="material-symbols-outlined text-sm">
                  {isListening && voiceTarget === 'all' ? 'mic_off' : 'mic'}
                </span>
                <span>{isListening && voiceTarget === 'all' ? 'Stop' : 'Speak'}</span>
              </button>
            </div>

            {liveTranscript && (
              <div className="mt-2.5 pt-2 border-t border-black/10 dark:border-white/10 text-xs font-medium italic text-[#B5451B] dark:text-[#FFA680] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#B5451B] animate-ping" />
                <span>&quot;{liveTranscript}&quot;</span>
              </div>
            )}
          </div>
        )}

        {/* Product Details Form (Typing or Voice) */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Product Title / Craft Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold font-serif uppercase tracking-wider text-[#B5451B]">
                {t('craft_title', 'Craft Title')} <span className="text-red-500">*</span>
              </label>
              {speechSupported && (
                <button
                  type="button"
                  onClick={() => startVoiceInput('title')}
                  className="text-[10px] text-[#B5451B] hover:underline flex items-center gap-0.5 font-medium"
                >
                  <span className="material-symbols-outlined text-xs">mic</span>
                  <span>Speak Title</span>
                </button>
              )}
            </div>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Handcrafted Terracotta Urli Vase"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-serif font-medium focus:outline-hidden focus:ring-2 focus:ring-[#B5451B] ${
                isDark
                  ? 'bg-[#121411] border-[#2D3A2B] text-white'
                  : 'bg-white border-[#22331E]/20 text-[#1A1815]'
              }`}
            />
          </div>

          {/* Craft Category */}
          <div>
            <label className="block text-xs font-bold font-serif uppercase tracking-wider text-[#B5451B] mb-1">
              {t('craft_category', 'Craft Category')} <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-serif font-medium focus:outline-hidden focus:ring-2 focus:ring-[#B5451B] ${
                isDark
                  ? 'bg-[#121411] border-[#2D3A2B] text-white'
                  : 'bg-white border-[#22331E]/20 text-[#1A1815]'
              }`}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Price & Stock Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold font-serif uppercase tracking-wider text-[#B5451B] mb-1">
                {t('price_inr', 'Price (₹)')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold opacity-70">
                  ₹
                </span>
                <input
                  type="number"
                  min="50"
                  step="10"
                  required
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className={`w-full pl-7 pr-3 py-2.5 rounded-xl border text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-[#B5451B] ${
                    isDark
                      ? 'bg-[#121411] border-[#2D3A2B] text-white'
                      : 'bg-white border-[#22331E]/20 text-[#1A1815]'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold font-serif uppercase tracking-wider text-[#B5451B] mb-1">
                {t('stock_units', 'Stock (Units)')} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={stock}
                onChange={(e) => setStock(Number(e.target.value))}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-[#B5451B] ${
                  isDark
                    ? 'bg-[#121411] border-[#2D3A2B] text-white'
                    : 'bg-white border-[#22331E]/20 text-[#1A1815]'
                }`}
              />
            </div>
          </div>

          {/* Description / Story */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold font-serif uppercase tracking-wider text-[#B5451B]">
                {t('story_desc', 'Story & Description')}
              </label>
              {speechSupported && (
                <button
                  type="button"
                  onClick={() => startVoiceInput('description')}
                  className="text-[10px] text-[#B5451B] hover:underline flex items-center gap-0.5 font-medium"
                >
                  <span className="material-symbols-outlined text-xs">mic</span>
                  <span>Speak Description</span>
                </button>
              )}
            </div>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe heritage technique, natural materials, and artisan story..."
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-sans focus:outline-hidden focus:ring-2 focus:ring-[#B5451B] ${
                isDark
                  ? 'bg-[#121411] border-[#2D3A2B] text-white'
                  : 'bg-white border-[#22331E]/20 text-[#1A1815]'
              }`}
            />
          </div>

          {/* Materials Used */}
          <div>
            <label className="block text-xs font-bold font-serif uppercase tracking-wider text-[#B5451B] mb-1">
              {t('materials_used', 'Materials Used')}
            </label>
            <input
              type="text"
              value={materials}
              onChange={(e) => setMaterials(e.target.value)}
              placeholder="e.g. Natural Terracotta Clay, Organic Glaze"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-sans focus:outline-hidden focus:ring-2 focus:ring-[#B5451B] ${
                isDark
                  ? 'bg-[#121411] border-[#2D3A2B] text-white'
                  : 'bg-white border-[#22331E]/20 text-[#1A1815]'
              }`}
            />
          </div>

          {/* GI Certification Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#E8B84B] text-lg">
                verified
              </span>
              <div>
                <p className="text-xs font-serif font-bold">
                  {t('gi_certified_label', 'Geographical Indication (GI) Certified')}
                </p>
                <p className="text-[10px] opacity-65">
                  {t('gi_certified_help', 'Enables direct GeM government buyer sync')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setIsGiCertified(!isGiCertified);
              }}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                isGiCertified ? 'bg-[#22331E]' : 'bg-gray-400'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  isGiCertified ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                onClose();
              }}
              className="flex-1 py-3 rounded-2xl border border-black/20 dark:border-white/20 text-xs font-serif font-bold text-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              {t('retake_photo', 'Retake Photo')}
            </button>

            <button
              type="submit"
              className="flex-2 py-3 rounded-2xl bg-[#B5451B] text-white text-xs font-serif font-bold text-center shadow-lg hover:bg-[#9E3913] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">cloud_upload</span>
              <span>{t('save_to_studio_catalog', 'Save to Studio Catalog & GeM')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
