import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { db } from './server/db.js';
import {
  sendOtpToEmail,
  sendOtpToPhone,
  verifyOtp,
  generateToken,
  authenticateJwt,
  AuthenticatedRequest,
  isValidEmail,
  hashPassword,
  verifyPassword,
} from './server/auth.js';
import {
  generateShilpiReply,
  enhanceCraftPhoto,
  extractCatalogFromVoice,
  generateHeritageStory,
  generateSocialCaption,
} from './server/ai.js';
import { uploadMiddleware, saveBase64Image } from './server/storage.js';

dotenv.config();

// Sanitize Clerk environment variables in case full 'KEY=value' string was pasted in settings
if (process.env.VITE_CLERK_PUBLISHABLE_KEY) {
  process.env.VITE_CLERK_PUBLISHABLE_KEY = process.env.VITE_CLERK_PUBLISHABLE_KEY
    .replace(/^VITE_CLERK_PUBLISHABLE_KEY=/, '')
    .replace(/^["']|["']$/g, '')
    .trim();
}
if (process.env.CLERK_SECRET_KEY) {
  process.env.CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY
    .replace(/^CLERK_SECRET_KEY=/, '')
    .replace(/^["']|["']$/g, '')
    .trim();
}

const app = express();
const PORT = 3000;

// Enable CORS for external browser deployments and mobile views
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static uploads serving
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    db: db.isPostgres() ? 'PostgreSQL' : 'PersistentStore',
    timestamp: new Date().toISOString(),
  });
});

/* =========================================================================
   1. AUTHENTICATION & OTP ENDPOINTS
   ========================================================================= */

// Normal-user sign in: password authentication precedes the email OTP challenge.
app.post('/api/auth/login', async (req, res) => {
  try {
    const identifier = typeof req.body.identifier === 'string' ? req.body.identifier.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Enter your registered email or mobile number and password.' });
    }
    const artisan = identifier.includes('@')
      ? db.getArtisanByEmail(identifier)
      : db.getArtisanByPhone(identifier);
    if (!artisan || !artisan.email || !verifyPassword(password, artisan.passwordHash)) {
      return res.status(401).json({ error: 'The email/mobile number or password is incorrect.' });
    }

    const result = await sendOtpToEmail(artisan.email, artisan.mobile, { shouldCreateUser: false });
    res.json({
      success: true,
      email: artisan.email,
      maskedEmail: artisan.email.replace(/^(.{2}).*(@.*)$/, '$1••••$2'),
      message: result.message,
      cooldownSeconds: result.cooldownSeconds,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Unable to start sign in.' });
  }
});

app.post('/api/auth/login-otp', async (req, res) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const otp = typeof req.body.otp === 'string' ? req.body.otp.trim() : '';
    if (!isValidEmail(email) || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ error: 'Enter the 6-digit login code sent to your registered email.' });
    }
    const artisan = db.getArtisanByEmail(email);
    if (!artisan) return res.status(401).json({ error: 'This account could not be found.' });
    if (!(await verifyOtp(email, otp))) {
      return res.status(401).json({ error: 'Invalid login code.' });
    }
    res.json({ success: true, token: generateToken(artisan), artisan });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Login verification failed.' });
  }
});

// Request 6-digit OTP (Mandatory Email ID)
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email, mobile } = req.body;
    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid Email ID is strictly mandatory for artisan verification' });
    }

    const result = await sendOtpToEmail(email, mobile);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to send verification code' });
  }
});

// Verify Email OTP and issue JWT session token
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, mobile, otp, artisanDetails, clerkVerified, clerkSessionId } = req.body;

    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid Email ID is strictly mandatory for artisan verification' });
    }

    if (!otp) {
      return res.status(400).json({ error: 'Verification code (OTP) is required' });
    }

    const isValid = await verifyOtp(email, otp, { clerkVerified, clerkSessionId });
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification code. Please check the code sent to your email.' });
    }

    // Lookup existing or create profile by email or mobile
    let artisan = db.getArtisanByEmail(email) || (mobile ? db.getArtisanByPhone(mobile) : null);
    if (!artisan && artisanDetails) {
      artisan = db.upsertArtisan({
        mobile: mobile || artisanDetails.mobile || '9876543210',
        fullName: artisanDetails.fullName || 'Artisan',
        craft: artisanDetails.selectedCraft || 'Traditional Handicrafts',
        state: artisanDetails.state || 'Uttar Pradesh',
        city: artisanDetails.city || 'Varanasi',
        gender: artisanDetails.gender,
        email: email.trim().toLowerCase(),
        language: artisanDetails.selectedLanguage || 'hi',
        passwordHash: artisanDetails.password ? hashPassword(artisanDetails.password) : undefined,
      });
    } else if (!artisan) {
      artisan = db.upsertArtisan({
        mobile: mobile || '9876543210',
        fullName: 'Master Artisan',
        craft: 'Traditional Handicrafts',
        state: 'Uttar Pradesh',
        city: 'Varanasi',
        email: email.trim().toLowerCase(),
        language: 'hi',
      });
    }

    const token = generateToken(artisan);
    res.json({
      success: true,
      token,
      artisan,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Verification failed' });
  }
});

// Get current session artisan
app.get('/api/auth/me', authenticateJwt, (req: AuthenticatedRequest, res) => {
  if (!req.artisan) {
    // Return demo profile if not logged in
    return res.json({ artisan: db.getArtisanById('artisan_demo') });
  }
  const artisan = db.getArtisanById(req.artisan.id) || db.getArtisanByPhone(req.artisan.mobile);
  res.json({ artisan });
});

/* =========================================================================
   2. ARTISAN PROFILE ENDPOINTS
   ========================================================================= */

app.get('/api/artisan', authenticateJwt, (req: AuthenticatedRequest, res) => {
  const artisanId = req.artisan?.id || (req.query.id as string) || 'artisan_demo';
  const profile = db.getArtisanById(artisanId) || db.getArtisanById('artisan_demo');
  res.json(profile);
});

app.put('/api/artisan', authenticateJwt, (req: AuthenticatedRequest, res) => {
  try {
    const artisanId = req.artisan?.id || req.body.id || 'artisan_demo';
    const updated = db.upsertArtisan({
      ...req.body,
      id: artisanId,
      mobile: req.body.mobile || req.artisan?.mobile || '9876543210',
      fullName: req.body.fullName || req.artisan?.fullName || 'Master Artisan',
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update artisan profile' });
  }
});

/* =========================================================================
   3. PRODUCTS & CATALOG ENDPOINTS
   ========================================================================= */

app.get('/api/products', (req, res) => {
  const artisanId = (req.query.artisanId as string) || undefined;
  const products = db.getProducts(artisanId);
  res.json(products);
});

app.post('/api/products', authenticateJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const { title, craft, price, stock = 1, imageUrl, story, rawMaterialsCost, laborHours, hourlyRate, marginPercentage, giCertified } = req.body;
    if (!title || !price) {
      return res.status(400).json({ error: 'Title and price are required' });
    }

    const artisanId = req.artisan?.id || 'artisan_demo';
    const product = db.createProduct({
      artisanId,
      title,
      craft: craft || 'Handicrafts',
      price: Number(price),
      stock: Number(stock),
      imageUrl,
      story,
      rawMaterialsCost: Number(rawMaterialsCost || 0),
      laborHours: Number(laborHours || 0),
      hourlyRate: Number(hourlyRate || 180),
      marginPercentage: Number(marginPercentage || 20),
      giCertified: Boolean(giCertified),
      isActive: true,
    });
    res.status(201).json(product);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create product' });
  }
});

app.put('/api/products/:id', authenticateJwt, (req: AuthenticatedRequest, res) => {
  try {
    const updated = db.updateProduct(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update product' });
  }
});

app.delete('/api/products/:id', authenticateJwt, (req: AuthenticatedRequest, res) => {
  const success = db.deleteProduct(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json({ success: true });
});

/* =========================================================================
   4. ORDERS & GEM B2B TENDERS ENDPOINTS
   ========================================================================= */

app.get('/api/orders', authenticateJwt, (req: AuthenticatedRequest, res) => {
  const artisanId = req.artisan?.id || (req.query.artisanId as string) || 'artisan_demo';
  const orders = db.getOrders(artisanId);
  res.json(orders);
});

app.post('/api/orders', authenticateJwt, (req: AuthenticatedRequest, res) => {
  try {
    const artisanId = req.artisan?.id || req.body.artisanId || 'artisan_demo';
    const status = req.body.status || 'pending';
    if (!['pending', 'accepted', 'shipped'].includes(status)) {
      return res.status(400).json({ error: 'Status must be pending, accepted, or shipped' });
    }
    const order = db.createOrder({
      ...req.body,
      artisanId,
      status,
      escrowStatus: req.body.escrowStatus || 'held_in_sbi_escrow',
    });
    res.status(201).json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create order' });
  }
});

app.patch('/api/orders/:id/status', authenticateJwt, (req: AuthenticatedRequest, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    if (!['pending', 'accepted', 'shipped'].includes(status)) {
      return res.status(400).json({ error: 'Status must be pending, accepted, or shipped' });
    }
    const order = db.getOrders(req.artisan?.id || 'artisan_demo').find((item) => item.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const updated = db.updateOrderStatus(req.params.id, status);
    if (!updated) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update order status' });
  }
});

app.delete('/api/orders/:id', authenticateJwt, (req: AuthenticatedRequest, res) => {
  const order = db.getOrders(req.artisan?.id || 'artisan_demo').find((item) => item.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (!db.deleteOrder(req.params.id)) return res.status(404).json({ error: 'Order not found' });
  res.status(204).end();
});

app.get('/api/tenders', (req, res) => {
  const tenders = db.getTenders();
  res.json(tenders);
});

app.post('/api/tenders/:id/bid', authenticateJwt, (req: AuthenticatedRequest, res) => {
  try {
    const updated = db.updateTenderStatus(req.params.id, 'bid_submitted');
    if (!updated) {
      return res.status(404).json({ error: 'Tender not found' });
    }
    res.json({ success: true, tender: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to submit tender bid' });
  }
});

/* =========================================================================
   5. REAL AI INTEGRATIONS (GEMINI SERVER-SIDE)
   ========================================================================= */

// Shilpi AI Chat
app.post('/api/shilpi-chat', async (req, res) => {
  try {
    const { message, history = [], language = 'en', artisanContext, products, pricingInputs } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const reply = await generateShilpiReply({
      message,
      history,
      language,
      artisanContext,
      products,
      pricingInputs,
    });

    // Save to chat history if artisanId is known
    const artisanId = artisanContext?.id || 'artisan_demo';
    db.addChatMessage(artisanId, 'user', message, language);
    db.addChatMessage(artisanId, 'assistant', reply, language);

    res.json({ reply });
  } catch (err: any) {
    console.error('Shilpi Chat Error:', err);
    res.status(500).json({ error: err.message || 'Failed to process chat message' });
  }
});

// Photo Enhancement with Presets
app.post('/api/photo-enhance', async (req, res) => {
  try {
    const { imageBase64, preset = 'golden_hour', craftType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const result = await enhanceCraftPhoto({
      imageBase64,
      preset,
      craftType,
    });
    res.json(result);
  } catch (err: any) {
    console.error('Photo Enhance Error:', err);
    res.status(500).json({ error: err.message || 'Photo enhancement failed' });
  }
});

// Multilingual Voice-to-Catalog Extractor
app.post('/api/voice-catalog', async (req, res) => {
  try {
    const { audioBase64, transcriptText, language = 'hi' } = req.body;
    const result = await extractCatalogFromVoice({
      audioBase64,
      transcriptText,
      language,
    });
    res.json(result);
  } catch (err: any) {
    console.error('Voice Catalog Error:', err);
    res.status(500).json({ error: err.message || 'Catalog extraction failed' });
  }
});

// Multilingual Heritage Story Generator
app.post('/api/heritage-story', async (req, res) => {
  try {
    const { craftTitle, craftType, angle = 'lineage', language = 'hi', artisanName } = req.body;
    if (!craftTitle) {
      return res.status(400).json({ error: 'craftTitle is required' });
    }

    const story = await generateHeritageStory({
      craftTitle,
      craftType: craftType || 'Handicrafts',
      angle,
      language,
      artisanName,
    });
    res.json(story);
  } catch (err: any) {
    console.error('Heritage Story Error:', err);
    res.status(500).json({ error: err.message || 'Story generation failed' });
  }
});

// Multilingual Social Caption Generator
app.post('/api/social-caption', async (req, res) => {
  try {
    const { craftTitle, price, craftType, artisanName, language = 'hi', platform = 'instagram' } = req.body;
    const result = await generateSocialCaption({
      craftTitle,
      price: Number(price) || 1200,
      craftType: craftType || 'Handicraft',
      artisanName: artisanName || 'Artisan',
      language,
      platform,
    });
    res.json(result);
  } catch (err: any) {
    console.error('Social Caption Error:', err);
    res.status(500).json({ error: err.message || 'Caption generation failed' });
  }
});

/* =========================================================================
   6. FILE UPLOAD ENDPOINTS (PERSISTENT STORAGE & VALIDATION)
   ========================================================================= */

app.post('/api/upload', uploadMiddleware.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }
    const publicUrl = `/uploads/${req.file.filename}`;
    res.json({
      url: publicUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Upload failed' });
  }
});

app.post('/api/upload-base64', async (req, res) => {
  try {
    const { imageBase64, prefix = 'craft' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }
    const url = await saveBase64Image(imageBase64, prefix);
    res.json({ url });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Base64 image upload failed' });
  }
});

/* =========================================================================
   7. MULTILINGUAL TTS AUDIO PROXY
   ========================================================================= */

const ttsAudioCache = new Map<string, Buffer>();

app.get('/api/tts', async (req, res) => {
  try {
    const lang = (req.query.lang as string) || 'hi';
    const text = (req.query.text as string) || '';

    if (!text) {
      return res.status(400).json({ error: 'Text query parameter is required' });
    }

    const cacheKey = `${lang}:${text}`;
    let buffer = ttsAudioCache.get(cacheKey);

    if (!buffer) {
      const ttsLanguageMap: Record<string, { tl: string; phoneticText?: string }> = {
        en: { tl: 'en' },
        hi: { tl: 'hi' },
        as: { tl: 'bn' },
        bn: { tl: 'bn' },
        brx: { tl: 'hi' },
        doi: { tl: 'hi' },
        gu: { tl: 'gu' },
        kn: { tl: 'kn' },
        ks: { tl: 'ur' },
        kok: { tl: 'hi' },
        mai: { tl: 'hi' },
        ml: { tl: 'ml' },
        mni: { tl: 'bn' },
        mr: { tl: 'mr' },
        ne: { tl: 'ne' },
        or: { tl: 'hi', phoneticText: 'ଶିଳ୍ପସେତୁରେ ଆପଣଙ୍କୁ ସ୍ୱାଗତ' },
        pa: { tl: 'pa' },
        sa: { tl: 'hi' },
        sat: { tl: 'hi', phoneticText: 'शिल्पसेतु रे जोहार' },
        sd: { tl: 'ur' },
        ta: { tl: 'ta' },
        te: { tl: 'te' },
        ur: { tl: 'ur' },
      };

      const config = ttsLanguageMap[lang] || { tl: 'hi' };
      const queryText = config.phoneticText || text;
      const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${config.tl}&client=tw-ob&q=${encodeURIComponent(queryText)}`;

      const response = await fetch(googleTtsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: 'TTS upstream error' });
      }

      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      ttsAudioCache.set(cacheKey, buffer);
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Accept-Ranges', 'bytes');

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : buffer.length - 1;
      const chunksize = end - start + 1;
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${buffer.length}`);
      res.setHeader('Content-Length', chunksize);
      return res.end(buffer.slice(start, end + 1));
    }

    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);
  } catch (err: any) {
    console.error('TTS proxy error:', err);
    return res.status(500).json({ error: 'Failed to generate speech audio' });
  }
});

/* =========================================================================
   8. VITE MIDDLEWARE & STATIC CLIENT SERVING
   ========================================================================= */

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
    console.log(`ShilpSetu Unified Server running on http://localhost:${PORT}`);
  });
}

startServer();
