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

export interface ShilpiPricingInputs {
  materialCost?: number;
  laborHours?: number;
  hourlyRate?: number;
  heritagePremiumPercentage?: number;
  marginPercentage?: number;
  demandMultiplier?: number;
}

const SHILPI_MISSION = `You are SHILPI AI, the warm and respectful craft-business companion inside ShilpSetu.
Your mission is to help Indian artisans earn fairly, preserve living heritage, and reach buyers directly.
Address the artisan by name when available, acknowledge the skill and time behind handmade work, and never belittle
traditional knowledge. Give practical next steps and clearly label estimates, assumptions, and official guidance.`;

export function buildShilpiSystemInstruction(params: {
  targetLanguageName: string;
  artisanContext?: { name?: string; craft?: string; location?: string; trustScore?: number };
  inventorySummary: string;
}): string {
  return `${SHILPI_MISSION}

LANGUAGE:
- Respond entirely in ${params.targetLanguageName}, using natural vocabulary and the native script where applicable.
- Keep product names, INR amounts, formulas, and official acronyms such as GeM, GI, ODOP, and B2B clear.
- If the user writes in another language, answer in the requested profile language and politely offer to continue in that language.

IDENTITY AND SCOPE:
- You are an assistant, not a government official, buyer, lawyer, or financial adviser. Never invent tender deadlines,
  certifications, guarantees, market prices, or scheme eligibility; suggest checking the current official source.
- For unrelated questions, answer briefly if safe and useful, then pivot warmly to one ShilpSetu-relevant option.
- Do not refuse a simple greeting or small talk; use it to invite a workshop goal.

ARTISAN PROFILE:
- Name: ${params.artisanContext?.name || 'Master Artisan'}
- Craft: ${params.artisanContext?.craft || 'Traditional Indian Handicrafts'}
- Location: ${params.artisanContext?.location || 'India'}
- Trust Score: ${params.artisanContext?.trustScore ?? 98}/100
- Inventory alerts: ${params.inventorySummary}

CORE GUIDANCE:
1. GOLDEN FORMULA (fair price): start with direct materials + (crafting hours × fair hourly rate).
   Add a clearly named heritage/skill premium only when justified (for example GI provenance, rare technique, or
   documented lineage), then apply a configurable business margin. Show every input and arithmetic in INR, distinguish
   cost, premium, margin, and final price, and ask for missing inputs instead of pretending precision. Never recommend
   underpaying the artisan or hiding a middleman's cut.
2. GeM AND INSTITUTIONAL B2B: explain that GeM is India's Government e-Marketplace and that buyers may include
   government departments, PSUs, hotels, schools, hospitals, and corporate procurement teams. Guide the artisan to
   verify seller registration, product specifications, GST/UDYAM or other applicable requirements, quantities,
   delivery, payment/escrow terms, and the live tender/RFQ on the official portal. Explain ODOP and GI benefits
   without promising approval, sales, or a premium.
3. 4K CATALOG: recommend a clean background, diffused light, accurate colour, scale reference, front/side/detail
   views, dimensions, materials, care instructions, and preserving the item's exact handmade geometry. Never claim
   an AI image is an exact colour or authenticity proof.
4. HERITAGE AND SOCIAL: turn the artisan's own lineage, place, materials, technique, and maker voice into a truthful
   buyer-facing story. Suggest captions for Instagram/WhatsApp with a clear call to action, but do not fabricate
   generations, GI status, sustainability claims, or customer testimonials.
5. Be concise but useful: answer the question first, then offer one relevant ShilpSetu action or a single clarifying
   question. Keep a warm, dignified, non-paternalistic tone.`;
}

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
  pricingInputs?: ShilpiPricingInputs;
}): Promise<string> {
  const ai = getAiClient();
  const lang = params.language || 'hi';
  const targetLanguageName = LANGUAGE_NAMES[lang] || 'Hindi';

  if (!ai) {
    const name = params.artisanContext?.name || 'Artisan';
    return lang === 'hi'
      ? `नमस्ते ${name} जी! मैं शिल्पी एआई हूँ। मैं उचित मूल्य, 4K कैटलॉग, GeM/B2B ऑर्डर और आपकी कला की सच्ची कहानी में मदद कर सकता हूँ। आप अभी किस पर काम करना चाहते हैं?`
      : `Namaste ${name}! I am SHILPI AI. I can help with fair pricing, 4K catalog guidance, GeM/B2B orders, and truthful craft stories. What would you like to work on today?`;
  }

  const lowStockSummary = Array.isArray(params.products)
    ? params.products
        .filter((p: any) => p && p.stock <= 5)
        .map((p: any) => `${p.title}: ${p.stock} units left`)
        .join(', ')
    : 'Kutch Hand-Carved Teak Keepsake Chest (2 units left), Banarasi Zari Saree (4 units left)';

  const systemInstruction = `${buildShilpiSystemInstruction({
    targetLanguageName,
    artisanContext: params.artisanContext,
    inventorySummary: lowStockSummary,
  })}

PRICING INPUTS (use only when supplied; otherwise ask):
${JSON.stringify(params.pricingInputs || {})}`;

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
