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

/**
 * Real Supabase Auth signUp with password and user metadata
 */
export async function signUpWithSupabase({
  email,
  password,
  fullName,
  mobile,
  craft,
  state,
  city,
  language,
}: {
  email: string;
  password?: string;
  fullName: string;
  mobile?: string;
  craft?: string;
  state?: string;
  city?: string;
  language?: string;
}): Promise<{
  success: boolean;
  user?: any;
  session?: any;
  error?: string;
  isAlreadyRegistered?: boolean;
}> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: SUPABASE_CONFIGURATION_ERROR };
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanMobile = mobile?.replace(/\D/g, '') || '';

  try {
    const { data, error } = await withAuthTimeout(supabase.auth.signUp({
      email: cleanEmail,
      password: password || '',
      options: {
        data: {
          full_name: fullName.trim(),
          mobile_number: cleanMobile,
          craft_specialty: craft || 'Terracotta Pottery',
          state: state || 'Uttar Pradesh',
          city: city || 'Varanasi',
          preferred_language: language || 'hi',
        },
      },
    }), 'Creating your account');

    if (error) {
      const errMsg = error.message.toLowerCase();
      const isAlready =
        errMsg.includes('already registered') ||
        errMsg.includes('already exists') ||
        errMsg.includes('user already exists');

      return {
        success: false,
        error: error.message,
        isAlreadyRegistered: isAlready,
      };
    }

    // Auto-upsert profile if user id is returned immediately
    if (data.user?.id) {
      const profileResult = await upsertSupabaseProfile({
        userId: data.user.id,
        fullName: fullName.trim(),
        email: cleanEmail,
        mobileNumber: cleanMobile,
        preferredLanguage: language || 'hi',
        desiredWorkshop: craft || 'pottery',
        location: `${city || 'Varanasi'}, ${state || 'Uttar Pradesh'}`,
        craftSpecialty: craft || 'Terracotta Pottery',
      });
      if (!profileResult.saved) {
        return { success: false, error: profileResult.error || 'Unable to save your profile.' };
      }
    }

    return {
      success: true,
      user: data.user,
      session: data.session,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Supabase signup failed',
    };
  }
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

export async function verifySupabaseOtp(email: string, token: string, type: 'email' | 'signup' | 'recovery' = 'email') {
  if (!isSupabaseConfigured()) return { verified: false, error: SUPABASE_CONFIGURATION_ERROR };
  const cleanEmail = email.trim().toLowerCase();
  const cleanToken = token.trim();
  if (!/^\d{6}$/.test(cleanToken)) return { verified: false, error: 'Enter the 6-digit verification code.' };

  // Try 'signup' OTP type first (used when user registers / signs up)
  let { data, error } = await withAuthTimeout(
    supabase.auth.verifyOtp({ email: cleanEmail, token: cleanToken, type }),
    'Verifying your code'
  );

  // Fallback to standard 'email' OTP type (used for signInWithOtp)
  if (error || (!data?.session && !data?.user)) {
    const emailAttempt = await withAuthTimeout(
      supabase.auth.verifyOtp({ email: cleanEmail, token: cleanToken, type: 'email' }),
      'Verifying your code'
    );
    if (!emailAttempt.error && (emailAttempt.data?.session || emailAttempt.data?.user)) {
      data = emailAttempt.data;
      error = null;
    }
  }

  return {
    verified: Boolean(data?.session || data?.user),
    session: data?.session,
    user: data?.user,
    error: error?.message,
  };
}

export async function sendSupabasePasswordReset(email: string) {
  if (!isSupabaseConfigured()) return { sent: false, error: SUPABASE_CONFIGURATION_ERROR };
  try {
    const { error } = await withAuthTimeout(
      supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
      }),
      'Sending your recovery code'
    );
    return error ? { sent: false, error: error.message } : { sent: true };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : 'Unable to send recovery code.' };
  }
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

  if (!email) return { signedIn: false, error: 'No account is linked to that mobile number.' };

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
