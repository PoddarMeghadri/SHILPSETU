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

// Clerk Publishable Key from environment or development default
const CLERK_PUBLISHABLE_KEY =
  (import.meta as any).env?.VITE_CLERK_PUBLISHABLE_KEY ||
  'pk_test_c2hpbHBzZXR1LWFydGlzYW4uY2xlcmsuYWNjb3VudHMuZGV2JA';

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

