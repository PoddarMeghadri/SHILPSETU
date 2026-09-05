import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LanguageProvider } from './context/LanguageContext';
import { NotificationProvider } from './context/NotificationContext';
import { initGlobalHaptics } from './services/sound';
import App from './App.tsx';
import './index.css';

// Initialize subtle haptic feedback across buttons for tactile artisan interactions
initGlobalHaptics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </LanguageProvider>
  </StrictMode>,
);

