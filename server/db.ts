import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;

// Data directory for persistent storage
const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface ArtisanRecord {
  id: string;
  mobile: string;
  fullName: string;
  craft: string;
  state: string;
  city: string;
  gender?: string;
  email?: string;
  language: string;
  trustScore: number;
  isVerified: boolean;
  udyamNumber?: string;
  giTag?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductRecord {
  id: string;
  artisanId: string;
  title: string;
  craft: string;
  price: number;
  stock: number;
  imageUrl?: string;
  story?: string;
  rawMaterialsCost?: number;
  laborHours?: number;
  hourlyRate?: number;
  marginPercentage?: number;
  giCertified?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderRecord {
  id: string;
  artisanId: string;
  productId?: string;
  productTitle: string;
  buyerName: string;
  buyerType: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: 'pending' | 'accepted' | 'shipped';
  escrowStatus: string;
  deliveryBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenderRecord {
  id: string;
  tenderNumber: string;
  title: string;
  organization: string;
  buyerType: string;
  quantity: number;
  maxBudget: number;
  status: 'open' | 'bid_submitted' | 'awarded' | 'closed';
  deadline: string;
  description: string;
  createdAt: string;
}

export interface ChatMessageRecord {
  id: string;
  artisanId: string;
  role: 'user' | 'assistant';
  content: string;
  language: string;
  createdAt: string;
}

interface DBStore {
  artisans: Record<string, ArtisanRecord>;
  products: Record<string, ProductRecord>;
  orders: Record<string, OrderRecord>;
  tenders: Record<string, TenderRecord>;
  chats: Record<string, ChatMessageRecord[]>;
}

// Initial default seed
const defaultTenders: TenderRecord[] = [
  {
    id: 't-gem-101',
    tenderNumber: 'GEM/2026/B/891244',
    title: '500 Hand-Cast Brass Diyas & Mementos',
    organization: 'Ministry of Culture & Tourism, Govt of India',
    buyerType: 'government',
    quantity: 500,
    maxBudget: 625000,
    status: 'open',
    deadline: '2026-10-15',
    description: 'Procurement of authentic hand-cast brass ceremonial lamps for national heritage exhibitions.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 't-corp-202',
    tenderNumber: 'CORP/ITC/2026/782',
    title: '250 Terracotta Artisan Tea Sets',
    organization: 'ITC WelcomHeritage Luxury Hotels',
    buyerType: 'corporate',
    quantity: 250,
    maxBudget: 350000,
    status: 'open',
    deadline: '2026-10-28',
    description: 'Direct procurement for luxury resort welcome gifting with verified artisan authenticity tags.',
    createdAt: new Date().toISOString(),
  },
];

const defaultInitialProducts: ProductRecord[] = [
  {
    id: 'p-1',
    artisanId: 'artisan_demo',
    title: 'Kutch Hand-Carved Teak Keepsake Chest',
    craft: 'Wood Carving',
    price: 3450,
    stock: 2,
    imageUrl: 'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?w=800&auto=format&fit=crop&q=80',
    story: 'Carved using ancestral teak wood chiseling techniques passed down through 4 generations.',
    rawMaterialsCost: 1200,
    laborHours: 8,
    hourlyRate: 180,
    marginPercentage: 25,
    giCertified: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p-2',
    artisanId: 'artisan_demo',
    title: 'Banarasi Zari Handloom Silk Saree',
    craft: 'Handloom Weaving',
    price: 8900,
    stock: 4,
    imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop',
    story: 'Woven on pit-looms with pure mulberry silk and electroplated zari warp.',
    rawMaterialsCost: 3500,
    laborHours: 24,
    hourlyRate: 180,
    marginPercentage: 20,
    giCertified: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p-3',
    artisanId: 'artisan_demo',
    title: 'Dhokra Brass Tribal Ritual Bell',
    craft: 'Dhokra Metal Casting',
    price: 2200,
    stock: 12,
    imageUrl: 'https://images.unsplash.com/photo-1590736969955-71cc94801759?w=800&auto=format&fit=crop',
    story: 'Created with 4,000-year-old lost wax casting process using bee wax and river silt core.',
    rawMaterialsCost: 650,
    laborHours: 6,
    hourlyRate: 180,
    marginPercentage: 30,
    giCertified: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const defaultInitialOrders: OrderRecord[] = [
  {
    id: 'ord-8812',
    artisanId: 'artisan_demo',
    productId: 'p-1',
    productTitle: 'Kutch Hand-Carved Teak Keepsake Chest',
    buyerName: 'Ministry of Culture (Govt of India)',
    buyerType: 'government',
    quantity: 15,
    unitPrice: 3450,
    totalAmount: 51750,
    status: 'pending',
    escrowStatus: 'held_in_sbi_escrow',
    deliveryBy: '2026-10-10',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'ord-8813',
    artisanId: 'artisan_demo',
    productId: 'p-2',
    productTitle: 'Banarasi Zari Handloom Silk Saree',
    buyerName: 'Tata Heritage & Luxury Crafts',
    buyerType: 'corporate',
    quantity: 8,
    unitPrice: 8900,
    totalAmount: 71200,
    status: 'accepted',
    escrowStatus: 'held_in_sbi_escrow',
    deliveryBy: '2026-10-18',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
  },
];

// Persistent File Store
class LocalStoreManager {
  private store: DBStore;

  constructor() {
    this.store = this.load();
  }

  private load(): DBStore {
    try {
      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Error reading store.json, creating initial store:', e);
    }
    const initial: DBStore = {
      artisans: {},
      products: defaultInitialProducts.reduce((acc, p) => ({ ...acc, [p.id]: p }), {}),
      orders: defaultInitialOrders.reduce((acc, o) => ({ ...acc, [o.id]: o }), {}),
      tenders: defaultTenders.reduce((acc, t) => ({ ...acc, [t.id]: t }), {}),
      chats: {},
    };
    this.save(initial);
    return initial;
  }

  private save(data: DBStore) {
    try {
      fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving store.json:', e);
    }
  }

  // Artisan operations
  getArtisanByPhone(phone: string): ArtisanRecord | null {
    const cleaned = phone.replace(/\D/g, '');
    for (const a of Object.values(this.store.artisans)) {
      if (a.mobile.replace(/\D/g, '') === cleaned) return a;
    }
    return null;
  }

  getArtisanByEmail(email: string): ArtisanRecord | null {
    const cleaned = email.trim().toLowerCase();
    for (const a of Object.values(this.store.artisans)) {
      if (a.email && a.email.trim().toLowerCase() === cleaned) return a;
    }
    return null;
  }

  getArtisanById(id: string): ArtisanRecord | null {
    return this.store.artisans[id] || null;
  }

  upsertArtisan(profile: Partial<ArtisanRecord> & { mobile: string; fullName: string }): ArtisanRecord {
    const id = profile.id || `artisan_${profile.mobile.replace(/\D/g, '').slice(-10)}`;
    const now = new Date().toISOString();
    const existing = this.store.artisans[id];

    const record: ArtisanRecord = {
      id,
      mobile: profile.mobile,
      fullName: profile.fullName,
      craft: profile.craft || existing?.craft || 'Traditional Handicrafts',
      state: profile.state || existing?.state || 'Uttar Pradesh',
      city: profile.city || existing?.city || 'Varanasi',
      gender: profile.gender || existing?.gender || 'other',
      email: profile.email || existing?.email,
      language: profile.language || existing?.language || 'hi',
      trustScore: profile.trustScore ?? existing?.trustScore ?? 98,
      isVerified: profile.isVerified ?? existing?.isVerified ?? true,
      udyamNumber: profile.udyamNumber || existing?.udyamNumber,
      giTag: profile.giTag || existing?.giTag,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    this.store.artisans[id] = record;
    this.save(this.store);
    return record;
  }

  // Products operations
  getProducts(artisanId?: string): ProductRecord[] {
    const list = Object.values(this.store.products);
    if (!artisanId) return list;
    return list.filter((p) => p.artisanId === artisanId || p.artisanId === 'artisan_demo');
  }

  createProduct(product: Omit<ProductRecord, 'id' | 'createdAt' | 'updatedAt'>): ProductRecord {
    const id = `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();
    const record: ProductRecord = {
      ...product,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.store.products[id] = record;
    this.save(this.store);
    return record;
  }

  updateProduct(id: string, updates: Partial<ProductRecord>): ProductRecord | null {
    const existing = this.store.products[id];
    if (!existing) return null;
    const updated: ProductRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.store.products[id] = updated;
    this.save(this.store);
    return updated;
  }

  deleteProduct(id: string): boolean {
    if (this.store.products[id]) {
      delete this.store.products[id];
      this.save(this.store);
      return true;
    }
    return false;
  }

  // Orders operations
  getOrders(artisanId?: string): OrderRecord[] {
    const list = Object.values(this.store.orders);
    if (!artisanId) return list;
    return list.filter((o) => o.artisanId === artisanId || o.artisanId === 'artisan_demo');
  }

  createOrder(order: Omit<OrderRecord, 'id' | 'createdAt' | 'updatedAt'>): OrderRecord {
    const id = `ord_${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();
    const record: OrderRecord = {
      ...order,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.store.orders[id] = record;
    this.save(this.store);
    return record;
  }

  updateOrderStatus(id: string, status: OrderRecord['status']): OrderRecord | null {
    const existing = this.store.orders[id];
    if (!existing) return null;
    const updated: OrderRecord = {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
    };
    this.store.orders[id] = updated;
    this.save(this.store);
    return updated;
  }

  // Tenders operations
  getTenders(): TenderRecord[] {
    return Object.values(this.store.tenders);
  }

  updateTenderStatus(id: string, status: TenderRecord['status']): TenderRecord | null {
    const existing = this.store.tenders[id];
    if (!existing) return null;
    const updated: TenderRecord = {
      ...existing,
      status,
    };
    this.store.tenders[id] = updated;
    this.save(this.store);
    return updated;
  }

  // Chat History operations
  getChatHistory(artisanId: string): ChatMessageRecord[] {
    return this.store.chats[artisanId] || [];
  }

  addChatMessage(artisanId: string, role: 'user' | 'assistant', content: string, language = 'hi'): ChatMessageRecord {
    const id = `msg_${Date.now()}`;
    const message: ChatMessageRecord = {
      id,
      artisanId,
      role,
      content,
      language,
      createdAt: new Date().toISOString(),
    };
    if (!this.store.chats[artisanId]) {
      this.store.chats[artisanId] = [];
    }
    this.store.chats[artisanId].push(message);
    // Keep max 50 recent messages
    if (this.store.chats[artisanId].length > 50) {
      this.store.chats[artisanId] = this.store.chats[artisanId].slice(-50);
    }
    this.save(this.store);
    return message;
  }
}

export const localStore = new LocalStoreManager();

// Optional PostgreSQL client connection
let pool: pg.Pool | null = null;
if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });
    console.log('PostgreSQL Pool initialized with DATABASE_URL');
  } catch (e) {
    console.warn('Could not initialize PostgreSQL pool:', e);
  }
}

export const db = {
  isPostgres: () => !!pool,
  getArtisanByPhone: (phone: string) => localStore.getArtisanByPhone(phone),
  getArtisanByEmail: (email: string) => localStore.getArtisanByEmail(email),
  getArtisanById: (id: string) => localStore.getArtisanById(id),
  upsertArtisan: (profile: any) => localStore.upsertArtisan(profile),
  getProducts: (artisanId?: string) => localStore.getProducts(artisanId),
  createProduct: (product: any) => localStore.createProduct(product),
  updateProduct: (id: string, updates: any) => localStore.updateProduct(id, updates),
  deleteProduct: (id: string) => localStore.deleteProduct(id),
  getOrders: (artisanId?: string) => localStore.getOrders(artisanId),
  createOrder: (order: any) => localStore.createOrder(order),
  updateOrderStatus: (id: string, status: any) => localStore.updateOrderStatus(id, status),
  getTenders: () => localStore.getTenders(),
  updateTenderStatus: (id: string, status: any) => localStore.updateTenderStatus(id, status),
  getChatHistory: (artisanId: string) => localStore.getChatHistory(artisanId),
  addChatMessage: (artisanId: string, role: any, content: string, language?: string) =>
    localStore.addChatMessage(artisanId, role, content, language),
};
