import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Normalizes Supabase URL to root project origin.
 * Users or configurations often provide REST API endpoints (e.g. https://<id>.supabase.co/rest/v1/)
 * or trailing slashes, which breaks GoTrue/Auth client route resolution.
 */
export function normalizeSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (parsed.hostname.endsWith('.supabase.co')) {
      return `${parsed.protocol}//${parsed.host}`;
    }
    // For custom or self-hosted instances, remove /rest/v1 or trailing slashes
    const pathname = parsed.pathname.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
    return `${parsed.protocol}//${parsed.host}${pathname}`;
  } catch {
    return trimmed.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  }
}

let supabaseAdminClient: SupabaseClient | null = null;
let supabaseAnonClient: SupabaseClient | null = null;

/**
 * Returns a lazy-initialized Supabase admin client using the service role key.
 * Used for backend operations that bypass RLS or manage users.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseAdminClient;
}

/**
 * Returns a lazy-initialized Supabase client using the anon key.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  if (!supabaseAnonClient) {
    supabaseAnonClient = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseAnonClient;
}
