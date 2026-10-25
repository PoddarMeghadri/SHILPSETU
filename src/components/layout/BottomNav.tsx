import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScreenId, LanguageCode } from '../../types';
import { sound } from '../../services/sound';
import { useTranslation } from '../../services/translations';
import { useNotifications } from '../../context/NotificationContext';
import { useAdminMode } from '../../context/AdminModeContext';

export interface BottomNavProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  onOpenShilpi?: () => void;
  isDark?: boolean;
  language?: LanguageCode;
  artisanAvatar?: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentScreen,
  onNavigate,
  onOpenShilpi,
  isDark = false,
  language,
}) => {
  const { t } = useTranslation(language);
  const { unreadCount } = useNotifications();
  const { isAdminMode } = useAdminMode();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Determine active tab
  const isHomeActive = currentScreen === 'home';
  const isStudioActive = currentScreen === 'studio' || currentScreen === 'cataloger' || currentScreen === 'story';
  const isOrdersActive = currentScreen === 'b2b' || currentScreen === 'pricing';
  const isMoreActive = ['dashboard', 'notifications', 'profile', 'settings', 'social'].includes(currentScreen);

  const handleNavClick = (screen: ScreenId) => {
    sound.playTap();
    setIsMoreOpen(false);
    onNavigate(screen);
  };

  const moreItems: Array<{ id: ScreenId; label: string; icon: string; badge?: number }> = [
    { id: 'dashboard', label: t('nav_dashboard', 'Dashboard & Analytics'), icon: 'analytics' },
    { id: 'notifications', label: t('nav_notifications', 'Alerts & Orders'), icon: 'notifications', badge: unreadCount },
    { id: 'profile', label: t('nav_profile', 'Artisan Profile & Bio'), icon: 'account_circle' },
    { id: 'settings', label: t('nav_settings', 'App Settings'), icon: 'settings' },
    { id: 'social', label: t('nav_social', 'Social Marketing Kit'), icon: 'share' },
  ];

  return (
    <>
      {/* Slide-Over Drawer for "More" Tab */}
      <AnimatePresence>
        {isMoreOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className={`relative z-10 w-full rounded-t-3xl border-t p-5 pb-24 shadow-2xl ${
                isDark ? 'bg-[#1C221A] text-[#F4ECDE] border-[#2D3A2B]' : 'bg-[#FAF6EE] text-[#1A1815] border-[#22331E]/15'
              }`}
            >
              <div className="w-12 h-1.5 bg-black/20 dark:bg-white/20 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif font-bold text-lg text-[#B5451B] dark:text-[#E8B84B]">
                  {t('more_options', 'More Modules & Settings')}
                </h3>
                <button
                  onClick={() => setIsMoreOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {moreItems.map((item) => {
                  const isCurrent = currentScreen === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl transition-all text-left ${
                        isCurrent
                          ? 'bg-[#B5451B] text-white font-bold shadow-md'
                          : isDark
                          ? 'bg-white/5 hover:bg-white/10 text-[#F4ECDE]'
                          : 'bg-black/5 hover:bg-black/10 text-[#1A1815]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      {item.badge && item.badge > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#E8B84B] text-[#1A1815]">
                          {item.badge}
                        </span>
                      ) : (
                        <span className="material-symbols-outlined text-lg opacity-60">chevron_right</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Primary Mobile Bottom Navigation Bar with Safe Area */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden pointer-events-none pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 px-3"
        role="navigation"
        aria-label="Mobile Bottom Navigation"
      >
        <div className="max-w-md mx-auto pointer-events-auto">
          <div
            className={`w-full backdrop-blur-xl border rounded-full px-2 py-2 shadow-2xl flex items-center justify-between relative ${
              isDark
                ? 'bg-[#1C221A]/95 border-[#2D3A2B] shadow-black/50 text-[#F4ECDE]'
                : 'bg-white/95 border-[#22331E]/10 shadow-[#22331E]/15 text-[#1A1815]'
            }`}
          >
            {/* 1. Home */}
            <button
              onClick={() => handleNavClick('home')}
              role="tab"
              aria-selected={isHomeActive}
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-full transition-transform active:scale-95 ${
                isHomeActive ? 'text-[#B5451B] dark:text-[#E8B84B] font-bold' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: isHomeActive ? "'FILL' 1" : "'FILL' 0" }}>
                home
              </span>
              <span className="text-[10px] tracking-tight truncate mt-0.5">
                {t('nav_home', 'Home')}
              </span>
            </button>

            {/* 2. AI Studio */}
            <button
              onClick={() => handleNavClick('studio')}
              role="tab"
              aria-selected={isStudioActive}
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-full transition-transform active:scale-95 ${
                isStudioActive ? 'text-[#B5451B] dark:text-[#E8B84B] font-bold' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: isStudioActive ? "'FILL' 1" : "'FILL' 0" }}>
                photo_camera
              </span>
              <span className="text-[10px] tracking-tight truncate mt-0.5">
                {t('nav_studio', 'AI Studio')}
              </span>
            </button>

            {/* 3. Center Shilpi AI Mic Action Button */}
            <div className="relative -top-4 px-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  sound.playVoiceStart();
                  if (onOpenShilpi) {
                    onOpenShilpi();
                  } else {
                    const evt = new CustomEvent('open-shilpi-assistant');
                    window.dispatchEvent(evt);
                  }
                }}
                className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#9C3A14] to-[#B5451B] text-white shadow-xl shadow-[#B5451B]/40 border-3 border-white dark:border-[#1C221A] flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
                aria-label="Ask Shilpi AI Voice Assistant"
                title="Ask Shilpi AI"
              >
                <div className="relative flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl animate-pulse">mic</span>
                  <div className="absolute inset-0 rounded-full border border-white/50 animate-ping opacity-30" />
                </div>
              </button>
            </div>

            {/* 4. Orders / GeM */}
            <button
              onClick={() => handleNavClick('b2b')}
              role="tab"
              aria-selected={isOrdersActive}
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-full transition-transform active:scale-95 ${
                isOrdersActive ? 'text-[#B5451B] dark:text-[#E8B84B] font-bold' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: isOrdersActive ? "'FILL' 1" : "'FILL' 0" }}>
                storefront
              </span>
              <span className="text-[10px] tracking-tight truncate mt-0.5">
                {t('nav_sell', 'Orders / GeM')}
              </span>
            </button>

            {/* 5. More */}
            <button
              onClick={() => {
                sound.playTap();
                setIsMoreOpen((prev) => !prev);
              }}
              role="tab"
              aria-selected={isMoreActive}
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-full transition-transform active:scale-95 relative ${
                isMoreActive ? 'text-[#B5451B] dark:text-[#E8B84B] font-bold' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <div className="relative">
                <span className="material-symbols-outlined text-2xl">menu</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#B5451B] ring-2 ring-white dark:ring-[#1C221A]" />
                )}
              </div>
              <span className="text-[10px] tracking-tight truncate mt-0.5">
                {t('nav_more', 'More')}
              </span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
};

export default BottomNav;
