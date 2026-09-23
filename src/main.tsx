import React, { Component, ErrorInfo, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
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

class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  props: ErrorBoundaryProps;
  state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[App Crash Caught by ErrorBoundary]:', error, errorInfo);
  }

  handleReload = () => {
    // In-memory React recovery for sandboxed iframes where window.location.reload may be blocked
    (this as any).setState({ hasError: false, error: null });
    try {
      if (typeof window !== 'undefined' && window.location) {
        window.location.reload();
      }
    } catch (_) {
      // Ignored if blocked by iframe sandbox
    }
  };

  handleResetAppState = () => {
    try {
      localStorage.removeItem('shilpsetu_auth_done');
      localStorage.removeItem('shilpsetu_user_profile');
      localStorage.removeItem('shilpsetu_artisan');
      sessionStorage.clear();
    } catch (_) {}
    this.handleReload();
  };

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
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3.5 px-6 rounded-xl bg-[#B5451B] hover:bg-[#9B3714] text-white font-medium text-sm transition-all shadow-md active:scale-98 cursor-pointer"
              >
                Reload Application
              </button>
              <button
                type="button"
                onClick={this.handleResetAppState}
                className="w-full py-2.5 px-4 rounded-xl border border-black/15 dark:border-white/15 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
              >
                Reset Session & Recover
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <LanguageProvider>
        <NotificationProvider>
          <AdminModeProvider>
            <App />
          </AdminModeProvider>
        </NotificationProvider>
      </LanguageProvider>
    </AppErrorBoundary>
  </StrictMode>,
);

