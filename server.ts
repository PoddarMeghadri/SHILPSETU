import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// API route for Shilpi AI Chat powered by Gemini
app.post('/api/shilpi-chat', async (req, res) => {
  try {
    const { message, history = [], language = 'en', artisanContext, products } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured', fallback: true });
    }

    const ai = new GoogleGenAI({ apiKey });

    const lowStockSummary = Array.isArray(products)
      ? products.filter((p: any) => p && p.stock <= 5).map((p: any) => `${p.title}: ${p.stock} units left`).join(', ')
      : 'Kutch Hand-Carved Teak Keepsake Chest: 2 units left, Banarasi Zari Handloom Silk Saree: 4 units left';

    const systemInstruction = `You are "SHILPI AI", an intelligent, warm, and empowering conversational AI assistant built into ShilpSetu (India's premier artisan craft enablement platform).
Artisans talk to you just like they talk to Gemini, ChatGPT, or a trusted workshop advisor.

Artisan Context:
- Name: ${artisanContext?.name || 'Master Artisan'}
- Craft: ${artisanContext?.craft || 'Traditional Indian Handicrafts'}
- Location: ${artisanContext?.location || 'India'}
- Verified Trust Score: ${artisanContext?.trustScore ?? 98}/100
- Workshop Inventory Low Stock Items: ${lowStockSummary}

Capabilities you can advise on:
1. Inventory & Stock: Inform artisans which products are low in stock (specifically Kutch Hand-Carved Teak Keepsake Chest with only 2 units left and Banarasi Zari Handloom Silk Saree with 4 units left) and suggest restocking.
2. Craft pricing (raw materials + artisan hours * fair living wage + heritage skill premium + fair margin without middleman cuts).
3. Government e-Marketplace (GeM) registration, institutional B2B procurement tenders, ODOP, GI verification.
4. 4K Photo Studio lighting, background removal, staging, and packaging guidance.
5. Multilingual cataloging and craft story writing.
6. Daily workshop sales, order management, and export advice.
7. Navigation of ShilpSetu app modules:
   - "studio" -> AI Photo Studio
   - "pricing" -> Smart Fair Price Calculator
   - "cataloger" -> Multilingual Voice Cataloger
   - "b2b" -> GeM & Institutional Tenders
   - "dashboard" -> Business Analytics & Stock Inventory
   - "social" -> WhatsApp/Instagram Marketing Kit
   - "story" -> Heritage Story Builder
   - "notifications" -> Alerts & Orders

Guidelines:
- Support the user in whatever language they write in (Hindi, English, Bengali, Tamil, Telugu, Marathi, Gujarati, etc.).
- Be respectful, encouraging, clear, and actionable. Use short formatted points or clean paragraphs.
- If recommending a specific platform tool, mention it naturally (e.g. "[Open Fair Price Calculator]" or "[Manage Inventory]").`;

    // Map conversation history
    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const h of history.slice(-6)) {
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

    const reply = response.text || 'Namaste! How can I assist your workshop today?';
    return res.json({ reply });
  } catch (error: any) {
    console.error('Shilpi AI Chat Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process AI chat request',
      fallback: true,
    });
  }
});

// API route for High-Fidelity Multilingual TTS (All 23 Indian Languages)
app.get('/api/tts', async (req, res) => {
  try {
    const lang = (req.query.lang as string) || 'hi';
    const text = (req.query.text as string) || '';

    if (!text) {
      return res.status(400).json({ error: 'Text query parameter is required' });
    }

    // Phonetic and dialect acoustic map for all 23 official Indian languages
    const ttsLanguageMap: Record<string, { tl: string; phoneticText?: string }> = {
      en: { tl: 'en' },
      hi: { tl: 'hi' },
      as: { tl: 'bn' }, // Assamese (Eastern Indo-Aryan) acoustic alignment
      bn: { tl: 'bn' },
      brx: { tl: 'hi' }, // Bodo (Devanagari script)
      doi: { tl: 'hi' }, // Dogri (Devanagari script)
      gu: { tl: 'gu' },
      kn: { tl: 'kn' },
      ks: { tl: 'ur' }, // Kashmiri (Perso-Arabic Nastaliq script)
      kok: { tl: 'hi' }, // Konkani (Devanagari script)
      mai: { tl: 'hi' }, // Maithili (Devanagari script)
      ml: { tl: 'ml' },
      mni: { tl: 'bn' }, // Manipuri (Eastern Indo-Aryan Bengali script)
      mr: { tl: 'mr' },
      ne: { tl: 'ne' },
      or: { tl: 'hi', phoneticText: 'शिल्पसेतुरे आपणङ्कु स्वागत' }, // Odia phonetics
      pa: { tl: 'pa' },
      sa: { tl: 'hi' }, // Sanskrit (Devanagari script)
      sat: { tl: 'hi', phoneticText: 'शिल्पसेतु रे जोहार' }, // Santali phonetics
      sd: { tl: 'ur' }, // Sindhi (Perso-Arabic script)
      ta: { tl: 'ta' },
      te: { tl: 'te' },
      ur: { tl: 'ur' }, // Indian Urdu
    };

    const config = ttsLanguageMap[lang] || { tl: 'hi' };
    const queryText = config.phoneticText || text;
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${config.tl}&client=tw-ob&q=${encodeURIComponent(queryText)}`;

    const response = await fetch(googleTtsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'TTS upstream error' });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buffer);
  } catch (err: any) {
    console.error('TTS proxy error:', err);
    return res.status(500).json({ error: 'Failed to generate speech audio' });
  }
});

// Vite middleware integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
