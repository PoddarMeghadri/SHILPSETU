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

const env = (import.meta as any).env || {};
const supabaseUrl = normalizeSupabaseUrl(env.VITE_SUPABASE_URL || env.SUPABASE_URL || '');
const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '') as string;

let supabaseClient: SupabaseClient | null = null;

/**
 * Lazy initialization of Supabase client in the browser.
 * Only instantiated if environment variables are supplied.
 */
export function getSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
}

export async function sendSupabaseOtp(email: string, shouldCreateUser = true) {
  const client = getSupabase();
  if (!client) return { sent: false, error: 'Supabase is not configured' };
  const { error } = await client.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      shouldCreateUser,
    },
  });
  return { sent: !error, error: error?.message };
}

export async function verifySupabaseOtp(email: string, token: string) {
  const client = getSupabase();
  if (!client) return { verified: false, error: 'Supabase is not configured' };
  const cleanEmail = email.trim().toLowerCase();
  const cleanToken = token.trim();

  // Try 'signup' OTP type first (used when user registers / signs up)
  let { data, error } = await client.auth.verifyOtp({
    email: cleanEmail,
    token: cleanToken,
    type: 'signup',
  });

  // Fallback to standard 'email' OTP type (used for signInWithOtp)
  if (error || (!data?.session && !data?.user)) {
    const emailAttempt = await client.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'email',
    });
    if (!emailAttempt.error && (emailAttempt.data?.session || emailAttempt.data?.user)) {
      data = emailAttempt.data;
      error = null;
    }
  }

  // Fallback to 'magiclink' OTP type
  if (error || (!data?.session && !data?.user)) {
    const magiclinkAttempt = await client.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'magiclink',
    });
    if (!magiclinkAttempt.error && (magiclinkAttempt.data?.session || magiclinkAttempt.data?.user)) {
      data = magiclinkAttempt.data;
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
  const client = getSupabase();
  if (!client) return { sent: false, error: 'Supabase is not configured' };
  const { error } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase());
  return { sent: !error, error: error?.message };
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
  fullName: string;
  email?: string;
  mobileNumber?: string;
  preferredLanguage: string;
  desiredWorkshop: string;
  location: string;
  craftSpecialty: string;
  avatarUrl?: string;
  bio?: string;
}): Promise<{ saved: boolean; localOnly?: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) {
    return { saved: true, localOnly: true };
  }

  // If we already know the profiles table does not exist in Supabase yet,
  // skip the network call to prevent console errors.
  if (isProfilesTableMissing) {
    return { saved: true, localOnly: true };
  }

  try {
    const { data: sessionData } = await client.auth.getSession();
    let userId = sessionData?.session?.user?.id;

    const cleanEmail = profile.email?.trim().toLowerCase();
    const cleanMobile = profile.mobileNumber?.replace(/\D/g, '');

    // If no direct Supabase session, lookup existing profile by email or mobile to reuse its ID
    if (!userId && !isProfilesTableMissing) {
      try {
        if (cleanEmail) {
          const { data: existingByEmail, error: emailErr } = await client
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
          const { data: existingByMobile, error: mobileErr } = await client
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

    const { error } = await client.from('profiles').upsert(payload, { onConflict: 'id' });

    if (error) {
      if (isTableMissingError(error)) {
        isProfilesTableMissing = true;
        console.warn('[Supabase Sync] public.profiles table is not created in Supabase yet. Artisan profile safely persisted to local and backend storage.');
        return { saved: true, localOnly: true };
      }
      console.warn('[Supabase] upsert notice:', error.message);
      // Fallback: try updating by email if ID conflict failed
      if (cleanEmail) {
        const { error: updateErr } = await client.from('profiles').update(payload).eq('email', cleanEmail);
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
  const client = getSupabase();
  if (!client) return { signedIn: false, error: 'Supabase is not configured' };
  let email = identifier.trim().toLowerCase();
  if (!email.includes('@')) {
    if (isProfilesTableMissing) {
      return { signedIn: false, error: 'Mobile lookup requires the remote profiles table. Please use your email address to sign in.' };
    }
    const { data, error } = await client.from('profiles').select('email').eq('mobile_number', identifier.replace(/\D/g, '')).maybeSingle();
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
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  return { signedIn: !error, error: error?.message, user: data?.user };
}

export async function updateSupabasePassword(newPassword: string) {
  const validationError = validatePassword(newPassword);
  if (validationError) return { updated: false, error: validationError };
  const client = getSupabase();
  if (!client) return { updated: false, error: 'Supabase is not configured' };
  const { error } = await client.auth.updateUser({ password: newPassword });
  return { updated: !error, error: error?.message };
}
