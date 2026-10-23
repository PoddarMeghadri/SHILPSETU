import dns from 'dns';
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
let isSupabaseUnreachable = false;
let dnsChecked = false;
let dnsCheckPending = false;

function checkDns(hostname: string) {
  if (dnsChecked || dnsCheckPending) return;
  dnsCheckPending = true;
  dns.lookup(hostname, (err) => {
    dnsCheckPending = false;
    dnsChecked = true;
    if (err) {
      isSupabaseUnreachable = true;
      supabaseAdminClient = null;
      supabaseAnonClient = null;
    }
  });
}

// Proactive initial DNS check at module load
const initialUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL);
if (initialUrl) {
  try {
    const hostname = new URL(initialUrl).hostname;
    checkDns(hostname);
  } catch {
    isSupabaseUnreachable = true;
  }
}

export function markSupabaseUnavailable(): void {
  isSupabaseUnreachable = true;
  supabaseAdminClient = null;
  supabaseAnonClient = null;
}

export function isFetchOrNetworkError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || (typeof err === 'string' ? err : '') || '').toLowerCase();
  const name = (err.name || '').toLowerCase();
  return (
    msg.includes('fetch failed') ||
    msg.includes('enotfound') ||
    msg.includes('econnrefused') ||
    msg.includes('network') ||
    msg.includes('storageunknownerror') ||
    name.includes('storageunknownerror') ||
    Boolean(err.__isStorageError) ||
    Boolean(err.originalError?.message?.toLowerCase().includes('fetch failed'))
  );
}

export function isSupabaseAvailable(): boolean {
  if (isSupabaseUnreachable) return false;
  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  return Boolean(url && key);
}

/**
 * Returns a lazy-initialized Supabase admin client using the service role key.
 * Used for backend operations that bypass RLS or manage users.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (isSupabaseUnreachable) return null;
  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  try {
    const hostname = new URL(url).hostname;
    checkDns(hostname);
    if (isSupabaseUnreachable) return null;
  } catch {
    markSupabaseUnavailable();
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
  if (isSupabaseUnreachable) return null;
  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  try {
    const hostname = new URL(url).hostname;
    checkDns(hostname);
    if (isSupabaseUnreachable) return null;
  } catch {
    markSupabaseUnavailable();
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
