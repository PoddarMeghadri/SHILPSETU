import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

