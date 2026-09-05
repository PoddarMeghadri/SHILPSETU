import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScreenId, LanguageCode } from '../../types';
import { sound } from '../../services/sound';
import { useTranslation } from '../../services/translations';
import { useNotifications, NotificationItemData } from '../../context/NotificationContext';

interface NotificationsScreenProps {
  onNavigate: (screen: ScreenId) => void;
  language?: LanguageCode;
  isDark?: boolean;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  onNavigate,
  isDark = false,
}) => {
  const { t } = useTranslation();
  const {
    notifications,
    unreadCount,
    markAllRead,
    markItemRead,
    deleteNotification,
  } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread' | 'gem' | 'orders' | 'studio'>('all');

  const filteredList = notifications.filter((item) => {
    if (filter === 'unread') return !item.isRead;
    if (filter === 'gem') return item.category === 'gem';
    if (filter === 'orders') return item.category === 'order';
    if (filter === 'studio') return item.category === 'studio';
    return true;
  });

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotification(id);
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-28 md:pb-12 pt-2 px-3 sm:px-6 lg:px-8 space-y-6">
      {/* Header Summary Card */}
      <div
        className={`p-5 sm:p-6 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm transition-colors ${
          isDark
            ? 'bg-[#1C221A] border-[#2D3A2B] text-[#F4ECDE]'
            : 'bg-white/80 border-[#22331E]/10 text-[#1A1815]'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-serif text-lg font-bold shadow-xs shrink-0 ${
              isDark ? 'bg-[#252E22] text-[#E8B84B]' : 'bg-[#EFE4CF] text-[#B5451B]'
            }`}
          >
            <span className="material-symbols-outlined text-2xl">notifications_active</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif font-bold text-lg sm:text-xl leading-tight">
                {t('screen_notifications', 'Notifications & Alerts')}
              </h2>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#B5451B] text-white animate-pulse">
                  {unreadCount} {t('new', 'New')}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm opacity-75 leading-tight mt-1 font-sans">
              {unreadCount === 0
                ? t('all_caught_up', 'All caught up with workshop alerts')
                : `${unreadCount} ${t('unread_alerts', 'unread alerts requiring attention')}`}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className={`text-xs font-semibold px-4 py-2 rounded-xl border transition-all active:scale-95 self-start sm:self-auto shrink-0 flex items-center gap-1.5 ${
              isDark
                ? 'bg-[#252E22] border-[#2D3A2B] text-[#E8B84B] hover:bg-[#2D3A2B]'
                : 'bg-[#EFE4CF] border-[#22331E]/10 text-[#B5451B] hover:bg-[#EAE0CC]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">done_all</span>
            <span>{t('mark_all_read', 'Mark All Read')}</span>
          </button>
        )}
      </div>

      {/* Filter Category Chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { key: 'all', label: t('all', 'All') },
          { key: 'unread', label: `${t('unread', 'Unread')} (${unreadCount})` },
          { key: 'orders', label: t('orders', 'Orders') },
          { key: 'gem', label: t('gem_govt_tab', 'GeM & Govt') },
          { key: 'studio', label: t('screen_studio', 'AI Studio') },
        ].map((tab) => {
          const isSelected = filter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                sound.playTap();
                setFilter(tab.key as any);
              }}
              className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${
                isSelected
                  ? 'bg-[#B5451B] text-white shadow-xs font-semibold'
                  : isDark
                  ? 'bg-[#1C221A] text-[#F4ECDE]/70 hover:bg-[#252E22] border border-[#2D3A2B]'
                  : 'bg-[#EFE4CF] text-[#1A1815]/70 hover:bg-[#EAE0CC] border border-[#22331E]/10'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Notifications List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredList.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                markItemRead(item.id);
                if (item.targetScreen) {
                  sound.playTap();
                  onNavigate(item.targetScreen);
                }
              }}
              className={`relative p-4 rounded-3xl border transition-all cursor-pointer shadow-xs active:scale-[0.99] group ${
                !item.isRead
                  ? isDark
                    ? 'bg-[#1C221A] border-[#B5451B]/40 ring-1 ring-[#B5451B]/20'
                    : 'bg-white border-[#B5451B]/30 ring-1 ring-[#B5451B]/15 shadow-sm'
                  : isDark
                  ? 'bg-[#161B14] border-[#2D3A2B] text-[#F4ECDE]/80 hover:bg-[#1C221A]'
                  : 'bg-white/70 border-[#22331E]/10 text-[#1A1815] hover:bg-white'
              }`}
            >
              {/* Unread indicator dot */}
              {!item.isRead && (
                <span className="absolute top-4 right-4 w-2.5 h-2.5 bg-[#B5451B] rounded-full ring-2 ring-[#F4ECDE] dark:ring-[#1C221A] animate-pulse" />
              )}

              <div className="flex items-start gap-3">
                {/* Category Icon */}
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${item.iconBg}`}
                >
                  <span className="material-symbols-outlined text-xl">{item.icon}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {item.badge && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#22331E]/10 dark:bg-white/10 text-[#B5451B] dark:text-[#E8B84B]">
                        {t(`notif_${item.id.replace(/-/g, '_')}_badge`, item.badge)}
                      </span>
                    )}
                    {item.amount && (
                      <span className="text-xs font-bold text-[#22331E] dark:text-[#E8B84B]">
                        {item.amount}
                      </span>
                    )}
                  </div>

                  <h3
                    className={`font-serif font-bold text-sm leading-snug mb-1 ${
                      isDark ? 'text-[#F4ECDE]' : 'text-[#22331E]'
                    }`}
                  >
                    {t(`notif_${item.id.replace(/-/g, '_')}_title`, item.title)}
                  </h3>

                  <p className="text-xs opacity-80 leading-relaxed font-sans mb-3">
                    {t(`notif_${item.id.replace(/-/g, '_')}_desc`, item.description)}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-current/10">
                    <span className="text-[10px] opacity-60 font-medium">
                      {t(`notif_${item.id.replace(/-/g, '_')}_time`, item.timestamp)}
                    </span>

                    <div className="flex items-center gap-3">
                      {!item.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            sound.playTap();
                            markItemRead(item.id);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B5451B] dark:text-[#E8B84B] hover:underline"
                          title={t('mark_read', 'Mark Read')}
                        >
                          <span className="material-symbols-outlined text-sm">done</span>
                          <span>{t('mark_read', 'Mark Read')}</span>
                        </button>
                      )}

                      {item.actionLabel && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#B5451B] hover:underline">
                          <span>{t(`notif_${item.id.replace(/-/g, '_')}_action`, item.actionLabel)}</span>
                          <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dismiss Button */}
                <button
                  onClick={(e) => handleDelete(item.id, e)}
                  title="Dismiss"
                  className="absolute bottom-3 right-3 text-current/30 hover:text-current/80 p-1 rounded-full transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty State */}
        {filteredList.length === 0 && (
          <div
            className={`p-8 text-center rounded-3xl border ${
              isDark ? 'bg-[#1C221A] border-[#2D3A2B]' : 'bg-white/60 border-[#22331E]/10'
            }`}
          >
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-[#B5451B]/10 text-[#B5451B] flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">done_all</span>
            </div>
            <h3 className="font-serif font-bold text-base mb-1">
              {t('all_caught_up', 'All caught up!')}
            </h3>
            <p className="text-xs opacity-75 max-w-xs mx-auto">
              {t(
                'no_notifications_desc',
                'No notifications found for this filter. New GeM orders, studio renders, and inquiries will appear here automatically.'
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
