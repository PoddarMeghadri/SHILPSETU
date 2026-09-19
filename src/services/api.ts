import { ArtisanProfile, ProductItem } from '../types';

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('shilpsetu_token') : null;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = ['Bearer', token].join(' ');
  }
  return headers;
}

export const api = {
  // Auth - Mandatory Email Verification
  async sendOtp(email: string, mobile?: string): Promise<{ success: boolean; message: string; cooldownSeconds?: number }> {
    const res = await fetch(`${API_BASE}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), mobile }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to send verification code');
    }
    return res.json();
  },

  async verifyOtp(
    email: string,
    otp: string,
    artisanDetails?: any,
    mobile?: string
  ): Promise<{ token: string; artisan: any }> {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        mobile,
        artisanDetails,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Invalid verification code');
    }
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('shilpsetu_token', data.token);
    }
    return data;
  },

  // Artisan Profile
  async getArtisanProfile(): Promise<ArtisanProfile | null> {
    try {
      const res = await fetch(`${API_BASE}/artisan`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data) return null;
      return {
        name: data.fullName || data.name,
        gender: data.gender || 'male',
        title: data.title || 'Master Artisan',
        location: `${data.city || 'Varanasi'}, ${data.state || 'Uttar Pradesh'}`,
        craft: data.craft || 'Traditional Handicrafts',
        avatarUrl: data.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
        completeness: data.completeness || 92,
        trustScore: data.trustScore || 98,
        udyamNumber: data.udyamNumber || 'UDYAM-UP-00-1294821',
        gemVerified: data.gemVerified !== false,
        storyQuote: data.storyQuote || 'Carrying forward 4 generations of sacred handloom craftsmanship.',
        bio: data.bio || '',
        mobile: data.mobile,
        email: data.email,
        recentPhotos: data.recentPhotos || [],
      };
    } catch {
      return null;
    }
  },

  async updateArtisanProfile(profile: Partial<ArtisanProfile>): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/artisan`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          fullName: profile.name,
          craft: profile.craft,
          gender: profile.gender,
          avatarUrl: profile.avatarUrl,
          bio: profile.bio,
          storyQuote: profile.storyQuote,
          udyamNumber: profile.udyamNumber,
          recentPhotos: profile.recentPhotos,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  // Products
  async getProducts(): Promise<ProductItem[]> {
    try {
      const res = await fetch(`${API_BASE}/products`);
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.map((p: any) => ({
        id: p.id,
        title: p.title,
        category: p.craft || p.category || 'Handicraft',
        rawImageUrl: p.imageUrl || p.rawImageUrl || '',
        polishedImageUrl: p.imageUrl || p.polishedImageUrl || '',
        price: p.price,
        description: p.story || p.description || '',
        materials: Array.isArray(p.materials) ? p.materials : ['Natural Clay', 'Earth Pigments'],
        hoursWorked: p.laborHours || 14,
        materialCost: p.rawMaterialsCost || 320,
        stock: p.stock ?? 1,
        status: p.isActive ? 'live' : 'draft',
        dateAdded: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Recent',
        gemSyncStatus: p.giCertified ? 'synced' : 'pending',
      }));
    } catch {
      return [];
    }
  },

  async createProduct(product: Partial<ProductItem>): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: product.title,
          craft: product.category,
          price: product.price,
          stock: product.stock || 1,
          imageUrl: product.polishedImageUrl || product.rawImageUrl,
          story: product.description,
          rawMaterialsCost: product.materialCost,
          laborHours: product.hoursWorked,
        }),
      });
      return await res.json();
    } catch (err) {
      console.warn('API createProduct offline or error:', err);
      return null;
    }
  },

  async updateProductStock(productId: string, newStock: number): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/products/${productId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ stock: newStock }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async updateProduct(productId: string, product: Partial<ProductItem>): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/products/${productId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: product.title,
          craft: product.category,
          price: product.price,
          stock: product.stock,
          story: product.description,
          rawMaterialsCost: product.materialCost,
          laborHours: product.hoursWorked,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async getOrders(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/orders`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Unable to load orders');
    return res.json();
  },

  async updateOrderStatus(orderId: string, status: string): Promise<any> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Unable to update order');
    return res.json();
  },

  // AI Actions
  async enhancePhoto(imageBase64: string, promptPreset?: string, lightingPreset?: string) {
    const res = await fetch(`${API_BASE}/ai/enhance-photo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, promptPreset, lightingPreset }),
    });
    return res.json();
  },

  async voiceCatalog(audioBase64: string, language?: string) {
    const res = await fetch(`${API_BASE}/ai/voice-catalog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64, language }),
    });
    return res.json();
  },

  async generateHeritageStory(artisanName: string, craft: string, generationDetails?: string, language?: string) {
    const res = await fetch(`${API_BASE}/ai/heritage-story`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artisanName, craft, generationDetails, language }),
    });
    return res.json();
  },

  async generateSocialCaption(productTitle: string, craft: string, price: number, platform?: string, language?: string) {
    const res = await fetch(`${API_BASE}/ai/social-caption`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productTitle, craft, price, platform, language }),
    });
    return res.json();
  },

  async chatWithShilpi(message: string, language?: string, context?: any) {
    const res = await fetch(`${API_BASE}/ai/shilpi-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, language, context }),
    });
    return res.json();
  },
};
