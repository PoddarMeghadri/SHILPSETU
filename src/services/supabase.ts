import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { validatePassword } from './passwordValidation';

export function normalizeSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (parsed.hostname.endsWith('.supabase.co')) {
      return `${parsed.protocol}//${parsed.host}`;
    }
    const pathname = parsed.pathname.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
    return `${parsed.protocol}//${parsed.host}${pathname}`;
  } catch {
    return trimmed.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  }
}

// 1. Audit & Enforce Supabase Client Initialization
const rawSupabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  '';
const rawSupabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);
const supabaseAnonKey = (rawSupabaseAnonKey || '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.info('[Supabase Info] Supabase credentials are not present in the client environment.');
}

/**
 * Singleton Supabase client configured with cross-origin persistent localStorage session storage.
 * Uses a safe fallback URL and anon key when not configured so external browsers and hosts never crash.
 */
const fallbackSupabaseUrl = 'https://placeholder-project.supabase.co';
const fallbackSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const supabase = createClient(
  supabaseUrl || fallbackSupabaseUrl,
  supabaseAnonKey || fallbackSupabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      ...(typeof window !== 'undefined' ? { storage: window.localStorage } : {}),
    },
  }
);

const AUTH_TIMEOUT_MS = 10_000;
const SUPABASE_CONFIGURATION_ERROR =
  'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the Vercel Preview and Production environments, then redeploy.';

async function withAuthTimeout<T>(operation: PromiseLike<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(operation),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out. Please try again.`)), AUTH_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

/**
 * Lazy / accessor method for Supabase client
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  return supabase;
}

/** Send a numeric email OTP through Supabase Auth. */
export async function sendSupabaseOtp(email: string, shouldCreateUser = true) {
  if (!isSupabaseConfigured()) return { sent: false, error: SUPABASE_CONFIGURATION_ERROR };
  const cleanEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return { sent: false, error: 'A valid email address is required.' };
  try {
    const { error } = await withAuthTimeout(
      supabase.auth.signInWithOtp({ email: cleanEmail, options: { shouldCreateUser } }),
      'Sending your verification code'
    );
    return error ? { sent: false, error: error.message } : { sent: true };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : 'Unable to send verification code.' };
  }
}

export async function verifySupabaseOtp(
  email: string,
  token: string,
  type: 'email' | 'signup' | 'recovery' = 'email'
) {
  if (!isSupabaseConfigured()) return { verified: false, error: SUPABASE_CONFIGURATION_ERROR };
  const cleanEmail = email.trim().toLowerCase();
  const cleanToken = token.trim();
  if (!/^\d{6}$/.test(cleanToken)) return { verified: false, error: 'Enter the 6-digit verification code.' };

  // Primary verification attempt with provided type
  let res = await withAuthTimeout(
    supabase.auth.verifyOtp({ email: cleanEmail, token: cleanToken, type }),
    'Verifying your code'
  );

  // If primary attempt failed, fallback to complementary type in case Supabase project
  // treated signInWithOtp as 'email' or vice-versa
  if (res.error && type !== 'email') {
    const fallbackRes = await withAuthTimeout(
      supabase.auth.verifyOtp({ email: cleanEmail, token: cleanToken, type: 'email' }),
      'Verifying your code'
    );
    if (!fallbackRes.error && (fallbackRes.data?.session || fallbackRes.data?.user)) {
      res = fallbackRes;
    }
  } else if (res.error && type === 'email') {
    const fallbackRes = await withAuthTimeout(
      supabase.auth.verifyOtp({ email: cleanEmail, token: cleanToken, type: 'signup' }),
      'Verifying your code'
    );
    if (!fallbackRes.error && (fallbackRes.data?.session || fallbackRes.data?.user)) {
      res = fallbackRes;
    }
  }

  const isVerified = Boolean(res.data?.session || res.data?.user);
  return {
    verified: isVerified,
    session: res.data?.session,
    user: res.data?.user,
    error: isVerified ? undefined : 'Invalid or expired 6-digit verification code. Please try again.',
  };
}

/**
 * Checks if an email address or mobile number is already registered in the profiles table.
 * Enforces strict account uniqueness (1 mobile number and 1 email per user).
 */
export async function checkAccountUniqueness(
  email?: string,
  mobile?: string
): Promise<{ unique: boolean; error?: string; field?: 'email' | 'mobile' }> {
  const cleanEmail = email?.trim().toLowerCase() || '';
  const cleanMobile = mobile?.trim() || '';
  const cleanDigits = cleanMobile.replace(/\D/g, '');

  if (!cleanEmail && !cleanMobile) {
    return { unique: true };
  }

  // 1. Query Supabase public.profiles table
  if (isSupabaseConfigured() && !isProfilesTableMissing) {
    try {
      const filters: string[] = [];
      if (cleanEmail) filters.push(`email.ilike.${cleanEmail}`);
      if (cleanMobile) filters.push(`mobile_number.eq.${cleanMobile}`);
      if (cleanDigits && cleanDigits !== cleanMobile) {
        filters.push(`mobile_number.eq.${cleanDigits}`);
      }
      if (cleanDigits) {
        filters.push(`mobile_number.ilike.%${cleanDigits}%`);
      }

      const { data: matchingUsers, error: checkError } = await supabase
        .from('profiles')
        .select('id, email, mobile_number')
        .or(filters.join(','));

      if (checkError) {
        if (isTableMissingError(checkError)) {
          isProfilesTableMissing = true;
        } else {
          console.warn('[Uniqueness Check]:', checkError.message);
        }
      }

      if (matchingUsers && matchingUsers.length > 0) {
        for (const existingUser of matchingUsers) {
          if (existingUser.email && cleanEmail && existingUser.email.trim().toLowerCase() === cleanEmail) {
            return {
              unique: false,
              error: 'An account is already registered with this email address. Please sign in instead.',
              field: 'email',
            };
          }
          if (existingUser.mobile_number && cleanDigits) {
            const storedDigits = existingUser.mobile_number.replace(/\D/g, '');
            if (
              existingUser.mobile_number.trim() === cleanMobile ||
              storedDigits === cleanDigits ||
              (storedDigits.length >= 8 && cleanDigits.length >= 8 && (storedDigits.endsWith(cleanDigits) || cleanDigits.endsWith(storedDigits)))
            ) {
              return {
                unique: false,
                error: 'An account is already registered with this mobile number. Please sign in instead.',
                field: 'mobile',
              };
            }
          }
        }
      }
    } catch (err: any) {
      if (isTableMissingError(err)) {
        isProfilesTableMissing = true;
      }
      console.warn('[Uniqueness Check Exception]:', err);
    }
  }

  // 2. Dual-layer cross-browser backend verification
  try {
    const res = await fetch('/api/auth/check-identity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, mobile: cleanMobile }),
    });
    if (res.ok) {
      const backendCheck = await res.json();
      if (backendCheck && !backendCheck.unique) {
        return {
          unique: false,
          error: backendCheck.error,
          field: backendCheck.field,
        };
      }
    }
  } catch (_) {}

  return { unique: true };
}

export async function sendSupabasePasswordReset(email: string) {
  if (!isSupabaseConfigured()) return { sent: false, error: SUPABASE_CONFIGURATION_ERROR };
  const cleanEmail = email.trim().toLowerCase();
  try {
    const { error } = await withAuthTimeout(
      // Recovery uses the same OTP endpoint as sign-in. Do not call
      // resetPasswordForEmail: Supabase implements that API as a link flow.
      supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: { shouldCreateUser: false },
      }),
      'Sending your recovery code'
    );
    return error ? { sent: false, error: error.message } : { sent: true };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : 'Unable to send recovery code.' };
  }
}

export async function sendSupabaseRecoveryOtp(email: string) {
  return sendSupabasePasswordReset(email);
}

let isProfilesTableMissing = false;

function isTableMissingError(err: any): boolean {
  if (!err) return false;
  const msg = typeof err === 'string' ? err : err.message || '';
  const code = err.code || '';
  return (
    code === 'PGRST205' ||
    msg.includes('Could not find the table') ||
    msg.includes('schema cache') ||
    msg.includes('relation "public.profiles" does not exist') ||
    msg.includes('relation "profiles" does not exist')
  );
}

export async function upsertSupabaseProfile(profile: {
  userId?: string;
  fullName: string;
  email?: string;
  mobileNumber?: string;
  preferredLanguage?: string;
  desiredWorkshop?: string;
  location?: string;
  craftSpecialty?: string;
  avatarUrl?: string;
  bio?: string;
}): Promise<{ saved: boolean; localOnly?: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { saved: true, localOnly: true };
  }

  // If we already know the profiles table does not exist in Supabase yet,
  // skip the network call to prevent console errors.
  if (isProfilesTableMissing) {
    return { saved: true, localOnly: true };
  }

  try {
    let userId = profile.userId;
    if (!userId) {
      const { data: sessionData } = await supabase.auth.getSession();
      userId = sessionData?.session?.user?.id;
    }

    const cleanEmail = profile.email?.trim().toLowerCase();
    const cleanMobile = profile.mobileNumber?.replace(/\D/g, '');

    // If no direct Supabase session, lookup existing profile by email or mobile to reuse its ID
    if (!userId && !isProfilesTableMissing) {
      try {
        if (cleanEmail) {
          const { data: existingByEmail, error: emailErr } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', cleanEmail)
            .maybeSingle();
          if (emailErr) {
            if (isTableMissingError(emailErr)) {
              isProfilesTableMissing = true;
              console.warn('[Supabase Sync] public.profiles table is not created in Supabase yet. Artisan profile safely persisted to local and backend storage.');
              return { saved: true, localOnly: true };
            }
          } else if (existingByEmail?.id) {
            userId = existingByEmail.id;
          }
        }
        if (!userId && cleanMobile && !isProfilesTableMissing) {
          const { data: existingByMobile, error: mobileErr } = await supabase
            .from('profiles')
            .select('id')
            .eq('mobile_number', cleanMobile)
            .maybeSingle();
          if (mobileErr) {
            if (isTableMissingError(mobileErr)) {
              isProfilesTableMissing = true;
              console.warn('[Supabase Sync] public.profiles table is not created in Supabase yet. Artisan profile safely persisted to local and backend storage.');
              return { saved: true, localOnly: true };
            }
          } else if (existingByMobile?.id) {
            userId = existingByMobile.id;
          }
        }
      } catch (lookupErr: any) {
        if (isTableMissingError(lookupErr)) {
          isProfilesTableMissing = true;
          return { saved: true, localOnly: true };
        }
      }
    }

    // If still no ID, generate a unique ID
    if (!userId) {
      userId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `artisan_${Date.now()}`;
    }

    const payload = {
      id: userId,
      full_name: profile.fullName?.trim() || 'Master Artisan',
      email: cleanEmail || null,
      mobile_number: cleanMobile || null,
      preferred_language: profile.preferredLanguage || 'hi',
      desired_workshop: profile.desiredWorkshop || 'pottery',
      location: profile.location || 'Varanasi, Uttar Pradesh',
      craft_specialty: profile.craftSpecialty || 'Terracotta Pottery',
      avatar_url: profile.avatarUrl || null,
      bio: profile.bio || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });

    if (error) {
      if (isTableMissingError(error)) {
        isProfilesTableMissing = true;
        console.warn('[Supabase Sync] public.profiles table is not created in Supabase yet. Artisan profile safely persisted to local and backend storage.');
        return { saved: true, localOnly: true };
      }
      console.warn('[Supabase] upsert notice:', error.message);
      // Fallback: try updating by email if ID conflict failed
      if (cleanEmail) {
        const { error: updateErr } = await supabase.from('profiles').update(payload).eq('email', cleanEmail);
        if (!updateErr) return { saved: true };
      }
      return { saved: false, error: error.message };
    }

    return { saved: true };
  } catch (err: any) {
    if (isTableMissingError(err)) {
      isProfilesTableMissing = true;
      return { saved: true, localOnly: true };
    }
    console.warn('[Supabase] Exception in upsertSupabaseProfile:', err?.message || err);
    return { saved: false, error: err?.message || 'Database error' };
  }
}

export async function signInSupabaseWithEmailOrMobile(identifier: string, password: string) {
  if (!isSupabaseConfigured()) return { signedIn: false, error: SUPABASE_CONFIGURATION_ERROR };
  let email = identifier.trim().toLowerCase();
  if (!email.includes('@')) {
    if (isProfilesTableMissing) {
      return { signedIn: false, error: 'Mobile lookup requires the remote profiles table. Please use your email address to sign in.' };
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('mobile_number', identifier.replace(/\D/g, ''))
      .maybeSingle();
    if (error) {
      if (isTableMissingError(error)) {
        isProfilesTableMissing = true;
        return { signedIn: false, error: 'Mobile lookup requires the remote profiles table. Please use your email address to sign in.' };
      }
      return { signedIn: false, error: error.message };
    }
    email = data?.email || '';
  }

  if (!email) return { signedIn: false, error: 'No registered account found with this mobile number.' };

  const { data, error } = await withAuthTimeout(
    supabase.auth.signInWithPassword({ email, password }),
    'Signing you in'
  );

  if (error) {
    const msg = error.message;
    if (msg.toLowerCase().includes('email not confirmed')) {
      return {
        signedIn: false,
        error: 'Your email address is not yet confirmed. Please verify the code sent to your email or reset your password.',
        isEmailNotConfirmed: true,
      };
    }
    return { signedIn: false, error: msg };
  }

  // Fetch full profile from remote profiles table
  let profileData: any = null;
  try {
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();
    profileData = prof;
  } catch (_) {}

  return {
    signedIn: true,
    user: data.user,
    session: data.session,
    profile: profileData,
  };
}

export async function updateSupabasePassword(newPassword: string) {
  const validationError = validatePassword(newPassword);
  if (validationError) return { updated: false, error: validationError };
  if (!isSupabaseConfigured()) return { updated: false, error: SUPABASE_CONFIGURATION_ERROR };
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { updated: !error, error: error?.message };
}

/**
 * Upload an artisan profile photo (DP) to Supabase Storage 'avatars' bucket.
 * Falls back to server-side admin upload if client storage permission is restricted.
 */
export async function uploadAvatarToSupabase(
  fileOrBase64: File | Blob | string,
  customUserId?: string
): Promise<{ publicUrl?: string; error?: string }> {
  try {
    let userId = customUserId;
    if (!userId && isSupabaseConfigured()) {
      const { data: sessionData } = await supabase.auth.getSession();
      userId = sessionData?.session?.user?.id;
    }
    if (!userId) {
      try {
        const stored = localStorage.getItem('shilpsetu_artisan');
        if (stored) {
          const parsed = JSON.parse(stored);
          userId = parsed.id || parsed.email || 'artisan';
        }
      } catch (_) {}
    }
    const safeUserId = userId || 'artisan';

    // If string is base64 or URL
    if (typeof fileOrBase64 === 'string') {
      const resp = await fetch('/api/storage/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: fileOrBase64, userId: safeUserId }),
      });
      const data = await resp.json();
      if (resp.ok && data.publicUrl) {
        return { publicUrl: data.publicUrl };
      }
      return { error: data.error || 'Avatar upload failed' };
    }

    // Direct client upload attempt
    if (isSupabaseConfigured() && typeof fileOrBase64 !== 'string') {
      const fileExt = (fileOrBase64 as File).name?.split('.').pop() || 'jpg';
      const filePath = `${safeUserId}/avatar_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, fileOrBase64, {
          cacheControl: '3600',
          upsert: true,
        });

      if (!uploadError) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        if (data?.publicUrl) {
          // Update profile column if userId is UUID
          if (safeUserId.includes('-')) {
            try {
              await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', safeUserId);
            } catch (_) {}
          }
          return { publicUrl: data.publicUrl };
        }
      }
    }

    // Fallback: use server upload endpoint with multipart FormData
    const formData = new FormData();
    formData.append('image', fileOrBase64);
    formData.append('userId', safeUserId);

    const resp = await fetch('/api/storage/avatar', {
      method: 'POST',
      body: formData,
    });
    const data = await resp.json();
    if (resp.ok && data.publicUrl) {
      return { publicUrl: data.publicUrl };
    }
    return { error: data.error || 'Failed to upload avatar' };
  } catch (err: any) {
    console.error('[Avatar Upload Error]:', err);
    return { error: err.message || 'Avatar upload failed' };
  }
}

/**
 * Upload a craft photo to Supabase Storage 'crafts' bucket.
 */
export async function uploadCraftToSupabase(
  fileOrBase64: File | Blob | string,
  customUserId?: string
): Promise<{ publicUrl?: string; error?: string }> {
  try {
    let userId = customUserId;
    if (!userId && isSupabaseConfigured()) {
      const { data: sessionData } = await supabase.auth.getSession();
      userId = sessionData?.session?.user?.id;
    }
    const safeUserId = userId || 'artisan';

    if (typeof fileOrBase64 === 'string') {
      const resp = await fetch('/api/storage/craft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: fileOrBase64, userId: safeUserId }),
      });
      const data = await resp.json();
      if (resp.ok && data.publicUrl) {
        return { publicUrl: data.publicUrl };
      }
      return { error: data.error || 'Craft image upload failed' };
    }

    if (isSupabaseConfigured() && typeof fileOrBase64 !== 'string') {
      const fileExt = (fileOrBase64 as File).name?.split('.').pop() || 'jpg';
      const filePath = `${safeUserId}/craft_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('crafts')
        .upload(filePath, fileOrBase64, {
          cacheControl: '3600',
          upsert: true,
        });

      if (!uploadError) {
        const { data } = supabase.storage.from('crafts').getPublicUrl(filePath);
        if (data?.publicUrl) {
          return { publicUrl: data.publicUrl };
        }
      }
    }

    const formData = new FormData();
    formData.append('image', fileOrBase64);
    formData.append('userId', safeUserId);

    const resp = await fetch('/api/storage/craft', {
      method: 'POST',
      body: formData,
    });
    const data = await resp.json();
    if (resp.ok && data.publicUrl) {
      return { publicUrl: data.publicUrl };
    }
    return { error: data.error || 'Failed to upload craft image' };
  } catch (err: any) {
    console.error('[Craft Image Upload Error]:', err);
    return { error: err.message || 'Craft upload failed' };
  }
}

/**
 * Save an artisan craft into public.crafts table.
 */
export async function saveCraftToSupabase(craft: {
  id?: string;
  userId?: string;
  title: string;
  description?: string;
  story?: string;
  price: number;
  materials?: string[] | string;
  imageUrl: string;
}): Promise<{ saved: boolean; craft?: any; error?: string }> {
  try {
    let userId = craft.userId;
    if (!userId && isSupabaseConfigured()) {
      const { data: sessionData } = await supabase.auth.getSession();
      userId = sessionData?.session?.user?.id;
    }
    const safeUserId = userId || 'artisan_demo';

    // Direct Supabase insert attempt
    if (isSupabaseConfigured() && safeUserId.includes('-')) {
      const payload = {
        user_id: safeUserId,
        title: craft.title,
        description: craft.description || '',
        story: craft.story || '',
        price: Number(craft.price) || 0,
        materials: Array.isArray(craft.materials) ? craft.materials.join(', ') : (craft.materials || ''),
        image_url: craft.imageUrl,
      };

      const { data, error } = await supabase
        .from('crafts')
        .insert(payload)
        .select()
        .single();

      if (!error && data) {
        return { saved: true, craft: data };
      }
    }

    // Always mirror to backend API route as well
    const resp = await fetch('/api/crafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...craft,
        userId: safeUserId,
      }),
    });
    const result = await resp.json();
    return { saved: resp.ok, craft: result.craft };
  } catch (err: any) {
    console.warn('[Save Craft Warning]:', err);
    return { saved: false, error: err.message };
  }
}

/**
 * Fetch crafts for the current user from public.crafts.
 */
export async function fetchUserCraftsFromSupabase(customUserId?: string): Promise<any[]> {
  try {
    let userId = customUserId;
    if (!userId && isSupabaseConfigured()) {
      const { data: sessionData } = await supabase.auth.getSession();
      userId = sessionData?.session?.user?.id;
    }

    if (isSupabaseConfigured() && userId && userId.includes('-')) {
      const { data, error } = await supabase
        .from('crafts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data;
      }
    }

    // Fallback to server endpoint
    const url = userId ? `/api/crafts?userId=${encodeURIComponent(userId)}` : '/api/crafts';
    const resp = await fetch(url);
    if (resp.ok) {
      const data = await resp.json();
      return data.crafts || [];
    }
    return [];
  } catch (err) {
    console.warn('[Fetch Crafts Warning]:', err);
    return [];
  }
}
