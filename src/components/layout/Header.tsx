import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArtisanProfile, LanguageCode, ScreenId } from '../../types';
import { APP_LANGUAGES } from '../../data/mockData';
import { sound } from '../../services/sound';
import { ShilpSetuLogo } from '../common/ShilpSetuLogo';
import { useLanguage } from '../../context/LanguageContext';
import { useNotifications } from '../../context/NotificationContext';
import { useAdminMode } from '../../context/AdminModeContext';

export interface HeaderProps {
  currentScreen: ScreenId;
  artisan: ArtisanProfile;
  currentLanguage?: LanguageCode;
  onLanguageChange?: (lang: LanguageCode) => void;
  onNavigate: (screen: ScreenId) => void;
  isScrolled?: boolean;
  isDark?: boolean;
  onToggleTheme?: () => void;
  onOpenVoiceAssistant?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  artisan,
  currentLanguage,
  onLanguageChange,
  onNavigate,
  isScrolled = false,
  isDark = false,
  onToggleTheme,
}) => {
  const { language: contextLanguage, setLanguage, t } = useLanguage();
  const { unreadCount } = useNotifications();
  const { isAdminMode } = useAdminMode();
  const effectiveLanguage = currentLanguage || contextLanguage;
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [langSearch, setLangSearch] = useState('');

  const activeLangObj = APP_LANGUAGES.find((l) => l.code === effectiveLanguage) || APP_LANGUAGES[0];

  const filteredLanguages = APP_LANGUAGES.filter(
    (l) =>
      l.label.toLowerCase().includes(langSearch.toLowerCase()) ||
      l.nativeLabel.toLowerCase().includes(langSearch.toLowerCase())
  );

  const screenBreadcrumbs: Record<ScreenId, { section: string; title: string }> = {
    home: { section: 'Workspace', title: t('screen_home', 'Home Dashboard') },
    studio: { section: 'AI Studio', title: t('screen_studio', 'AI Photo Studio & 4K Enhancer') },
    cataloger: { section: 'Catalog', title: t('screen_cataloger', 'Multilingual Auto-Cataloger') },
    pricing: { section: 'Financials', title: t('screen_pricing', 'Smart Fair Price Calculator') },
    b2b: { section: 'Procurement', title: t('screen_b2b', 'Orders & GeM Government Portal') },
    dashboard: { section: 'Analytics', title: t('screen_dashboard', 'Business Insights & Inventory') },
    notifications: { section: 'Communications', title: t('screen_notifications', 'Notifications & Order Alerts') },
    social: { section: 'Marketing', title: t('screen_social', '1-Click Social Marketing Kit') },
    story: { section: 'Heritage', title: t('screen_story', 'Heritage Story Builder') },
    profile: { section: 'Artisan', title: t('screen_profile', 'Artisan Workshop & Storefront') },
    settings: { section: 'System', title: t('settings', 'App & Workshop Settings') },
  };

  const breadcrumb = screenBreadcrumbs[currentScreen] || { section: 'Workspace', title: 'Dashboard' };

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-300 ${
          isScrolled || currentScreen !== 'home'
            ? isDark
              ? 'bg-[#121411]/95 backdrop-blur-xl border-b border-[#2D3A2B] shadow-md'
              : 'bg-[#F4ECDE]/90 backdrop-blur-xl border-b border-[#22331E]/10 shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-2 min-h-[4rem] flex items-center justify-between gap-4">
          {/* MOBILE ONLY (< md): Compact Logo or Back Button */}
          <div className="flex items-center gap-2 md:hidden">
            {currentScreen !== 'home' ? (
              <button
                onClick={() => {
                  sound.playTap();
                  onNavigate('home');
                }}
                className="flex items-center gap-1.5 text-[#9a3412] font-semibold text-sm p-1.5 -ml-1 rounded-full hover:bg-black/5 active:scale-95 transition-all"
                title={t('back_to_home', 'Back to Home')}
              >
                <span className="material-symbols-outlined text-2xl rtl-flip">arrow_back</span>
                <span className="font-serif font-bold text-sm">{t('home', 'Home')}</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  sound.playTap();
                  onNavigate('home');
                }}
                className="flex items-center gap-2 text-left group py-0.5"
              >
                <ShilpSetuLogo size="xs" isDark={isDark} />
                <div className="flex flex-col">
                  <span className="font-serif font-black text-base text-[#9a3412] leading-tight">
                    SHILPSETU
                  </span>
                  <span className="font-serif italic text-[10px] text-stone-600 dark:text-stone-300 leading-none">
                    Every hand has a story
                  </span>
                </div>
              </button>
            )}
          </div>

          {/* DESKTOP ONLY (md+): Breadcrumbs (Workspace > SHILPSETU on home, section > title on all pages) */}
          <div className="hidden md:flex items-center gap-2">
            <span className="font-serif font-bold text-xs text-[#9a3412] dark:text-[#E8B84B]">
              {breadcrumb.section}
            </span>
            <span className="material-symbols-outlined text-xs opacity-40">chevron_right</span>
            <h2 className="font-serif font-bold text-base lg:text-lg text-[#1A1815] dark:text-[#F4ECDE] leading-none">
              {breadcrumb.title}
            </h2>
          </div>

          {/* MOBILE CENTER: Screen title on non-home screens */}
          <div className="flex md:hidden flex-1 justify-center min-w-0">
            {currentScreen !== 'home' && (
              <h2 className="font-serif font-bold text-sm truncate text-[#1A1815] dark:text-[#F4ECDE]">
                {breadcrumb.title}
              </h2>
            )}
          </div>

          {/* RIGHT SIDE: Language Switcher, Notification Badges */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Language Switcher Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setShowLangMenu((prev) => !prev);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-serif font-bold border transition-all cursor-pointer shadow-xs ${
                  isDark
                    ? 'border-[#2D3A2B] bg-[#1F261D] text-[#F4ECDE] hover:bg-[#283225]'
                    : 'border-[#22331E]/20 bg-white/80 text-[#1A1815] hover:bg-white'
                }`}
                title="Change Language"
                aria-label="Change Language"
              >
                <span className="material-symbols-outlined text-base text-[#9a3412]">translate</span>
                <span className="truncate max-w-[65px] sm:max-w-none">{activeLangObj.nativeLabel}</span>
                <span className="material-symbols-outlined text-sm opacity-60">expand_more</span>
              </button>

              <AnimatePresence>
                {showLangMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    className={`absolute right-0 top-full mt-2 w-56 rounded-2xl border p-2 shadow-2xl z-50 ${
                      isDark
                        ? 'bg-[#1C221A] border-[#2D3A2B] text-[#F4ECDE]'
                        : 'bg-[#FAF6EE] border-[#22331E]/15 text-[#1A1815]'
                    }`}
                  >
                    <div className="p-1 mb-1">
                      <input
                        type="text"
                        placeholder="Search language..."
                        value={langSearch}
                        onChange={(e) => setLangSearch(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-transparent focus:outline-hidden placeholder-neutral-400"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-0.5">
                      {filteredLanguages.map((l) => (
                        <button
                          key={l.code}
                          onClick={() => {
                            sound.playTap();
                            if (onLanguageChange) onLanguageChange(l.code);
                            setLanguage(l.code);
                            setShowLangMenu(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-serif flex items-center justify-between cursor-pointer ${
                            effectiveLanguage === l.code
                              ? 'bg-[#9a3412] text-white font-bold'
                              : 'hover:bg-black/5 dark:hover:bg-white/10'
                          }`}
                        >
                          <span>{l.nativeLabel}</span>
                          <span className="text-[10px] opacity-70 font-sans">{l.label}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Notification Badge Button */}
            <button
              onClick={() => {
                sound.playTap();
                onNavigate('notifications');
              }}
              className={`relative w-9 h-9 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                isDark
                  ? 'border-[#2D3A2B] bg-[#1F261D] text-[#F4ECDE] hover:bg-[#283225]'
                  : 'border-[#22331E]/20 bg-white/80 text-[#1A1815] hover:bg-white'
              }`}
              title="Notifications & Alerts"
              aria-label="Notifications & Alerts"
            >
              <span className="material-symbols-outlined text-lg">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#9a3412] text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-[#121411]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Mobile Theme Toggle (Only on mobile where desktop sidebar is hidden) */}
            {onToggleTheme && (
              <button
                onClick={() => {
                  sound.playTap();
                  onToggleTheme();
                }}
                className={`md:hidden w-9 h-9 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                  isDark
                    ? 'border-[#2D3A2B] bg-[#1F261D] text-[#E8B84B]'
                    : 'border-[#22331E]/20 bg-white/80 text-[#9a3412]'
                }`}
                aria-label="Toggle Theme"
              >
                <span className="material-symbols-outlined text-lg">
                  {isDark ? 'light_mode' : 'dark_mode'}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
