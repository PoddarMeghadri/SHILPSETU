import React, { useState } from 'react';
import { ScreenId, ArtisanProfile, LanguageCode } from '../../types';
import { ShilpSetuLogo } from '../common/ShilpSetuLogo';
import { BlueVerifiedBadge } from '../common/SocialIcons';
import { sound } from '../../services/sound';
import { useTranslation } from '../../services/translations';
import { useNotifications } from '../../context/NotificationContext';
import { useAdminMode } from '../../context/AdminModeContext';

interface DesktopSidebarProps {
  currentScreen: ScreenId;
  artisan: ArtisanProfile;
  onNavigate: (screen: ScreenId) => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  language?: LanguageCode;
  onOpenVoiceAssistant?: () => void;
}

interface NavItemDef {
  id: ScreenId;
  labelKey: string;
  defaultLabel: string;
  icon: string;
  badge?: string;
}

const PRIMARY_NAV_ITEMS: NavItemDef[] = [
  { id: 'home', labelKey: 'nav_home', defaultLabel: 'Home Dashboard', icon: 'dashboard' },
  { id: 'studio', labelKey: 'nav_studio', defaultLabel: 'AI Photo Studio', icon: 'photo_camera' },
  { id: 'b2b', labelKey: 'nav_sell', defaultLabel: 'B2B & GeM Portal', icon: 'storefront' },
  { id: 'dashboard', labelKey: 'nav_dashboard', defaultLabel: 'Business Insights', icon: 'analytics' },
  { id: 'notifications', labelKey: 'nav_notifications', defaultLabel: 'Alerts', icon: 'notifications', badge: 'NEW' },
  { id: 'profile', labelKey: 'nav_profile', defaultLabel: 'Artisan Workshop', icon: 'badge' },
];

const SECONDARY_NAV_ITEMS: NavItemDef[] = [
  { id: 'cataloger', labelKey: 'screen_cataloger', defaultLabel: 'Voice Auto-Cataloger', icon: 'mic' },
  { id: 'pricing', labelKey: 'screen_pricing', defaultLabel: 'Smart Pricing Assistant', icon: 'currency_rupee' },
  { id: 'social', labelKey: 'screen_social', defaultLabel: 'Social Share Kit', icon: 'share' },
  { id: 'story', labelKey: 'screen_story', defaultLabel: 'Heritage Story Builder', icon: 'history_edu' },
];

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  currentScreen,
  artisan,
  onNavigate,
  isDark = false,
  onToggleTheme,
  language,
  onOpenVoiceAssistant,
}) => {
  const { t } = useTranslation();
  const { unreadCount } = useNotifications();
  const { isAdminMode } = useAdminMode();

  // State to minimize/expand sidebar on tablet/pc
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('shilpsetu_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    sound.playTap();
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('shilpsetu_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 border-r sticky top-0 h-screen z-30 transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-72 xl:w-80'
      } ${
        isDark
          ? 'bg-[#161B14] border-[#2D3A2B] text-[#F4ECDE]'
          : 'bg-[#ECE0CC]/95 border-[#22331E]/10 text-[#1A1815]'
      }`}
      aria-label={t('desktop_sidebar_label', 'Desktop and Tablet Sidebar')}
    >
      {/* Brand Header with 3-Lined Minimize Button Above */}
      <div
        className={`border-b border-current/10 flex items-center transition-all ${
          isCollapsed ? 'p-3 flex-col gap-2.5 justify-center' : 'p-4 lg:p-5 grid grid-cols-[minmax(0,1fr)_auto] gap-2'
        }`}
      >
        {!isCollapsed ? (
          <>
            {/* Clickable Brand Logo & Title */}
            <button
              onClick={() => {
                sound.playTap();
                onNavigate('home');
              }}
              className="flex items-center gap-3 text-left group min-w-0 flex-1 cursor-pointer"
              title={t('app_title_tagline', 'ShilpSetu — Bridge of Craft')}
            >
              <div className="shrink-0 transition-transform group-hover:scale-105">
                <ShilpSetuLogo size="sm" isDark={isDark} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="font-serif font-black text-lg tracking-tight leading-none text-[#B5451B] truncate">
                    SHILPSETU
                  </h1>
                  {isAdminMode && (
                    <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-emerald-600 text-white rounded shadow-xs flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 animate-pulse" />
                      Admin
                    </span>
                  )}
                </div>
                <p className="font-serif italic text-[11px] opacity-75 truncate mt-0.5">
                  {t('app_tagline', 'Har Haath Ki Kahani')}
                </p>
              </div>
            </button>

            <div className="flex items-center gap-1.5 shrink-0">
              {onToggleTheme && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    onToggleTheme();
                  }}
                  className={`w-10 h-10 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                    isDark
                      ? 'border-[#2D3A2B] bg-[#1F261D] text-[#E8B84B] hover:bg-[#283225]'
                      : isAdminMode
                      ? 'border-[#059669]/20 bg-[#E8F5E9] text-[#059669] hover:bg-[#C8E6C9]'
                      : 'border-[#B5451B]/20 bg-[#FAF6EE] text-[#B5451B] hover:bg-[#EFE4CF]'
                  }`}
                  title={isDark ? t('switch_light_mode', 'Switch to Light Mode') : t('switch_dark_mode', 'Switch to Dark Mode')}
                  aria-label={isDark ? t('switch_light_mode', 'Switch to Light Mode') : t('switch_dark_mode', 'Switch to Dark Mode')}
                  id="btn-sidebar-theme-toggle"
                >
                  <span className="material-symbols-outlined text-[19px]">
                    {isDark ? 'light_mode' : 'dark_mode'}
                  </span>
                </button>
              )}

              {/* 3-Lined Button to Minimize Navigation Bar */}
              <button
                onClick={toggleCollapsed}
                className={`w-10 h-10 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                  isDark
                    ? 'border-[#2D3A2B] bg-[#1F261D] text-[#E8B84B] hover:bg-[#283225]'
                    : 'border-[#22331E]/15 bg-white/70 text-[#22331E] hover:bg-white'
                }`}
                title={t('minimize_nav_bar', 'Minimize navigation bar')}
                aria-label={t('minimize_nav_bar', 'Minimize navigation bar')}
                id="btn-collapse-sidebar"
              >
                <span className="material-symbols-outlined text-[20px]">menu</span>
              </button>
            </div>
          </>
        ) : (
          /* Minimized Header with 3-Lined Button and Centered Logo */
          <div className="flex flex-col items-center gap-2.5 w-full py-1">
            <button
              onClick={toggleCollapsed}
              className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                isDark
                  ? 'border-[#2D3A2B] bg-[#1F261D] text-[#E8B84B] hover:bg-[#283225]'
                  : 'border-[#22331E]/15 bg-white/70 text-[#22331E] hover:bg-white'
              }`}
              title={t('expand_nav_bar', 'Expand navigation bar')}
              aria-label={t('expand_nav_bar', 'Expand navigation bar')}
              id="btn-expand-sidebar"
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>

            {onToggleTheme && (
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  onToggleTheme();
                }}
                className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                  isDark
                    ? 'border-[#2D3A2B] bg-[#1F261D] text-[#E8B84B] hover:bg-[#283225]'
                    : isAdminMode
                    ? 'border-[#059669]/20 bg-[#E8F5E9] text-[#059669] hover:bg-[#C8E6C9]'
                    : 'border-[#B5451B]/20 bg-[#FAF6EE] text-[#B5451B] hover:bg-[#EFE4CF]'
                }`}
                title={isDark ? t('switch_light_mode', 'Switch to Light Mode') : t('switch_dark_mode', 'Switch to Dark Mode')}
                aria-label={isDark ? t('switch_light_mode', 'Switch to Light Mode') : t('switch_dark_mode', 'Switch to Dark Mode')}
                id="btn-sidebar-collapsed-theme-toggle"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isDark ? 'light_mode' : 'dark_mode'}
                </span>
              </button>
            )}

            <button
              onClick={() => {
                sound.playTap();
                onNavigate('home');
              }}
              title={t('app_title_tagline', 'ShilpSetu — Bridge of Craft')}
              className="cursor-pointer hover:scale-105 transition-transform"
            >
              <ShilpSetuLogo size="xs" isDark={isDark} />
            </button>
          </div>
        )}
      </div>

      {/* Navigation Links Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-2.5 py-4 space-y-5 no-scrollbar">
        {/* Main Section */}
        <div className="space-y-1">
          {!isCollapsed && (
            <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-[#B5451B] opacity-80 mb-2 font-sans">
              {t('main_navigation', 'Main Navigation')}
            </p>
          )}

          {PRIMARY_NAV_ITEMS.map((item) => {
            const isActive = currentScreen === item.id;
            const label = t(item.labelKey, item.defaultLabel);
            // Badge only stays while notifications are unread
            const effectiveBadge =
              item.id === 'notifications'
                ? unreadCount > 0
                  ? 'NEW'
                  : null
                : item.badge;

            return (
              <button
                key={item.id}
                onClick={() => {
                  sound.playTap();
                  onNavigate(item.id);
                }}
                title={isCollapsed ? label : undefined}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center py-2.5 px-0' : 'justify-between px-3 py-2.5'
                } rounded-2xl text-xs font-medium font-sans transition-all group relative cursor-pointer ${
                  isActive
                    ? 'bg-[#B5451B] text-white font-bold shadow-sm'
                    : isDark
                    ? 'text-[#F4ECDE]/80 hover:bg-[#252E22] hover:text-white'
                    : 'text-[#22331E]/80 hover:bg-[#DFD3BE] hover:text-[#1A1815]'
                }`}
              >
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} min-w-0`}>
                  <span
                    className={`material-symbols-outlined text-[20px] transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-[#B5451B]'
                    }`}
                  >
                    {item.icon}
                  </span>
                  {!isCollapsed && <span className="truncate">{label}</span>}
                </div>

                {/* Badge rendering: shows NEW only when there are unread alerts */}
                {effectiveBadge && (
                  <>
                    {!isCollapsed ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#E8B84B] text-[#1A1815] uppercase tracking-wider shrink-0 shadow-2xs">
                        {effectiveBadge}
                      </span>
                    ) : (
                      <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-[#E8B84B] ring-2 ring-[#ECE0CC] dark:ring-[#161B14]" />
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Secondary Artisan Toolkit Section */}
        <div className="space-y-1 pt-2 border-t border-current/10">
          {!isCollapsed ? (
            <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-[#B5451B] opacity-80 mb-2 font-sans">
              {t('artisan_tools', 'Artisan Studio & Tools')}
            </p>
          ) : (
            <div className="h-0.5 w-6 mx-auto bg-current/15 my-2" />
          )}

          {SECONDARY_NAV_ITEMS.map((item) => {
            const isActive = currentScreen === item.id;
            const label = t(item.labelKey, item.defaultLabel);

            return (
              <button
                key={item.id}
                onClick={() => {
                  sound.playTap();
                  onNavigate(item.id);
                }}
                title={isCollapsed ? label : undefined}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center py-2.5 px-0' : 'justify-between px-3 py-2.5'
                } rounded-2xl text-xs font-medium font-sans transition-all group relative cursor-pointer ${
                  isActive
                    ? 'bg-[#B5451B] text-white font-bold shadow-sm'
                    : isDark
                    ? 'text-[#F4ECDE]/80 hover:bg-[#252E22] hover:text-white'
                    : 'text-[#22331E]/80 hover:bg-[#DFD3BE] hover:text-[#1A1815]'
                }`}
              >
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} min-w-0`}>
                  <span
                    className={`material-symbols-outlined text-[20px] transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : isDark ? 'text-[#E8B84B]' : 'text-[#22331E]'
                    }`}
                  >
                    {item.icon}
                  </span>
                  {!isCollapsed && <span className="truncate">{label}</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick SHILPI AI Button */}
        {onOpenVoiceAssistant && (
          <div className="pt-2">
            {!isCollapsed ? (
              <button
                onClick={() => {
                  sound.playVoiceStart();
                  onOpenVoiceAssistant();
                }}
                className="w-full p-3 rounded-2xl bg-gradient-to-br from-[#B5451B] to-[#8C2C09] text-white text-left flex items-center gap-3 shadow-md hover:brightness-105 active:scale-98 transition-all border border-[#E8B84B]/40 cursor-pointer"
                id="btn-desktop-shilpi-ai"
              >
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-lg text-[#FFEBB3] animate-pulse">
                    mic
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-serif font-bold text-xs text-[#FFEBB3] leading-tight">
                    SHILPI AI
                  </p>
                  <p className="text-[10px] text-white/80 truncate mt-0.5">
                    {t('tap_to_speak', 'Tap to Interact with Shilpi AI')}
                  </p>
                </div>
              </button>
            ) : (
              <button
                onClick={() => {
                  sound.playVoiceStart();
                  onOpenVoiceAssistant();
                }}
                className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-[#B5451B] to-[#8C2C09] text-white flex items-center justify-center shadow-md hover:brightness-105 active:scale-95 transition-all border border-[#E8B84B]/50 relative group cursor-pointer"
                title={t('shilpi_ai_assistant_title', 'SHILPI AI — Chat & Voice Assistant')}
                id="btn-desktop-shilpi-ai-collapsed"
              >
                <span className="material-symbols-outlined text-xl text-[#FFEBB3] animate-pulse">
                  mic
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Artisan Identity Profile Card */}
      <div className="p-3 border-t border-current/10 shrink-0">
        <button
          onClick={() => {
            sound.playTap();
            onNavigate('profile');
          }}
          className={`w-full ${
            isCollapsed ? 'p-1.5 justify-center' : 'p-2.5 justify-between'
          } rounded-2xl flex items-center gap-3 text-left transition-all cursor-pointer ${
            isDark ? 'hover:bg-[#252E22]' : 'hover:bg-[#DFD3BE]'
          }`}
          title={isCollapsed ? `${artisan.name} (${artisan.trustScore ?? 98}★ Trust Score)` : t('view_artisan_profile', 'View Artisan Profile')}
        >
          <div className="relative shrink-0 mx-auto">
            <img
              src={artisan.avatarUrl}
              alt={artisan.name}
              className={`${isCollapsed ? 'w-9 h-9' : 'w-10 h-10'} rounded-full object-cover border-2 border-[#E8B84B]`}
            />
            <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center drop-shadow-xs">
              <BlueVerifiedBadge size={14} />
            </span>
          </div>

          {!isCollapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="font-serif font-bold text-xs truncate leading-tight">
                  {artisan.name}
                </p>
                <p className="text-[10px] opacity-70 font-sans truncate">
                  {artisan.craft.split('&')[0]}
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8B84B] text-[#1A1815] shrink-0 shadow-xs">
                {artisan.trustScore ?? 98}★
              </span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
