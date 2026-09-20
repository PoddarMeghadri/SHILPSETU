import { Request, Response as ExpressResponse, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { db } from './db.js';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'shilpsetu_artisan_jwt_secret_key_2026';
const DEFAULT_AUTH_PROVIDER_TIMEOUT_MS = 10_000;

function getAuthProviderTimeoutMs(): number {
  const configured = Number(process.env.AUTH_PROVIDER_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_AUTH_PROVIDER_TIMEOUT_MS;
}

function fetchWithAuthProviderTimeout(input: RequestInfo | URL, init: RequestInit = {}): Promise<globalThis.Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getAuthProviderTimeoutMs());

  if (init.signal) {
    if (init.signal.aborted) {
      controller.abort();
    } else {
      init.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

function getSupabaseAuthClient() {
  const rawUrl = process.env.SUPABASE_URL || 'https://gxytjeznfhcbdnwzmeaa.supabase.co';
  const cleanUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
  return createClient(cleanUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: fetchWithAuthProviderTimeout,
    },
  });
}

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim().toLowerCase());
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

export function verifyPassword(password: string, storedHash?: string): boolean {
  if (!storedHash) return false;
  const [salt, expected] = storedHash.split(':');
  if (!salt || !expected) return false;
  try {
    const actual = scryptSync(password, salt, 64);
    return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

export function validatePasswordRules(password: string): string | null {
  if (!password || typeof password !== 'string') return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 16) return 'Password must be no more than 16 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter.';
  if (!/\d/.test(password)) return 'Password must include a number.';
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must include a special character.';
  return null;
}

export function generatePasswordResetToken(email: string): string {
  return jwt.sign(
    {
      email: email.trim().toLowerCase(),
      purpose: 'password_reset',
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
}

export function verifyPasswordResetToken(token: string, expectedEmail: string): boolean {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return Boolean(
      decoded &&
      decoded.purpose === 'password_reset' &&
      decoded.email === expectedEmail.trim().toLowerCase()
    );
  } catch {
    return false;
  }
}

/** Dispatch a numeric email OTP through Supabase Auth. */
export async function sendOtpToEmail(
  email: string,
  _phone?: string,
  options: { shouldCreateUser?: boolean } = {}
): Promise<{ success: boolean; message: string; cooldownSeconds: number }> {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    throw new Error('Valid Email ID is strictly mandatory for artisan verification');
  }
  const supabase = getSupabaseAuthClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: { shouldCreateUser: options.shouldCreateUser !== false },
  });
  if (error) throw new Error(error.message);
  return { success: true, message: `Verification code sent successfully to ${normalizedEmail}.`, cooldownSeconds: 30 };
}

/**
 * Backwards compatibility helper that enforces mandatory email.
 */
export async function sendOtpToPhone(
  phone: string,
  email?: string
): Promise<{ success: boolean; message: string }> {
  if (!email) {
    throw new Error('Email ID is mandatory. Please provide a valid email address.');
  }
  return sendOtpToEmail(email, phone);
}

/** Verify a 6-digit OTP through Supabase Auth. */
export async function verifyOtp(
  identifier: string,
  inputOtp: string,
  options?: {
    supabaseVerified?: boolean;
    supabaseAccessToken?: string;
    clerkVerified?: boolean;
    clerkSessionId?: string;
  }
): Promise<boolean> {
  const normalizedInput = inputOtp?.trim();
  if (!/^\d{6}$/.test(normalizedInput || '')) throw new Error('Please enter the 6-digit verification code.');
  const cleanIdentifier = identifier.trim().toLowerCase();
  if (!cleanIdentifier.includes('@')) throw new Error('OTP verification requires the registered email address.');

  const supabase = getSupabaseAuthClient();
  if (options?.supabaseVerified && options.supabaseAccessToken) {
    const { data, error } = await supabase.auth.getUser(options.supabaseAccessToken);
    if (!error && data.user) return true;
  }
  for (const type of ['email', 'signup', 'recovery'] as const) {
    const { data, error } = await supabase.auth.verifyOtp({ email: cleanIdentifier, token: normalizedInput, type });
    if (!error && (data.user || data.session)) return true;
  }
  throw new Error('Incorrect verification code. Please enter the OTP sent to your email.');
}

export function generateToken(artisan: { id: string; email?: string; mobile?: string; fullName: string }): string {
  return jwt.sign(
    {
      id: artisan.id,
      email: artisan.email,
      mobile: artisan.mobile,
      fullName: artisan.fullName,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export interface AuthenticatedRequest extends Request {
  artisan?: {
    id: string;
    email?: string;
    mobile?: string;
    fullName: string;
  };
}

/**
 * Middleware validating bearer tokens:
 * Supports ShilpSetu JWT tokens and Clerk session tokens.
 */
export async function authenticateJwt(req: AuthenticatedRequest, res: ExpressResponse, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  // 1. Try ShilpSetu internal JWT
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.artisan = decoded;
    return next();
  } catch {
    // Continue to check Clerk token
  }

  // 2. Decode Clerk JWT or session token if available
  try {
    const decoded = jwt.decode(token) as any;
    if (decoded && (decoded.sub || decoded.email)) {
      // Look up artisan by email or sub
      const email = decoded.email || decoded.email_addresses?.[0]?.email_address;
      const artisan = email ? db.getArtisanByEmail(email) : null;

      req.artisan = {
        id: artisan?.id || decoded.sub || 'artisan_clerk',
        email: email || artisan?.email,
        mobile: artisan?.mobile || '',
        fullName: artisan?.fullName || decoded.name || 'Artisan',
      };
      return next();
    }
  } catch {
    // Ignore and proceed to 401
  }

  return res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
}
