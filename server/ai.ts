import { GoogleGenAI } from '@google/genai';

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

// Indian Language Name Mapping for Prompt Grounding
export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi (हिंदी)',
  as: 'Assamese (অসমীয়া)',
  bn: 'Bengali (বাংলা)',
  brx: 'Bodo (बड़ो)',
  doi: 'Dogri (डोगरी)',
  gu: 'Gujarati (ગુજરાતી)',
  kn: 'Kannada (ಕನ್ನಡ)',
  ks: 'Kashmiri (کٲشُر / कॉशुर)',
  kok: 'Konkani (कोंकणी)',
  mai: 'Maithili (मैथिली)',
  ml: 'Malayalam (മലയാളം)',
  mni: 'Manipuri (মৈতৈলোন্)',
  mr: 'Marathi (मराठी)',
  ne: 'Nepali (नेपाली)',
  or: 'Odia (ଓଡ଼ିଆ)',
  pa: 'Punjabi (ਪੰਜਾਬੀ)',
  sa: 'Sanskrit (संस्कृतम्)',
  sat: 'Santali (ᱥᱟᱱᱛᱟᱲᱤ)',
  sd: 'Sindhi (سنڌي / सिन्धी)',
  ta: 'Tamil (தமிழ்)',
  te: 'Telugu (తెలుగు)',
  ur: 'Urdu (اردو)',
};

/**
 * 1. Shilpi Conversational AI
 */
export async function generateShilpiReply(params: {
  message: string;
  history?: Array<{ role: string; content: string }>;
  language?: string;
  artisanContext?: {
    name?: string;
    craft?: string;
    location?: string;
    trustScore?: number;
  };
  products?: any[];
}): Promise<string> {
  const ai = getAiClient();
  const lang = params.language || 'hi';
  const targetLanguageName = LANGUAGE_NAMES[lang] || 'Hindi';

  if (!ai) {
    return `Namaste ${params.artisanContext?.name || 'Artisan'}! [Offline mode: Shilpi AI is ready to advise on craft pricing, studio photography, GeM tenders, and inventory.]`;
  }

  const lowStockSummary = Array.isArray(params.products)
    ? params.products
        .filter((p: any) => p && p.stock <= 5)
        .map((p: any) => `${p.title}: ${p.stock} units left`)
        .join(', ')
    : 'Kutch Hand-Carved Teak Keepsake Chest (2 units left), Banarasi Zari Saree (4 units left)';

  const systemInstruction = `You are "SHILPI AI", an intelligent, empathetic, and culturally rooted conversational AI workshop advisor built into ShilpSetu (India's premier artisan enablement platform).
Artisans talk to you to get actionable assistance for their workshop, pricing, photography, government tenders (GeM), inventory, and social selling.

CRITICAL INSTRUCTION:
- You MUST respond ENTIRELY in ${targetLanguageName}. Use authentic, natural vocabulary and native script appropriate for ${targetLanguageName}. Do not mix unintended English words into non-English responses.
- Respect and celebrate traditional Indian craftsmanship and indigenous knowledge.

Artisan Profile:
- Name: ${params.artisanContext?.name || 'Master Artisan'}
- Craft: ${params.artisanContext?.craft || 'Traditional Indian Handicrafts'}
- Location: ${params.artisanContext?.location || 'India'}
- Trust Score: ${params.artisanContext?.trustScore ?? 98}/100
- Inventory Alerts: ${lowStockSummary}

Capabilities:
1. Smart Pricing: Explain fair wage formula (Materials + Artisan Hours * Fair Living Wage + Heritage Skill Premium).
2. GeM & B2B Tenders: Explain ODOP, GI tag benefits, institutional procurement, and escrow protection.
3. 4K Studio: Advise on lighting presets (Golden Hour, Cool Daylight, Chiaroscuro, Sacred Earth).
4. Social Kit: Guide on sharing craft stories directly with buyers.`;

  const contents: any[] = [];
  if (Array.isArray(params.history)) {
    for (const h of params.history.slice(-6)) {
      if (h && h.content) {
        contents.push({
          role: h.role === 'model' || h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(h.content) }],
        });
      }
    }
  }

  contents.push({
    role: 'user',
    parts: [{ text: params.message }],
  });

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents,
    config: {
      systemInstruction,
      temperature: 0.7,
    },
  });

  return response.text || 'Namaste! How may I assist your craft workshop today?';
}

/**
 * 2. Photo Enhancement & Studio Lighting Presets
 */
export async function enhanceCraftPhoto(params: {
  imageBase64: string;
  preset: 'golden_hour' | 'cool_daylight' | 'chiaroscuro' | 'sacred_earth';
  craftType?: string;
}): Promise<{ enhancedImageUrl: string; lightingDescription: string }> {
  const presetDescriptions: Record<string, { prompt: string; label: string }> = {
    golden_hour: {
      label: 'Golden Hour Sunset',
      prompt:
        'Studio product photograph of Indian handicraft, 3200K warm golden hour sunset sidelighting, soft specular highlights on clay and metallic textures, rich warm ambient shadow falloff, pristine clean neutral studio surface, 4k ultra-high definition, museum catalog quality.',
    },
    cool_daylight: {
      label: 'Cool Daylight 5600K',
      prompt:
        'Museum quality studio product photography, clean 5600K pure daylight balanced lighting, zero color casting, accurate fabric fiber and metal reflections, soft diffused shadows, neutral off-white background, pin-sharp focus, commercial luxury catalog.',
    },
    chiaroscuro: {
      label: 'Dramatic Chiaroscuro',
      prompt:
        'Fine art dramatic chiaroscuro lighting, Rembrandt lighting angle, dark charcoal charcoal textured backdrop, single directional beam illuminating handcrafted master detail, deep cinematic shadows, dramatic luxury presentation.',
    },
    sacred_earth: {
      label: 'Sacred Earth',
      prompt:
        'Organic earthy atmospheric studio product photography, soft morning skylight, natural linen and raw terracotta ambient warmth, authentic handmade Indian craft aesthetic, gentle organic depth of field, high dynamic range.',
    },
  };

  const selected = presetDescriptions[params.preset] || presetDescriptions.golden_hour;
  const ai = getAiClient();

  if (ai && params.imageBase64) {
    try {
      // Clean base64 prefix if present
      const cleanBase64 = params.imageBase64.replace(/^data:image\/\w+;base64,/, '');

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: cleanBase64,
                },
              },
              {
                text: `${selected.prompt} Preserve the exact shape, geometry, and intricate hand-carved / woven details of this craft item. Only enhance the lighting, remove clutter from the background, and provide a pristine professional studio setting.`,
              },
            ],
          },
        ],
      });

      // If model returned image in parts
      const candidate = response.candidates?.[0];
      const imagePart = candidate?.content?.parts?.find((p: any) => p.inlineData);
      if (imagePart && imagePart.inlineData) {
        return {
          enhancedImageUrl: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
          lightingDescription: selected.label,
        };
      }
    } catch (e) {
      console.warn('Gemini image enhancement fallback to styled filter:', e);
    }
  }

  // Fallback if image generation is unavailable: return original with preset label
  return {
    enhancedImageUrl: params.imageBase64,
    lightingDescription: selected.label,
  };
}

/**
 * 3. Voice to Catalog Extractor
 */
export async function extractCatalogFromVoice(params: {
  audioBase64?: string;
  transcriptText?: string;
  language?: string;
}): Promise<{
  title: string;
  craft: string;
  description: string;
  price: number;
  materials: string[];
  laborHours: number;
  tags: string[];
}> {
  const ai = getAiClient();
  const lang = params.language || 'hi';
  const targetLanguageName = LANGUAGE_NAMES[lang] || 'Hindi';

  const fallbackResult = {
    title: 'Handcrafted Terracotta Diya Set',
    craft: 'Terracotta Pottery',
    description: 'Handmade traditional clay lamps burnished with river pebbles for natural acoustic resonance and earthen luster.',
    price: 850,
    materials: ['Riverbed Alluvial Clay', 'Natural Mustard Oil Finish'],
    laborHours: 4.5,
    tags: ['Terracotta', 'Handmade', 'GI-Certified', 'ODOP'],
  };

  if (!ai) {
    return fallbackResult;
  }

  try {
    const prompt = `You are the ShilpSetu Auto-Cataloging Engine.
Listen to or read the artisan's spoken voice description and extract a complete product catalog entry in JSON format.

Spoken input transcript: "${params.transcriptText || 'Handmade brass craft bell with antique finish, 6 hours of work, pure bell metal.'}"

Target Language for output text (title, craft, description, tags): ${targetLanguageName}.

Return ONLY a JSON object strictly matching this schema:
{
  "title": "string in ${targetLanguageName}",
  "craft": "string in ${targetLanguageName}",
  "description": "string in ${targetLanguageName}",
  "price": number in INR,
  "materials": ["array of material strings in ${targetLanguageName}"],
  "laborHours": number,
  "tags": ["array of 3-5 tags in ${targetLanguageName}"]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const jsonStr = response.text || '';
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('Voice catalog extraction error:', err);
    return fallbackResult;
  }
}

/**
 * 4. Heritage Craft Story Generator
 */
export async function generateHeritageStory(params: {
  craftTitle: string;
  craftType: string;
  angle: 'lineage' | 'technique' | 'earth' | 'folklore';
  language?: string;
  artisanName?: string;
}): Promise<{
  title: string;
  tagline: string;
  story: string;
  quote: string;
}> {
  const ai = getAiClient();
  const lang = params.language || 'hi';
  const targetLanguageName = LANGUAGE_NAMES[lang] || 'Hindi';

  const defaultStories: Record<string, any> = {
    lineage: {
      title: 'Three Generations of Clay',
      tagline: 'Ancestral Lineage & Heritage',
      story: 'My grandfather learned the wheel from the village elders by the banks of the Ganges in 1948. He taught my father, who placed his hands over mine when I was seven years old. Today, every pot I throw carries the warmth of three generations of patience, river silt, and woodsmoke.',
      quote: 'We do not just shape clay; we keep the memory of our ancestors alive.',
    },
    technique: {
      title: 'The Art of River Pebble Burnishing',
      tagline: 'Master Craft Technique',
      story: 'Before our terracotta enters the wood kiln, we hand-rub each vessel with smooth riverbed pebbles for three hours. This closes the microscopic pores of the clay, creating a natural waterproof sheen and metallic acoustic ring without any synthetic chemical glaze.',
      quote: 'True strength comes not from modern paints, but from earth and patient friction.',
    },
    earth: {
      title: 'Rooted in Sacred Alluvial Soil',
      tagline: 'Ecological & Sustainable Roots',
      story: 'We harvest our clay strictly after the monsoon floods when the river deposits its richest fine sediment. Our wood kilns are fueled with fallen branches and mustard husk, returning 100% back to the soil at the end of its lifecycle.',
      quote: 'From dust it rises, to dust it gently returns.',
    },
    folklore: {
      title: 'The Song of the Potter’s Wheel',
      tagline: 'Myths & Local Folklore',
      story: 'In our village, the wheel is considered an avatar of the spinning universe. We never touch the clay in the morning without first offering a prayer to Prajapati. Each vessel is sculpted with an intention of peace and prosperity for the family that welcomes it.',
      quote: 'Every hum of the wheel is a prayer for the home that receives our craft.',
    },
  };

  if (!ai) {
    return defaultStories[params.angle] || defaultStories.lineage;
  }

  try {
    const prompt = `You are a master oral historian and cultural chronicler of Indian traditional handicrafts.
Write an authentic, evocative heritage story for the craft: "${params.craftTitle}" (${params.craftType}).
Story Angle: "${params.angle}".
Artisan Name: "${params.artisanName || 'Master Artisan'}".

CRITICAL INSTRUCTION:
- You MUST write the entire story, title, tagline, and quote in ${targetLanguageName} using its native script.
- Ensure the tone is poetic, deeply respectful, grounded in India's folk traditions and sustainable indigenous craftsmanship.

Return strictly a JSON object:
{
  "title": "Poetic title in ${targetLanguageName}",
  "tagline": "Short category subtitle in ${targetLanguageName}",
  "story": "Rich narrative paragraph (80-120 words) in ${targetLanguageName}",
  "quote": "Memorable artisan aphorism in ${targetLanguageName}"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
      },
    });

    return JSON.parse(response.text || '{}');
  } catch (err) {
    console.error('Heritage story generation error:', err);
    return defaultStories[params.angle] || defaultStories.lineage;
  }
}

/**
 * 5. Social Caption Generator
 */
export async function generateSocialCaption(params: {
  craftTitle: string;
  price: number;
  craftType: string;
  artisanName: string;
  language?: string;
  platform: 'whatsapp' | 'instagram' | 'facebook';
}): Promise<{ caption: string; hashtags: string[] }> {
  const ai = getAiClient();
  const lang = params.language || 'hi';
  const targetLanguageName = LANGUAGE_NAMES[lang] || 'Hindi';

  if (!ai) {
    return {
      caption: `✨ Directly from our workshop to your home: ${params.craftTitle}. Handcrafted with ancestral love by ${params.artisanName}. Fair price ₹${params.price}. 100% direct artisan earnings through ShilpSetu SBI Escrow.`,
      hashtags: ['#IndianCrafts', '#VocalForLocal', '#HandmadeWithLove', '#ShilpSetu'],
    };
  }

  try {
    const prompt = `Write an authentic social media post for ${params.platform.toUpperCase()} to help artisan "${params.artisanName}" sell their "${params.craftTitle}" (${params.craftType}) priced at ₹${params.price}.

CRITICAL:
- Write the post in ${targetLanguageName} using its native script.
- Emphasize direct artisan purchase with zero middlemen, fair wages, and secure SBI Escrow protection.
- Include a warm invitation to collectors and heritage enthusiasts.

Return strictly a JSON object:
{
  "caption": "Full social post text in ${targetLanguageName}",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4"]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
      },
    });

    return JSON.parse(response.text || '{}');
  } catch (err) {
    console.error('Social caption generation error:', err);
    return {
      caption: `✨ ${params.craftTitle} - ₹${params.price}. Handcrafted by ${params.artisanName}. Verified authentic handicraft.`,
      hashtags: ['#ShilpSetu', '#Handmade', '#VocalForLocal'],
    };
  }
}
