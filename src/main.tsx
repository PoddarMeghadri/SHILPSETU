import React, { Component, ErrorInfo, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { LanguageProvider } from './context/LanguageContext';
import { NotificationProvider } from './context/NotificationContext';
import { AdminModeProvider } from './context/AdminModeContext';
import { initGlobalHaptics } from './services/sound';
import { logSupabaseDiagnostics, getSupabaseDiagnostics } from './utils/supabaseDiagnostics';
import App from './App.tsx';
import './index.css';

// Initialize subtle haptic feedback across buttons for tactile artisan interactions
initGlobalHaptics();

// Log Supabase environment injection status to browser console on startup
const diagnostics = logSupabaseDiagnostics();

// Expose diagnostic inspection helper globally on window for easy developer checking in console
if (typeof window !== 'undefined') {
  (window as any).__SUPABASE_DIAGNOSTICS__ = diagnostics;
  (window as any).checkSupabaseConfig = logSupabaseDiagnostics;
}

// Error boundary to prevent any blank screen in standalone or external browsers
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AppErrorBoundary extends React.Component<any, any> {
  props: any;
  state = { hasError: false };

  constructor(props: any) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('[App Crash Caught by ErrorBoundary]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F4ECDE] dark:bg-[#121411] text-[#1A1815] dark:text-[#F4ECDE] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#FCF8F2] dark:bg-[#1C221A] rounded-3xl p-8 border border-[#DFD3C3] dark:border-[#2D3A2B] shadow-xl text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-[#B5451B]/10 text-[#B5451B] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-3xl">refresh</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold font-serif text-[#1A1815] dark:text-[#F4ECDE]">
                ShilpSetu Artisan App
              </h2>
              <p className="text-xs opacity-75 leading-relaxed">
                The application encountered a display refresh requirement. Click below to continue.
              </p>
            </div>
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="w-full py-3.5 px-6 rounded-xl bg-[#B5451B] hover:bg-[#9B3714] text-white font-medium text-sm transition-all shadow-md active:scale-98"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return (this.props as any).children;
  }
}

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
    <AppErrorBoundary>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
        <LanguageProvider>
          <NotificationProvider>
            <AdminModeProvider>
              <App />
            </AdminModeProvider>
          </NotificationProvider>
        </LanguageProvider>
      </ClerkProvider>
    </AppErrorBoundary>
  </StrictMode>,
);

