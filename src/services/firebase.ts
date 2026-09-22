import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from 'firebase/auth';
import type { Auth, ConfirmationResult } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);
const app = isFirebaseConfigured
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;
export const firebaseAuth: Auth | null = app ? getAuth(app) : null;

let recaptchaVerifier: RecaptchaVerifier | null = null;

export function clearPhoneRecaptcha() {
  recaptchaVerifier?.clear();
  recaptchaVerifier = null;
}

function getPhoneRecaptcha(): RecaptchaVerifier {
  if (recaptchaVerifier) return recaptchaVerifier;
  if (!firebaseAuth) throw new Error('Mobile verification is not configured.');
  if (typeof document === 'undefined' || !document.getElementById('recaptcha-container')) {
    throw new Error('Secure verification is not available on this screen.');
  }
  recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, 'recaptcha-container', {
    size: 'invisible',
  });
  return recaptchaVerifier;
}

export function formatIndianPhone(mobile: string): string {
  const clean = mobile.trim().replace(/[^\d+]/g, '');
  return clean.startsWith('+') ? clean : `+91${clean}`;
}

export async function sendFirebasePhoneOtp(mobile: string): Promise<{
  sent: boolean;
  confirmation?: ConfirmationResult;
  error?: string;
}> {
  try {
    if (!firebaseAuth) return { sent: false, error: 'Mobile verification is not configured.' };
    const confirmation = await signInWithPhoneNumber(
      firebaseAuth,
      formatIndianPhone(mobile),
      getPhoneRecaptcha()
    );
    return { sent: true, confirmation };
  } catch (error) {
    clearPhoneRecaptcha();
    return {
      sent: false,
      error: error instanceof Error ? error.message : 'Unable to send the mobile verification code.',
    };
  }
}
