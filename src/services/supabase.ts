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

export async function sendSupabaseOtp(email: string) {
  const client = getSupabase();
  if (!client) return { sent: false, error: 'Supabase is not configured' };
  const { error } = await client.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true },
  });
  return { sent: !error, error: error?.message };
}

export async function verifySupabaseOtp(email: string, token: string) {
  const client = getSupabase();
  if (!client) return { verified: false, error: 'Supabase is not configured' };
  const { data, error } = await client.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token,
    type: 'email',
  });
  return { verified: Boolean(data.session || data.user), error: error?.message };
}

export async function sendSupabasePasswordReset(email: string) {
  const client = getSupabase();
  if (!client) return { sent: false, error: 'Supabase is not configured' };
  const { error } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase());
  return { sent: !error, error: error?.message };
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
}) {
  const client = getSupabase();
  if (!client) return { saved: false, error: 'Supabase is not configured' };
  const { data: sessionData } = await client.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return { saved: false, error: 'No Supabase session is available for profile persistence.' };
  const { error } = await client.from('profiles').upsert({
    id: userId,
    full_name: profile.fullName,
    email: profile.email,
    mobile_number: profile.mobileNumber,
    preferred_language: profile.preferredLanguage,
    desired_workshop: profile.desiredWorkshop,
    location: profile.location,
    craft_specialty: profile.craftSpecialty,
    avatar_url: profile.avatarUrl,
    bio: profile.bio,
  });
  return { saved: !error, error: error?.message };
}

export async function signInSupabaseWithEmailOrMobile(identifier: string, password: string) {
  const client = getSupabase();
  if (!client) return { signedIn: false, error: 'Supabase is not configured' };
  let email = identifier.trim().toLowerCase();
  if (!email.includes('@')) {
    const { data, error } = await client.from('profiles').select('email').eq('mobile_number', identifier.replace(/\D/g, '')).maybeSingle();
    if (error) return { signedIn: false, error: error.message };
    email = data?.email || '';
  }

  if (!email) return { signedIn: false, error: 'No account is linked to that mobile number.' };
  const { error } = await client.auth.signInWithPassword({ email, password });
  return { signedIn: !error, error: error?.message };
}

export async function updateSupabasePassword(newPassword: string) {
  const validationError = validatePassword(newPassword);
  if (validationError) return { updated: false, error: validationError };
  const client = getSupabase();
  if (!client) return { updated: false, error: 'Supabase is not configured' };
  const { error } = await client.auth.updateUser({ password: newPassword });
  return { updated: !error, error: error?.message };
}
