import { ArtisanProfile, ProductItem } from '../types';

const API_BASE = '/api';

async function safeJson<T = any>(res: Response): Promise<T | null> {
  try {
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return null;
    }
    return await res.json();
  } catch {
    return null;
  }
}

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
  // Check if an account already exists with this email address
  async checkEmail(email: string): Promise<{ exists: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/auth/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await safeJson<{ exists: boolean }>(res);
      return data || { exists: false };
    } catch {
      return { exists: false };
    }
  },

  // Dual-layer verification: Check if email or mobile number is already registered
  async checkIdentity(email: string, mobile: string): Promise<{ unique: boolean; error?: string; field?: 'email' | 'mobile' }> {
    try {
      const res = await fetch(`${API_BASE}/auth/check-identity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), mobile: mobile.trim() }),
      });
      const data = await safeJson(res);
      if (!data) return { unique: true };
      return data;
    } catch {
      return { unique: true };
    }
  },

  // Direct login with email or phone + password
  async login(identifier: string, password: string): Promise<{ success: boolean; token: string; artisan: any }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: identifier.trim(), password }),
    });
    const data = (await safeJson(res)) || {};
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'The email/mobile number or password is incorrect.');
    }
    if (data.token) {
      localStorage.setItem('shilpsetu_token', data.token);
    }
    return data;
  },

  // Forgot Password: Step 1 - Send 6-digit OTP strictly to registered email
  async forgotPasswordSendOtp(email: string): Promise<{ success: boolean; message: string; cooldownSeconds?: number }> {
    const res = await fetch(`${API_BASE}/auth/forgot-password/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const data = (await safeJson(res)) || {};
    if (!res.ok) {
      throw new Error(data.error || 'Failed to send verification code.');
    }
    return data;
  },

  // Forgot Password: Step 2 - Strictly verify 6-digit OTP
  async forgotPasswordVerifyOtp(
    email: string,
    otp: string,
    options?: {
      clerkVerified?: boolean;
      clerkSessionId?: string;
      supabaseVerified?: boolean;
      supabaseAccessToken?: string;
    }
  ): Promise<{ success: boolean; message: string; resetToken: string }> {
    const res = await fetch(`${API_BASE}/auth/forgot-password/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        ...options,
      }),
    });
    const data = (await safeJson(res)) || {};
    if (!res.ok) {
      throw new Error(data.error || 'Invalid 6-digit verification code.');
    }
    return data;
  },

  // Forgot Password: Step 3 - Set new password and confirm it
  async resetPassword(params: {
    email: string;
    newPassword: string;
    resetToken?: string;
    otp?: string;
  }): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: params.email.trim().toLowerCase(),
        newPassword: params.newPassword,
        resetToken: params.resetToken,
        otp: params.otp,
      }),
    });
    const data = (await safeJson(res)) || {};
    if (!res.ok) {
      throw new Error(data.error || 'Failed to reset password.');
    }
    return data;
  },

  // Auth - Mandatory Email Verification
  async sendOtp(email: string, mobile?: string, purpose: 'signup' | 'login' = 'signup'): Promise<{ success: boolean; message: string; cooldownSeconds?: number }> {
    const res = await fetch(`${API_BASE}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), mobile, purpose }),
    });
    const data = (await safeJson(res)) || {};
    if (!res.ok) {
      const error: any = new Error(data.error || 'Failed to send verification code');
      error.status = res.status;
      error.code = data.code;
      throw error;
    }
    return data;
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
    const data = (await safeJson(res)) || {};
    if (!res.ok) {
      throw new Error(data.error || 'Invalid verification code');
    }
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
      const data = await safeJson(res);
      if (!data) {
        // Safe local storage fallback for static environments like Vercel
        try {
          const stored = localStorage.getItem('shilpsetu_artisan');
          if (stored) return JSON.parse(stored);
        } catch (_) {}
        return null;
      }
      const resolvedCity = data.city || (data.location && data.location.includes(',') ? data.location.split(',')[0].trim() : (data.location || 'Varanasi'));
      const resolvedState = data.state || (data.location && data.location.includes(',') ? data.location.split(',')[1].trim() : 'Uttar Pradesh');
      const resolvedLoc = data.location || `${resolvedCity}, ${resolvedState}`;

      return {
        name: data.fullName || data.name,
        gender: data.gender || 'male',
        title: data.title || 'Master Artisan',
        location: resolvedLoc,
        city: resolvedCity,
        state: resolvedState,
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
      try {
        const stored = localStorage.getItem('shilpsetu_artisan');
        if (stored) return JSON.parse(stored);
      } catch (_) {}
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
          city: profile.city,
          state: profile.state,
          location: profile.location || (profile.city ? `${profile.city}${profile.state ? `, ${profile.state}` : ''}` : undefined),
          avatarUrl: profile.avatarUrl,
          bio: profile.bio,
          storyQuote: profile.storyQuote,
          udyamNumber: profile.udyamNumber,
          recentPhotos: profile.recentPhotos,
          mobile: profile.mobile !== undefined ? profile.mobile : '',
          email: profile.email !== undefined ? profile.email : '',
        }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        // Static serverless or CDN environment without Node server (e.g. Vercel static)
        return true;
      }
      return res.ok;
    } catch {
      return true;
    }
  },

  // Products
  async getProducts(): Promise<ProductItem[]> {
    try {
      const res = await fetch(`${API_BASE}/products`);
      const data = await safeJson(res);
      if (!Array.isArray(data)) {
        try {
          const saved = localStorage.getItem('shilpsetu_products');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          }
        } catch (_) {}
        return [];
      }
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
      try {
        const saved = localStorage.getItem('shilpsetu_products');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (_) {}
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
      const data = await safeJson(res);
      return data || { id: `prod_${Date.now()}`, ...product };
    } catch (err) {
      console.warn('API createProduct offline or error:', err);
      return { id: `prod_${Date.now()}`, ...product };
    }
  },

  async updateProductStock(productId: string, newStock: number): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/products/${productId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ stock: newStock }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return true;
      return res.ok;
    } catch {
      return true;
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
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return true;
      return res.ok;
    } catch {
      return true;
    }
  },

  async getOrders(): Promise<any[]> {
    const fallback = (() => {
      if (typeof localStorage === 'undefined') return [];
      try {
        const saved = localStorage.getItem('shilpsetu_orders');
        if (!saved) return [];
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : Array.isArray(parsed?.orders) ? parsed.orders : [];
      } catch {
        return [];
      }
    })();

    try {
      const res = await fetch(`${API_BASE}/orders`, { headers: getAuthHeaders() });
      const rawBody = res.ok ? await res.text() : '';
      if (!res.ok) {
        if (fallback.length > 0) return fallback;
        throw new Error('Unable to load orders');
      }

      if (!rawBody || rawBody.trim() === '') {
        if (fallback.length > 0) return fallback;
        return [];
      }

      let parsed: any = null;
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        if (fallback.length > 0) return fallback;
        return [];
      }

      const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.orders) ? parsed.orders : Array.isArray(parsed?.data) ? parsed.data : [];
      const normalized = arr.map((order: any) => ({
        ...order,
        id: order.id ?? order.orderId ?? order._id ?? `ord-${Date.now()}-${Math.random()}`.replace(/\./g, ''),
        buyerName: order.buyerName ?? order.customerName ?? order.customer?.name ?? 'Customer',
        productTitle: order.productTitle ?? order.itemTitle ?? order.product?.title ?? 'Handcrafted product',
        totalAmount: Number(order.totalAmount ?? order.amount ?? order.total ?? 0),
        unitPrice: Number(order.unitPrice ?? order.price ?? order.amount ?? 0),
        quantity: Number(order.quantity ?? order.qty ?? 1),
        status: String(order.status ?? order.orderStatus ?? 'pending').toLowerCase(),
        createdAt: order.createdAt ?? order.time ?? order.created_at ?? new Date().toISOString(),
      }));

      if (normalized.length > 0) {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('shilpsetu_orders', JSON.stringify(normalized));
        }
        return normalized;
      }

      return fallback.length > 0 ? fallback : [];
    } catch {
      return fallback.length > 0 ? fallback : [];
    }
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

  async deleteOrder(orderId: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/orders/${orderId}`, { method: 'DELETE', headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Unable to reject order');
    return true;
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
