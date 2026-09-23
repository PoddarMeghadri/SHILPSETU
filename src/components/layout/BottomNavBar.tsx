import React from 'react';
import { motion } from 'motion/react';
import { ScreenId, LanguageCode } from '../../types';
import { sound } from '../../services/sound';
import { useTranslation } from '../../services/translations';
import { useNotifications } from '../../context/NotificationContext';
import { useAdminMode } from '../../context/AdminModeContext';

interface BottomNavBarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  isDark?: boolean;
  language?: LanguageCode;
  artisanAvatar?: string;
}

interface NavItem {
  id: ScreenId;
  labelKey: string;
  defaultLabel: string;
  icon: string;
  activeIcon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', labelKey: 'nav_home', defaultLabel: 'Home', icon: 'home', activeIcon: 'home' },
  { id: 'studio', labelKey: 'nav_studio', defaultLabel: 'Studio', icon: 'photo_camera', activeIcon: 'photo_camera' },
  { id: 'b2b', labelKey: 'nav_sell', defaultLabel: 'Sell', icon: 'storefront', activeIcon: 'storefront' },
  { id: 'dashboard', labelKey: 'nav_dashboard', defaultLabel: 'Dashboard', icon: 'analytics', activeIcon: 'analytics' },
  { id: 'notifications', labelKey: 'nav_notifications', defaultLabel: 'Alerts', icon: 'notifications', activeIcon: 'notifications' },
  { id: 'profile', labelKey: 'nav_profile', defaultLabel: 'Profile', icon: 'account_circle', activeIcon: 'account_circle' },
  { id: 'settings', labelKey: 'nav_settings', defaultLabel: 'Settings', icon: 'settings', activeIcon: 'settings' },
];

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentScreen,
  onNavigate,
  isDark = false,
  language,
  artisanAvatar,
}) => {
  const { t } = useTranslation(language);
  const { unreadCount } = useNotifications();
  const { isAdminMode } = useAdminMode();

  // Map secondary screens to primary tab highlights if needed
  const activeTabId = (() => {
    if (currentScreen === 'cataloger' || currentScreen === 'social' || currentScreen === 'story') {
      return 'studio';
    }
    if (currentScreen === 'pricing') {
      return 'b2b';
    }
    return currentScreen;
  })();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom,12px)] pt-2 px-2 sm:px-4 pointer-events-none md:hidden">
      <div className="max-w-md mx-auto pointer-events-auto flex justify-center">
        {/* Floating frosted glass pill container */}
        <div
          className={`w-full backdrop-blur-xl border rounded-full px-1.5 py-1.5 shadow-2xl flex items-center justify-between gap-0.5 ${
            isDark
              ? 'bg-[#1C221A]/95 border-[#2D3A2B] shadow-black/50'
              : 'bg-white/95 border-[#22331E]/10 shadow-[#22331E]/15'
          }`}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTabId === item.id;
            const label = t(item.labelKey, item.defaultLabel);

            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={isActive}
                aria-label={label}
                title={label}
                onClick={() => {
                  if (currentScreen !== item.id) {
                    sound.playTap();
                    onNavigate(item.id);
                  }
                }}
                className="relative flex flex-col items-center justify-center py-1 px-1 flex-1 min-w-0 rounded-full select-none outline-none group transition-transform active:scale-95"
              >
                {/* Sliding Spring Active Indicator Pill */}
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    transition={{
                      type: 'spring',
                      stiffness: 450,
                      damping: 32,
                    }}
                    className={`absolute inset-0 rounded-full z-0 ${
                      isAdminMode
                        ? isDark ? 'bg-emerald-500/30' : 'bg-emerald-500/20'
                        : isDark ? 'bg-[#B5451B]/30' : 'bg-[#B5451B]/15'
                    }`}
                    style={isAdminMode ? { backgroundColor: 'var(--admin-accent-glow)' } : undefined}
                  />
                )}

                {/* Icon & Label */}
                <div
                  className={`relative z-10 flex flex-col items-center justify-center w-full transition-colors duration-200 ${
                    isActive
                      ? isAdminMode
                        ? isDark ? 'text-emerald-400' : 'text-emerald-700 font-bold'
                        : 'text-[#B5451B]'
                      : isDark
                      ? 'text-[#F4ECDE]/60 group-hover:text-[#F4ECDE]'
                      : 'text-[#22331E]/60 group-hover:text-[#22331E]'
                  }`}
                  style={
                    isActive && isAdminMode
                      ? { color: isDark ? 'var(--admin-accent-dark-text)' : 'var(--admin-accent)' }
                      : undefined
                  }
                >
                  <div className="relative">
                    <span
                      className="material-symbols-outlined text-[21px] sm:text-[23px] leading-none"
                      style={{
                        fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                      }}
                    >
                      {isActive ? item.activeIcon : item.icon}
                    </span>
                    {/* Badge for Notifications Tab */}
                    {item.id === 'notifications' && unreadCount > 0 && (
                      <span
                        className={`absolute -top-0.5 -right-1 w-2 h-2 rounded-full ring-2 ring-[#F4ECDE] dark:ring-[#1C221A] animate-pulse ${
                          isAdminMode ? 'bg-emerald-500' : 'bg-[#B5451B]'
                        }`}
                        style={isAdminMode ? { backgroundColor: 'var(--admin-accent)' } : undefined}
                      />
                    )}
                  </div>
                  <span
                    className={`text-[9.5px] sm:text-[10.5px] tracking-tight font-sans truncate max-w-full text-center leading-tight mt-0.5 ${
                      isActive
                        ? isAdminMode
                          ? isDark ? 'font-bold text-emerald-400' : 'font-bold text-emerald-700'
                          : 'font-bold text-[#B5451B]'
                        : 'font-medium'
                    }`}
                    style={
                      isActive && isAdminMode
                        ? { color: isDark ? 'var(--admin-accent-dark-text)' : 'var(--admin-accent)' }
                        : undefined
                    }
                  >
                    {label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
