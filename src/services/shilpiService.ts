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
 * Intelligent local fallback engine if server Gemini API is offline or unreachable.
 */
export function generateArtisanAIResponse(
  query: string,
  context: ShilpiChatContext,
  history: ChatMessage[] = []
): { reply: string; suggestedAction?: { label: string; screen?: ScreenId; icon?: string } } {
  const q = query.toLowerCase().trim();
  const artisanName = context.artisan?.name ? context.artisan.name.split(' ')[0] : 'Artisan';
  const craftName = context.artisan?.craft ? context.artisan.craft.split('&')[0].trim() : 'Handicraft';
  const isHindi = context.language === 'hi';
  const pricing = context.pricingInputs || {};

  // 1. Stock & Inventory
  if (
    q.includes('stock') ||
    q.includes('inventory') ||
    q.includes('low') ||
    q.includes('कम') ||
    q.includes('माल') ||
    q.includes('इन्वेंट्री') ||
    q.includes('स्टॉक')
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

  // 2. Photo Studio & Camera
  if (q.includes('studio') || q.includes('photo') || q.includes('camera') || q.includes('lighting') || q.includes('फोटो')) {
    return {
      reply: isHindi
        ? `नमस्ते ${artisanName} जी! मैंने **एआई फोटो स्टूडियो** खोल दिया है। यहाँ आप अपने ${craftName} की सामान्य तस्वीरों को 4K स्टूडियो रेंडर, रिफ्लेक्शन और बैकग्राउंड रिमूवल के साथ प्रोफेशनल कैटलॉग इमेज बना सकते हैं।`
        : `Namaste ${artisanName}! You can use the **AI Photo Studio** to transform raw workshop photos of your ${craftName} into 4K e-commerce renders with studio lighting and zero background clutter.`,
      suggestedAction: { label: 'Open AI Photo Studio', screen: 'studio', icon: 'photo_camera' },
    };
  }

  // 3. Pricing
  if (q.includes('price') || q.includes('pricing') || q.includes('dam') || q.includes('bhav') || q.includes('मूल्य') || q.includes('कीमत')) {
    return {
      reply: isHindi
        ? `शिल्पसेतु का **उचित मूल्य कैलकुलेटर** बिचौलियों के बिना वास्तविक शिल्प मूल्य तय करता है:\n\n• **कच्चा माल**: माटी, रंग, ईंधन\n• **कारीगरी समय**: घंटे × सम्मानजनक दैनिक मजदूरी (₹120-180/घंटा)\n• **विरासत प्रीमियम**: 15-20% GI/कलात्मक विशिष्टता\n• **उचित लाभ मार्जिन**: 20-25%\n\nकैलकुलेटर खोलें और अपने नए शिल्प का सटीक मूल्य निकालें।`
        : `ShilpSetu's **Fair Price Calculator** eliminates middlemen cuts and calculates true value:\n\n• **Raw Materials**: Clay, glazes, fuel/firing\n• **Artisan Labor**: Crafting hours × living wage (₹120–180/hr)\n• **Heritage Premium**: 15–20% for GI/artisan uniqueness\n• **Fair Margin**: 20–25% direct workshop profit\n\nOpen the calculator to price your new creation accurately.`,
      suggestedAction: { label: 'Smart Fair Price Calculator', screen: 'pricing', icon: 'calculate' },
    };
  }

  // 4. GeM and B2B
  if (q.includes('gem') || q.includes('tender') || q.includes('bulk') || q.includes('b2b') || q.includes('order') || q.includes('सरकारी') || q.includes('टेंडर')) {
    return {
      reply: isHindi
        ? `**GeM (Government e-Marketplace) और B2B पोर्टल** पर सरकारी विभागों, संस्थानों, होटल और कॉर्पोरेट खरीदारों की थोक आवश्यकताएँ मिल सकती हैं। बोली से पहले विक्रेता पात्रता, मात्रा, विनिर्देश, डिलीवरी और भुगतान की शर्तें आधिकारिक पोर्टल पर अवश्य जाँचें।`
        : `The **B2B & GeM Gateway** helps you explore government, institutional, hospitality, and corporate bulk opportunities for your ${craftName}. Verify seller requirements, specifications, delivery, payment terms, and the live RFQ on the official portal before bidding.`,
      suggestedAction: { label: 'Open GeM & B2B Tenders', screen: 'b2b', icon: 'gavel' },
    };
  }

  // Default Greeting / Conversational Fallback
  return {
    reply: isHindi
      ? `नमस्ते ${artisanName} जी! मैं आपकी **शिल्पी एआई** सहायक हूँ। आप मुझसे अपने शिल्प के मूल्य, 4K फोटो संपादन, GeM टेंडर्स या सोशल मीडिया पोस्ट्स के बारे में कुछ भी पूछ सकते हैं। आज मैं आपकी कार्यशाला की क्या मदद करूँ?`
      : `Namaste ${artisanName}! I am **SHILPI AI**, your master craft and workshop intelligence partner. You can ask me anything about fair craft pricing, photo styling, GeM bulk orders, or craft storytelling. What is on your mind today?`,
  };
}

/**
 * Sends a message to the backend Gemini AI API endpoint (/api/shilpi-chat).
 * Includes an automatic offline fallback if the serverless function is unreachable.
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch('/api/shilpi-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        message,
        history: formattedHistory,
        language: context.language,
        artisanContext: {
          name: context.artisan?.name,
          craft: context.artisan?.craft,
          location: context.artisan?.location,
          trustScore: context.artisan?.trustScore ?? 98,
        },
        pricingInputs: context.pricingInputs,
      }),
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.reply) {
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
    console.warn('[shilpiService] Serverless call failed or timed out, executing offline fallback:', err);
  }

  // Offline / Network Fallback
  const fallbackResult = generateArtisanAIResponse(message, context, history);
  return {
    id: `shilpi-${Date.now()}`,
    sender: 'shilpi',
    text: fallbackResult.reply,
    timestamp,
    suggestedAction: fallbackResult.suggestedAction,
  };
}

export default {
  sendShilpiChatMessage,
  generateArtisanAIResponse,
};
