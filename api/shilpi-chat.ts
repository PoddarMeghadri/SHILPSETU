import { GoogleGenAI } from '@google/genai';

interface ChatHistoryItem {
  role: string;
  content: string;
}

interface ArtisanContext {
  name?: string;
  craft?: string;
  location?: string;
  trustScore?: number;
}

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  hi: 'Hindi (हिंदी)',
  bn: 'Bengali (বাংলা)',
  ta: 'Tamil (தமிழ்)',
  te: 'Telugu (తెలుగు)',
  kn: 'Kannada (ಕನ್ನಡ)',
  ml: 'Malayalam (മലയാളം)',
  mr: 'Marathi (मराठी)',
  gu: 'Gujarati (ગુજરાતી)',
  pa: 'Punjabi (ਪੰਜਾਬੀ)',
  or: 'Odia (ଓଡ଼ିଆ)',
  ur: 'Urdu (اردو)',
};

export default async function handler(req: any, res: any) {
  // 1. CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const { message, history = [], language = 'en', artisanContext } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Field "message" is required and must be a string.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const targetLang = LANGUAGE_LABELS[language] || 'English';
    const artisanName = artisanContext?.name || 'Artisan';
    const craftName = artisanContext?.craft || 'Traditional Indian Handicrafts';
    const location = artisanContext?.location || 'India';

    // If Gemini API Key is missing on the server, return a respectful fallback
    if (!apiKey) {
      console.warn('[api/shilpi-chat]: GEMINI_API_KEY is not configured on server.');
      return res.status(200).json({
        reply: language === 'hi'
          ? `नमस्ते ${artisanName} जी! मैं शिल्पी एआई हूँ। मैं उचित शिल्प मूल्य, 4K कैटलॉगिंग, GeM सरकारी ऑर्डर्स और सोशल मार्केटिंग में आपकी मदद करने के लिए तैयार हूँ।`
          : `Namaste ${artisanName}! I am SHILPI AI, your master craft partner. I am ready to assist you with fair craft pricing, 4K cataloging, GeM bulk tenders, and heritage craft marketing.`,
        fallback: true,
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Build system instruction tailored for Indian artisans
    const systemInstruction = `You are SHILPI AI, the compassionate and knowledgeable craft-business companion inside ShilpSetu.
Your mission is to empower rural and master Indian artisans with fair pricing, 4K catalog guidance, GeM government procurement tenders, and authentic craft storytelling.

ARTISAN IDENTITY:
- Artisan Name: ${artisanName}
- Craft Tradition: ${craftName}
- Workshop Location: ${location}
- Trust Score: ${artisanContext?.trustScore ?? 98}/100

LANGUAGE DIRECTIVE:
- Respond fluently in ${targetLang}. Use natural, respectful phrasing and proper script (Devanagari for Hindi, Bengali script for Bengali, Tamil script for Tamil, Telugu script for Telugu, or natural English).
- Respect traditional vocabulary (karigar, ustad, dharohar, parampara, hastakala, rozgar).

CORE DOMAINS:
1. FAIR CRAFT PRICING: Explain the Golden Formula: Raw Materials + (Hours Worked × Fair Hourly Wage ₹120-₹180/hr) + Heritage/GI Premium (15-20%) + Business Margin (20-25%). Protect the artisan from middlemen exploitation.
2. GeM (GOVERNMENT e-MARKETPLACE) & B2B: Guide the artisan through bulk tenders for government ministries, corporate gifting, and luxury export orders.
3. 4K PHOTO STUDIO & CATALOG: Offer concrete photo tips (diffused natural lighting, 3/4 hero angle, scale reference, neutral backdrop).
4. HERITAGE STORYTELLING: Help the artisan write compelling stories about their generational lineage and authentic handmade process.

TONE: Warm, dignified, respectful, and actionable. Avoid corporate jargon. Be concise, practical, and clear.`;

    const contents: any[] = [];

    // Append recent history
    if (Array.isArray(history)) {
      for (const item of history.slice(-6)) {
        if (item && item.content) {
          contents.push({
            role: item.role === 'model' || item.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: String(item.content) }],
          });
        }
      }
    }

    // Append current message
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || 'Namaste! How may I assist your craft workshop today?';
    return res.status(200).json({ reply, success: true });
  } catch (error: any) {
    console.error('[api/shilpi-chat] Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process Shilpi chat request',
    });
  }
}
