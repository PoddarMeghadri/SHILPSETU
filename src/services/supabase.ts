import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { validatePassword } from './passwordValidation';
import { logSupabaseDiagnostics, getSupabaseDiagnostics } from '../utils/supabaseDiagnostics';

export { logSupabaseDiagnostics, getSupabaseDiagnostics };

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
const fallbackSupabaseUrl = 'https://gxytjeznfhcbdnwzmeaa.supabase.co';
const fallbackSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4eXRqZXpuZmhjYmRud3ptZWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NTI2MjIsImV4cCI6MjEwNTIyODYyMn0.c-bgiXJFfvBq4Q38ZNPgiO6-zn6uKZBZ70OrxsG7Wwc';

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
  'Supabase authentication failed. Please verify your internet connection and try again.';

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
  return Boolean((supabaseUrl || fallbackSupabaseUrl) && (supabaseAnonKey || fallbackSupabaseAnonKey));
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
      if (cleanEmail) filters.push(`email.eq.${cleanEmail}`);
      if (cleanMobile) filters.push(`mobile_number.eq.${cleanMobile}`);
      if (cleanDigits && cleanDigits !== cleanMobile) {
        filters.push(`mobile_number.eq.${cleanDigits}`);
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
              error: 'An account is already registered with this email address. Please sign in.',
              field: 'email',
            };
          }
          if (existingUser.mobile_number && (cleanMobile || cleanDigits)) {
            const storedDigits = existingUser.mobile_number.replace(/\D/g, '');
            if (
              existingUser.mobile_number.trim() === cleanMobile ||
              storedDigits === cleanDigits ||
              (storedDigits.length >= 8 && cleanDigits.length >= 8 && (storedDigits.endsWith(cleanDigits) || cleanDigits.endsWith(storedDigits)))
            ) {
              return {
                unique: false,
                error: 'An account is already registered with this mobile number. Please sign in.',
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
          error: backendCheck.error || (backendCheck.field === 'mobile' ? 'An account is already registered with this mobile number. Please sign in.' : 'An account is already registered with this email address. Please sign in.'),
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

function fileOrBlobToDataUrl(fileOrBlob: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(fileOrBlob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const binary = atob(parts[1]);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type: mime });
  } catch {
    return null;
  }
}

async function compressImageClient(dataUrl: string, maxDim = 400, quality = 0.82): Promise<string> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return dataUrl;
  if (!dataUrl.startsWith('data:image')) return dataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function upsertSupabaseProfile(profile: {
  userId?: string;
  fullName: string;
  email?: string;
  mobileNumber?: string;
  preferredLanguage?: string;
  desiredWorkshop?: string;
  city?: string;
  state?: string;
  location?: string;
  craftSpecialty?: string;
  avatarUrl?: string;
  bio?: string;
}): Promise<{ saved: boolean; localOnly?: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { saved: true, localOnly: true };
  }

  const cleanEmail = profile.email?.trim().toLowerCase();
  const cleanMobile = profile.mobileNumber?.replace(/\D/g, '');
  const effectiveCity = (
    profile.city?.trim() ||
    (profile.location?.includes(',') ? profile.location.split(',')[0].trim() : (profile.location?.trim() || ''))
  ).trim();
  const effectiveState = (
    profile.state?.trim() ||
    (profile.location?.includes(',') ? profile.location.split(',')[1].trim() : 'Uttar Pradesh')
  ).trim();
  const effectiveLocation = (
    profile.location?.trim() ||
    (effectiveCity ? `${effectiveCity}${effectiveState ? `, ${effectiveState}` : ''}` : 'Varanasi, Uttar Pradesh')
  ).trim();

  // 1. ALWAYS mirror immediately to active Supabase Auth user metadata
  // This succeeds independently of whether the public.profiles database table exists in Supabase.
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user) {
      await supabase.auth.updateUser({
        data: {
          full_name: profile.fullName?.trim() || 'Master Artisan',
          name: profile.fullName?.trim() || 'Master Artisan',
          mobile_number: cleanMobile,
          city: effectiveCity,
          state: effectiveState,
          location: effectiveLocation,
          avatar_url: profile.avatarUrl || null,
          preferred_language: profile.preferredLanguage || 'hi',
          desired_workshop: profile.desiredWorkshop || 'pottery',
          craft_specialty: profile.craftSpecialty || 'Terracotta Pottery',
          bio: profile.bio || null,
        },
      });
    }
  } catch (_) {}

  // 2. ALWAYS sync to localStorage stores immediately
  try {
    const stored = localStorage.getItem('shilpsetu_artisan');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (effectiveCity) parsed.city = effectiveCity;
      if (effectiveState) parsed.state = effectiveState;
      if (effectiveLocation) parsed.location = effectiveLocation;
      if (profile.avatarUrl) parsed.avatarUrl = profile.avatarUrl;
      if (profile.fullName) parsed.name = profile.fullName;
      if (cleanMobile) parsed.mobile = cleanMobile;
      if (cleanEmail) parsed.email = cleanEmail;
      localStorage.setItem('shilpsetu_artisan', JSON.stringify(parsed));
    }
    const storedUserProf = localStorage.getItem('shilpsetu_user_profile');
    if (storedUserProf) {
      const parsedUser = JSON.parse(storedUserProf);
      if (effectiveCity) parsedUser.city = effectiveCity;
      if (effectiveState) parsedUser.state = effectiveState;
      if (effectiveLocation) parsedUser.location = effectiveLocation;
      if (profile.avatarUrl) parsedUser.avatar_url = profile.avatarUrl;
      if (profile.fullName) parsedUser.full_name = profile.fullName;
      if (cleanMobile) parsedUser.mobile_number = cleanMobile;
      if (cleanEmail) parsedUser.email = cleanEmail;
      localStorage.setItem('shilpsetu_user_profile', JSON.stringify(parsedUser));
    }
  } catch (_) {}

  // If we already know the profiles table does not exist in Supabase yet,
  // skip the table network call since auth metadata and localStorage are already saved.
  if (isProfilesTableMissing) {
    return { saved: true, localOnly: true };
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const sessionUserId = sessionData?.session?.user?.id;
    let userId = sessionUserId || profile.userId;

    // Guard against non-UUID IDs (e.g. 'artisan_demo') when calling Postgres
    const isValidUuid = typeof userId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    if (!isValidUuid) {
      userId = sessionUserId || undefined;
    }

    // If no active authenticated Supabase session, do not attempt to write to profiles table
    // because RLS policy (id = auth.uid()) will block it. Local & Auth metadata are already saved.
    if (!userId) {
      return { saved: true, localOnly: true };
    }

    // Standardize: populate city, location, and state in the upsert object
    const payload: any = {
      id: userId,
      full_name: profile.fullName?.trim() || 'Master Artisan',
      email: cleanEmail || null,
      mobile_number: cleanMobile || null,
      city: effectiveCity || null,
      location: effectiveLocation || null,
      preferred_language: profile.preferredLanguage || 'hi',
      desired_workshop: profile.desiredWorkshop || 'pottery',
      craft_specialty: profile.craftSpecialty || 'Terracotta Pottery',
      avatar_url: profile.avatarUrl || null,
      bio: profile.bio || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });

    if (error) {
      if (isTableMissingError(error)) {
        isProfilesTableMissing = true;
        console.warn('[Supabase Sync] public.profiles table is not created in Supabase yet. Artisan profile safely persisted to auth metadata and local storage.');
        return { saved: true, localOnly: true };
      }
      // If a column is missing in older remote schema, retry without that column
      const colMatch = error.message?.match(/column "([^"]+)" of relation "profiles" does not exist/i) ||
                       error.message?.match(/Could not find the '([^']+)' column/i);
      if (colMatch && colMatch[1]) {
        const missingCol = colMatch[1];
        const fallbackPayload = { ...payload };
        delete fallbackPayload[missingCol];
        const { error: retryErr } = await supabase.from('profiles').upsert(fallbackPayload, { onConflict: 'id' });
        if (!retryErr) return { saved: true };
      }
      if (error.message?.includes('city') || error.message?.includes('location')) {
        const fallbackPayload = { ...payload };
        delete fallbackPayload.city;
        delete fallbackPayload.desired_workshop;
        const { error: retryErr } = await supabase.from('profiles').upsert(fallbackPayload, { onConflict: 'id' });
        if (!retryErr) return { saved: true };
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

  // Fetch full profile from remote profiles table including city, location, and avatar_url
  let profileData: any = null;
  try {
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();
    profileData = prof;
  } catch (_) {}

  // Fallback to user metadata if profiles table is empty or missing columns
  const meta = data.user.user_metadata || {};
  if (!profileData) {
    profileData = {
      id: data.user.id,
      full_name: meta.full_name || meta.name || 'Master Artisan',
      email: data.user.email,
      mobile_number: meta.mobile_number,
      city: meta.city || 'Varanasi',
      location: meta.location || (meta.city ? `${meta.city}, Uttar Pradesh` : 'Varanasi, Uttar Pradesh'),
      avatar_url: meta.avatar_url,
      preferred_language: meta.preferred_language || 'hi',
      desired_workshop: meta.desired_workshop || 'pottery',
    };
  } else {
    if (!profileData.city && meta.city) profileData.city = meta.city;
    if (!profileData.location && (meta.location || meta.city)) {
      profileData.location = meta.location || meta.city;
    }
    if (!profileData.avatar_url && meta.avatar_url) {
      profileData.avatar_url = meta.avatar_url;
    }
  }

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
 * Enforces immediate persistent update of public.profiles.avatar_url, auth user_metadata, and localStorage.
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

    // 1. Prepare compressed client-side image representation
    let rawDataUrl = '';
    if (typeof fileOrBase64 === 'string') {
      rawDataUrl = fileOrBase64;
    } else {
      rawDataUrl = await fileOrBlobToDataUrl(fileOrBase64);
    }
    const compressedDataUrl = await compressImageClient(rawDataUrl, 400, 0.82);
    const uploadBlob = dataUrlToBlob(compressedDataUrl) || (typeof fileOrBase64 !== 'string' ? fileOrBase64 : null);

    let resolvedUrl = '';

    // 2. Direct client upload attempt to Supabase Storage 'avatars'
    if (isSupabaseConfigured() && uploadBlob) {
      try {
        const fileName = `${safeUserId}-${Date.now()}.jpg`;
        const filePath = `${safeUserId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, uploadBlob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: true,
          });

        if (!uploadError) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
          if (data?.publicUrl) {
            resolvedUrl = data.publicUrl;
          }
        } else {
          console.warn('[Supabase Storage avatar notice]:', uploadError.message);
        }
      } catch (storageErr) {
        console.warn('[Supabase Storage avatar exception]:', storageErr);
      }
    }

    // 3. Fallback: check if server endpoint exists (e.g. in Express dev/production server)
    if (!resolvedUrl) {
      try {
        const resp = await fetch('/api/storage/avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: compressedDataUrl, userId: safeUserId }),
        });
        const contentType = resp.headers.get('content-type') || '';
        if (resp.ok && contentType.includes('application/json')) {
          const data = await resp.json();
          if (data?.publicUrl) {
            resolvedUrl = data.publicUrl;
          }
        }
      } catch (_) {}
    }

    // 4. Ultimate cross-environment fallback for static hosts (like Vercel SPA):
    // Use the optimized compressed client data URL. It renders instantaneously,
    // avoids server dependencies, and persists across reloads via localStorage and Auth.
    if (!resolvedUrl) {
      resolvedUrl = compressedDataUrl;
    }

    // 5. Cross-layer persistence: Auth metadata, profiles table, and localStorage
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.updateUser({ data: { avatar_url: resolvedUrl } });
      }
    } catch (_) {}

    try {
      if (isSupabaseConfigured() && !isProfilesTableMissing) {
        if (safeUserId.includes('@')) {
          await supabase.from('profiles').update({ avatar_url: resolvedUrl, updated_at: new Date().toISOString() }).eq('email', safeUserId);
        } else if (safeUserId.includes('-')) {
          await supabase.from('profiles').update({ avatar_url: resolvedUrl, updated_at: new Date().toISOString() }).eq('id', safeUserId);
        }
      }
    } catch (_) {}

    try {
      const stored = localStorage.getItem('shilpsetu_artisan');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.avatarUrl = resolvedUrl;
        localStorage.setItem('shilpsetu_artisan', JSON.stringify(parsed));
      }
      const storedUserProf = localStorage.getItem('shilpsetu_user_profile');
      if (storedUserProf) {
        const parsedUser = JSON.parse(storedUserProf);
        parsedUser.avatar_url = resolvedUrl;
        parsedUser.avatarUrl = resolvedUrl;
        localStorage.setItem('shilpsetu_user_profile', JSON.stringify(parsedUser));
      }
    } catch (_) {}

    return { publicUrl: resolvedUrl };
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

    let rawDataUrl = '';
    if (typeof fileOrBase64 === 'string') {
      rawDataUrl = fileOrBase64;
    } else {
      rawDataUrl = await fileOrBlobToDataUrl(fileOrBase64);
    }
    const compressedDataUrl = await compressImageClient(rawDataUrl, 800, 0.8);
    const uploadBlob = dataUrlToBlob(compressedDataUrl) || (typeof fileOrBase64 !== 'string' ? fileOrBase64 : null);

    let resolvedUrl = '';

    if (isSupabaseConfigured() && uploadBlob) {
      try {
        const fileName = `${safeUserId}/craft_${Date.now()}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('crafts')
          .upload(fileName, uploadBlob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: true,
          });

        if (!uploadError) {
          const { data } = supabase.storage.from('crafts').getPublicUrl(fileName);
          if (data?.publicUrl) {
            resolvedUrl = data.publicUrl;
          }
        }
      } catch (_) {}
    }

    if (!resolvedUrl) {
      try {
        const resp = await fetch('/api/storage/craft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: compressedDataUrl, userId: safeUserId }),
        });
        const contentType = resp.headers.get('content-type') || '';
        if (resp.ok && contentType.includes('application/json')) {
          const data = await resp.json();
          if (data?.publicUrl) {
            resolvedUrl = data.publicUrl;
          }
        }
      } catch (_) {}
    }

    if (!resolvedUrl) {
      resolvedUrl = compressedDataUrl;
    }

    return { publicUrl: resolvedUrl };
  } catch (err: any) {
    console.error('[Craft Upload Error]:', err);
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
