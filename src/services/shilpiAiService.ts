import { ScreenId, ArtisanProfile, LanguageCode, ProductItem } from '../types';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'shilpi';
  text: string;
  timestamp: string;
  suggestedAction?: {
    label: string;
    screen?: ScreenId;
    callback?: () => void;
    icon?: string;
  };
}

export interface ShilpiChatContext {
  artisan: ArtisanProfile;
  language: LanguageCode;
  products?: ProductItem[];
  pricingInputs?: {
    materialCost?: number;
    laborHours?: number;
    hourlyRate?: number;
    heritagePremiumPercentage?: number;
    marginPercentage?: number;
    demandMultiplier?: number;
  };
  isDark?: boolean;
}

/**
 * Intelligent local fallback engine if server Gemini API is offline or unconfigured.
 */
export function generateArtisanAIResponse(
  query: string,
  context: ShilpiChatContext,
  history: ChatMessage[] = []
): { reply: string; suggestedAction?: { label: string; screen?: ScreenId; icon?: string } } {
  const q = query.toLowerCase().trim();
  const artisanName = context.artisan.name.split(' ')[0] || 'Artisan';
  const craftName = context.artisan.craft.split('&')[0].trim();
  const isHindi = context.language === 'hi';
  const pricing = context.pricingInputs || {};

  // 0. Stock & Inventory Queries (Direct check for low inventory)
  if (
    q.includes('stock') ||
    q.includes('inventory') ||
    q.includes('low') ||
    q.includes('कम') ||
    q.includes('माल') ||
    q.includes('इन्वेंट्री') ||
    q.includes('स्टॉक') ||
    q.includes('बची') ||
    q.includes('बचा')
  ) {
    const productsList = context.products || [];
    const lowStock = productsList.filter((p) => p.stock <= 5).sort((a, b) => a.stock - b.stock);

    if (lowStock.length > 0) {
      const itemsText = lowStock
        .map((p) => `• **${p.title}** (${p.category}): **${p.stock} units left** ${p.stock <= 2 ? '🔴 (Critical Low Stock)' : '🟡 (Low Stock)'}`)
        .join('\n');
      return {
        reply: isHindi
          ? `नमस्ते ${artisanName} जी! आपकी कार्यशाला इन्वेंटरी में **${lowStock.length} शिल्प उत्पाद कम स्टॉक** में हैं:\n\n${itemsText}\n\nसबसे कम स्टॉक **${lowStock[0].title}** का है (मात्र ${lowStock[0].stock} पीस बचे हैं)। आगामी ऑर्डर्स के लिए आप तुरंत स्टॉक जोड़ सकते हैं।`
          : `Namaste ${artisanName}! Here are the products running **low in your workshop inventory**:\n\n${itemsText}\n\nYour lowest product is **${lowStock[0].title}** with only **${lowStock[0].stock} units left** in workshop stock. You can restock it directly in the Inventory Manager!`,
        suggestedAction: { label: 'Manage Inventory & Stock', screen: 'dashboard', icon: 'inventory_2' },
      };
    } else {
      return {
        reply: isHindi
          ? `नमस्ते ${artisanName} जी! आपकी कार्यशाला इन्वेंटरी बिल्कुल ठीक है। सभी शिल्पों में पर्याप्त स्टॉक उपलब्ध है।`
          : `Namaste ${artisanName}! All your workshop craft products currently have healthy stock levels (above 5 units each).`,
        suggestedAction: { label: 'View Inventory', screen: 'dashboard', icon: 'inventory_2' },
      };
    }
  }

  // 1. Navigation & App Feature Triggers
  if (q.includes('studio') || q.includes('photo') || q.includes('camera') || q.includes('lighting') || q.includes('फोटो')) {
    return {
      reply: isHindi
        ? `नमस्ते ${artisanName} जी! मैंने **एआई फोटो स्टूडियो** खोल दिया है। यहाँ आप अपने ${craftName} की सामान्य तस्वीरों को 4K स्टूडियो रेंडर, रिफ्लेक्शन और बैकग्राउंड रिमूवल के साथ प्रोफेशनल कैटलॉग इमेज बना सकते हैं।`
        : `Namaste ${artisanName}! You can use the **AI Photo Studio** to transform raw workshop photos of your ${craftName} into 4K e-commerce renders with studio lighting and zero background clutter.`,
      suggestedAction: { label: 'Open AI Photo Studio', screen: 'studio', icon: 'photo_camera' },
    };
  }

  if (q.includes('catalog') || q.includes('add item') || q.includes('naya') || q.includes('item') || q.includes('समान') || q.includes('कैटलॉग')) {
    return {
      reply: isHindi
        ? `**मल्टीलिंगुअल वॉयस कैटलॉगर** आपके लिए तैयार है। आप अपनी मातृभाषा में बोलकर नया शिल्प आइटम, आयाम, सामग्री और वजन दर्ज कर सकते हैं।`
        : `Ready to catalog a new masterpiece! Speak or type your ${craftName} specifications in your native language, and I will auto-format the GeM specifications, dimensions, and materials.`,
      suggestedAction: { label: 'Voice Auto-Cataloger', screen: 'cataloger', icon: 'mic' },
    };
  }

  if (q.includes('price') || q.includes('pricing') || q.includes('dam') || q.includes('bhav') || q.includes('margin') || q.includes('cost') || q.includes('मूल्य') || q.includes('भाव') || q.includes('कीमत')) {
    const materialCost = pricing.materialCost ?? 0;
    const laborHours = pricing.laborHours ?? 0;
    const hourlyRate = pricing.hourlyRate ?? 180;
    const heritagePremium = pricing.heritagePremiumPercentage ?? 0;
    const margin = pricing.marginPercentage ?? 20;
    const laborCost = laborHours * hourlyRate;
    const productionCost = materialCost + laborCost;
    const premiumAmount = productionCost * (heritagePremium / 100);
    const subtotal = productionCost + premiumAmount;
    const suggestedPrice = Math.round(subtotal * (1 + margin / 100));
    const hasInputs = materialCost > 0 && laborHours > 0;
    const breakdown = hasInputs
      ? isHindi
        ? `\n\n**आपके दिए इनपुट का पारदर्शी हिसाब:**\n• सामग्री: ₹${materialCost.toLocaleString('en-IN')}\n• मेहनताना: ${laborHours} घंटे × ₹${hourlyRate} = ₹${laborCost.toLocaleString('en-IN')}\n• कारीगरी लागत: ₹${productionCost.toLocaleString('en-IN')}\n• विरासत प्रीमियम (${heritagePremium}%): ₹${Math.round(premiumAmount).toLocaleString('en-IN')}\n• लाभ मार्जिन (${margin}%): ₹${Math.round(subtotal * (margin / 100)).toLocaleString('en-IN')}\n• **सुझाया गया उचित मूल्य: ₹${suggestedPrice.toLocaleString('en-IN')}**`
        : `\n\n**Transparent calculation using your inputs:**\n• Materials: ₹${materialCost.toLocaleString('en-IN')}\n• Labor: ${laborHours} hours × ₹${hourlyRate} = ₹${laborCost.toLocaleString('en-IN')}\n• Production cost: ₹${productionCost.toLocaleString('en-IN')}\n• Heritage/skill premium (${heritagePremium}%): ₹${Math.round(premiumAmount).toLocaleString('en-IN')}\n• Business margin (${margin}%): ₹${Math.round(subtotal * (margin / 100)).toLocaleString('en-IN')}\n• **Suggested fair price: ₹${suggestedPrice.toLocaleString('en-IN')}**`
      : isHindi
        ? `\n\nसटीक हिसाब के लिए सामग्री लागत, काम के घंटे, प्रति घंटे उचित मेहनताना और अपना मार्जिन बताइए।`
        : `\n\nFor an exact breakdown, share material cost, crafting hours, a fair hourly rate, heritage premium (if justified), and your desired margin.`;
    return {
      reply: isHindi
        ? `शिल्पसेतु का **उचित मूल्य कैलकुलेटर** बिचौलियों के बिना वास्तविक शिल्प मूल्य तय करता है:\n\n` +
          `• **कच्चा माल**: माटी, रंग, ईंधन\n` +
          `• **कारीगरी समय**: घंटे × सम्मानजनक दैनिक मजदूरी (₹120-180/घंटा)\n` +
          `• **विरासत प्रीमियम**: 15-20% GI/कलात्मक विशिष्टता\n` +
          `• **उचित लाभ मार्जिन**: 20-25%\n\n` +
          `कैलकुलेटर खोलें और अपने नए शिल्प का सटीक मूल्य निकालें।${breakdown}`
        : `ShilpSetu's **Fair Price Calculator** eliminates middlemen cuts and calculates true value:\n\n` +
          `• **Raw Materials**: Clay, glazes, fuel/firing\n` +
          `• **Artisan Labor**: Crafting hours × living wage (₹120–180/hr)\n` +
          `• **Heritage Premium**: 15–20% for GI/artisan uniqueness\n` +
          `• **Fair Margin**: 20–25% direct workshop profit\n\n` +
          `Open the calculator to price your new creation accurately.${breakdown}`,
      suggestedAction: { label: 'Smart Fair Price Calculator', screen: 'pricing', icon: 'calculate' },
    };
  }

  if (q.includes('gem') || q.includes('tender') || q.includes('bulk') || q.includes('b2b') || q.includes('order') || q.includes('सरकारी') || q.includes('टेंडर')) {
    return {
      reply: isHindi
        ? `**GeM (Government e-Marketplace) और B2B पोर्टल** पर सरकारी विभागों, संस्थानों, होटल और कॉर्पोरेट खरीदारों की थोक आवश्यकताएँ मिल सकती हैं। बोली से पहले विक्रेता पात्रता, मात्रा, विनिर्देश, डिलीवरी और भुगतान की शर्तें आधिकारिक पोर्टल पर अवश्य जाँचें।`
        : `The **B2B & GeM Gateway** helps you explore government, institutional, hospitality, and corporate bulk opportunities for your ${craftName}. Verify seller requirements, specifications, delivery, payment terms, and the live RFQ on the official portal before bidding.`,
      suggestedAction: { label: 'Open GeM & B2B Tenders', screen: 'b2b', icon: 'gavel' },
    };
  }

  if (q.includes('sales') || q.includes('dashboard') || q.includes('revenue') || q.includes('income') || q.includes('hisab') || q.includes('कमाई') || q.includes('बिक्री')) {
    return {
      reply: isHindi
        ? `आपके कार्यशाला की आज की बिक्री, पेंडिंग ऑर्डर्स और मासिक आय का विश्लेषण देखने के लिए **बिज़नेस डैशबोर्ड** देखें।`
        : `Your **Business Revenue Dashboard** tracks gross earnings, pending dispatches, GeM payouts, and profit margins in real-time.`,
      suggestedAction: { label: 'Business Dashboard', screen: 'dashboard', icon: 'analytics' },
    };
  }

  if (q.includes('instagram') || q.includes('whatsapp') || q.includes('social') || q.includes('share') || q.includes('शेयर') || q.includes('मार्केटिंग')) {
    return {
      reply: isHindi
        ? `**सोशल मार्केटिंग किट** आपके शिल्प के लिए रेडी-टू-पोस्ट इंस्टाग्राम स्टोरीज और व्हाट्सएप ब्रॉडकास्ट पोस्टर्स तुरंत तैयार करता है, जिसमें सीधे खरीदार के लिए QR कोड भी होता है।`
        : `Your **1-Click Social Marketing Kit** generates high-converting WhatsApp catalogs and Instagram craft reels posters with direct buy links!`,
      suggestedAction: { label: 'Social Share Kit', screen: 'social', icon: 'share' },
    };
  }

  if (q.includes('story') || q.includes('lineage') || q.includes('virasat') || q.includes('kahani') || q.includes('कहानी') || q.includes('विरासत')) {
    return {
      reply: isHindi
        ? `आपकी कला पीढ़ियों की धरोहर है। **विरासत स्टोरी बिल्डर** आपके परिवार की पारंपरिक तकनीकों को दिल को छू लेने वाली कहानियों में बदलता है।`
        : `Every hand has a story. The **Heritage Story Builder** documents your ancestral lineage and generational technique so global buyers appreciate the genuine soul behind each piece.`,
      suggestedAction: { label: 'Heritage Story Builder', screen: 'story', icon: 'history_edu' },
    };
  }

  // 2. Knowledge & Craft Advice (Gemini style)
  if (q.includes('gi tag') || q.includes('geographical indication') || q.includes('जीआई')) {
    return {
      reply:
        `**Geographical Indication (GI) guidance for ${artisanName}:**\n\n` +
        `1. **Authenticity**: A GI identifies a craft's regional identity and can help buyers distinguish genuine work.\n` +
        `2. **Buyer confidence**: Explain the verified region and technique in your listing; do not promise a fixed premium.\n` +
        `3. **Eligibility**: Check the current official GI authority and scheme requirements before applying.\n\n` +
        `Your ShilpSetu Trust Score (${context.artisan.trustScore ?? 98}/100) can support transparent provenance, but it is not a certification.`,
    };
  }

  if (q.includes('photo') || q.includes('camera') || q.includes('tips') || q.includes('lighting')) {
    return {
      reply:
        `**Pro Tips for Photographing ${craftName}:**\n\n` +
        `• **Natural Diffused Light**: Shoot near a window in morning (8–10 AM) or late afternoon. Avoid harsh direct midday sun.\n` +
        `• **Show Scale & Texture**: Place a hand, coin, or clay cup next to it so buyers immediately grasp dimensions and fine handcrafted textures.\n` +
        `• **Angle Variety**: Always capture: (1) Eye-level 3/4 hero shot, (2) Top-down view, and (3) Close-up of artisan stamp or brushwork.\n\n` +
        `You can enhance any photo in 1 click in our AI Studio!`,
      suggestedAction: { label: 'Try 4K Photo Studio', screen: 'studio', icon: 'photo_camera' },
    };
  }

  if (q.includes('caption') || q.includes('post') || q.includes('reel') || q.includes('hashtags')) {
    return {
      reply:
        `**Ready-to-Post Instagram Caption Template:**\n\n` +
        `"Handmade ${craftName} from ${context.artisan.location}. Made with [your material] using [your technique]. Each piece carries the maker's care and a story I can share with you. ✨\n\n` +
        `Message me for dimensions, care details, availability, and a direct order. Replace the bracketed details with your own verified story.\n\n` +
        `#HandmadeInIndia #ArtisanDirect #${craftName.replace(/\s+/g, '')} #ShilpSetu"`,
      suggestedAction: { label: 'Open Social Share Kit', screen: 'social', icon: 'share' },
    };
  }

  if (
    q.includes('weather') ||
    q.includes('movie') ||
    q.includes('recipe') ||
    q.includes('cricket') ||
    q.includes('politics') ||
    q.includes('मौसम') ||
    q.includes('फिल्म') ||
    q.includes('खाना')
  ) {
    return {
      reply: isHindi
        ? `मैं इस विषय पर संक्षेप में मदद कर सकता हूँ। आपकी कार्यशाला पर लौटें तो मैं ${craftName} की उचित कीमत, GeM/B2B ऑर्डर, 4K कैटलॉग या विरासत कहानी में भी मदद करूँ?`
        : `I can help briefly with that. Bringing it back to your workshop, would you like help with a fair ${craftName} price, GeM/B2B orders, a 4K catalog, or a truthful heritage story?`,
    };
  }

  // 3. Conversational greeting & Open question handling
  if (q.includes('hello') || q.includes('hi') || q.includes('namaste') || q.includes('नमस्ते') || q.includes('हेलो')) {
    return {
      reply: isHindi
        ? `नमस्ते ${artisanName} जी! मैं आपकी **शिल्पी एआई** सहायक हूँ। आप मुझसे अपने शिल्प के मूल्य, 4K फोटो संपादन, GeM टेंडर्स या सोशल मीडिया पोस्ट्स के बारे में कुछ भी पूछ सकते हैं। आज मैं आपकी कार्यशाला की क्या मदद करूँ?`
        : `Namaste ${artisanName}! I am **SHILPI AI**, your master craft and workshop intelligence partner. You can ask me anything about fair craft pricing, photo styling, GeM bulk orders, or craft storytelling. What is on your mind today?`,
    };
  }

  // General helpful conversational response
  return {
    reply: isHindi
      ? `नमस्ते ${artisanName} जी! मैंने आपका प्रश्न समझा: "${query}"।\n\n` +
        `एक शिल्पकार के रूप में, आप शिल्पसेतु के सभी एआई टूल्स का उपयोग करके अपने ${craftName} के व्यापार को बढ़ा सकते हैं। आप मुझसे पूछ सकते हैं:\n` +
        `• *"मेरे नए शिल्प का सही मूल्य क्या होना चाहिए?"*\n` +
        `• *"सरकारी GeM पोर्टल पर टेंडर कैसे देखें?"*\n` +
        `• *"फोटो स्टूडियो में लाइटिंग कैसे सुधारें?"*`
      : `Namaste ${artisanName}! Regarding "${query}":\n\n` +
        `As a master of ${craftName} from ${context.artisan.location}, you can leverage ShilpSetu's intelligence tools to maximize your earnings with zero middlemen:\n\n` +
        `• **Fair Pricing**: Calculate exact costs, wages, and margins.\n` +
        `• **GeM Direct Tenders**: Bid on corporate and government bulk supply contracts.\n` +
        `• **4K AI Studio**: Create catalog-grade studio renders in seconds.\n\n` +
        `Feel free to ask specific questions or tell me what you'd like to work on!`,
  };
}

/**
 * Sends a message to the backend Gemini AI API endpoint (/api/shilpi-chat).
 * Falls back transparently to local intelligence if offline or unavailable.
 */
export async function sendShilpiChatMessage(
  message: string,
  context: ShilpiChatContext,
  history: ChatMessage[] = []
): Promise<ChatMessage> {
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  try {
    const formattedHistory = history.map((m) => ({
      role: m.sender === 'user' ? 'user' : 'model',
      content: m.text,
    }));

    const response = await fetch('/api/shilpi-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        history: formattedHistory,
        language: context.language,
        artisanContext: {
          name: context.artisan.name,
          craft: context.artisan.craft,
          location: context.artisan.location,
          trustScore: context.artisan.trustScore ?? 98,
        },
        pricingInputs: context.pricingInputs,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.reply && !data.fallback) {
        // Detect action suggestions from response or query
        const localAnalysis = generateArtisanAIResponse(message, context, history);
        return {
          id: `shilpi-${Date.now()}`,
          sender: 'shilpi',
          text: data.reply,
          timestamp,
          suggestedAction: localAnalysis.suggestedAction,
        };
      }
    }
  } catch (err) {
    console.warn('Backend Gemini call failed, using intelligent artisan engine fallback:', err);
  }

  // Graceful high-quality offline/fallback response
  const fallbackResult = generateArtisanAIResponse(message, context, history);
  return {
    id: `shilpi-${Date.now()}`,
    sender: 'shilpi',
    text: fallbackResult.reply,
    timestamp,
    suggestedAction: fallbackResult.suggestedAction,
  };
}
