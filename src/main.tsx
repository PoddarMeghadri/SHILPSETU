import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { LanguageProvider } from './context/LanguageContext';
import { NotificationProvider } from './context/NotificationContext';
import { initGlobalHaptics } from './services/sound';
import App from './App.tsx';
import './index.css';

// Initialize subtle haptic feedback across buttons for tactile artisan interactions
initGlobalHaptics();

// Clerk Publishable Key from environment or valid project instance
function getClerkPublishableKey(): string {
  const envKey = (import.meta as any).env?.VITE_CLERK_PUBLISHABLE_KEY || '';
  const cleaned = String(envKey)
    .replace(/^VITE_CLERK_PUBLISHABLE_KEY=/, '')
    .replace(/^["']|["']$/g, '')
    .trim();
  if (cleaned && (cleaned.startsWith('pk_test_') || cleaned.startsWith('pk_live_'))) {
    return cleaned;
  }
  return 'pk_test_ZXRlcm5hbC1maXJlZmx5LTgyODYuY2xlcmsuYWNjb3VudHMuZGV2JA';
}

const CLERK_PUBLISHABLE_KEY = getClerkPublishableKey();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <LanguageProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </LanguageProvider>
    </ClerkProvider>
  </StrictMode>,
);

