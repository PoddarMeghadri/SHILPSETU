/**
 * Diagnostic utility to verify and log Supabase environment variables on application startup.
 * Helps verify if VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are properly injected
 * in external production environments (e.g. Vercel) versus local/dev builds.
 */

export interface SupabaseDiagnostics {
  environment: string;
  hostname: string;
  isVercel: boolean;
  isAiStudio: boolean;
  isLocalhost: boolean;
  viteSupabaseUrl: {
    defined: boolean;
    source: 'injected' | 'fallback' | 'missing';
    valuePreview: string;
    isValidFormat: boolean;
  };
  viteSupabaseAnonKey: {
    defined: boolean;
    source: 'injected' | 'fallback' | 'missing';
    length: number;
    preview: string;
    isJwtFormat: boolean;
  };
  status: 'configured_injected' | 'using_fallback' | 'missing_credentials';
  actionableMessage?: string;
}

export function getSupabaseDiagnostics(): SupabaseDiagnostics {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const rawUrl = envUrl || import.meta.env.SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const rawKey = envKey || import.meta.env.SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const isUrlInjected = Boolean(rawUrl && rawUrl.trim().length > 0);
  const isKeyInjected = Boolean(rawKey && rawKey.trim().length > 0);

  const fallbackUrl = 'https://gxytjeznfhcbdnwzmeaa.supabase.co';
  const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4eXRqZXpuZmhjYmRud3ptZWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NTI2MjIsImV4cCI6MjEwNTIyODYyMn0.c-bgiXJFfvBq4Q38ZNPgiO6-zn6uKZBZ70OrxsG7Wwc';

  const effectiveUrl = (rawUrl || fallbackUrl).trim();
  const effectiveKey = (rawKey || fallbackKey).trim();

  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'node';
  const isVercel = hostname.includes('vercel.app');
  const isAiStudio = hostname.includes('.run.app') || hostname.includes('aistudio');
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  let isValidUrl = false;
  try {
    const parsed = new URL(effectiveUrl.startsWith('http') ? effectiveUrl : `https://${effectiveUrl}`);
    isValidUrl = Boolean(parsed.hostname);
  } catch (_) {
    isValidUrl = false;
  }

  const isJwt = effectiveKey.split('.').length === 3;

  // Mask sensitive portion of key for safe browser console output
  const maskedKey = effectiveKey.length > 20
    ? `${effectiveKey.substring(0, 12)}...${effectiveKey.substring(effectiveKey.length - 8)}`
    : (effectiveKey ? '***' : '(not set)');

  let status: SupabaseDiagnostics['status'] = 'missing_credentials';
  let actionableMessage = '';

  if (isUrlInjected && isKeyInjected) {
    status = 'configured_injected';
  } else if (!isUrlInjected && !isKeyInjected) {
    status = 'using_fallback';
    actionableMessage = isVercel
      ? '⚠️ [Vercel Environment Warning]: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are NOT injected in this Vercel deployment. ShilpSetu is operating on the built-in fallback client. To inject custom credentials, navigate to your Vercel Project Settings -> Environment Variables, add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, and trigger a new deployment.'
      : 'ℹ️ Operating using built-in fallback Supabase credentials.';
  } else {
    status = 'missing_credentials';
    actionableMessage = '⚠️ Partial Supabase configuration detected: one of VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing.';
  }

  return {
    environment: import.meta.env.MODE || 'production',
    hostname,
    isVercel,
    isAiStudio,
    isLocalhost,
    viteSupabaseUrl: {
      defined: isUrlInjected,
      source: isUrlInjected ? 'injected' : (effectiveUrl ? 'fallback' : 'missing'),
      valuePreview: effectiveUrl || '(not set)',
      isValidFormat: isValidUrl,
    },
    viteSupabaseAnonKey: {
      defined: isKeyInjected,
      source: isKeyInjected ? 'injected' : (effectiveKey ? 'fallback' : 'missing'),
      length: effectiveKey.length,
      preview: maskedKey,
      isJwtFormat: isJwt,
    },
    status,
    actionableMessage: actionableMessage || undefined,
  };
}

/**
 * Diagnostic logger that prints formatted status of Supabase configuration
 * to the browser console on startup.
 */
export function logSupabaseDiagnostics(): SupabaseDiagnostics {
  const diag = getSupabaseDiagnostics();

  const titleStyle = 'background: #0f172a; color: #38bdf8; font-weight: bold; padding: 4px 8px; border-radius: 4px;';
  const tagStyleInjected = 'background: #15803d; color: #ffffff; font-weight: bold; padding: 2px 6px; border-radius: 3px;';
  const tagStyleFallback = 'background: #b45309; color: #ffffff; font-weight: bold; padding: 2px 6px; border-radius: 3px;';

  console.groupCollapsed('%c[ShilpSetu] Supabase Environment Diagnostics%c', titleStyle, '');
  
  console.log('📍 Hostname:', diag.hostname);
  console.log('🌐 Deployment Platform:', diag.isVercel ? 'Vercel Deployment' : diag.isAiStudio ? 'AI Studio Environment' : diag.isLocalhost ? 'Local Development' : 'External Host');
  console.log('⚙️ Vite Mode:', diag.environment);

  if (diag.viteSupabaseUrl.defined) {
    console.log(
      '%c VITE_SUPABASE_URL %c Injected by build environment (%s)',
      tagStyleInjected,
      'color: #10b981; font-weight: 600;',
      diag.viteSupabaseUrl.valuePreview
    );
  } else {
    console.log(
      '%c VITE_SUPABASE_URL %c Not injected via env - Active fallback: %s',
      tagStyleFallback,
      'color: #f59e0b;',
      diag.viteSupabaseUrl.valuePreview
    );
  }

  if (diag.viteSupabaseAnonKey.defined) {
    console.log(
      '%c VITE_SUPABASE_ANON_KEY %c Injected by build environment (%s, %d chars)',
      tagStyleInjected,
      'color: #10b981; font-weight: 600;',
      diag.viteSupabaseAnonKey.preview,
      diag.viteSupabaseAnonKey.length
    );
  } else {
    console.log(
      '%c VITE_SUPABASE_ANON_KEY %c Not injected via env - Active fallback: %s (%d chars)',
      tagStyleFallback,
      'color: #f59e0b;',
      diag.viteSupabaseAnonKey.preview,
      diag.viteSupabaseAnonKey.length
    );
  }

  console.log('📊 Overall Supabase Status:', diag.status);

  if (diag.actionableMessage) {
    console.warn(diag.actionableMessage);
  }

  console.log('Full Diagnostic Object:', diag);
  console.groupEnd();

  return diag;
}
